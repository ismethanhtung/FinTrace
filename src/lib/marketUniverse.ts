export type AssetUniverse = "coin" | "stock";

export const UNIVERSE_STORAGE_KEY = "ft-asset-universe";

export const SUPPORTED_UNIVERSE_ROUTES = new Set<string>([
    "/",
    "/market",
    "/board",
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

export function resolveUniverseSwitchPath(
    pathname: string,
    nextUniverse: AssetUniverse,
): string {
    if (pathname === "/market" || pathname === "/board") {
        return nextUniverse === "stock" ? "/board" : "/market";
    }
    if (SUPPORTED_UNIVERSE_ROUTES.has(pathname)) return pathname;
    return nextUniverse === "stock" ? "/board" : "/market";
}
