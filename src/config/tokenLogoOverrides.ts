/**
 * Binance base asset (e.g. "BTC", "1000SATS") → CoinGecko coin `id`
 * when tự động map theo symbol bị trùng hoặc sai.
 *
 * @see docs/token-logos.md
 */
export const COINGECKO_ID_OVERRIDES: Record<string, string> = {
    // Ví dụ: 'IOT': 'iota',
};
