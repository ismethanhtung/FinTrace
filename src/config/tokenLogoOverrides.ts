/**
 * Manual overrides for token logo lookup keys.
 *
 * Key:
 * - asset id (e.g. `BTCUSDT`)
 * - or base asset symbol (e.g. `BTC`, `1000SATS`)
 *
 * Value:
 * - canonical Binance lookup key to try first.
 *
 * @see docs/token-logos.md
 */
export const BINANCE_LOGO_KEY_OVERRIDES: Record<string, string> = {
    // Example: 'BTCUSDT': 'BTCUSDT',
    // Example: 'BTC': 'BTC',
};
