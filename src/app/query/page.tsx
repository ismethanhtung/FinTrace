"use client";

import PageLayout from "../../components/PageLayout";
import { useQueryEngine } from "../../hooks/useQueryEngine";
import { cn } from "../../lib/utils";
import {
    Search,
    ShieldCheck,
    Wallet,
    SlidersHorizontal,
    Loader2,
    AlertCircle,
    Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

const modes: Array<{
    key: "simple" | "filtering" | "wallet" | "security";
    label: string;
    icon: ReactNode;
}> = [
    { key: "simple", label: "Simple", icon: <Search size={14} className="text-accent" /> },
    { key: "filtering", label: "Filtering", icon: <SlidersHorizontal size={14} className="text-accent" /> },
    { key: "wallet", label: "Wallet", icon: <Wallet size={14} className="text-accent" /> },
    { key: "security", label: "Security", icon: <ShieldCheck size={14} className="text-accent" /> },
];

function fmtUsd(v: number | null | undefined): string {
    if (v === null || v === undefined || !Number.isFinite(v)) return "--";
    return v >= 1_000_000
        ? `$${(v / 1_000_000).toFixed(2)}M`
        : v >= 1_000
          ? `$${(v / 1_000).toFixed(2)}K`
          : `$${v.toFixed(2)}`;
}

function fmtPct(v: number | null | undefined): string {
    if (v === null || v === undefined || !Number.isFinite(v)) return "--";
    const sign = v >= 0 ? "+" : "";
    return `${sign}${v.toFixed(2)}%`;
}

function SkeletonRows() {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[920px]">
                <thead>
                    <tr className="border-b border-main text-[10px] text-muted uppercase tracking-[0.12em]">
                        <th className="px-5 py-3.5 font-semibold">#</th>
                        <th className="px-5 py-3.5 font-semibold">Chain</th>
                        <th className="px-5 py-3.5 font-semibold">Pair</th>
                        <th className="px-5 py-3.5 font-semibold text-right">Price (USD)</th>
                        <th className="px-5 py-3.5 font-semibold text-right">Liquidity</th>
                        <th className="px-5 py-3.5 font-semibold text-right">Volume 24h</th>
                        <th className="px-5 py-3.5 font-semibold text-right">FDV</th>
                        <th className="px-5 py-3.5 font-semibold text-right">Δ24h</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-main">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-main pointer-events-none">
                            <td className="px-5 py-4">
                                <div className="h-3 w-5 bg-main/45 animate-pulse rounded" />
                            </td>
                            <td className="px-5 py-4">
                                <div className="h-3 w-16 bg-main/45 animate-pulse rounded" />
                            </td>
                            <td className="px-5 py-4">
                                <div className="h-3 w-32 bg-main/45 animate-pulse rounded" />
                            </td>
                            <td className="px-5 py-4 text-right">
                                <div className="h-3 w-20 ml-auto bg-main/45 animate-pulse rounded" />
                            </td>
                            <td className="px-5 py-4 text-right">
                                <div className="h-3 w-24 ml-auto bg-main/45 animate-pulse rounded" />
                            </td>
                            <td className="px-5 py-4 text-right">
                                <div className="h-3 w-24 ml-auto bg-main/45 animate-pulse rounded" />
                            </td>
                            <td className="px-5 py-4 text-right">
                                <div className="h-3 w-20 ml-auto bg-main/45 animate-pulse rounded" />
                            </td>
                            <td className="px-5 py-4 text-right">
                                <div className="h-3 w-16 ml-auto bg-main/45 animate-pulse rounded" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function QueryPage() {
    const { mode, setMode, text, setText, spec, result, isLoading, error, warning, run } = useQueryEngine();

    const RECENTS_KEY = "ft-query_recents_v1";
    const MAX_RECENTS = 6;

    const [recents, setRecents] = useState<string[]>([]);

    type SecurityScanResultUI = {
        tokenAddress: string;
        status: "not_configured" | "scanned" | "error";
        message: string;
        findings?: Array<{ label: string; severity: "low" | "medium" | "high"; value?: string }>;
    };

    type WalletTrackingResultUI = {
        walletAddress: string;
        status: "not_configured" | "error" | "tracked";
        message: string;
        pnl?: Array<{ symbol: string; realizedPnlUsd: number | null }>;
        portfolio?: Array<{ symbol: string; allocationPct: number | null }>;
        recentActivity?: Array<{ symbol: string; event: "buy" | "sell"; at: string }>;
    };

    const crossChain = useMemo(() => {
        if (!result || result.kind !== "cross_chain") return null;
        return result.result as
            | {
                  tokenAddress?: string;
                  matches: Array<{
                      pair: {
                          chainId: string;
                          pairAddress: string;
                          priceUsd?: number | null;
                          liquidityUsd?: number | null;
                          volumeUsdH24?: number | null;
                          fdvUsd?: number | null;
                          marketCapUsd?: number | null;
                          priceChangeH24Pct?: number | null;
                          baseToken: { symbol?: string; address?: string; name?: string };
                      };
                      chainId: string;
                      pairAddress: string;
                      bestScore: number;
                  }>;
                  filteredCount: number;
                  totalCandidateCount: number;
                  appliedFilters: Array<{ field: string; op: string; valueUsd: number }>;
                  warnings: string[];
              }
            | null;
    }, [result]);

    const totals = useMemo(() => {
        if (!crossChain) return null;
        const matches = crossChain.matches.slice(0, 10);
        const liquidity = matches.reduce((acc, m) => acc + (m.pair.liquidityUsd ?? 0), 0);
        const volume = matches.reduce((acc, m) => acc + (m.pair.volumeUsdH24 ?? 0), 0);
        return { liquidity, volume };
    }, [crossChain]);

    const security = useMemo(() => {
        if (!result || result.kind !== "security") return null;
        return result.result as SecurityScanResultUI;
    }, [result]);

    const wallet = useMemo(() => {
        if (!result || result.kind !== "wallet") return null;
        return result.result as WalletTrackingResultUI;
    }, [result]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(RECENTS_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as unknown;
            if (!Array.isArray(parsed)) return;
            const cleaned = parsed
                .map((x) => (typeof x === "string" ? x.trim() : ""))
                .filter(Boolean)
                .slice(0, MAX_RECENTS);
            setRecents(cleaned);
        } catch {
            // Ignore localStorage issues.
        }
    }, []);

    const onRun = useCallback(async () => {
        const t = text.trim();
        if (!t) return;
        setRecents((prev) => {
            const next = [t, ...prev.filter((x) => x !== t)].slice(0, MAX_RECENTS);
            try {
                localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
            } catch {
                // Ignore localStorage write errors.
            }
            return next;
        });
        await run();
    }, [MAX_RECENTS, RECENTS_KEY, run, text]);

    const usdcEvm = "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
    const sampleWallet = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

    const evmAddrInText = useMemo(() => {
        const m = text.trim().match(/0x[a-fA-F0-9]{40,64}/);
        return m?.[0] ?? null;
    }, [text]);

    const [autoRunText, setAutoRunText] = useState<string | null>(null);

    useEffect(() => {
        if (!autoRunText) return;
        if (!text.trim()) return;
        if (text.trim() !== autoRunText) return;
        if (isLoading) return;
        void onRun();
        setAutoRunText(null);
    }, [autoRunText, isLoading, onRun, text]);

    return (
        <PageLayout title="Query Engine" wide>
            <div className="flex flex-col gap-4 min-h-0">
                <div className="rounded-xl border border-main bg-secondary/10 p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                            {modes.map((m) => (
                                <button
                                    key={m.key}
                                    type="button"
                                    onClick={() => setMode(m.key)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors flex items-center gap-2",
                                        mode === m.key
                                            ? "bg-accent/10 text-accent border-accent/30"
                                            : "bg-secondary border-main text-muted hover:text-main hover:bg-secondary/60",
                                    )}
                                >
                                    {m.icon}
                                    {m.label}
                                </button>
                            ))}
                        </div>
                        <div className="text-[11px] text-muted flex items-center gap-2">
                            <Sparkles size={14} className="text-accent" />
                            NLQ + Cross-chain v1
                        </div>
                    </div>

                    <div className="flex items-start gap-3 flex-wrap">
                        <div className="flex-1 min-w-[260px]">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                <input
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder={
                                        mode === "wallet"
                                            ? "Dán địa chỉ ví để theo dõi P&L/portfolio/activity..."
                                            : mode === "security"
                                              ? "Dán contract/token address để scan honeypot/liquidity lock..."
                                              : "Dán contract/token address hoặc gõ câu chat ví dụ: FDV thấp < 50M..."
                                    }
                                    className="w-full bg-main border border-main rounded-md py-2 pl-10 pr-3 text-[12px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                                />
                            </div>

                            <div className="mt-2 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] text-muted uppercase tracking-widest font-bold">
                                        Examples
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            (() => {
                                                setMode("simple");
                                                setText(usdcEvm);
                                                setAutoRunText(usdcEvm);
                                            })()
                                        }
                                        className="px-3 py-1.5 rounded-full bg-secondary border border-main text-[11px] text-muted hover:text-main hover:bg-secondary/60 transition-colors"
                                    >
                                        Simple: USDC
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            (() => {
                                                setMode("filtering");
                                                const next = evmAddrInText
                                                    ? `${evmAddrInText} FDV thấp < 50M`
                                                    : "FDV thấp < 50M (cần token address)";
                                                setText(next);
                                                setAutoRunText(next);
                                            })()
                                        }
                                        className="px-3 py-1.5 rounded-full bg-secondary border border-main text-[11px] text-muted hover:text-main hover:bg-secondary/60 transition-colors"
                                    >
                                        Filtering: FDV &lt; 50M
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            (() => {
                                                setMode("wallet");
                                                setText(sampleWallet);
                                                setAutoRunText(sampleWallet);
                                            })()
                                        }
                                        className="px-3 py-1.5 rounded-full bg-secondary border border-main text-[11px] text-muted hover:text-main hover:bg-secondary/60 transition-colors"
                                    >
                                        Wallet: Whale
                                    </button>
                                </div>

                                {text.trim().length === 0 && recents.length ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] text-muted uppercase tracking-widest font-bold">
                                            Recents
                                        </span>
                                        {recents.map((r) => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setText(r)}
                                                className="px-3 py-1.5 rounded-full bg-main border border-main text-[11px] text-muted hover:text-main hover:bg-secondary/60 transition-colors"
                                            >
                                                {r.length > 28 ? `${r.slice(0, 28)}...` : r}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={!text.trim() || isLoading}
                            onClick={() => void onRun()}
                            className={cn(
                                "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[12px] font-semibold transition-colors border",
                                text.trim() && !isLoading
                                    ? "bg-accent text-white border-accent hover:bg-accent/90"
                                    : "bg-secondary text-muted border-main",
                            )}
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={14} />}
                            Run Query
                        </button>
                    </div>

                    {warning && (
                        <div className="text-[12px] text-amber-400 border border-amber-400/20 bg-amber-500/10 rounded-md px-3 py-2">
                            {warning}
                        </div>
                    )}

                    {spec && (
                        <div className="text-[11px] text-muted font-mono break-words">
                            Spec: {spec.intent}
                            {spec.tokenAddress ? ` · token=${spec.tokenAddress.slice(0, 10)}...` : ""}
                        </div>
                    )}

                    {error && (
                        <div className="text-[12px] text-rose-500 border border-rose-500/20 bg-rose-500/10 rounded-md px-3 py-2 flex items-center gap-2">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-main bg-secondary/10 p-4 sm:p-5 min-h-0">
                    {!result && !isLoading ? (
                        <div className="h-full flex items-center justify-center text-[12px] text-muted">
                            Nhập query ở trên để bắt đầu.
                        </div>
                    ) : null}

                    {isLoading ? <SkeletonRows /> : null}

                    {result && result.kind === "cross_chain" && crossChain ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="rounded-lg border border-main bg-main px-4 py-3">
                                    <div className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">
                                        Candidate
                                    </div>
                                    <div className="text-[16px] font-mono font-semibold tabular-nums">
                                        {crossChain.totalCandidateCount.toLocaleString("en-US")}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-main bg-main px-4 py-3">
                                    <div className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">
                                        Matched
                                    </div>
                                    <div className="text-[16px] font-mono font-semibold tabular-nums">
                                        {crossChain.filteredCount.toLocaleString("en-US")}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-main bg-main px-4 py-3">
                                    <div className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">
                                        Top-10 Liquidity
                                    </div>
                                    <div className="text-[16px] font-mono font-semibold tabular-nums">
                                        {fmtUsd(totals?.liquidity ?? null)}
                                    </div>
                                </div>
                            </div>

                            {crossChain.appliedFilters?.length ? (
                                <div className="text-[11px] text-muted font-mono">
                                    Filters:
                                    {" "}
                                    {crossChain.appliedFilters
                                        .map((f) => `${f.field} ${f.op} ${f.valueUsd}`)
                                        .join(" · ")}
                                </div>
                            ) : null}

                            {crossChain.warnings?.length ? (
                                <div className="text-[12px] text-amber-400 border border-amber-400/20 bg-amber-500/10 rounded-md px-3 py-2">
                                    {crossChain.warnings.join(" · ")}
                                </div>
                            ) : null}

                            <div className="max-h-[430px] overflow-y-auto overflow-x-auto thin-scrollbar">
                                <table className="w-full text-left min-w-[920px]">
                                    <thead>
                                        <tr className="border-b border-main text-[10px] text-muted uppercase tracking-[0.12em]">
                                            <th className="px-5 py-3.5 font-semibold">#</th>
                                            <th className="px-5 py-3.5 font-semibold">Chain</th>
                                            <th className="px-5 py-3.5 font-semibold">Pair</th>
                                            <th className="px-5 py-3.5 font-semibold text-right">Price (USD)</th>
                                            <th className="px-5 py-3.5 font-semibold text-right">Liquidity</th>
                                            <th className="px-5 py-3.5 font-semibold text-right">Volume 24h</th>
                                            <th className="px-5 py-3.5 font-semibold text-right">FDV</th>
                                            <th className="px-5 py-3.5 font-semibold text-right">Δ24h</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-main">
                                        {crossChain.matches.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-5 py-8 text-center text-[12px] text-muted">
                                                    Không có dữ liệu match.
                                                </td>
                                            </tr>
                                        ) : (
                                            crossChain.matches.map((m, idx) => {
                                                const p = m.pair;
                                                const fdv = p.marketCapUsd ?? p.fdvUsd ?? null;
                                                const isUp = (p.priceChangeH24Pct ?? 0) >= 0;
                                                return (
                                                    <tr key={m.pairAddress} className="hover:bg-main/40 transition-colors border-b border-main cursor-default">
                                                        <td className="px-5 py-4 text-muted text-[11px] font-mono tabular-nums">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="px-5 py-4 text-[12px] font-semibold">{p.chainId}</td>
                                                        <td className="px-5 py-4">
                                                            <div className="text-[11px] font-mono text-muted break-all">
                                                                {p.baseToken.symbol ?? "TOKEN"} · {p.pairAddress.slice(0, 10)}...
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 text-right text-[12px] font-mono font-semibold tabular-nums">
                                                            {fmtUsd(p.priceUsd)}
                                                        </td>
                                                        <td className="px-5 py-4 text-right text-[12px] font-mono text-muted tabular-nums">
                                                            {fmtUsd(p.liquidityUsd)}
                                                        </td>
                                                        <td className="px-5 py-4 text-right text-[12px] font-mono text-muted tabular-nums">
                                                            {fmtUsd(p.volumeUsdH24)}
                                                        </td>
                                                        <td className="px-5 py-4 text-right text-[12px] font-mono text-muted tabular-nums">
                                                            {fmtUsd(fdv)}
                                                        </td>
                                                        <td
                                                            className={cn(
                                                                "px-5 py-4 text-right text-[12px] font-mono font-semibold tabular-nums",
                                                                isUp ? "text-emerald-500" : "text-rose-500",
                                                            )}
                                                        >
                                                            {fmtPct(p.priceChangeH24Pct)}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : null}

                    {result && result.kind !== "cross_chain" ? (
                        <div className="space-y-4">
                            {result.kind === "security" && security ? (
                                <div className="rounded-xl border border-main bg-main p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">
                                                Security Audit (v1)
                                            </div>
                                            <div className="text-[12px] font-mono text-muted break-all">
                                                {security.tokenAddress}
                                            </div>
                                        </div>
                                        <div
                                            className={cn(
                                                "px-2.5 py-1 rounded-md text-[11px] font-bold border",
                                                security.status === "not_configured"
                                                    ? "text-amber-400 bg-amber-500/10 border-amber-400/20"
                                                    : security.status === "scanned"
                                                      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                                                      : "text-rose-500 bg-rose-500/10 border-rose-500/20",
                                            )}
                                        >
                                            {security.status === "not_configured"
                                                ? "Not Configured"
                                                : security.status === "scanned"
                                                  ? "Scanned"
                                                  : "Error"}
                                        </div>
                                    </div>

                                    <div className="text-[12px] text-muted mt-3 leading-relaxed">
                                        {security.message}
                                    </div>

                                    {security.findings?.length ? (
                                        <div className="mt-4 space-y-2">
                                            <div className="text-[10px] text-muted uppercase tracking-widest font-bold">
                                                Findings
                                            </div>
                                            <div className="divide-y divide-main">
                                                {security.findings.slice(0, 12).map((f, idx) => (
                                                    <div key={`${f.label}-${idx}`} className="py-2">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="text-[12px] font-semibold text-main">
                                                                {f.label}
                                                            </div>
                                                            <div
                                                                className={cn(
                                                                    "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border",
                                                                    f.severity === "high"
                                                                        ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
                                                                        : f.severity === "medium"
                                                                          ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                                                                          : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                                                                )}
                                                            >
                                                                {f.severity}
                                                            </div>
                                                        </div>
                                                        {f.value ? (
                                                            <div className="text-[11px] text-muted mt-1 font-mono break-all">
                                                                {f.value}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            {result.kind === "wallet" && wallet ? (
                                <div className="rounded-xl border border-main bg-main p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">
                                                Wallet / Whale Tracking (v1)
                                            </div>
                                            <div className="text-[12px] font-mono text-muted break-all">
                                                {wallet.walletAddress}
                                            </div>
                                        </div>
                                        <div
                                            className={cn(
                                                "px-2.5 py-1 rounded-md text-[11px] font-bold border",
                                                wallet.status === "not_configured"
                                                    ? "text-amber-400 bg-amber-500/10 border-amber-400/20"
                                                    : wallet.status === "tracked"
                                                      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                                                      : "text-rose-500 bg-rose-500/10 border-rose-500/20",
                                            )}
                                        >
                                            {wallet.status === "not_configured"
                                                ? "Not Configured"
                                                : wallet.status === "tracked"
                                                  ? "Tracked"
                                                  : "Error"}
                                        </div>
                                    </div>

                                    <div className="text-[12px] text-muted mt-3 leading-relaxed">
                                        {wallet.message}
                                    </div>

                                    {wallet.pnl?.length ? (
                                        <div className="mt-4 space-y-2">
                                            <div className="text-[10px] text-muted uppercase tracking-widest font-bold">
                                                Realized P&L
                                            </div>
                                            <div className="divide-y divide-main">
                                                {wallet.pnl.slice(0, 10).map((p, idx) => (
                                                    <div key={`${p.symbol}-${idx}`} className="py-2 flex items-center justify-between gap-3">
                                                        <div className="text-[12px] font-semibold text-main">
                                                            {p.symbol}
                                                        </div>
                                                        <div
                                                            className={cn(
                                                                "text-[12px] font-mono font-semibold tabular-nums",
                                                                p.realizedPnlUsd === null
                                                                    ? "text-muted"
                                                                    : p.realizedPnlUsd >= 0
                                                                      ? "text-emerald-500"
                                                                      : "text-rose-500",
                                                            )}
                                                        >
                                                            {p.realizedPnlUsd === null
                                                                ? "--"
                                                                : `$${p.realizedPnlUsd.toFixed(2)}`}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}

                                    {wallet.portfolio?.length ? (
                                        <div className="mt-4 space-y-2">
                                            <div className="text-[10px] text-muted uppercase tracking-widest font-bold">
                                                Portfolio Allocation
                                            </div>
                                            <div className="divide-y divide-main">
                                                {wallet.portfolio.slice(0, 10).map((p, idx) => (
                                                    <div key={`${p.symbol}-${idx}`} className="py-2 flex items-center justify-between gap-3">
                                                        <div className="text-[12px] font-semibold text-main">
                                                            {p.symbol}
                                                        </div>
                                                        <div className="text-[12px] font-mono text-muted tabular-nums">
                                                            {p.allocationPct === null ? "--" : `${p.allocationPct.toFixed(2)}%`}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}

                                    {wallet.recentActivity?.length ? (
                                        <div className="mt-4 space-y-2">
                                            <div className="text-[10px] text-muted uppercase tracking-widest font-bold">
                                                Recent Activity
                                            </div>
                                            <div className="divide-y divide-main">
                                                {wallet.recentActivity.slice(0, 10).map((a, idx) => (
                                                    <div key={`${a.symbol}-${idx}`} className="py-2 flex items-center justify-between gap-3">
                                                        <div className="text-[12px] font-semibold text-main">
                                                            {a.symbol}
                                                            <span className={cn("ml-2 text-[11px] font-bold", a.event === "buy" ? "text-emerald-500" : "text-rose-500")}>
                                                                {a.event.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-muted font-mono">
                                                            {a.at}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </PageLayout>
    );
}

