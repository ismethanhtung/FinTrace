"use client";

import React, { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AppTopBar } from "../../components/shell/AppTopBar";

type ApiName = "status" | "snapshot" | "subscribe";
type FeedCode = "BA" | "SP" | "DE" | "MI";

type ApiResult = {
    loading: boolean;
    error: string | null;
    payload: unknown | null;
    fetchedAt: string | null;
};

const FEED_CODES: FeedCode[] = ["BA", "SP", "DE", "MI"];

const initialResult: ApiResult = {
    loading: false,
    error: null,
    payload: null,
    fetchedAt: null,
};

function toCsvList(input: string): string {
    return input
        .split(",")
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean)
        .join(",");
}

function prettyJson(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

export default function VndirectRealtimePreviewPage() {
    const [statusResult, setStatusResult] = useState<ApiResult>(initialResult);
    const [snapshotResult, setSnapshotResult] =
        useState<ApiResult>(initialResult);
    const [subscribeResult, setSubscribeResult] =
        useState<ApiResult>(initialResult);

    const [snapshotSymbols, setSnapshotSymbols] = useState("FPT,VCB");
    const [snapshotFeeds, setSnapshotFeeds] = useState("BA,SP,DE,MI");
    const [snapshotLimit, setSnapshotLimit] = useState("200");

    const [subscribeMode, setSubscribeMode] = useState<"add" | "set">("add");
    const [subscribeSymbols, setSubscribeSymbols] = useState("FPT,VCB,SSI");
    const [subscribeDerivativeSymbols, setSubscribeDerivativeSymbols] =
        useState("VN30F1M,VN30F2M");
    const [subscribeMarketIds, setSubscribeMarketIds] = useState(
        "10,11,12,13,02,03",
    );

    const [polling, setPolling] = useState(false);

    const callApi = async (
        api: ApiName,
        params: URLSearchParams,
        setter: React.Dispatch<React.SetStateAction<ApiResult>>,
    ) => {
        setter((prev) => ({
            ...prev,
            loading: true,
            error: null,
        }));

        try {
            const response = await fetch(`/api/vndirect/realtime?${params}`, {
                method: "GET",
                cache: "no-store",
            });
            const data = (await response.json()) as unknown;
            setter({
                loading: false,
                error: response.ok ? null : `HTTP ${response.status}`,
                payload: data,
                fetchedAt: new Date().toISOString(),
            });
        } catch (error) {
            setter({
                loading: false,
                error: error instanceof Error ? error.message : "Unknown error",
                payload: null,
                fetchedAt: new Date().toISOString(),
            });
        }
    };

    const fetchStatus = async () => {
        const params = new URLSearchParams({ cmd: "status" });
        await callApi("status", params, setStatusResult);
    };

    const fetchSnapshot = async () => {
        const params = new URLSearchParams({ cmd: "snapshot" });
        const symbols = toCsvList(snapshotSymbols);
        const feeds = toCsvList(snapshotFeeds);
        const limit = Number.parseInt(snapshotLimit, 10);
        if (symbols) params.set("symbols", symbols);
        if (feeds) params.set("feeds", feeds);
        if (Number.isFinite(limit) && limit >= 10 && limit <= 10000) {
            params.set("limit", String(limit));
        }
        await callApi("snapshot", params, setSnapshotResult);
    };

    const runSubscribe = async () => {
        const params = new URLSearchParams({
            cmd: "subscribe",
            mode: subscribeMode,
        });
        const symbols = toCsvList(subscribeSymbols);
        const derivativeSymbols = toCsvList(subscribeDerivativeSymbols);
        const marketIds = toCsvList(subscribeMarketIds);

        if (symbols) params.set("symbols", symbols);
        if (derivativeSymbols) {
            params.set("derivative_symbols", derivativeSymbols);
        }
        if (marketIds) params.set("market_ids", marketIds);
        await callApi("subscribe", params, setSubscribeResult);
    };

    const snapshotFeedPreview = useMemo(() => {
        const payload = snapshotResult.payload as
            | { data?: Record<string, unknown> }
            | null;
        const raw = payload?.data;
        if (!raw || typeof raw !== "object") return [];
        return FEED_CODES.map((feed) => {
            const value = (raw as Record<string, unknown>)[feed];
            const rows = Array.isArray(value) ? value : [];
            return { feed, count: rows.length, sample: rows[0] ?? null };
        });
    }, [snapshotResult.payload]);

    React.useEffect(() => {
        fetchStatus();
        fetchSnapshot();
        // Run once on load for quick visibility.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        if (!polling) return;
        const id = window.setInterval(() => {
            void fetchStatus();
            void fetchSnapshot();
        }, 3000);
        return () => window.clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [polling, snapshotSymbols, snapshotFeeds, snapshotLimit]);

    return (
        <div className="flex flex-col h-screen w-full bg-main text-main overflow-hidden">
            <AppTopBar
                refreshTitle="Refresh status and snapshot"
                refreshAriaLabel="Refresh status and snapshot"
                onRefresh={() => {
                    void fetchStatus();
                    void fetchSnapshot();
                }}
            />

            <main className="flex-1 min-h-0 overflow-auto p-6 sm:p-8">
                <div className="mx-auto w-full max-w-[1400px] space-y-4">
                    <section className="rounded-xl border border-main bg-main p-4">
                        <h1 className="text-[16px] font-semibold tracking-tight">
                            VNDIRECT Realtime Inspector
                        </h1>
                        <p className="text-[12px] text-muted mt-1">
                            Trang thử nhanh để xem dữ liệu trả về từ các API
                            realtime `status`, `snapshot`, `subscribe` và mẫu
                            bản ghi theo feed `BA/SP/DE/MI`.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPolling((v) => !v)}
                                className="px-3 py-1.5 text-[12px] rounded-md border border-main bg-secondary hover:bg-secondary/70 transition-colors"
                            >
                                {polling
                                    ? "Stop auto refresh (3s)"
                                    : "Start auto refresh (3s)"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    void fetchStatus();
                                    void fetchSnapshot();
                                }}
                                className="px-3 py-1.5 text-[12px] rounded-md border border-main bg-secondary hover:bg-secondary/70 transition-colors inline-flex items-center gap-2"
                            >
                                <RefreshCw size={13} />
                                Refresh now
                            </button>
                        </div>
                    </section>

                    <section className="rounded-xl border border-main bg-main p-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-[14px] font-semibold">
                                1) Status API
                            </h2>
                            <button
                                type="button"
                                onClick={() => void fetchStatus()}
                                className="px-3 py-1.5 text-[12px] rounded-md border border-main bg-secondary hover:bg-secondary/70 transition-colors"
                            >
                                {statusResult.loading
                                    ? "Loading..."
                                    : "Run status"}
                            </button>
                        </div>
                        <ApiResultView result={statusResult} />
                    </section>

                    <section className="rounded-xl border border-main bg-main p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-[14px] font-semibold">
                                2) Snapshot API
                            </h2>
                            <button
                                type="button"
                                onClick={() => void fetchSnapshot()}
                                className="px-3 py-1.5 text-[12px] rounded-md border border-main bg-secondary hover:bg-secondary/70 transition-colors"
                            >
                                {snapshotResult.loading
                                    ? "Loading..."
                                    : "Run snapshot"}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <LabeledInput
                                label="symbols (CSV)"
                                value={snapshotSymbols}
                                onChange={setSnapshotSymbols}
                            />
                            <LabeledInput
                                label="feeds (CSV)"
                                value={snapshotFeeds}
                                onChange={setSnapshotFeeds}
                            />
                            <LabeledInput
                                label="limit (10..10000)"
                                value={snapshotLimit}
                                onChange={setSnapshotLimit}
                            />
                        </div>

                        <ApiResultView result={snapshotResult} />
                    </section>

                    <section className="rounded-xl border border-main bg-main p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-[14px] font-semibold">
                                3) Subscribe API (runtime update)
                            </h2>
                            <button
                                type="button"
                                onClick={() => void runSubscribe()}
                                className="px-3 py-1.5 text-[12px] rounded-md border border-main bg-secondary hover:bg-secondary/70 transition-colors"
                            >
                                {subscribeResult.loading
                                    ? "Loading..."
                                    : "Run subscribe"}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <label className="flex flex-col gap-1 text-[12px]">
                                <span className="text-muted">mode</span>
                                <select
                                    className="border border-main rounded-md bg-main px-2 py-2"
                                    value={subscribeMode}
                                    onChange={(e) =>
                                        setSubscribeMode(
                                            e.target.value as "add" | "set",
                                        )
                                    }
                                >
                                    <option value="add">add</option>
                                    <option value="set">set</option>
                                </select>
                            </label>
                            <LabeledInput
                                label="symbols (CSV)"
                                value={subscribeSymbols}
                                onChange={setSubscribeSymbols}
                            />
                            <LabeledInput
                                label="derivative_symbols (CSV)"
                                value={subscribeDerivativeSymbols}
                                onChange={setSubscribeDerivativeSymbols}
                            />
                            <LabeledInput
                                label="market_ids (CSV)"
                                value={subscribeMarketIds}
                                onChange={setSubscribeMarketIds}
                            />
                        </div>

                        <ApiResultView result={subscribeResult} />
                    </section>

                    <section className="rounded-xl border border-main bg-main p-4 space-y-3">
                        <h2 className="text-[14px] font-semibold">
                            4) Feed preview (from latest snapshot)
                        </h2>
                        <p className="text-[12px] text-muted">
                            Mỗi feed hiển thị `count` và 1 bản ghi mẫu đầu tiên
                            lấy từ response snapshot gần nhất.
                        </p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {snapshotFeedPreview.map((item) => (
                                <div
                                    key={item.feed}
                                    className="rounded-md border border-main bg-secondary/20 p-3"
                                >
                                    <div className="text-[12px] font-semibold">
                                        {item.feed} · records: {item.count}
                                    </div>
                                    <pre className="mt-2 max-h-64 overflow-auto text-[11px] leading-5 font-mono whitespace-pre-wrap break-all">
                                        {prettyJson(
                                            item.sample || {
                                                api_group:
                                                    "vndirect_realtime",
                                                api_source:
                                                    "vndirect_websocket",
                                                api_tag: `vndirect_ws.${item.feed}`,
                                                note: "No data yet for this feed.",
                                            },
                                        )}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

function LabeledInput({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="flex flex-col gap-1 text-[12px]">
            <span className="text-muted">{label}</span>
            <input
                className="border border-main rounded-md bg-main px-2 py-2"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </label>
    );
}

function ApiResultView({ result }: { result: ApiResult }) {
    return (
        <div className="mt-3 rounded-md border border-main bg-secondary/10 p-3">
            <div className="text-[11px] text-muted mb-2">
                fetched_at: {result.fetchedAt || "N/A"}
            </div>
            {result.error ? (
                <div className="text-[12px] text-rose-500 mb-2">
                    Error: {result.error}
                </div>
            ) : null}
            <pre className="max-h-96 overflow-auto text-[11px] leading-5 font-mono whitespace-pre-wrap break-all">
                {prettyJson(result.payload)}
            </pre>
        </div>
    );
}
