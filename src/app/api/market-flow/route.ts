import { NextRequest, NextResponse } from 'next/server';

/**
 * Market Flow Analysis API — Hybrid approach
 *
 * Strategy:
 *  1. TOTAL Buy / Sell volumes:
 *     → Fetched from Kline (OHLCV) data via field [9] takerBuyBaseAssetVolume.
 *       This is 100% accurate and covers any period without pagination.
 *
 *  2. Large / Medium / Small BREAKDOWN (% ratios):
 *     → Derived from a paginated 15-minute aggTrades sample regardless of
 *       the selected period. Each aggTrade is classified by its USDT value:
 *         Large:  ≥ $10,000
 *         Medium: $1,000 – $10,000
 *         Small:  < $1,000
 *       The resulting ratio is then applied to the full klines total to give
 *       accurate absolute numbers at the selected period's scale.
 *
 *  3. Futures metrics (async, parallel):
 *     → globalLongShortAccountRatio (position ratio)
 *     → takerlongshortRatio (taker volume)
 *     → openInterestHist (open interest)
 *
 * All Binance endpoints used are 100% public — no API key required.
 */

const FAPI = 'https://fapi.binance.com/futures/data';
const SPOT = 'https://api.binance.com/api/v3';

// Period → kline interval for total volume calculation
const PERIOD_KLINE_MAP: Record<string, { interval: string; limit: number }> = {
  '15m': { interval: '1m',  limit: 15  },
  '30m': { interval: '1m',  limit: 30  },
  '1h':  { interval: '5m',  limit: 12  },
  '2h':  { interval: '5m',  limit: 24  },
  '4h':  { interval: '15m', limit: 16  },
  '1d':  { interval: '1h',  limit: 24  },
};

const MAX_AGG_PAGES = 12; // Sample ~12,000 recent trades for ratio calculation

