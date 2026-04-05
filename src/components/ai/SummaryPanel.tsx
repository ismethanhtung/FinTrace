"use client";

import React, { useState } from "react";
import {
    Activity,
    TrendingUp,
    TrendingDown,
    Loader2,
    FileText,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useMarket } from "../../context/MarketContext";
import { useAppSettings } from "../../context/AppSettingsContext";
import { useCoinNews } from "../../hooks/useCoinNews";
import ReactMarkdown from "react-markdown";
import { aiProviderService } from "../../services/aiProviderService";
import { useI18n } from "../../context/I18nContext";

export const SummaryPanel = () => {
    const { t } = useI18n();
    const { selectedSymbol, assets } = useMarket();
    const { activeProviderId, activeProvider, selectedModel } =
        useAppSettings();
    const { news } = useCoinNews({ symbol: selectedSymbol });

    const [aiReport, setAiReport] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentAsset = assets.find((a) => a.id === selectedSymbol);
    const baseSymbol = selectedSymbol.replace("USDT", "");

    const isBullish = currentAsset ? currentAsset.changePercent >= 0 : true;

    if (!currentAsset) return null;

    // Real Calculated Metrics
    const range =
        currentAsset.high24h && currentAsset.low24h
            ? currentAsset.high24h - currentAsset.low24h
            : 0;
    const spreadPct =
        currentAsset.low24h && range > 0
            ? (range / currentAsset.low24h) * 100
            : 0;

    const vwapEst =
        currentAsset.high24h && currentAsset.low24h
            ? (currentAsset.high24h +
                  currentAsset.low24h +
                  currentAsset.price) /
              3
            : currentAsset.price;

    const distToHigh = currentAsset.high24h
        ? ((currentAsset.high24h - currentAsset.price) / currentAsset.price) *
          100
        : 0;
    const distToLow = currentAsset.low24h
        ? ((currentAsset.price - currentAsset.low24h) / currentAsset.low24h) *
          100
        : 0;

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const systemContext = `Bạn là Giám đốc Đầu tư (CIO) AI. Hãy phân tích chuyên sâu đồng ${baseSymbol} dựa trên các số liệu 24h và tin tức sau đây. Trả về đúng 3 mục (bằng Markdown, tiếng Việt, cực kì cô đọng chuyên nghiệp):
1. **Macro & Dòng tiền:** (Đánh giá volume, biến động ${spreadPct.toFixed(1)}%, vị thế giá so với VWAP).
2. **Tổng hợp Tin tức:** (Ảnh hưởng của top news).
3. **Dự phóng Kỹ thuật:** (Support/Resistance gần nhất dựa trên 24h Low/High).

DỮ LIỆU THỊ TRƯỜNG THỰC TẾ TRONG 24H QUA:
Giá: $${currentAsset.price}
VWAP (Ước tính): $${vwapEst.toFixed(4)}
Đỉnh 24H: $${currentAsset.high24h} | Đáy 24H: $${currentAsset.low24h}
Tin tức nổi bật: ${news.map((n) => n.title).join("; ")}
`;

            const report = await aiProviderService.chat(
                activeProviderId,
                activeProvider?.apiKey ?? "",
                activeProvider?.baseUrl,
                selectedModel,
                [{ role: "user", content: systemContext }],
            );
            setAiReport(report);
        } catch (err: any) {
            setError(err.message || t("summaryPanel.reportError"));
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto thin-scrollbar bg-main pb-10">
            {/* ── Metric Header ── */}
            <div className="px-4 py-3 bg-secondary/30 border-b border-main flex justify-between items-end">
                <div>
                    <div className="text-[10px] text-muted font-semibold uppercase tracking-wider mb-0.5">
                        {t("summaryPanel.baseAsset")}
                    </div>
                    <div className="text-[16px] font-bold text-main">
                        {baseSymbol}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-muted font-semibold uppercase tracking-wider mb-0.5">
                        {t("summaryPanel.change24h")}
                    </div>
                    <div
                        className={cn(
                            "text-[14px] font-mono font-bold flex items-center gap-1",
                            isBullish ? "text-emerald-500" : "text-rose-500",
                        )}
                    >
                        {isBullish ? (
                            <TrendingUp size={12} />
                        ) : (
                            <TrendingDown size={12} />
                        )}
                        {isBullish ? "+" : ""}
                        {currentAsset.changePercent.toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* ── Deep AI Report Module ── */}
            <div className="p-4 border-b border-main bg-main space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-bold text-main uppercase">
                            {t("summaryPanel.aiExecutiveReport")}
                        </span>
                    </div>
                    {!aiReport && (
                        <button
                            onClick={handleGenerateReport}
                            disabled={isGenerating}
                            className="px-2 py-1 bg-accent/10 hover:bg-accent/20 text-accent text-[9px] font-bold uppercase rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                            {t("summaryPanel.generate")}
                            {isGenerating ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : null}
                        </button>
                    )}
                </div>

                {error && (
                    <div className="text-rose-500 text-[10px] bg-rose-500/10 p-2 rounded">
                        {error}
                    </div>
                )}

                {aiReport && (
                    <div className="prose prose-invert prose-p:my-1 prose-ul:my-0.5 prose-li:my-0 prose-sm text-[11px] leading-relaxed max-w-none marker:text-accent bg-secondary/20 p-3 rounded border border-main">
                        <ReactMarkdown>{aiReport}</ReactMarkdown>
                    </div>
                )}
                {!aiReport && !isGenerating && !error && (
                    <div className="text-[10.5px] text-muted italic leading-relaxed">
                        {t("summaryPanel.noReportHint")}
                    </div>
                )}
            </div>

            {/* ── Actionable Sentiment ── */}
            <div className="p-4 border-b border-main">
                <div className="flex items-center space-x-1.5 mb-2.5">
                    <span className="text-[11px] font-bold text-main uppercase">
                        {t("summaryPanel.intradayMomentumBias")}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <div className="flex justify-between text-[10px] mb-1.5 font-mono">
                            <span className="text-rose-500">
                                {t("summaryPanel.bear")}
                            </span>
                            <span className="text-emerald-500">
                                {t("summaryPanel.bull")}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-main rounded-full overflow-hidden flex">
                            {currentAsset?.low24h &&
                            currentAsset?.high24h &&
                            currentAsset.high24h > currentAsset.low24h ? (
                                (() => {
                                    const bullPct = Math.min(
                                        100,
                                        Math.max(
                                            0,
                                            ((currentAsset.price -
                                                currentAsset.low24h) /
                                                range) *
                                                100,
                                        ),
                                    );
                                    const bearPct = 100 - bullPct;
                                    return (
                                        <>
                                            <div
                                                className="h-full bg-rose-500 transition-all duration-1000"
                                                style={{ width: `${bearPct}%` }}
                                            />
                                            <div
                                                className="h-full bg-emerald-500 transition-all duration-1000"
                                                style={{ width: `${bullPct}%` }}
                                            />
                                        </>
                                    );
                                })()
                            ) : (
                                <div className="h-full bg-accent/50 w-full" />
                            )}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        {currentAsset?.low24h &&
                        currentAsset?.high24h &&
                        currentAsset.high24h > currentAsset.low24h ? (
                            (() => {
                                const bullPct = Math.min(
                                    100,
                                    Math.max(
                                        0,
                                        ((currentAsset.price -
                                            currentAsset.low24h) /
                                            range) *
                                            100,
                                    ),
                                );
                                const isBull = bullPct >= 50;
                                return (
                                    <>
                                        <div
                                            className={cn(
                                                "text-[16px] font-mono font-bold leading-none",
                                                isBull
                                                    ? "text-emerald-500"
                                                    : "text-rose-500",
                                            )}
                                        >
                                            {bullPct.toFixed(0)}%
                                        </div>
                                        <div className="text-[9px] text-muted uppercase mt-0.5">
                                            {t("summaryPanel.strength")}
                                        </div>
                                    </>
                                );
                            })()
                        ) : (
                            <>
                                <div className="text-[16px] font-mono font-bold leading-none text-muted">
                                    50%
                                </div>
                                <div className="text-[9px] text-muted uppercase mt-0.5">
                                    {t("summaryPanel.neutral")}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Real Technical Tabular ── */}
            <div className="flex flex-col">
                <div className="px-4 py-2 bg-secondary/20 border-b border-main flex items-center space-x-1.5">
                    <span className="text-[11px] font-bold text-main uppercase">
                        {t("summaryPanel.exactPriceMetrics")}
                    </span>
                </div>

                <div className="border-b border-main text-[11px]">
                    {[
                        {
                            ind: t("summaryPanel.estVwap"),
                            val: `$${vwapEst.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`,
                            sig:
                                currentAsset.price > vwapEst
                                    ? t("summaryPanel.bullish")
                                    : t("summaryPanel.bearish"),
                        },
                        {
                            ind: t("summaryPanel.volatilitySpread"),
                            val: `${spreadPct.toFixed(2)}%`,
                            sig:
                                spreadPct > 5
                                    ? t("summaryPanel.high")
                                    : spreadPct > 2
                                      ? t("summaryPanel.normal")
                                      : t("summaryPanel.low"),
                        },
                        {
                            ind: t("summaryPanel.distToHigh"),
                            val: `-${distToHigh.toFixed(2)}%`,
                            sig:
                                distToHigh < 2
                                    ? t("summaryPanel.nearTop")
                                    : t("summaryPanel.midLow"),
                        },
                        {
                            ind: t("summaryPanel.distToLow"),
                            val: `+${distToLow.toFixed(2)}%`,
                            sig:
                                distToLow < 2
                                    ? t("summaryPanel.nearBottom")
                                    : t("summaryPanel.midHigh"),
                        },
                    ].map((row, i, arr) => (
                        <div
                            key={i}
                            className={cn(
                                "flex px-4 py-2 hover:bg-secondary/20 transition-colors",
                                i < arr.length - 1 && "border-b border-main",
                            )}
                        >
                            <div className="w-[105px] text-muted">
                                {row.ind}
                            </div>
                            <div className="w-[85px] font-mono text-main">
                                {row.val}
                            </div>
                            <div
                                className={cn(
                                    "flex-1 text-right font-medium",
                                    [
                                        t("summaryPanel.bullish"),
                                        t("summaryPanel.nearBottom"),
                                    ].includes(row.sig)
                                        ? "text-emerald-500"
                                        : [
                                              t("summaryPanel.bearish"),
                                              t("summaryPanel.nearTop"),
                                          ].includes(row.sig)
                                          ? "text-rose-500"
                                          : "text-amber-500",
                                )}
                            >
                                {row.sig}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Vol & Price Action ── */}
            <div className="flex flex-col mb-6">
                <div className="px-4 py-2 bg-secondary/20 border-b border-main flex items-center space-x-1.5">
                    <span className="text-[11px] font-bold text-main uppercase">
                        {t("summaryPanel.volumeLiquidity")}
                    </span>
                </div>

                <div className="grid grid-cols-2 border-b border-main">
                    <div className="p-3 bg-main border-r border-b border-main">
                        <div className="text-[9px] text-muted uppercase tracking-wider mb-1">
                            24h High
                        </div>
                        <div className="text-[12px] font-mono text-emerald-500 font-medium truncate">
                            $
                            {currentAsset.high24h?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 6,
                            })}
                        </div>
                    </div>
                    <div className="p-3 bg-main border-b border-main">
                        <div className="text-[9px] text-muted uppercase tracking-wider mb-1">
                            24h Low
                        </div>
                        <div className="text-[12px] font-mono text-rose-500 font-medium truncate">
                            $
                            {currentAsset.low24h?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 6,
                            })}
                        </div>
                    </div>
                    <div className="p-3 bg-main overflow-hidden border-r border-main">
                        <div className="text-[9px] text-muted uppercase tracking-wider mb-1">
                            Vol ({baseSymbol})
                        </div>
                        <div className="text-[12px] font-mono text-main truncate">
                            {currentAsset.baseVolume
                                ? currentAsset.baseVolume >= 1000
                                    ? `${(currentAsset.baseVolume / 1000).toFixed(2)}K`
                                    : currentAsset.baseVolume.toFixed(2)
                                : "-"}
                        </div>
                    </div>
                    <div className="p-3 bg-main overflow-hidden">
                        <div className="text-[9px] text-muted uppercase tracking-wider mb-1">
                            Vol (USDT)
                        </div>
                        <div className="text-[12px] font-mono text-main truncate">
                            {currentAsset.quoteVolumeRaw
                                ? currentAsset.quoteVolumeRaw >= 1_000_000_000
                                    ? `$${(currentAsset.quoteVolumeRaw / 1_000_000_000).toFixed(2)}B`
                                    : `$${(currentAsset.quoteVolumeRaw / 1_000_000).toFixed(1)}M`
                                : "-"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
