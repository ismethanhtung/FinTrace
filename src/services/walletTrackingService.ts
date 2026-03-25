export type WalletTrackingResult = {
    walletAddress: string;
    status: "not_configured" | "error" | "tracked";
    message: string;
    pnl?: Array<{ symbol: string; realizedPnlUsd: number | null }>;
    portfolio?: Array<{ symbol: string; allocationPct: number | null }>;
    recentActivity?: Array<{ symbol: string; event: "buy" | "sell"; at: string }>;
};

function buildProviderUrl(args: { providerUrl: string; walletAddress: string }): string {
    const { providerUrl, walletAddress } = args;
    return providerUrl
        .replaceAll("{walletAddress}", walletAddress)
        .replaceAll("{{walletAddress}}", walletAddress)
        .replaceAll(":walletAddress", walletAddress);
}

function parseOptionalNumber(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

/**
 * Wallet/Whale tracking adapter (v1).
 *
 * v1 requires provider configuration. If provider is not configured,
 * we return a user-facing message.
 */
export async function trackWalletV1(args: {
    walletAddress: string;
}): Promise<WalletTrackingResult> {
    const walletAddress = args.walletAddress.trim();

    const providerUrl = process.env.WALLET_TRACKING_PROVIDER_URL;
    const apiKey = process.env.WALLET_TRACKING_API_KEY;

    if (!providerUrl || !apiKey) {
        return {
            walletAddress,
            status: "not_configured",
            message:
                "Wallet/Whale tracking (P&L, portfolio, activity) chưa được cấu hình provider ở server. Vui lòng thiết lập `WALLET_TRACKING_API_KEY` và `WALLET_TRACKING_PROVIDER_URL` trong `.env.local`.",
        };
    }

    const url = buildProviderUrl({ providerUrl, walletAddress });

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12_000);

        try {
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                    "x-api-key": apiKey,
                },
                signal: controller.signal,
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                return {
                    walletAddress,
                    status: "error",
                    message: `Wallet tracking provider error (${res.status}).`,
                    pnl: text ? [{ symbol: "raw", realizedPnlUsd: null }] : undefined,
                };
            }

            const data: unknown = await res.json().catch(() => null);
            const rec = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

            const message =
                typeof rec.message === "string"
                    ? rec.message
                    : typeof rec.statusMessage === "string"
                      ? rec.statusMessage
                      : "Wallet tracking completed.";

            const pnlRaw = rec.pnl ?? rec.profitLoss ?? rec.realizedPnl ?? [];
            const pnlArr = Array.isArray(pnlRaw) ? pnlRaw : [];
            const pnl = pnlArr
                .map((x: unknown) => {
                    if (!x || typeof x !== "object") return null;
                    const xr = x as Record<string, unknown>;
                    const symbol = typeof xr.symbol === "string" ? xr.symbol : "TOKEN";
                    const realized = parseOptionalNumber(xr.realizedPnlUsd ?? xr.realizedPnl);
                    return { symbol, realizedPnlUsd: realized };
                })
                .filter((x): x is NonNullable<typeof x> => Boolean(x));

            const portfolioRaw = rec.portfolio ?? rec.allocations ?? [];
            const portfolioArr = Array.isArray(portfolioRaw) ? portfolioRaw : [];
            const portfolio = portfolioArr
                .map((x: unknown) => {
                    if (!x || typeof x !== "object") return null;
                    const xr = x as Record<string, unknown>;
                    const symbol = typeof xr.symbol === "string" ? xr.symbol : "TOKEN";
                    const allocationPct = parseOptionalNumber(xr.allocationPct ?? xr.allocation_percent);
                    return { symbol, allocationPct };
                })
                .filter((x): x is NonNullable<typeof x> => Boolean(x));

            const activityRaw = rec.recentActivity ?? rec.activity ?? [];
            const activityArr = Array.isArray(activityRaw) ? activityRaw : [];
            const recentActivity = activityArr
                .map((x: unknown) => {
                    if (!x || typeof x !== "object") return null;
                    const xr = x as Record<string, unknown>;
                    const symbol = typeof xr.symbol === "string" ? xr.symbol : "TOKEN";
                    const evRaw = typeof xr.event === "string" ? xr.event.toLowerCase() : "";
                    const event: "buy" | "sell" | null =
                        evRaw === "buy" ? "buy" : evRaw === "sell" ? "sell" : null;
                    const at = typeof xr.at === "string" ? xr.at : typeof xr.time === "string" ? xr.time : "";
                    if (!event || !at) return null;
                    return { symbol, event, at };
                })
                .filter((x): x is NonNullable<typeof x> => Boolean(x));

            return {
                walletAddress,
                status: "tracked",
                message,
                pnl: pnl.length ? pnl : undefined,
                portfolio: portfolio.length ? portfolio : undefined,
                recentActivity: recentActivity.length ? recentActivity : undefined,
            };
        } finally {
            clearTimeout(timer);
        }
    } catch (err: unknown) {
        return {
            walletAddress,
            status: "error",
            message: err instanceof Error ? err.message : "Wallet tracking failed",
        };
    }
}

