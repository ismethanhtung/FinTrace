import { describe, expect, it } from "vitest";

import {
    buildBinanceAssetMetadataMap,
    enrichAssetsWithBinanceAssetMetadata,
    getCachedBinanceAssetMetadata,
    resetBinanceAssetMetadataServiceForTests,
    type BinanceAssetMetadataEntry,
} from "./binanceAssetMetadataService";

const SAMPLE_ENTRIES: BinanceAssetMetadataEntry[] = [
    {
        id: "473",
        assetCode: "AVAX",
        assetName: "Avalanche",
        unit: "",
        commissionRate: 0,
        freeAuditWithdrawAmt: 0,
        freeUserChargeAmount: 150000,
        createTime: 1647254123000,
        test: 0,
        gas: 0,
        isLegalMoney: false,
        reconciliationAmount: 0,
        seqNum: "0",
        chineseName: "Avalanche",
        cnLink: "",
        enLink: "",
        logoUrl: "https://img.test/avax.png",
        fullLogoUrl: "https://img.test/avax-full.png",
        supportMarket: null,
        feeReferenceAsset: "",
        feeRate: null,
        feeDigit: 8,
        assetDigit: 8,
        trading: true,
        tags: ["Layer1_Layer2", "pos", "RWA"],
        plateType: "MAINWEB",
        etf: false,
        isLedgerOnly: false,
        delisted: false,
        preDelist: false,
        tagBits: "0",
        pdTradeDeadline: null,
        pdDepositDeadline: null,
        pdAnnounceUrl: null,
        oldAssetCode: null,
        newAssetCode: null,
        swapTag: "no",
        swapAnnounceUrl: null,
    },
];

describe("binanceAssetMetadataService", () => {
    it("buildBinanceAssetMetadataMap indexes entries by assetCode", () => {
        const map = buildBinanceAssetMetadataMap(SAMPLE_ENTRIES);

        expect(map.get("AVAX")?.assetName).toBe("Avalanche");
    });

    it("enrichAssetsWithBinanceAssetMetadata enriches spot and futures assets", async () => {
        const originalFetch = global.fetch;
        global.fetch = async () =>
            new Response(JSON.stringify(SAMPLE_ENTRIES), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });

        try {
            const assets = [
                {
                    id: "AVAXUSDT",
                    symbol: "AVAX",
                    name: "AVAX",
                    price: 22.5,
                    change: 0.5,
                    changePercent: 2.2,
                    marketCap: "-",
                    volume24h: "$1M",
                    high24h: 23,
                    low24h: 21.2,
                    baseVolume: 100,
                    quoteVolumeRaw: 1000,
                    sparkline: [],
                    marketType: "spot" as const,
                },
                {
                    id: "AVAXUSDT_PERP",
                    symbol: "AVAX",
                    name: "AVAX",
                    price: 22.5,
                    change: 0.5,
                    changePercent: 2.2,
                    marketCap: "-",
                    volume24h: "$1M",
                    high24h: 23,
                    low24h: 21.2,
                    baseVolume: 100,
                    quoteVolumeRaw: 1000,
                    sparkline: [],
                    marketType: "futures" as const,
                },
            ];

            const out = await enrichAssetsWithBinanceAssetMetadata(assets);

            expect(out[0].name).toBe("Avalanche");
            expect(out[0].tags).toEqual(["Layer1_Layer2", "pos", "RWA"]);
            expect(out[0].binanceAssetInfo?.plateType).toBe("MAINWEB");
            expect(out[1].name).toBe("Avalanche");
            expect(out[1].tags).toEqual(["Layer1_Layer2", "pos", "RWA"]);
        } finally {
            global.fetch = originalFetch;
            resetBinanceAssetMetadataServiceForTests();
        }
    });

    it("getCachedBinanceAssetMetadata deduplicates concurrent fetches", async () => {
        resetBinanceAssetMetadataServiceForTests();
        const originalFetch = global.fetch;
        let fetchCount = 0;
        global.fetch = async () => {
            fetchCount += 1;
            return new Response(JSON.stringify(SAMPLE_ENTRIES), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        };

        try {
            const [first, second] = await Promise.all([
                getCachedBinanceAssetMetadata(),
                getCachedBinanceAssetMetadata(),
            ]);
            expect(fetchCount).toBe(1);
            expect(first).toEqual(SAMPLE_ENTRIES);
            expect(second).toEqual(SAMPLE_ENTRIES);
        } finally {
            global.fetch = originalFetch;
            resetBinanceAssetMetadataServiceForTests();
        }
    });
});
