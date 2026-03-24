/**
 * GET /api/market-news
 *
 * Fetches the top 3 general crypto-market news articles from Google News RSS,
 * then enriches each with a single Groq AI call that returns:
 *   - shortTitle   : condensed title (≤ 60 chars, English)
 *   - sentiment    : "positive" | "negative" | "neutral"
 *   - summary      : 2-3 Markdown bullet-points in Vietnamese
 *
 * Results are cached server-side for 3 hours to minimise RSS + AI cost.
 */

import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { getGroqApiKey } from '../../../lib/getGroqKey';

export const runtime = 'nodejs';

function extractUserGroqKey(request: Request): string | null {
  const headerKey = request.headers.get('x-groq-api-key')?.trim();
  if (headerKey) return headerKey;
  const auth = request.headers.get('authorization');
  if (!auth) return null;
  const matched = auth.match(/^Bearer\s+(.+)$/i);
  return matched?.[1]?.trim() || null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type MarketNewsArticle = {
  id: string;
  originalTitle: string;
  shortTitle: string;
  url: string;
  source: string;
  publishedAt: string;
  relativeTime: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  summary: string; // Markdown bullets, Vietnamese
};

// ─── In-memory cache (server process lifetime) ───────────────────────────────

type CacheEntry = {
  articles: MarketNewsArticle[];
  fetchedAt: number;
};

let _cache: CacheEntry | null = null;
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const RSS_QUERIES = [
  'cryptocurrency market today',
  'bitcoin ethereum market',
  'crypto market news',
];

async function fetchRssArticles(): Promise<
  { id: string; title: string; url: string; source: string; publishedAt: string; description: string }[]
> {
  const parser = new Parser();
  const query = RSS_QUERIES[Math.floor(Math.random() * RSS_QUERIES.length)];
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

  const feed = await parser.parseURL(rssUrl);

  return feed.items.slice(0, 8).map((item, i) => {
    const rawDesc = item.contentSnippet || item.content || item.summary || '';
    const cleanDesc = rawDesc.replace(/(<([^>]+)>)/gi, '').substring(0, 600);
    const cleanTitle = (item.title || 'Crypto News').replace(/ - [^-]+$/, '').trim();
    const source =
      (item as any).source?.title ||
      item.creator ||
      feed.title ||
      'News';

    return {
      id: item.guid || `rss-${i}`,
      title: cleanTitle,
      url: item.link || '',
      source: String(source).split(' ')[0],
      publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
      description: cleanDesc,
    };
  });
}

async function enrichWithAI(
  article: { title: string; description: string },
  groqKey: string,
): Promise<{ shortTitle: string; sentiment: 'positive' | 'negative' | 'neutral'; summary: string }> {
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

  const systemPrompt = `You are a senior crypto market analyst AI. 
Given a news article title and snippet, respond with ONLY a valid JSON object (no markdown, no extra text):
{
  "shortTitle": "<concise English title ≤60 chars>",
  "sentiment": "<positive|negative|neutral>",
  "summaryPoints": ["<Vietnamese point 1>", "<Vietnamese point 2>", "<Vietnamese point 3 optional>"]
}

Rules:
- shortTitle: keep the key information, strip publisher names
- sentiment: judge from market impact perspective (positive = bullish, negative = bearish)
- summaryPoints: 2-3 short Vietnamese points, no markdown bullets, no numbering`;

  const textFallbackSystemPrompt = `You are a senior crypto market analyst AI.
Return ONLY one line, no markdown, no extra words, with this exact format:
shortTitle || sentiment || point1 || point2 || point3

Rules:
- sentiment must be exactly: positive, negative, or neutral
- shortTitle must be English and concise (<= 60 chars)
- points must be Vietnamese and insightful
- point3 can be empty if not needed`;

  const userContent = `Title: ${article.title}\nSnippet: ${article.description || 'N/A'}`;

  const parseAiJson = (text: string): { shortTitle?: string; sentiment?: string; summary?: string; summaryPoints?: unknown } => {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('No JSON object in AI response');
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  };

  const normalizeSummary = (summary?: string | string[]): string => {
    const mergedSummary = Array.isArray(summary)
      ? summary
          .map((s) => String(s).trim())
          .filter(Boolean)
          .join('\n')
      : summary;

    if (!mergedSummary?.trim()) {
      return '- Chưa có đủ dữ liệu để tóm tắt rõ ràng.';
    }
    const lines = mergedSummary
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => (line.startsWith('- ') ? line : `- ${line.replace(/^[-*]\s*/, '')}`));
    return lines.slice(0, 3).join('\n');
  };

  const heuristicSentiment = (text: string): 'positive' | 'negative' | 'neutral' => {
    const t = text.toLowerCase();
    const positiveSignals = ['rises', 'surges', 'advances', 'gain', 'bullish', 'record', 'inflow', 'breakout'];
    const negativeSignals = ['falls', 'drops', 'declines', 'bearish', 'sell-off', 'outflow', 'risk-off', 'cautious'];
    const pos = positiveSignals.filter((k) => t.includes(k)).length;
    const neg = negativeSignals.filter((k) => t.includes(k)).length;
    if (pos > neg) return 'positive';
    if (neg > pos) return 'negative';
    return 'neutral';
  };

  const fallbackSummary = () => {
    const snippet = (article.description || '').trim();
    if (!snippet) {
      return '- Tin này đề cập biến động thị trường crypto tổng quan.\n- Cần mở bài gốc để có thêm dữ liệu định lượng.';
    }
    const firstSentence = snippet.split(/[.!?]/).map((s) => s.trim()).find(Boolean) || snippet;
    return `- Tin tập trung vào diễn biến ngắn hạn của thị trường crypto.\n- Chi tiết chính: ${firstSentence.substring(0, 160)}.\n- Nên theo dõi phản ứng giá và thanh khoản sau tin.`;
  };

  const callGroq = async (payload: Record<string, unknown>) => {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const error = new Error(`Groq error ${res.status}: ${errText}`);
      (error as Error & { status?: number; body?: string }).status = res.status;
      (error as Error & { status?: number; body?: string }).body = errText;
      throw error;
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() ?? '';
  };

  const parseDelimitedFallback = (text: string): { shortTitle: string; sentiment: 'positive' | 'negative' | 'neutral'; summary: string } => {
    const cleaned = text.replace(/\r/g, '').trim();
    const parts = cleaned.split('||').map((p) => p.trim()).filter(Boolean);
    const shortTitle = (parts[0] || article.title).replace(/\s+/g, ' ').trim().substring(0, 70);
    const maybeSentiment = (parts[1] || '').toLowerCase();
    const sentiment = (['positive', 'negative', 'neutral'] as const).includes(
      maybeSentiment as 'positive' | 'negative' | 'neutral',
    )
      ? (maybeSentiment as 'positive' | 'negative' | 'neutral')
      : heuristicSentiment(`${article.title}\n${article.description}`);
    const points = parts.slice(2, 5);
    return {
      shortTitle,
      sentiment,
      summary: normalizeSummary(points.length ? points : fallbackSummary()),
    };
  };

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const text = await callGroq({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 300,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });
      const parsed = parseAiJson(text);

      const sentiment = (['positive', 'negative', 'neutral'] as const).includes(
        parsed.sentiment as 'positive' | 'negative' | 'neutral',
      )
        ? (parsed.sentiment as 'positive' | 'negative' | 'neutral')
        : heuristicSentiment(`${article.title}\n${article.description}`);

      return {
        shortTitle: (parsed.shortTitle || article.title).replace(/\s+/g, ' ').trim().substring(0, 70),
        sentiment,
        summary: normalizeSummary(
          Array.isArray(parsed.summaryPoints)
            ? (parsed.summaryPoints as string[])
            : parsed.summary,
        ),
      };
    } catch (err) {
      // If JSON validation fails at provider side, retry with looser text format once.
      const errBody = String((err as Error & { body?: string })?.body || '');
      const isJsonValidationFailure =
        errBody.includes('json_validate_failed') ||
        errBody.includes('Failed to generate JSON');
      if (isJsonValidationFailure) {
        try {
          const textFallback = await callGroq({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: textFallbackSystemPrompt },
              { role: 'user', content: userContent },
            ],
            max_tokens: 280,
            temperature: 0.2,
          });
          return parseDelimitedFallback(textFallback);
        } catch (fallbackErr) {
          lastError = fallbackErr;
          await new Promise((r) => setTimeout(r, 250 * attempt));
          continue;
        }
      }

      lastError = err;
      // brief backoff helps when hitting free-tier burst limits
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }

  const fallbackErrorMsg =
    lastError instanceof Error ? lastError.message : String(lastError || 'unknown');
  console.warn('[market-news] AI enrich fallback:', article.title, fallbackErrorMsg);
  return {
    shortTitle: article.title.replace(/\s+/g, ' ').trim().substring(0, 70),
    sentiment: heuristicSentiment(`${article.title}\n${article.description}`),
    summary: fallbackSummary(),
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === '1';

  // Serve from cache if fresh
  if (!forceRefresh && _cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(
      { articles: _cache.articles, cachedAt: new Date(_cache.fetchedAt).toISOString() },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=300',
        },
      },
    );
  }

  try {
    const userProvidedGroqKey = extractUserGroqKey(request);
    const rawArticlesPromise = fetchRssArticles();

    // Priority: ENV/AWS first, then fallback to user-provided key from request.
    const groqKeyPromise = getGroqApiKey().catch(() => {
      if (userProvidedGroqKey) return userProvidedGroqKey;
      throw new Error(
        'Groq API key is missing. Configure GROQ_API_KEY (or AWS secret) or provide x-groq-api-key header.',
      );
    });

    const [rawArticles, groqKey] = await Promise.all([
      rawArticlesPromise,
      groqKeyPromise,
    ]);

    // Pick top 3 articles and enrich them one-by-one to reduce rate-limit failures
    const top3 = rawArticles.slice(0, 3);
    const enriched: Awaited<ReturnType<typeof enrichWithAI>>[] = [];
    for (const art of top3) {
      // sequential processing improves reliability on Groq free-tier limits
      const ai = await enrichWithAI(art, groqKey);
      enriched.push(ai);
    }

    const articles: MarketNewsArticle[] = top3.map((art, i) => {
      const ai = enriched[i];
      return {
        id: art.id,
        originalTitle: art.title,
        shortTitle: ai.shortTitle,
        url: art.url,
        source: art.source,
        publishedAt: art.publishedAt,
        relativeTime: relativeTime(art.publishedAt),
        sentiment: ai.sentiment,
        summary: ai.summary,
      };
    });

    _cache = { articles, fetchedAt: Date.now() };

    return NextResponse.json(
      { articles, cachedAt: new Date(_cache.fetchedAt).toISOString() },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=300',
        },
      },
    );
  } catch (error) {
    console.error('[market-news] Error:', error);

    // If we have stale cache, serve it rather than fail
    if (_cache) {
      return NextResponse.json(
        { articles: _cache.articles, cachedAt: new Date(_cache.fetchedAt).toISOString(), stale: true },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch market news', details: String(error) },
      { status: 500 },
    );
  }
}
