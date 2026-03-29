import type { Asset, MarketType } from "../binanceService";
import type { MarketDataAdapter } from "../marketDataAdapter";
import { createMockStockAssets } from "../../lib/mockStockData";
import { stockLambdaService } from "../stockLambdaService";

async function fetchStockAssetsByMarketType(marketType: MarketType): Promise<Asset[]> {
    if (!stockLambdaService.isConfigured()) {
        return createMockStockAssets(marketType);
    }

    try {
        const assets = await stockLambdaService.getStockAssets(marketType);
        if (!assets.length) {
            return createMockStockAssets(marketType);
        }
        return assets;
    } catch (error) {
        console.error("[stockLambdaMarketAdapter] Falling back to mock stock assets:", error);
        return createMockStockAssets(marketType);
    }
}

export const stockLambdaMarketAdapter: MarketDataAdapter = {
    universe: "stock",
    isMock: false,
    listAssets: fetchStockAssetsByMarketType,
};
