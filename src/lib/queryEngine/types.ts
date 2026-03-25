export type QueryMode = "simple" | "filtering" | "wallet" | "security";

export type QueryIntent = "tokenAddress" | "walletAddress" | "keyword" | "unknown";

export type NumericOp = "lt" | "lte" | "gt" | "gte";

export type NumericFilter = {
    op: NumericOp;
    valueUsd: number;
};

export type ScreeningFilters = {
    /**
     * FDV/market cap are often interchangeable across DEX aggregators.
     * In v1 we map both to DexScreener's `fdv` when `marketCap` is missing.
     */
    fdv?: NumericFilter;
    liquidityUsd?: NumericFilter;
    volumeUsdH24?: NumericFilter;
    priceChangeH24Pct?: {
        op: NumericOp;
        valuePct: number;
    };
};

export type QuerySpec = {
    mode: QueryMode;
    intent: QueryIntent;
    /**
     * Contract address or chain-native token address. v1 primarily targets EVM (`0x...`).
     */
    tokenAddress?: string;
    walletAddress?: string;
    keyword?: string;

    /**
     * Advanced screening. Only applied when mode is `filtering`.
     */
    screening?: ScreeningFilters;

    /**
     * Security options (v1: may return "not configured").
     */
    security?: {
        scanHoneypot?: boolean;
        scanLiquidityLock?: boolean;
        scanDevHoldings?: boolean;
    };

    /**
     * Wallet options (v1: may return "not configured").
     */
    wallet?: {
        pnl?: boolean;
        portfolio?: boolean;
        recentActivity?: boolean;
    };
};

export type QuerySpecValidationResult =
    | { ok: true; spec: QuerySpec }
    | { ok: false; errors: string[] };

