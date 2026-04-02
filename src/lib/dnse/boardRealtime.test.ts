import { describe, expect, it } from "vitest";
import {
    extractDnseBoardPatches,
    mergeDnseBoardState,
} from "./boardRealtime";

describe("extractDnseBoardPatches", () => {
    it("extracts security definition fields", () => {
        const patches = extractDnseBoardPatches({
            c: "security_definition.G1.json",
            d: {
                symbol: "hpg",
                basicPrice: 28.3,
                ceilingPrice: 30,
                floorPrice: 26.5,
            },
        });

        expect(patches).toEqual([
            {
                symbol: "HPG",
                ref: 28.3,
                ceiling: 30,
                floor: 26.5,
            },
        ]);
    });

    it("extracts quote fields with depth arrays", () => {
        const patches = extractDnseBoardPatches({
            data: {
                symbol: "FPT",
                bid: [
                    { price: "122.1", quantity: "1000" },
                    { price: 122, quantity: 500 },
                ],
                offer: [{ price: 122.2, quantity: 700 }],
                totalBidQtty: "20000",
                totalOfferQtty: "15000",
            },
        });

        expect(patches).toEqual([
            {
                symbol: "FPT",
                bid: [
                    { price: 122.1, quantity: 1000 },
                    { price: 122, quantity: 500 },
                ],
                offer: [{ price: 122.2, quantity: 700 }],
                totalBidQtty: 20000,
                totalOfferQtty: 15000,
            },
        ]);
    });

    it("extracts trade fields from nested arrays", () => {
        const patches = extractDnseBoardPatches({
            records: [
                {
                    symbol: "SSI",
                    price: "24.15",
                    quantity: "1200",
                    totalVolumeTraded: 5400000,
                    highestPrice: 24.4,
                    lowestPrice: 23.95,
                },
            ],
        });

        expect(patches).toEqual([
            {
                symbol: "SSI",
                price: 24.15,
                quantity: 1200,
                totalVolumeTraded: 5400000,
                highestPrice: 24.4,
                lowestPrice: 23.95,
            },
        ]);
    });

    it("extracts DNSE snake_case realtime payload fields", () => {
        const patches = extractDnseBoardPatches({
            data: {
                T: "te",
                symbol: "HPG",
                bid: [
                    { price: 26.85, qtty: 28280 },
                    { price: 26.8, qtty: 59440 },
                ],
                offer: [{ price: 26.9, qtty: 14790 }],
                match_price: 26.85,
                match_qtty: 300,
                total_volume_traded: 718620,
                highest_price: 27,
                lowest_price: 26.75,
            },
        });

        expect(patches).toEqual([
            {
                symbol: "HPG",
                bid: [
                    { price: 26.85, quantity: 28280 },
                    { price: 26.8, quantity: 59440 },
                ],
                offer: [{ price: 26.9, quantity: 14790 }],
                price: 26.85,
                quantity: 300,
                totalVolumeTraded: 718620,
                highestPrice: 27,
                lowestPrice: 26.75,
            },
        ]);
    });
});

describe("mergeDnseBoardState", () => {
    it("merges incremental patches by symbol", () => {
        const merged = mergeDnseBoardState(
            {
                HPG: {
                    symbol: "HPG",
                    ref: 28.3,
                    ceiling: 30,
                    floor: 26.5,
                },
            },
            [
                {
                    symbol: "HPG",
                    price: 28.4,
                    quantity: 1000,
                },
                {
                    symbol: "FPT",
                    price: 122.2,
                },
            ],
        );

        expect(merged).toEqual({
            HPG: {
                symbol: "HPG",
                ref: 28.3,
                ceiling: 30,
                floor: 26.5,
                price: 28.4,
                quantity: 1000,
            },
            FPT: {
                symbol: "FPT",
                price: 122.2,
            },
        });
    });
});
