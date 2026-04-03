import { describe, expect, it } from "vitest";
import {
    getKbMiniChartMaxHourInVn,
    resolveKbDefaultDateString,
} from "./indexIntraday";

describe("resolveKbDefaultDateString", () => {
    it("uses previous trading date before 09:00 Asia/Ho_Chi_Minh", () => {
        // 2026-04-03 08:59:00 (UTC+7)
        const now = new Date("2026-04-03T01:59:00.000Z");
        expect(resolveKbDefaultDateString(now)).toBe("02-04-2026");
    });

    it("uses current date from 09:00 Asia/Ho_Chi_Minh onward", () => {
        // 2026-04-03 09:00:00 (UTC+7)
        const now = new Date("2026-04-03T02:00:00.000Z");
        expect(resolveKbDefaultDateString(now)).toBe("03-04-2026");
    });
});

describe("getKbMiniChartMaxHourInVn", () => {
    it("shows full session window before market open", () => {
        // 2026-04-03 08:30:00 (UTC+7)
        const now = new Date("2026-04-03T01:30:00.000Z");
        expect(getKbMiniChartMaxHourInVn(now)).toBe(15);
    });

    it("caps visible max hour to current VN time during session", () => {
        // 2026-04-03 10:30:00 (UTC+7)
        const now = new Date("2026-04-03T03:30:00.000Z");
        const value = getKbMiniChartMaxHourInVn(now);
        expect(value).toBeGreaterThanOrEqual(10.49);
        expect(value).toBeLessThanOrEqual(10.51);
    });
});
