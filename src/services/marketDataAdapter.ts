import type { Asset, MarketType } from "./binanceService";
import type { AssetUniverse } from "../lib/marketUniverse";

export type UnifiedAsset = Asset & {
    universe: AssetUniverse;
};

export type UnifiedMarketStats = {
    marketCap: string;
    volume24h: string;
    primaryDominance: string;
};

export interface MarketDataAdapter {
    readonly universe: AssetUniverse;
    listAssets: (marketType: MarketType) => Promise<Asset[]>;
}

export function toUnifiedAsset(
    asset: Asset,
    universe: AssetUniverse,
): UnifiedAsset {
    return {
        ...asset,
        universe,
    };
}
