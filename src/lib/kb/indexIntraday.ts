type JsonRecord = Record<string, unknown>;

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
        if (!timeRaw || close == null) continue;
        const parsed = parseKbTime(timeRaw);
        if (!parsed) continue;
        out.push({
            time: parsed.hourDecimal,
            value: close,
            isoTime: parsed.isoTime,
        });
    }

    out.sort((a, b) => a.time - b.time);
    return out;
}
