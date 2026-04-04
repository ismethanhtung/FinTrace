"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAIChat } from "../../hooks/useAIChat";
import { useMarket } from "../../context/MarketContext";
import { useAppSettings } from "../../context/AppSettingsContext";
import { useUniverse } from "../../context/UniverseContext";
import { useCoinNews } from "../../hooks/useCoinNews";
import { newsService } from "../../services/newsService";
import { aiProviderService, ModelInfo } from "../../services/aiProviderService";
import { getFallbackModelsForProvider } from "../../lib/aiModelDefaults";
import {
    Send,
    Bot,
    Trash2,
    Plus,
    History,
    ExternalLink,
    ChevronDown,
    Cpu,
    Zap,
} from "lucide-react";
import { cn } from "../../lib/utils";
import ReactMarkdown from "react-markdown";

// ─── Provider/Model Selector ──────────────────────────────────────────────────

interface ModelSelectorProps {
    providerId: string;
    providerName: string;
    model: string;
    models: ModelInfo[];
    isLoadingModels: boolean;
    providers: {
        id: string;
        name: string;
        hasKey: boolean;
        disabled: boolean;
    }[];
    onProviderChange: (id: string) => void;
    onModelChange: (model: string) => void;
}

const ModelSelector = ({
    providerId,
    providerName,
    model,
    models,
    isLoadingModels,
    providers,
    onProviderChange,
    onModelChange,
}: ModelSelectorProps) => {
    const [showProviderMenu, setShowProviderMenu] = useState(false);
    const [showModelMenu, setShowModelMenu] = useState(false);
    const providerRef = useRef<HTMLDivElement>(null);
    const modelRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                providerRef.current &&
                !providerRef.current.contains(e.target as Node)
            ) {
                setShowProviderMenu(false);
            }
            if (
                modelRef.current &&
                !modelRef.current.contains(e.target as Node)
            ) {
                setShowModelMenu(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const shortModel = model.includes("/")
        ? (model.split("/").pop() ?? model)
        : model;
    const displayModel =
        shortModel.length > 22 ? shortModel.slice(0, 20) + "…" : shortModel;

    return (
        <div className="flex items-center gap-1.5 min-w-0">
            {/* Provider selector */}
            <div ref={providerRef} className="relative flex-shrink-0">
                <button
                    onClick={() => {
                        setShowProviderMenu((v) => !v);
                        setShowModelMenu(false);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary border border-main hover:border-accent/40 transition-colors text-[10px] font-semibold text-main"
                    title="Select provider"
                >
                    <Zap size={9} className="text-accent" />
                    <span className="truncate max-w-[80px]">
                        {providerName}
                    </span>
                    <ChevronDown size={8} className="text-muted" />
                </button>
                {showProviderMenu && (
                    <div className="absolute bottom-full left-0 mb-1.5 z-50 min-w-[150px] bg-main border border-main rounded-xl shadow-xl overflow-hidden">
                        <div className="py-1">
                            {providers.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        if (p.disabled) return;
                                        onProviderChange(p.id);
                                        setShowProviderMenu(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 text-[11px] transition-colors",
                                        p.id === providerId
                                            ? "bg-accent/10 text-accent"
                                            : p.disabled
                                              ? "text-muted/60"
                                              : "text-main hover:bg-secondary",
                                    )}
                                    disabled={p.disabled}
                                >
                                    <div className="flex items-center gap-2">
                                        <Zap
                                            size={10}
                                            className={
                                                p.id === providerId
                                                    ? "text-accent"
                                                    : "text-muted"
                                            }
                                        />
                                        <span className="font-medium">
                                            {p.name}
                                        </span>
                                    </div>
                                    {!p.hasKey && (
                                        <span className="text-[9px] text-amber-500 font-mono">
                                            no key
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {/* Model selector */}
            <div ref={modelRef} className="relative flex-shrink flex-1 min-w-0">
                <button
                    onClick={() => {
                        setShowModelMenu((v) => !v);
                        setShowProviderMenu(false);
                    }}
                    disabled={isLoadingModels}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary border border-main hover:border-accent/40 transition-colors text-[10px] font-medium text-muted hover:text-main disabled:opacity-60 w-full min-w-0"
                    title="Select model"
                >
                    <Cpu size={9} />
                    <span
                        className="font-mono truncate"
                        style={{ maxWidth: "96px" }}
                        title={
                            isLoadingModels
                                ? "loading…"
                                : // Show full model on hover
                                  displayModel !== shortModel
                                  ? shortModel
                                  : undefined
                        }
                    >
                        {/* 
                            Linh hoạt hiển thị tên đầy đủ khi đủ chiều rộng,
                            chỉ rút gọn với "…" nếu không đủ
                         */}
                        {isLoadingModels ? (
                            "loading…"
                        ) : (
                            <span
                                style={{ display: "inline-block", minWidth: 0 }}
                            >
                                <span
                                    style={{
                                        display: "inline-block",
                                        minWidth: 0,
                                        maxWidth: "100%",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        verticalAlign: "bottom",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {shortModel}
                                </span>
                            </span>
                        )}
                    </span>
                    <ChevronDown size={8} />
                </button>
                {showModelMenu && models.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-1.5 z-50 w-[220px] bg-main border border-main rounded-xl shadow-xl overflow-hidden">
                        <div className="max-h-[200px] overflow-y-auto thin-scrollbar py-1">
                            {models.map((m) => {
                                const label = m.name ?? m.id;
                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => {
                                            onModelChange(m.id);
                                            setShowModelMenu(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-[11px] transition-colors truncate",
                                            m.id === model
                                                ? "bg-accent/10 text-accent font-medium"
                                                : "text-main hover:bg-secondary",
                                        )}
                                        title={m.id}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── ChatPanel ────────────────────────────────────────────────────────────────

export const ChatPanel = () => {
    const { selectedSymbol, assets } = useMarket();
    const { universe } = useUniverse();
    const {
        aiProviders,
        activeProviderId,
        setActiveProviderId,
        activeProvider,
        availableProviders,
        serverKeyStatus,
        selectedModel,
        setSelectedModel,
        systemPrompt,
    } = useAppSettings();

    const { news } = useCoinNews({ symbol: selectedSymbol });

    // Models for the currently active provider
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    useEffect(() => {
        if (!activeProvider) return;
        setIsLoadingModels(true);
        setModels([]);

        aiProviderService
            .getModels(
                activeProvider.id,
                activeProvider.apiKey,
                activeProvider.baseUrl,
            )
            .then((list) => {
                const effective =
                    list.length > 0
                        ? list
                        : getFallbackModelsForProvider(activeProvider.id);
                setModels(effective);
                if (
                    effective.length > 0 &&
                    !effective.find((m) => m.id === selectedModel)
                ) {
                    setSelectedModel(effective[0].id, activeProvider.id);
                }
            })
            .catch((err) => {
                console.warn(
                    "[ChatPanel] Failed to load models, using fallback:",
                    err,
                );
                // Use fallback models so UI still works even when API fails
                const fallback = getFallbackModelsForProvider(
                    activeProvider.id,
                );
                setModels(fallback);
                if (
                    fallback.length > 0 &&
                    !fallback.find((m) => m.id === selectedModel)
                ) {
                    setSelectedModel(fallback[0].id, activeProvider.id);
                }
            })
            .finally(() => setIsLoadingModels(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeProvider?.id, activeProvider?.apiKey]);

    const handleProviderChange = useCallback(
        (id: string) => {
            setActiveProviderId(id);
        },
        [setActiveProviderId],
    );

    const currentAsset = assets.find((a) => a.id === selectedSymbol);
    const contextSummary = currentAsset
        ? `Symbol: ${selectedSymbol}
Price: $${currentAsset.price.toLocaleString()}
24h Change: ${currentAsset.changePercent.toFixed(2)}%
24h High: $${currentAsset.high24h?.toLocaleString()}
24h Low: $${currentAsset.low24h?.toLocaleString()}
Volume (Base): ${currentAsset.baseVolume}
CRITICAL INSTRUCTION: You MUST heavily base your analysis on the following recent news headlines AND their summaries. Evaluate if these news items are bullish or bearish, and synthesize that with the technical data above.
If you mention a specific news article, you MUST cite it using markdown links formatted exactly like this: [Read Article](URL) so the user can click it.

NEWS DATA:
${
    news.length > 0
        ? news
              .slice(0, 10)
              .map(
                  (n) =>
                      `- TITLE: ${n.title}\n  SUMMARY: ${n.description || "No summary available."}\n  URL: ${n.url}`,
              )
              .join("\n\n")
        : "No recent news available."
}`
        : `No market data available for ${selectedSymbol}`;

    const resolveDynamicContext = useCallback(
        async (userText: string) => {
            const mentioned = assets.filter((a) => {
                if (a.id === selectedSymbol) return false;
                const base = a.id.replace("USDT", "");
                const regex = new RegExp(`\\b${base}\\b`, "i");
                let isMatch = regex.test(userText);
                if (!isMatch && base === "BTC")
                    isMatch = /bitcoin/i.test(userText);
                if (!isMatch && base === "ETH")
                    isMatch = /ethereum/i.test(userText);
                if (!isMatch && base === "SOL")
                    isMatch = /solana/i.test(userText);
                if (!isMatch && base === "XRP")
                    isMatch = /ripple/i.test(userText);
                if (!isMatch && base === "DOGE")
                    isMatch = /dogecoin/i.test(userText);
                return isMatch;
            });

            if (mentioned.length === 0) return null;

            const targets = mentioned.slice(0, 2);
            const parts = [];
            for (const asset of targets) {
                try {
                    const n = await newsService.getNews(
                        asset.id,
                        undefined,
                        5,
                        universe,
                    );
                    const newsText = n
                        .map(
                            (x) =>
                                `- [${x.title}](${x.url}): ${x.description || ""}`,
                        )
                        .join("\n");
                    parts.push(
                        `=== MENTIONED ASSET: ${asset.id} ===\nPrice: $${asset.price.toLocaleString()} | 24h Change: ${asset.changePercent.toFixed(2)}%\nNews Headlines:\n${newsText || "No recent news."}`,
                    );
                } catch (err) {}
            }
            return parts.join("\n\n");
        },
        [assets, selectedSymbol, universe],
    );

    const {
        sessions,
        activeSession,
        activeSessionId,
        setActiveSessionId,
        createSession,
        deleteSession,
        sendMessage,
        isStreaming,
        stopStreaming,
    } = useAIChat({
        providerId: activeProviderId,
        apiKey: activeProvider?.apiKey ?? "",
        baseUrl: activeProvider?.baseUrl ?? "",
        model: selectedModel,
        systemPromptTemplate: systemPrompt,
        symbol: selectedSymbol,
        contextSummary,
        resolveDynamicContext,
    });

    const [input, setInput] = useState("");
    const [showHistory, setShowHistory] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const canChat = Boolean(
        activeProvider &&
        activeProvider.enabled &&
        availableProviders.some((p) => p.id === activeProviderId),
    );

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeSession?.messages, isStreaming]);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isStreaming) return;
        if (!canChat) return;
        sendMessage(input);
        setInput("");
    };

    // Provider list for selector (only enabled ones)
    const providerOptions = aiProviders
        .filter((p) => p.enabled)
        .map((p) => ({
            id: p.id,
            name: p.name,
            hasKey: Boolean(p.apiKey?.trim()) || Boolean(serverKeyStatus[p.id]),
            disabled:
                !Boolean(p.apiKey?.trim()) && !Boolean(serverKeyStatus[p.id]),
        }));

    return (
        <div className="h-full flex flex-col relative bg-main">
            {/* ── Chat Header bar ── */}
            <div className="px-5 py-2 flex items-center justify-between shrink-0 bg-secondary/30">
                <div className="flex items-center space-x-2 text-muted">
                    <span className="text-[10px] font-semibold tracking-wider text-main truncate max-w-[150px]"></span>
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => createSession(selectedSymbol)}
                        className="p-1.5 rounded-md text-muted hover:text-main hover:bg-secondary transition-colors"
                        title="New Chat"
                    >
                        <Plus size={14} />
                    </button>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={cn(
                            "p-1.5 rounded-md transition-colors",
                            showHistory
                                ? "text-accent bg-accent/10"
                                : "text-muted hover:text-main hover:bg-secondary",
                        )}
                        title="Chat History"
                    >
                        <History size={14} />
                    </button>
                </div>
            </div>

            <div className="relative flex-1 min-h-0">
                {/* ── Session History Sidebar Overlay ── */}
                {showHistory && (
                    <div className="absolute inset-0 z-20 bg-main border-y border-main">
                        <div className="h-full overflow-y-auto thin-scrollbar p-3 space-y-1">
                            {sessions.length === 0 ? (
                                <div className="text-[11px] text-muted text-center py-6">
                                    No previous chats.
                                </div>
                            ) : (
                                sessions
                                    .slice()
                                    .reverse()
                                    .map((session) => (
                                        <div
                                            key={session.id}
                                            className={cn(
                                                "flex items-center justify-between p-2 rounded-md border transition-all cursor-pointer",
                                                activeSessionId === session.id
                                                    ? "bg-accent/10 border-accent/50"
                                                    : "bg-main/40 border-transparent hover:bg-secondary/80 hover:border-main",
                                            )}
                                            onClick={() => {
                                                setActiveSessionId(session.id);
                                                setShowHistory(false);
                                            }}
                                        >
                                            <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                                                <div className="truncate text-[12px] font-medium text-main">
                                                    {session.title}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteSession(session.id);
                                                }}
                                                className="text-muted hover:text-rose-500 transition-all p-1 rounded-md"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                )}

                {/* ── Message Area ── */}
                <div className="h-full overflow-y-auto thin-scrollbar p-5 space-y-5">
                    {!activeSession || activeSession.messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-12 h-12 rounded-full border-2 border-dashed border-main flex items-center justify-center bg-secondary/30 text-accent">
                                <Bot size={20} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-[14px] font-bold">
                                    FinTrace AI Analyst
                                </h3>
                                <p className="text-[11px] text-muted max-w-[220px]">
                                    Ask me to predict trends, interpret volume,
                                    or summarize{" "}
                                    <strong className="text-main">
                                        {selectedSymbol.replace("USDT", "")}
                                    </strong>{" "}
                                    metrics.
                                </p>
                            </div>
                            <div className="pt-2 flex flex-col gap-1 w-[200px]">
                                {[
                                    "Is it overbought?",
                                    "Support/Resistance levels?",
                                    "Explain recent volume",
                                ].map((chip, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setInput(chip)}
                                        className="text-[10px] font-mono py-1.5 px-3 rounded border border-main bg-secondary/30 hover:bg-main hover:border-accent/40 transition-colors text-muted hover:text-main text-left"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        activeSession.messages.map((msg, i) => (
                            <div
                                key={msg.id || i}
                                className={cn(
                                    "flex flex-col space-y-1.5 max-w-[95%]",
                                    msg.role === "user"
                                        ? "ml-auto items-end"
                                        : "mr-auto",
                                )}
                            >
                                <div
                                    className={cn(
                                        "px-3 py-2 rounded-2xl text-[12.5px] leading-relaxed break-words shadow-sm",
                                        msg.role === "user"
                                            ? "bg-accent text-white rounded-br-sm"
                                            : "bg-secondary border border-main rounded-bl-sm",
                                        msg.error
                                            ? "border-rose-500/50 text-rose-500 bg-rose-500/10"
                                            : "",
                                    )}
                                >
                                    {msg.role === "assistant" ? (
                                        <div className="prose prose-invert prose-p:my-1 prose-pre:bg-main/50 prose-pre:border prose-pre:border-main prose-sm max-w-none">
                                            <ReactMarkdown
                                                components={{
                                                    a: ({
                                                        node,
                                                        ...props
                                                    }) => (
                                                        <a
                                                            {...props}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-0.5 text-accent hover:text-accent/80 transition-colors underline underline-offset-4 decoration-accent/30 hover:decoration-accent/80 mx-1 font-medium"
                                                        >
                                                            <span>
                                                                {
                                                                    props.children
                                                                }
                                                            </span>
                                                            <ExternalLink
                                                                size={10}
                                                                className="shrink-0 ml-0.5"
                                                            />
                                                        </a>
                                                    ),
                                                }}
                                            >
                                                {msg.content ||
                                                    (msg.isStreaming
                                                        ? "Fetching coin data and cooking news..."
                                                        : "...")}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* ── Input Area ── */}
            <div className="p-2.5 border-t border-main bg-main shrink-0 space-y-1.5">
                {/* Provider + Model selector row */}
                <ModelSelector
                    providerId={activeProviderId}
                    providerName={activeProvider?.name ?? activeProviderId}
                    model={selectedModel}
                    models={models}
                    isLoadingModels={isLoadingModels}
                    providers={providerOptions}
                    onProviderChange={handleProviderChange}
                    onModelChange={setSelectedModel}
                />

                {/* Textarea + send button */}
                <form
                    onSubmit={handleSend}
                    className="relative flex items-center"
                >
                    <textarea
                        rows={Math.min(
                            4,
                            Math.max(1, input.split("\n").length),
                        )}
                        placeholder={
                            canChat
                                ? `Let's cook ${selectedSymbol.replace("USDT", "")}...`
                                : "AI is disabled — enable a provider in Settings"
                        }
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={!canChat}
                        className="w-full bg-secondary border border-main rounded-md py-1.5 pl-3.5 pr-10 text-[12px] text-main focus:outline-none focus:border-accent/50 resize-none thin-scrollbar leading-5 placeholder:text-muted"
                        style={{ minHeight: "36px" }}
                    />
                    {isStreaming ? (
                        <button
                            type="button"
                            onClick={stopStreaming}
                            className="absolute right-1.5 bottom-1.5 p-1 w-6 h-6 flex items-center justify-center bg-rose-500 text-white rounded-md hover:bg-rose-600 transition-colors"
                        >
                            <div className="w-2.5 h-2.5 bg-current rounded-sm animate-pulse" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={!input.trim() || !canChat}
                            className="absolute right-1.5 bottom-1.5 p-1 w-6 h-6 flex items-center justify-center bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 transition-colors"
                        >
                            <Send size={11} className="ml-0.5" />
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};
