import {
    mapVietcapSnapshotBySymbol,
    type VietcapBoardSnapshotSymbolState,
} from "../lib/vietcap/boardSnapshot";

type VietcapSnapshotApiResponse = {
    group?: string;
    fetchedAt?: string;
    rows?: unknown;
    error?: string;
};

export type VietcapBoardSnapshotResult = {
    group: string;
    fetchedAt: string | null;
    bySymbol: Record<string, VietcapBoardSnapshotSymbolState>;
    groupsBySymbol: Record<string, string[]>;
    count: number;
};

const DEFAULT_GROUP = "VN30";
const DEFAULT_GROUPS = ["VN30", "HNX30", "HOSE", "HNX", "UPCOM"];

function normalizeGroup(value?: string): string {
    const normalized = (value || DEFAULT_GROUP).trim().toUpperCase();
    return /^[A-Z0-9_]{1,24}$/.test(normalized) ? normalized : DEFAULT_GROUP;
}

export const vietcapBoardSnapshotService = {
    async getGroupSnapshot(group?: string): Promise<VietcapBoardSnapshotResult> {
        const safeGroup = normalizeGroup(group);
        const res = await fetch(
            `/api/board/vietcap-snapshot?group=${encodeURIComponent(safeGroup)}`,
            {
                method: "GET",
                cache: "no-store",
            },
        );
        const payload = (await res.json()) as VietcapSnapshotApiResponse;
        if (!res.ok) {
            throw new Error(
                payload?.error ||
                    `Vietcap snapshot API error: ${res.status}`,
            );
        }

        const bySymbol = mapVietcapSnapshotBySymbol(payload.rows);
        const groupsBySymbol = Object.fromEntries(
            Object.keys(bySymbol).map((symbol) => [symbol, [safeGroup]]),
        );
        return {
            group: normalizeGroup(payload.group || safeGroup),
            fetchedAt: typeof payload.fetchedAt === "string" ? payload.fetchedAt : null,
            bySymbol,
            groupsBySymbol,
            count: Object.keys(bySymbol).length,
        };
    },

    async getGroupsSnapshot(
        groups?: string[],
    ): Promise<VietcapBoardSnapshotResult> {
        const safeGroups = Array.from(
            new Set(
                (groups?.length ? groups : DEFAULT_GROUPS).map((g) =>
                    normalizeGroup(g),
                ),
            ),
        );
        const settled = await Promise.allSettled(
            safeGroups.map((group) => this.getGroupSnapshot(group)),
        );

        const merged: Record<string, VietcapBoardSnapshotSymbolState> = {};
        const mergedGroupsBySymbol: Record<string, Set<string>> = {};
        let fetchedAt: string | null = null;
        let hasSuccess = false;

        for (const result of settled) {
            if (result.status !== "fulfilled") continue;
            hasSuccess = true;
            if (!fetchedAt || (result.value.fetchedAt && result.value.fetchedAt > fetchedAt)) {
                fetchedAt = result.value.fetchedAt;
            }
            Object.assign(merged, result.value.bySymbol);
            Object.entries(result.value.bySymbol).forEach(([symbol]) => {
                if (!mergedGroupsBySymbol[symbol]) {
                    mergedGroupsBySymbol[symbol] = new Set<string>();
                }
                mergedGroupsBySymbol[symbol].add(result.value.group);
            });
        }

        if (!hasSuccess) {
            throw new Error("Vietcap snapshot API unavailable for all groups");
        }

        return {
            group: safeGroups.join(","),
            fetchedAt,
            bySymbol: merged,
            groupsBySymbol: Object.fromEntries(
                Object.entries(mergedGroupsBySymbol).map(([symbol, groups]) => [
                    symbol,
                    Array.from(groups),
                ]),
            ),
            count: Object.keys(merged).length,
        };
    },
};
