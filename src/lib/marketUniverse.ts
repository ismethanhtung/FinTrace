export type AssetUniverse = "coin" | "stock";

export const UNIVERSE_STORAGE_KEY = "ft-asset-universe";

export const SUPPORTED_UNIVERSE_ROUTES = new Set<string>([
    "/",
    "/market",
    "/heatmap",
    "/news",
    "/data-stream",
    "/transactions",
    "/smart-money",
    "/liquidation",
]);

export function normalizeUniverse(value: unknown): AssetUniverse {
    return value === "stock" ? "stock" : "coin";
}

export function isMockUniverse(universe: AssetUniverse): boolean {
    return universe === "stock";
}

export function resolveUniverseSwitchPath(pathname: string): string {
    if (SUPPORTED_UNIVERSE_ROUTES.has(pathname)) return pathname;
    return "/market";
}

