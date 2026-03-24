export type NetworkFilterKey =
    | "all"
    | "highlights"
    | "bsc"
    | "base"
    | "solana"
    | "ethereum"
    | "more";

export type NetworkMapPayload = {
    updatedAt: number;
    bySymbol: Record<string, string[]>;
    bySymbolPrimary: Record<string, string>;
};

const NETWORK_ALIASES: Record<string, string> = {
    ethereum: "ethereum",
    "binance-smart-chain": "bsc",
    "bnb-smart-chain": "bsc",
    bsc: "bsc",
    base: "base",
    solana: "solana",
};

const FALLBACK_OVERRIDES: Record<string, string[]> = {
    BTC: ["native"],
    ETH: ["ethereum"],
    BNB: ["bsc"],
    SOL: ["solana"],
    USDT: ["ethereum", "bsc", "solana", "base"],
    USDC: ["ethereum", "solana", "base"],
};

const PRIMARY_FALLBACK_OVERRIDES: Record<string, string> = {
    BTC: "native",
    ETH: "ethereum",
    BNB: "bsc",
    SOL: "solana",
    TRX: "tron",
    AVAX: "avalanche",
    DOT: "polkadot",
};

export function normalizeNetworks(raw: string[]): string[] {
    const out = new Set<string>();
    for (const item of raw) {
        const key = item.trim().toLowerCase();
        if (!key) continue;
        const normalized = NETWORK_ALIASES[key] ?? key;
        out.add(normalized);
    }
    return Array.from(out);
}

export function filterChipToNetworkKey(chip: string): NetworkFilterKey {
    switch (chip) {
        case "BSC":
            return "bsc";
        case "Base":
            return "base";
        case "Solana":
            return "solana";
        case "Ethereum":
            return "ethereum";
        case "Highlights":
            return "highlights";
        case "More":
            return "more";
        default:
            return "all";
    }
}

export function resolveNetworksForSymbol(
    symbol: string,
    map: Record<string, string[]>,
): string[] {
    const key = symbol.toUpperCase();
    const fromMap = map[key];
    if (fromMap && fromMap.length) return fromMap;
    return FALLBACK_OVERRIDES[key] ?? ["other"];
}

export function shouldKeepByNetwork(
    chip: string,
    symbol: string,
    map: Record<string, string[]>,
    primaryMap: Record<string, string>,
): boolean {
    const mode = filterChipToNetworkKey(chip);
    const nets = resolveNetworksForSymbol(symbol, map);
    const primary =
        primaryMap[symbol.toUpperCase()] ??
        PRIMARY_FALLBACK_OVERRIDES[symbol.toUpperCase()] ??
        "other";
    if (mode === "all" || mode === "highlights") return true;
    if (mode === "more") {
        return !["ethereum", "bsc", "base", "solana"].includes(primary);
    }
    // Strict mode: filter by primary network to avoid wrapped/multi-chain noise.
    if (mode === "ethereum" || mode === "bsc" || mode === "base" || mode === "solana") {
        return primary === mode;
    }
    return nets.includes(mode);
}
