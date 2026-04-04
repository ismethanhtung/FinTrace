import { binanceService, type Asset, type BinanceTicker, type MarketType } from "../binanceService";
import { enrichAssetsWithLogos } from "../tokenLogoService";
import { enrichAssetsWithBinanceAssetMetadata } from "../binanceAssetMetadataService";
import { isLeveragedToken } from "../../lib/tokenFilters";
import type { MarketDataAdapter } from "../marketDataAdapter";

async function fetchCoinAssetsByMarketType(marketType: MarketType): Promise<Asset[]> {
    if (marketType === "futures") {
        const tickers = await binanceService.getFuturesTickers();
        const allUSDT = tickers
            .filter(
                (t) =>
                    t.symbol.endsWith("USDT") &&
                    !t.symbol.includes("_") &&
                    !isLeveragedToken(t.symbol.slice(0, -4)),
            )
            .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));

        const withLogos = await enrichAssetsWithLogos(
            allUSDT.map(binanceService.transformFuturesTicker),
        );
        return enrichAssetsWithBinanceAssetMetadata(withLogos);
    }

    const tickers: BinanceTicker[] = await binanceService.getTickers();
    const allUSDT = tickers
        .filter(
            (t) =>
                t.symbol.endsWith("USDT") &&
                !isLeveragedToken(t.symbol.slice(0, -4)),
        )
        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));

    const withLogos = await enrichAssetsWithLogos(
        allUSDT.map(binanceService.transformTicker),
    );
    return enrichAssetsWithBinanceAssetMetadata(withLogos);
}

export const coinMarketAdapter: MarketDataAdapter = {
    universe: "coin",
    listAssets: fetchCoinAssetsByMarketType,
};
