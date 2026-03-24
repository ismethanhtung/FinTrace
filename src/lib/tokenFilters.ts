/**
 * Minimum base-asset prefix length before each leveraged-token suffix.
 * Prevents false positives on short legitimate symbols:
 *   - "JUP" ends with "UP" but prefix="J" (len 1) < 3 → not leveraged ✓
 *   - "BTCUP" → prefix="BTC" (len 3) >= 3 → leveraged ✓
 *   - "EOSBEAR" → prefix="EOS" (len 3) >= 2 → leveraged ✓
 */
const LEVERAGED_SUFFIX_MIN_PREFIX: [string, number][] = [
    ["BEAR", 2],
    ["BULL", 2],
    ["DOWN", 2],
    ["UP", 3],
];

/**
 * Returns true for Binance Leveraged Tokens (BLVT) such as EOSBEAR, BTCDOWN, ETHUP.
 * These are near-zero-price tokens that pollute market lists and sort results.
 *
 * @param baseAsset - The base asset symbol (e.g. "EOSBEAR", "BTCDOWN"), NOT the trading pair.
 */
export function isLeveragedToken(baseAsset: string): boolean {
    const upper = baseAsset.toUpperCase();
    for (const [suffix, minPrefix] of LEVERAGED_SUFFIX_MIN_PREFIX) {
        if (
            upper.endsWith(suffix) &&
            upper.length - suffix.length >= minPrefix
        ) {
            return true;
        }
    }
    return false;
}
