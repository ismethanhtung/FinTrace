"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LeftSidebar } from "../../components/LeftSidebar";
import { TickerBar } from "../../components/TickerBar";
import { AppTopBar } from "../../components/shell/AppTopBar";
import {
    ChevronDown,
    ChevronRight,
    Database,
    Loader2,
    Pause,
    Play,
    RefreshCw,
} from "lucide-react";

type BrowseEntry = {
    key: string;
    type: string;
    ttl: number;
    value: unknown;
    truncated: boolean;
};

type BrowseResponse = {
    ok: boolean;
    error?: string;
    fetchedAt?: string;
    pattern?: string;
    nextCursor?: string;
    hasMore?: boolean;
    count?: number;
    entries?: BrowseEntry[];
};

function formatTtl(ttl: number): string {
    if (ttl < 0) {
        return ttl === -1 ? "∞" : "—";
    }
    if (ttl < 60) return `${ttl}s`;
    if (ttl < 3600) return `${Math.floor(ttl / 60)}m`;
    return `${Math.floor(ttl / 3600)}h`;
}

function valuePreview(v: unknown): string {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") {
        return v.length > 120 ? `${v.slice(0, 120)}…` : v;
    }
    try {
        const s = JSON.stringify(v);
        return s.length > 160 ? `${s.slice(0, 160)}…` : s;
    } catch {
        return String(v);
    }
}

