type JsonRecord = Record<string, unknown>;
const VN_TZ = "Asia/Ho_Chi_Minh";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const KB_SESSION_START_HOUR = 9;
export const KB_SESSION_END_HOUR = 15;

export const KB_UI_INDEX_SYMBOLS = [
    "VNINDEX",
    "VN30",
    "HNX30",
    "HNXINDEX",
    "UPCOM",
] as const;

export type KbUiIndexSymbol = (typeof KB_UI_INDEX_SYMBOLS)[number];

export type KbIntradayPoint = {
    time: number;
    value: number;
    volume: number;
    isoTime: string;
};

export type KbIntradaySeries = {
    uiSymbol: KbUiIndexSymbol;
    sourceSymbol: string;
    points: KbIntradayPoint[];
};

export const KB_SOURCE_SYMBOL_CANDIDATES: Record<KbUiIndexSymbol, string[]> = {
    VNINDEX: ["VNINDEX"],
    VN30: ["VN30"],
    HNX30: ["HNX30"],
    HNXINDEX: ["HNXINDEX", "HNX"],
    UPCOM: ["UPCOMINDEX", "HNXUPCOMINDEX", "UPCOM"],
};

export function toKbApiDateString(date: Date): string {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function toKbApiDateStringUtc(date: Date): string {
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
}

type VnDateTimeParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};

function getVnDateTimeParts(date: Date): VnDateTimeParts {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: VN_TZ,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(date);

    const byType = (type: Intl.DateTimeFormatPartTypes): number => {
        const part = parts.find((item) => item.type === type)?.value;
        const parsed = Number.parseInt(part || "", 10);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    return {
        year: byType("year"),
        month: byType("month"),
        day: byType("day"),
        hour: byType("hour"),
        minute: byType("minute"),
        second: byType("second"),
    };
}

export function getKbNowHourDecimalInVn(date: Date = new Date()): number {
    const { hour, minute, second } = getVnDateTimeParts(date);
    return hour + minute / 60 + second / 3600;
}

export function getKbMiniChartMaxHourInVn(date: Date = new Date()): number {
    const nowHour = getKbNowHourDecimalInVn(date);
    if (nowHour < KB_SESSION_START_HOUR) return KB_SESSION_END_HOUR;
    return Math.min(KB_SESSION_END_HOUR, Math.max(KB_SESSION_START_HOUR, nowHour));
}

export function resolveKbDefaultDateString(date: Date = new Date()): string {
    const { year, month, day, hour } = getVnDateTimeParts(date);
    const vnMidnightUtc = Date.UTC(year, month - 1, day);
    const targetUtc =
        hour < KB_SESSION_START_HOUR ? vnMidnightUtc - ONE_DAY_MS : vnMidnightUtc;
    return toKbApiDateStringUtc(new Date(targetUtc));
}

function asRecord(value: unknown): JsonRecord | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as JsonRecord;
}

function readNumber(value: unknown): number | null {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value !== "string") return null;
    const cleaned = value.replace(/,/g, "").trim();
    if (!cleaned) return null;
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}

function readString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function parseKbTime(value: string): { hourDecimal: number; isoTime: string } | null {
    const match = value.match(
        /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/,
    );
    if (!match) return null;
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    const hour = Number.parseInt(match[4], 10);
    const minute = Number.parseInt(match[5], 10);
    const second = Number.parseInt(match[6] || "0", 10);
    if (
        !Number.isFinite(year) ||
        !Number.isFinite(month) ||
        !Number.isFinite(day) ||
        !Number.isFinite(hour) ||
        !Number.isFinite(minute) ||
        !Number.isFinite(second)
    ) {
        return null;
    }
    const hourDecimal = hour + minute / 60 + second / 3600;
    const isoTime = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${String(second).padStart(2, "0")}`;
    return { hourDecimal, isoTime };
}

export function mapKbIntradayRowsToPoints(rows: unknown): KbIntradayPoint[] {
    if (!Array.isArray(rows)) return [];
    const out: KbIntradayPoint[] = [];

    for (const row of rows) {
        const record = asRecord(row);
        if (!record) continue;
        const timeRaw = readString(record.t);
        const close = readNumber(record.c);
        const volume = readNumber(
            record.v ??
                record.volume ??
                record.vol ??
                record.totalVolume ??
                record.total_volume,
        );
        if (!timeRaw || close == null) continue;
        const parsed = parseKbTime(timeRaw);
        if (!parsed) continue;
        out.push({
            time: parsed.hourDecimal,
            value: close,
            volume: Math.max(0, volume ?? 0),
            isoTime: parsed.isoTime,
        });
    }

    out.sort((a, b) => a.time - b.time);
    return out;
}
