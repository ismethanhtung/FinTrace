import type { Asset, MarketType } from "../binanceService";
import type { MarketDataAdapter } from "../marketDataAdapter";
import { stockLambdaService } from "../stockLambdaService";

async function fetchStockAssetsByMarketType(marketType: MarketType): Promise<Asset[]> {
    if (!stockLambdaService.isConfigured()) {
        throw new Error("Missing NEXT_PUBLIC_STOCK_LAMBDA_URL env");
    }

    const assets = await stockLambdaService.getStockAssets(marketType);
    if (!assets.length) {
        throw new Error("Stock listing is empty");
    }
    return assets;
}

export const stockLambdaMarketAdapter: MarketDataAdapter = {
    universe: "stock",
    listAssets: fetchStockAssetsByMarketType,
};