export default function RedisExplorerPage() {
    const [pattern, setPattern] = useState("*");
    const [patternDraft, setPatternDraft] = useState("*");
    const [limit] = useState(250);
    const [entries, setEntries] = useState<BrowseEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadAllBusy, setLoadAllBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fetchedAt, setFetchedAt] = useState<string | null>(null);
    const [hasMoreHint, setHasMoreHint] = useState(false);
    const [realtime, setRealtime] = useState(true);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const toggleExpand = (key: string) => {
        setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const fetchPage = useCallback(
        async (cursor: string, pat: string): Promise<BrowseResponse> => {
            const u = new URL("/api/redis/browse", window.location.origin);
            u.searchParams.set("cursor", cursor);
            u.searchParams.set("pattern", pat);
            u.searchParams.set("limit", String(limit));
            const res = await fetch(u.toString(), { cache: "no-store" });
            const data = (await res.json()) as BrowseResponse;
            if (!res.ok || !data.ok) {
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            return data;
        },
        [limit],
    );

    const refreshFirstPage = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchPage("0", pattern);
            setEntries(data.entries ?? []);
            setFetchedAt(data.fetchedAt ?? null);
            setHasMoreHint(Boolean(data.hasMore));
        } catch (e) {
            setEntries([]);
            setError(e instanceof Error ? e.message : String(e));
            setFetchedAt(null);
            setHasMoreHint(false);
        } finally {
            setLoading(false);
        }
    }, [fetchPage, pattern]);

    const loadAllPages = useCallback(async () => {
        setLoadAllBusy(true);
        setError(null);
        try {
            const merged: BrowseEntry[] = [];
            let cursor = "0";
            let lastAt: string | null = null;
            let guard = 0;
            do {
                guard += 1;
                if (guard > 500) {
                    throw new Error("Quá nhiều trang — dừng để tránh treo.");
                }
                const data = await fetchPage(cursor, pattern);
                lastAt = data.fetchedAt ?? lastAt;
                merged.push(...(data.entries ?? []));
                cursor = data.nextCursor ?? "0";
                const more = data.hasMore && cursor !== "0";
                if (!more) break;
            } while (cursor !== "0");

            merged.sort((a, b) => a.key.localeCompare(b.key));
            setEntries(merged);
            setFetchedAt(lastAt);
            setHasMoreHint(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoadAllBusy(false);
        }
    }, [fetchPage, pattern]);

    useEffect(() => {
        void refreshFirstPage();
    }, [refreshFirstPage]);

    useEffect(() => {
        if (!realtime) return;
        const id = window.setInterval(() => {
            void refreshFirstPage();
        }, 3000);
        return () => window.clearInterval(id);
    }, [realtime, refreshFirstPage]);

    const applyPattern = () => {
        setPattern(patternDraft.trim() || "*");
    };

    const busy = loading || loadAllBusy;

    const typeCounts = useMemo(() => {
        const m: Record<string, number> = {};
        for (const e of entries) {
            m[e.type] = (m[e.type] ?? 0) + 1;
        }
        return m;
    }, [entries]);

    return (
        <div className="flex flex-col h-screen w-full bg-main text-main overflow-hidden">
            <AppTopBar />

            <main className="flex-1 min-h-0 flex overflow-hidden">
                <LeftSidebar />

                <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-main">
                    <div className="px-3 border-b border-main bg-secondary/30 shrink-0">
                        <div className="h-[56px] flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-9 w-9 rounded-lg border border-main bg-secondary flex items-center justify-center shrink-0">
                                    <Database
                                        size={18}
                                        className="text-accent"
                                        strokeWidth={2}
                                    />
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                    <div className="text-[11px] text-muted uppercase tracking-widest font-bold truncate">
                                        Redis explorer
                                    </div>
                                    <div className="text-[12px] text-muted font-mono truncate">
                                        {entries.length} keys
                                        {hasMoreHint ? " · còn trang tiếp theo" : ""}
                                        {fetchedAt ? ` · ${fetchedAt}` : ""}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                <div className="hidden sm:flex items-center gap-2 mr-1">
                                    <input
                                        value={patternDraft}
                                        onChange={(e) =>
                                            setPatternDraft(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") applyPattern();
                                        }}
                                        placeholder="MATCH pattern (vd board:*)"
                                        className="h-8 w-[220px] max-w-[40vw] rounded-lg border border-main bg-secondary px-2 text-[12px] font-mono text-main placeholder:text-muted/70 focus:outline-none focus:ring-1 focus:ring-accent/50"
                                        spellCheck={false}
                                    />
                                    <button
                                        type="button"
                                        onClick={applyPattern}
                                        className="h-8 px-3 rounded-lg border border-main bg-secondary text-muted hover:text-main hover:border-accent/40 transition-colors text-[11px] font-semibold"
                                    >
                                        Lọc
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setRealtime((v) => !v)}
                                    className={`h-8 px-3 rounded-lg border border-main text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
                                        realtime
                                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                            : "bg-secondary text-muted hover:text-main"
                                    }`}
                                    title="Cập nhật trang đầu mỗi 3 giây"
                                >
                                    {realtime ? (
                                        <Pause size={13} />
                                    ) : (
                                        <Play size={13} />
                                    )}
                                    Realtime
                                </button>

                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void refreshFirstPage()}
                                    className="h-8 px-3 rounded-lg border border-main bg-secondary text-muted hover:text-main hover:border-accent/40 transition-colors text-[11px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2
                                            size={13}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <RefreshCw size={13} />
                                    )}
                                    Làm mới
                                </button>

                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void loadAllPages()}
                                    className="h-8 px-3 rounded-lg border border-main bg-secondary text-muted hover:text-main hover:border-accent/40 transition-colors text-[11px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {loadAllBusy ? (
                                        <Loader2
                                            size={13}
                                            className="animate-spin"
                                        />
                                    ) : null}
                                    Tải toàn bộ
                                </button>
                            </div>
                        </div>

                        <div className="sm:hidden pb-3 flex gap-2">
                            <input
                                value={patternDraft}
                                onChange={(e) => setPatternDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") applyPattern();
                                }}
                                placeholder="MATCH pattern"
                                className="flex-1 h-8 rounded-lg border border-main bg-secondary px-2 text-[12px] font-mono"
                            />
                            <button
                                type="button"
                                onClick={applyPattern}
                                className="h-8 px-3 rounded-lg border border-main bg-secondary text-[11px] font-semibold text-muted"
                            >
                                Lọc
                            </button>
                        </div>
                    </div>

                    {Object.keys(typeCounts).length > 0 ? (
                        <div className="px-3 py-2 border-b border-main flex flex-wrap gap-2 shrink-0">
                            {Object.entries(typeCounts).map(([t, n]) => (
                                <span
                                    key={t}
                                    className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-main bg-secondary/50 text-muted"
                                >
                                    {t}:{" "}
                                    <span className="text-main font-bold">
                                        {n}
                                    </span>
                                </span>
                            ))}
                        </div>
                    ) : null}

                    <div className="flex-1 min-h-0 overflow-auto thin-scrollbar p-3">
                        {error ? (
                            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[13px] px-3 py-2 font-mono">
                                {error}
                            </div>
                        ) : null}

                        {!error && entries.length === 0 && !busy ? (
                            <div className="text-[13px] text-muted font-mono py-8 text-center border border-dashed border-main rounded-lg">
                                Không có key khớp pattern.
                            </div>
                        ) : null}

                        <div className="space-y-2 max-w-[1600px] mx-auto">
                            {entries.map((row) => {
                                const open = expanded[row.key] ?? false;
                                return (
                                    <div
                                        key={row.key}
                                        className="rounded-lg border border-main bg-secondary/20 overflow-hidden"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleExpand(row.key)
                                            }
                                            className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-secondary/40 transition-colors"
                                        >
                                            <span className="mt-0.5 text-muted">
                                                {open ? (
                                                    <ChevronDown size={16} />
                                                ) : (
                                                    <ChevronRight
                                                        size={16}
                                                    />
                                                )}
                                            </span>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <code className="text-[12px] font-mono text-main break-all">
                                                        {row.key}
                                                    </code>
                                                    <span className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded border border-main bg-secondary text-muted">
                                                        {row.type}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-muted">
                                                        TTL{" "}
                                                        {formatTtl(row.ttl)}
                                                    </span>
                                                    {row.truncated ? (
                                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                            truncated
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {!open ? (
                                                    <div className="text-[11px] font-mono text-muted break-all">
                                                        {valuePreview(
                                                            row.value,
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </button>
                                        {open ? (
                                            <pre className="text-[11px] font-mono leading-relaxed px-3 pb-3 pt-0 text-main whitespace-pre-wrap break-all border-t border-main/60 bg-main/40 max-h-[min(65vh,560px)] overflow-auto thin-scrollbar">
                                                {typeof row.value === "string"
                                                    ? row.value
                                                    : JSON.stringify(
                                                          row.value,
                                                          null,
                                                          2,
                                                      )}
                                            </pre>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <TickerBar />
                </div>
            </main>
        </div>
    );
}
