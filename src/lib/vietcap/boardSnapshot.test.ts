import { describe, expect, it } from "vitest";
import {
    mapVietcapSnapshotBySymbol,
    toVietcapBoardSnapshotState,
} from "./boardSnapshot";

describe("vietcap board snapshot mapper", () => {
    it("maps a Vietcap row into board snapshot state", () => {
        const out = toVietcapBoardSnapshotState({
            s: "acb",
            ref: 23800,
            cei: 25450,
            flo: 22150,
            c: 23600,
            mv: 1037900,
            vo: 9767900,
            h: 23700,
            l: 23300,
            frbv: 1182692,
            frsv: 890300,
            frcrr: 128125275,
            bp1: 23550,
            bv1: 300,
            bp2: 23500,
            bv2: 1200,
            bp3: 23450,
            bv3: 5200,
            ap1: 23600,
            av1: 860800,
            ap2: 23650,
            av2: 428300,
            ap3: 23700,
            av3: 207200,
            orgn: "Asia Commercial Joint Stock Bank",
            bo: "HSX",
            co: "VN000000ACB8",
        });

        expect(out?.symbol).toBe("ACB");
        expect(out?.ref).toBe(23800);
        expect(out?.bid).toEqual([
            { price: 23550, quantity: 300 },
            { price: 23500, quantity: 1200 },
            { price: 23450, quantity: 5200 },
        ]);
        expect(out?.offer).toEqual([
            { price: 23600, quantity: 860800 },
            { price: 23650, quantity: 428300 },
            { price: 23700, quantity: 207200 },
        ]);
        expect(out?.foreignBuy).toBe(1182692);
        expect(out?.exchange).toBe("HSX");
    });

    it("skips rows without valid symbol and keeps latest duplicate", () => {
        const out = mapVietcapSnapshotBySymbol([
            { s: "SSI", c: 20 },
            { s: "ssi", c: 21 },
            { s: "***", c: 99 },
        ]);
        expect(Object.keys(out)).toEqual(["SSI"]);
        expect(out.SSI?.price).toBe(21);
    });
});
