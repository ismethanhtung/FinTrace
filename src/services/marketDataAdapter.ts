import type { Asset, MarketType } from "./binanceService";
import type { AssetUniverse } from "../lib/marketUniverse";

export type UnifiedAsset = Asset & {
    universe: AssetUniverse;
    isMock: boolean;
};

export type UnifiedMarketStats = {
    marketCap: string;
    volume24h: string;
    primaryDominance: string;
};

export interface MarketDataAdapter {
    readonly universe: AssetUniverse;
    readonly isMock: boolean;
    listAssets: (marketType: MarketType) => Promise<Asset[]>;
}

export function toUnifiedAsset(
    asset: Asset,
    universe: AssetUniverse,
    isMock: boolean,
): UnifiedAsset {
    return {
        ...asset,
        universe,
        isMock: Boolean(isMock || asset.isMock),
    };
}

