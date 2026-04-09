const TONE_EPS = 1e-6;

export type StockTone = "fuchsia" | "emerald" | "rose" | "amber" | "cyan";

export function toneClassForStock(tone: StockTone): string {
    if (tone === "fuchsia") return "text-[#c05af2]";
    if (tone === "emerald") return "text-[#32d74b]";
    if (tone === "rose") return "text-[#ff2727]";
    if (tone === "cyan") return "text-cyan-500";
    return "text-[#ffbe0c]";
}

export function resolveStockTone(
    price: number,
    ref: number,
    ceiling: number,
    floor: number,
): StockTone {
    if (Number.isFinite(price) && Number.isFinite(ceiling)) {
        if (Math.abs(price - ceiling) <= TONE_EPS) return "fuchsia";
    }
    if (Number.isFinite(price) && Number.isFinite(floor)) {
        if (Math.abs(price - floor) <= TONE_EPS) return "cyan";
    }
    if (Number.isFinite(price) && Number.isFinite(ref)) {
        if (price > ref + TONE_EPS) return "emerald";
        if (price < ref - TONE_EPS) return "rose";
        return "amber";
    }
    return "amber";
}
