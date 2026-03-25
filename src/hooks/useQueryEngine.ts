"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useAppSettings } from "../context/AppSettingsContext";
import type { QueryMode, QuerySpec } from "../lib/queryEngine/types";

export type QueryEngineUIResult =
    | {
          kind: "cross_chain";
          result: unknown;
      }
    | {
          kind: "security";
          result: unknown;
      }
    | {
          kind: "wallet";
          result: unknown;
      };

type NlqResponse = {
    spec: QuerySpec;
    fallback?: boolean;
    warning?: string;
};

type SearchResponse = {
    result: unknown;
};

export function useQueryEngine() {
    const { activeProviderId, selectedModel } = useAppSettings();

    const [mode, setMode] = useState<QueryMode>("simple");
    const [text, setText] = useState("");

    const [spec, setSpec] = useState<QuerySpec | null>(null);
    const [result, setResult] = useState<QueryEngineUIResult | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);

    const abortRef = useRef<AbortController | null>(null);

    const canRun = useMemo(() => text.trim().length > 0 && !isLoading, [text, isLoading]);

    const run = useCallback(async () => {
        if (!canRun) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);
        setError(null);
        setWarning(null);
        setResult(null);
        setSpec(null);

        try {
            const nlqRes = await fetch("/api/query/nlq", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text,
                    mode,
                    provider: activeProviderId === "openrouter" || activeProviderId === "groq" || activeProviderId === "huggingface"
                        ? (activeProviderId as "openrouter" | "groq" | "huggingface")
                        : "openrouter",
                    model: selectedModel,
                }),
                signal: controller.signal,
            });

            if (!nlqRes.ok) {
                const details = await nlqRes.text().catch(() => "");
                throw new Error(`NLQ failed (${nlqRes.status}): ${details || "empty body"}`);
            }

            const nlqJson = (await nlqRes.json()) as NlqResponse;
            setSpec(nlqJson.spec);
            if (nlqJson.warning) setWarning(nlqJson.warning);

            const searchRes = await fetch("/api/query/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ spec: nlqJson.spec }),
                signal: controller.signal,
            });

            if (!searchRes.ok) {
                const details = await searchRes.text().catch(() => "");
                throw new Error(`Search failed (${searchRes.status}): ${details || "empty body"}`);
            }

            const searchJson = (await searchRes.json()) as SearchResponse;

            const kind: QueryEngineUIResult["kind"] =
                mode === "security" ? "security" : mode === "wallet" ? "wallet" : "cross_chain";

            setResult({ kind, result: searchJson.result });
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") return;
            setError(err instanceof Error ? err.message : "Query failed");
        } finally {
            if (!controller.signal.aborted) setIsLoading(false);
        }
    }, [activeProviderId, canRun, mode, selectedModel, text]);

    return {
        mode,
        setMode,
        text,
        setText,
        spec,
        result,
        isLoading,
        error,
        warning,
        run,
    };
}

