"use client";

import { useState } from "react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../context/I18nContext";

type TestResult = {
    label: string;
    status: "idle" | "running" | "ok" | "error";
    detail: string;
};

function idleResult(label: string, idleDetail: string): TestResult {
    return { label, status: "idle", detail: idleDetail };
}

export function ConnectionTestPanel({ className }: { className?: string }) {
    const { t } = useI18n();
    const idle = t("settingsPage.connectionTestNotRun");
    const [mongo, setMongo] = useState(() => idleResult("MongoDB", idle));
    const [redis, setRedis] = useState(() => idleResult("Redis", idle));
    const [api, setApi] = useState(() =>
        idleResult("API /auth/session", idle),
    );
    const [socket, setSocket] = useState(() =>
        idleResult("WebSocket Binance", idle),
    );
    const [sse, setSse] = useState(() =>
        idleResult("SSE (app /api/health/sse)", idle),
    );

    const runMongoTest = async () => {
        setMongo({
            label: mongo.label,
            status: "running",
            detail: t("settingsPage.connectionTestRunning"),
        });
        try {
            const res = await fetch("/api/health/mongo", { cache: "no-store" });
            const json = (await res.json()) as {
                status?: string;
                latencyMs?: number;
                checkedAt?: string;
                error?: string;
                details?: { message?: string };
            };
            if (!res.ok) {
                throw new Error(
                    json.details?.message || json.error || "Mongo test failed",
                );
            }
            setMongo({
                label: mongo.label,
                status: "ok",
                detail: t("settingsPage.connectionTestOkMongo", {
                    ms: json.latencyMs ?? "-",
                    at: json.checkedAt ?? "",
                }),
            });
        } catch (error) {
            setMongo({
                label: mongo.label,
                status: "error",
                detail: error instanceof Error ? error.message : String(error),
            });
        }
    };

    const runRedisTest = async () => {
        setRedis({
            label: redis.label,
            status: "running",
            detail: t("settingsPage.connectionTestRunning"),
        });
        try {
            const res = await fetch("/api/health/redis", { cache: "no-store" });
            const json = (await res.json()) as {
                status?: string;
                latencyMs?: number;
                checkedAt?: string;
                db?: number;
                error?: string;
                details?: { message?: string };
            };
            if (!res.ok) {
                throw new Error(
                    json.details?.message || json.error || "Redis test failed",
                );
            }
            setRedis({
                label: redis.label,
                status: "ok",
                detail: t("settingsPage.connectionTestOkRedis", {
                    db: json.db ?? 0,
                    ms: json.latencyMs ?? "-",
                    at: json.checkedAt ?? "",
                }),
            });
        } catch (error) {
            setRedis({
                label: redis.label,
                status: "error",
                detail: error instanceof Error ? error.message : String(error),
            });
        }
    };

    const runApiTest = async () => {
        setApi({
            label: api.label,
            status: "running",
            detail: t("settingsPage.connectionTestRunning"),
        });
        const started = performance.now();
        try {
            const res = await fetch("/api/auth/session", { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await res.json();
            setApi({
                label: api.label,
                status: "ok",
                detail: t("settingsPage.connectionTestOkApi", {
                    ms: (performance.now() - started).toFixed(0),
                }),
            });
        } catch (error) {
            setApi({
                label: api.label,
                status: "error",
                detail: error instanceof Error ? error.message : String(error),
            });
        }
    };

    const runSocketTest = async () => {
        setSocket({
            label: socket.label,
            status: "running",
            detail: t("settingsPage.connectionTestWsOpening"),
        });
        const started = performance.now();
        await new Promise<void>((resolve) => {
            let done = false;
            const finish = (next: Omit<TestResult, "label">) => {
                if (done) return;
                done = true;
                setSocket({ label: socket.label, ...next });
                resolve();
            };

            try {
                const ws = new WebSocket(
                    "wss://stream.binance.com:9443/ws/btcusdt@trade",
                );
                const timer = window.setTimeout(() => {
                    ws.close();
                    finish({
                        status: "error",
                        detail: t("settingsPage.connectionTestWsTimeout"),
                    });
                }, 6000);

                ws.onmessage = () => {
                    window.clearTimeout(timer);
                    ws.close();
                    finish({
                        status: "ok",
                        detail: t("settingsPage.connectionTestOkWs", {
                            ms: (performance.now() - started).toFixed(0),
                        }),
                    });
                };
                ws.onerror = () => {
                    window.clearTimeout(timer);
                    ws.close();
                    finish({
                        status: "error",
                        detail: t("settingsPage.connectionTestWsError"),
                    });
                };
            } catch (error) {
                finish({
                    status: "error",
                    detail: error instanceof Error ? error.message : String(error),
                });
            }
        });
    };

    const runSseTest = async () => {
        setSse({
            label: sse.label,
            status: "running",
            detail: t("settingsPage.connectionTestSseOpening"),
        });
        const started = performance.now();
        await new Promise<void>((resolve) => {
            let done = false;
            const finish = (next: Omit<TestResult, "label">) => {
                if (done) return;
                done = true;
                setSse({ label: sse.label, ...next });
                resolve();
            };

            let messageCount = 0;
            let es: EventSource;
            try {
                es = new EventSource("/api/health/sse");
            } catch (error) {
                finish({
                    status: "error",
                    detail: error instanceof Error ? error.message : String(error),
                });
                return;
            }

            const timer = window.setTimeout(() => {
                es.close();
                finish({
                    status: "error",
                    detail: t("settingsPage.connectionTestSseTimeout"),
                });
            }, 8000);

            es.onmessage = (ev) => {
                messageCount += 1;
                if (messageCount < 2) return;
                window.clearTimeout(timer);
                es.close();
                finish({
                    status: "ok",
                    detail: t("settingsPage.connectionTestOkSse", {
                        n: messageCount,
                        ms: (performance.now() - started).toFixed(0),
                        sample: ev.data.slice(0, 80),
                    }),
                });
            };

            es.onerror = () => {
                window.clearTimeout(timer);
                es.close();
                finish({
                    status: "error",
                    detail:
                        messageCount > 0
                            ? t("settingsPage.connectionTestSseDropped")
                            : t("settingsPage.connectionTestSseError"),
                });
            };
        });
    };

    const Card = ({
        result,
        onRun,
    }: {
        result: TestResult;
        onRun: () => void;
    }) => (
        <div className="space-y-3 rounded-xl border border-main bg-secondary/30 p-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[14px] font-semibold">{result.label}</p>
                <span
                    className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px]",
                        result.status === "ok" &&
                            "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
                        result.status === "error" &&
                            "border-rose-500/30 bg-rose-500/10 text-rose-500",
                        result.status === "running" &&
                            "border-amber-500/30 bg-amber-500/10 text-amber-500",
                        result.status === "idle" &&
                            "border-main text-muted",
                    )}
                >
                    {result.status === "idle"
                        ? t("settingsPage.connectionStatusIdle")
                        : result.status === "running"
                          ? t("settingsPage.connectionStatusRunning")
                          : result.status === "ok"
                            ? t("settingsPage.connectionStatusOk")
                            : t("settingsPage.connectionStatusError")}
                </span>
            </div>
            <p className="break-words text-[12px] text-muted">{result.detail}</p>
            <button
                type="button"
                onClick={onRun}
                disabled={result.status === "running"}
                className="h-8 rounded-lg border border-main bg-secondary px-3 text-[12px] text-muted transition-colors hover:bg-main hover:text-main disabled:opacity-60"
            >
                {t("settingsPage.connectionTestRun")}
            </button>
        </div>
    );

    return (
        <div className={cn("space-y-4", className)}>
            <p className="text-[12px] leading-relaxed text-muted">
                {t("settingsPage.connectionTestPanelIntro")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
                <Card result={mongo} onRun={runMongoTest} />
                <Card result={redis} onRun={runRedisTest} />
                <Card result={api} onRun={runApiTest} />
                <Card result={socket} onRun={runSocketTest} />
                <Card result={sse} onRun={runSseTest} />
            </div>
        </div>
    );
}
