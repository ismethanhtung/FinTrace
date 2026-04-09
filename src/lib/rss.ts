export type ParsedRssItem = {
    guid?: string;
    title?: string;
    link?: string;
    creator?: string;
    source?: string;
    pubDate?: string;
    isoDate?: string;
    contentSnippet?: string;
    content?: string;
    summary?: string;
};

export type ParsedRssFeed = {
    title?: string;
    items: ParsedRssItem[];
};

const RSS_TIMEOUT_MS = 12_000;
const RSS_MAX_ATTEMPTS = 2;

export class RssFetchError extends Error {
    url: string;
    status: number | null;
    timedOut: boolean;

    constructor(
        message: string,
        opts: { url: string; status?: number | null; timedOut?: boolean },
    ) {
        super(message);
        this.name = "RssFetchError";
        this.url = opts.url;
        this.status = opts.status ?? null;
        this.timedOut = Boolean(opts.timedOut);
    }
}

function decodeHtmlEntities(input: string): string {
    return input
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x2F;/gi, "/")
        .replace(/&#(\d+);/g, (_, code) => {
            const n = Number(code);
            return Number.isFinite(n) ? String.fromCharCode(n) : _;
        })
        .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => {
            const n = Number.parseInt(code, 16);
            return Number.isFinite(n) ? String.fromCharCode(n) : _;
        });
}

function stripCdata(value: string): string {
    return value.replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "").trim();
}

function extractTag(xmlChunk: string, tag: string): string | undefined {
    const match = xmlChunk.match(
        new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
    );
    if (!match?.[1]) return undefined;
    return decodeHtmlEntities(stripCdata(match[1]));
}

function extractTagAttr(
    xmlChunk: string,
    tag: string,
    attr: string,
): string | undefined {
    const match = xmlChunk.match(
        new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"[^>]*>`, "i"),
    );
    if (!match?.[1]) return undefined;
    return decodeHtmlEntities(match[1]);
}

function parseRssXml(xml: string): ParsedRssFeed {
    const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
    const channel = channelMatch?.[1] ?? xml;
    const feedTitle = extractTag(channel, "title");

    const itemMatches = channel.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];
    const items: ParsedRssItem[] = itemMatches.map((itemXml) => {
        const sourceTag = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
        const sourceUrl = extractTagAttr(itemXml, "source", "url");
        const sourceTitle = sourceTag?.[1]
            ? decodeHtmlEntities(stripCdata(sourceTag[1]))
            : undefined;

        const description =
            extractTag(itemXml, "description") ?? extractTag(itemXml, "summary");

        return {
            guid: extractTag(itemXml, "guid"),
            title: extractTag(itemXml, "title"),
            link: extractTag(itemXml, "link"),
            creator:
                extractTag(itemXml, "dc:creator") ??
                extractTag(itemXml, "creator"),
            source: sourceTitle || sourceUrl,
            pubDate: extractTag(itemXml, "pubDate"),
            isoDate:
                extractTag(itemXml, "isoDate") ??
                extractTag(itemXml, "published"),
            contentSnippet: description,
            content:
                extractTag(itemXml, "content:encoded") ??
                extractTag(itemXml, "content"),
            summary: extractTag(itemXml, "summary"),
        };
    });

    return {
        title: feedTitle,
        items,
    };
}

export async function fetchRssFeed(url: string): Promise<ParsedRssFeed> {
    for (let attempt = 1; attempt <= RSS_MAX_ATTEMPTS; attempt += 1) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), RSS_TIMEOUT_MS);
        try {
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
                    "User-Agent": "fintrace/1.0 (+cloudflare)",
                },
                signal: ctrl.signal,
            });
            if (!res.ok) {
                throw new RssFetchError(`RSS upstream error ${res.status}`, {
                    url,
                    status: res.status,
                });
            }
            const xml = await res.text();
            return parseRssXml(xml);
        } catch (error) {
            const timedOut =
                error instanceof DOMException && error.name === "AbortError";
            const isRetriable =
                timedOut ||
                !(error instanceof RssFetchError) ||
                (error.status !== null && error.status >= 500);
            if (attempt >= RSS_MAX_ATTEMPTS || !isRetriable) {
                if (error instanceof RssFetchError) {
                    throw error;
                }
                throw new RssFetchError(
                    timedOut ? "RSS request timed out" : "RSS request failed",
                    { url, timedOut },
                );
            }
        } finally {
            clearTimeout(timer);
        }
    }
    throw new RssFetchError("RSS request failed", { url });
}

export function readRssErrorLogFields(error: unknown): {
    message: string;
    url?: string;
    status?: number | null;
    timedOut?: boolean;
} {
    if (error instanceof RssFetchError) {
        return {
            message: error.message,
            url: error.url,
            status: error.status,
            timedOut: error.timedOut,
        };
    }
    if (error instanceof Error) {
        return { message: error.message };
    }
    return { message: String(error) };
}
