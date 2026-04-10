"use client";

import { useState } from "react";
import { AppTopBar } from "../../components/shell/AppTopBar";
import { LeftSidebar } from "../../components/LeftSidebar";
import { TickerBar } from "../../components/TickerBar";

type TestResult = {
    label: string;
    status: "idle" | "running" | "ok" | "error";
    detail: string;
};

const initialResult = (label: string): TestResult => ({
    label,
    status: "idle",
    detail: "Chưa chạy",
});

export default function ConnectionTestPage() {
    const [mongo, setMongo] = useState<TestResult>(initialResult("MongoDB"));
    const [api, setApi] = useState<TestResult>(initialResult("API /auth/session"));
    const [socket, setSocket] = useState<TestResult>(
        initialResult("WebSocket Binance"),
    );

    const runMongoTest = async () => {
        setMongo({ label: mongo.label, status: "running", detail: "Đang kiểm tra..." });
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
                throw new Error(json.details?.message || json.error || "Mongo test failed");
            }
            setMongo({
                label: mongo.label,
                status: "ok",
                detail: `OK · ${json.latencyMs ?? "-"}ms · ${json.checkedAt ?? ""}`,
            });
        } catch (error) {
            setMongo({
                label: mongo.label,
                status: "error",
                detail: error instanceof Error ? error.message : String(error),
            });
        }
    };

    const runApiTest = async () => {
        setApi({ label: api.label, status: "running", detail: "Đang kiểm tra..." });
        const started = performance.now();
        try {
            const res = await fetch("/api/auth/session", { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await res.json();
            setApi({
                label: api.label,
                status: "ok",
                detail: `OK · ${(performance.now() - started).toFixed(0)}ms`,
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
            detail: "Đang mở kết nối...",
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
                const ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@trade");
                const timer = window.setTimeout(() => {
                    ws.close();
                    finish({
                        status: "error",
                        detail: "Timeout: không nhận được dữ liệu trong 6s",
                    });
                }, 6000);

                ws.onmessage = () => {
                    window.clearTimeout(timer);
                    ws.close();
                    finish({
                        status: "ok",
                        detail: `OK · ${(performance.now() - started).toFixed(0)}ms`,
                    });
                };
                ws.onerror = () => {
                    window.clearTimeout(timer);
                    ws.close();
                    finish({
                        status: "error",
                        detail: "WebSocket error (network/firewall/domain blocked)",
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

    const Card = ({
        result,
        onRun,
    }: {
        result: TestResult;
        onRun: () => void;
    }) => (
        <div className="rounded-xl border border-main bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[14px] font-semibold">{result.label}</p>
                <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        result.status === "ok"
                            ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                            : result.status === "error"
                              ? "border-rose-500/30 text-rose-500 bg-rose-500/10"
                              : result.status === "running"
                                ? "border-amber-500/30 text-amber-500 bg-amber-500/10"
                                : "border-main text-muted"
                    }`}
                >
                    {result.status}
                </span>
            </div>
            <p className="text-[12px] text-muted break-words">{result.detail}</p>
            <button
                type="button"
                onClick={onRun}
                disabled={result.status === "running"}
                className="h-8 px-3 rounded-lg border border-main bg-secondary text-muted hover:text-main hover:bg-main text-[12px] disabled:opacity-60"
            >
                Run test
            </button>
        </div>
    );

    return (
        <div className="flex flex-col h-screen w-full bg-main text-main overflow-hidden">
            <AppTopBar />
            <main className="flex-1 min-h-0 flex overflow-hidden">
                <LeftSidebar />
                <div className="flex-1 min-h-0 overflow-auto thin-scrollbar p-4">
                    <div className="max-w-3xl mx-auto space-y-4">
                        <h1 className="text-[18px] font-semibold">Connection Test</h1>
                        <p className="text-[12px] text-muted">
                            Test nhanh kết nối MongoDB, API nội bộ và WebSocket.
                        </p>
                        <Card result={mongo} onRun={runMongoTest} />
                        <Card result={api} onRun={runApiTest} />
                        <Card result={socket} onRun={runSocketTest} />
                    </div>
                </div>
            </main>
            <TickerBar />
        </div>
    );
}