async function fetchJSON(url: string): Promise<any> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Binance ${res.status}: ${url}`);
  return res.json();
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

function getValue<T>(r: PromiseSettledResult<T>): T | null {
  return r.status === 'fulfilled' ? r.value : null;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') || 'BTCUSDT';
  const period = req.nextUrl.searchParams.get('period') || '1d';
  const limit  = req.nextUrl.searchParams.get('limit') || '30';

  const klConf = PERIOD_KLINE_MAP[period] ?? PERIOD_KLINE_MAP['1d'];

  try {
    // ── Fetch in parallel: klines + 15m aggTrades sample + futures data ──
    const now = Date.now();
    const sampleStart = now - 15 * 60_000; // 15-minute recent window for ratio

    const [klinesResult, aggTradesResult, lsRatioResult, takerFlowResult, oiResult] =
      await Promise.allSettled([
        // 1. Klines for accurate total volume
        fetchJSON(`${SPOT}/klines?symbol=${symbol}&interval=${klConf.interval}&limit=${klConf.limit}`),
        // 2. aggTrades sample (15m) for L/M/S ratio
        fetchAggTradesSample(symbol, sampleStart, now),
        // 3. Futures: Long/Short Account Ratio
        fetchJSON(`${FAPI}/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=${limit}`),
        // 4. Futures: Taker Buy/Sell Volume
        fetchJSON(`${FAPI}/takerlongshortRatio?symbol=${symbol}&period=${period}&limit=${limit}`),
        // 5. Futures: Open Interest History
        fetchJSON(`${FAPI}/openInterestHist?symbol=${symbol}&period=${period}&limit=${limit}`),
      ]);

    // ── Process klines for total buy/sell ──
    const klines: any[] | null = getValue(klinesResult);
    let totalBuyVol = 0;
    let totalSellVol = 0;
    if (klines && klines.length > 0) {
      for (const k of klines) {
        const totalVol  = parseFloat(k[5]);   // base asset volume
        const takerBuy  = parseFloat(k[9]);   // taker buy base asset volume
        const takerSell = totalVol - takerBuy;
        totalBuyVol  += takerBuy  > 0 ? takerBuy  : 0;
        totalSellVol += takerSell > 0 ? takerSell : 0;
      }
    }

    // ── Process aggTrades sample for L/M/S RATIO ──
    const aggSample: { largeBuyRatio: number; largeSellRatio: number; midBuyRatio: number; midSellRatio: number; smallBuyRatio: number; smallSellRatio: number } | null = getValue(aggTradesResult);

    // Apply ratio to klines totals for final buckets
    let buckets = null;
    if (aggSample && totalBuyVol > 0 && totalSellVol > 0) {
      buckets = {
        large: {
          buy:  round4(totalBuyVol  * aggSample.largeBuyRatio),
          sell: round4(totalSellVol * aggSample.largeSellRatio),
        },
        medium: {
          buy:  round4(totalBuyVol  * aggSample.midBuyRatio),
          sell: round4(totalSellVol * aggSample.midSellRatio),
        },
        small: {
          buy:  round4(totalBuyVol  * aggSample.smallBuyRatio),
          sell: round4(totalSellVol * aggSample.smallSellRatio),
        },
      };
    } else if (totalBuyVol > 0 || totalSellVol > 0) {
      // Fallback: no ratio, show only totals as "medium"
      buckets = {
        large:  { buy: 0, sell: 0 },
        medium: { buy: round4(totalBuyVol), sell: round4(totalSellVol) },
        small:  { buy: 0, sell: 0 },
      };
    }

    return NextResponse.json({
      symbol,
      period,
      buckets,
      longShortRatio: getValue(lsRatioResult),
      takerFlow:      getValue(takerFlowResult),
      openInterest:   getValue(oiResult),
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Fetches 15 minutes of aggTrades (paginated, up to MAX_AGG_PAGES×1000 trades)
 * and returns the buy/sell RATIO for each size bucket.
 * We return ratios (not absolute) so they can be applied to any time window's volume.
 */
async function fetchAggTradesSample(symbol: string, startTime: number, endTime: number) {
  let largeBuy = 0, largeSell = 0;
  let midBuy = 0,   midSell = 0;
  let smallBuy = 0, smallSell = 0;
  let currentStart = startTime;
  let pages = 0;

  while (currentStart < endTime && pages < MAX_AGG_PAGES) {
    let trades: any[];
    try {
      trades = await fetchJSON(
        `${SPOT}/aggTrades?symbol=${symbol}&startTime=${currentStart}&endTime=${endTime}&limit=1000`
      );
    } catch {
      break;
    }
    if (!trades || trades.length === 0) break;
    pages++;

    for (const t of trades) {
      const qty   = parseFloat(t.q);
      const value = qty * parseFloat(t.p);
      const isBuy = !t.m; // m=true → maker is buyer → market SELL

      if (value >= 10_000) {
        isBuy ? (largeBuy += qty) : (largeSell += qty);
      } else if (value >= 1_000) {
        isBuy ? (midBuy += qty) : (midSell += qty);
      } else {
        isBuy ? (smallBuy += qty) : (smallSell += qty);
      }
    }

    currentStart = trades[trades.length - 1].T + 1;
    if (trades.length < 1000) break;
  }

  const totalBuy  = largeBuy + midBuy + smallBuy;
  const totalSell = largeSell + midSell + smallSell;

  if (totalBuy === 0 && totalSell === 0) return null;

  // Convert to ratios (0–1) so they scale correctly to any volume
  const safeDivBuy  = (n: number) => totalBuy  > 0 ? n / totalBuy  : 0;
  const safeDivSell = (n: number) => totalSell > 0 ? n / totalSell : 0;

  return {
    largeBuyRatio:  safeDivBuy(largeBuy),
    largeSellRatio: safeDivSell(largeSell),
    midBuyRatio:    safeDivBuy(midBuy),
    midSellRatio:   safeDivSell(midSell),
    smallBuyRatio:  safeDivBuy(smallBuy),
    smallSellRatio: safeDivSell(smallSell),
  };
}
