import type { Asset, MarketType } from "../binanceService";
import type { MarketDataAdapter } from "../marketDataAdapter";
import { createMockStockAssets } from "../../lib/mockStockData";

async function fetchStockMockAssetsByMarketType(
    marketType: MarketType,
): Promise<Asset[]> {
    return createMockStockAssets(marketType);
}

export const stockMockMarketAdapter: MarketDataAdapter = {
    universe: "stock",
    isMock: true,
    listAssets: fetchStockMockAssetsByMarketType,
};

