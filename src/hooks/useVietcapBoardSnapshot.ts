import { useCallback, useEffect, useState } from "react";
import {
    vietcapBoardSnapshotService,
    type VietcapBoardSnapshotResult,
} from "../services/vietcapBoardSnapshotService";

type UseVietcapBoardSnapshotOptions = {
    enabled?: boolean;
    group?: string;
    groups?: string[];
    refreshIntervalMs?: number;
};

type UseVietcapBoardSnapshotResult = {
    snapshotBySymbol: VietcapBoardSnapshotResult["bySymbol"];
    groupsBySymbol: VietcapBoardSnapshotResult["groupsBySymbol"];
    fetchedAt: string | null;
    count: number;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};

const DEFAULT_REFRESH_INTERVAL_MS = 45_000;

export function useVietcapBoardSnapshot(
    options: UseVietcapBoardSnapshotOptions = {},
): UseVietcapBoardSnapshotResult {
    const {
        enabled = true,
        group = "VN30",
        groups,
        refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS,
    } = options;
    const [snapshotBySymbol, setSnapshotBySymbol] = useState<
        VietcapBoardSnapshotResult["bySymbol"]
    >({});
    const [groupsBySymbol, setGroupsBySymbol] = useState<
        VietcapBoardSnapshotResult["groupsBySymbol"]
    >({});
    const [fetchedAt, setFetchedAt] = useState<string | null>(null);
    const [count, setCount] = useState(0);
    const [isLoading, setIsLoading] = useState(Boolean(enabled));
    const [error, setError] = useState<string | null>(null);

    const fetchSnapshot = useCallback(async () => {
        if (!enabled) return;
        try {
            const data = groups?.length
                ? await vietcapBoardSnapshotService.getGroupsSnapshot(groups)
                : await vietcapBoardSnapshotService.getGroupSnapshot(group);
            setSnapshotBySymbol(data.bySymbol);
            setGroupsBySymbol(data.groupsBySymbol);
            setFetchedAt(data.fetchedAt);
            setCount(data.count);
            setError(null);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to fetch Vietcap board snapshot",
            );
        } finally {
            setIsLoading(false);
        }
    }, [enabled, group, groups]);

    useEffect(() => {
        if (!enabled) {
            setSnapshotBySymbol({});
            setGroupsBySymbol({});
            setFetchedAt(null);
            setCount(0);
            setError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        void fetchSnapshot();
        const timer = window.setInterval(() => {
            void fetchSnapshot();
        }, Math.max(5_000, refreshIntervalMs));
        return () => window.clearInterval(timer);
    }, [enabled, fetchSnapshot, refreshIntervalMs]);

    return {
        snapshotBySymbol,
        groupsBySymbol,
        fetchedAt,
        count,
        isLoading,
        error,
        refetch: fetchSnapshot,
    };
}
