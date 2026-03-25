"use client";

import { useEffect, useRef } from "react";

declare global {
    interface Window {
        GrafanaFaroWebSdk?: {
            initializeFaro: (cfg: any) => void;
            faro?: {
                instrumentations: {
                    add: (inst: any) => void;
                };
            };
        };
        GrafanaFaroWebTracing?: {
            TracingInstrumentation: new () => any;
        };
    }
}

const FARO_WEB_SDK_URL =
    "https://unpkg.com/@grafana/faro-web-sdk@2/dist/bundle/faro-web-sdk.iife.js";
const FARO_TRACING_URL =
    "https://unpkg.com/@grafana/faro-web-tracing@2/dist/bundle/faro-web-tracing.iife.js";

const FARO_COLLECT_URL =
    "https://faro-collector-prod-ap-southeast-1.grafana.net/collect/25ecb2b712d368268b35a633119e06e8";

export function FaroClient() {
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        // Avoid duplicate injection on HMR / strict-mode double effects.
        const existingSdk = document.getElementById("faro-web-sdk");
        const existingTracing = document.getElementById("faro-web-tracing");

        const initTracing = () => {
            try {
                const sdk = window.GrafanaFaroWebSdk;
                const tracing = window.GrafanaFaroWebTracing;
                if (!sdk?.faro?.instrumentations || !tracing?.TracingInstrumentation)
                    return;

                const instrumentation = new tracing.TracingInstrumentation();
                sdk.faro.instrumentations.add(instrumentation);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error("[Faro] Failed to add tracing instrumentation", e);
            }
        };

        const initFaro = () => {
            try {
                window.GrafanaFaroWebSdk?.initializeFaro({
                    url: FARO_COLLECT_URL,
                    app: {
                        name: "fin thanhtung",
                        version: "1.0.0",
                        environment: "production",
                    },
                });

                if (existingTracing) {
                    initTracing();
                    return;
                }

                const webTracingScript = document.createElement("script");
                webTracingScript.id = "faro-web-tracing";
                webTracingScript.src = FARO_TRACING_URL;
                webTracingScript.async = true;
                webTracingScript.onload = () => initTracing();
                document.head.appendChild(webTracingScript);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error("[Faro] initializeFaro failed", e);
            }
        };

        if (existingSdk) {
            initFaro();
            return;
        }

        const webSdkScript = document.createElement("script");
        webSdkScript.id = "faro-web-sdk";
        webSdkScript.src = FARO_WEB_SDK_URL;
        webSdkScript.async = true;
        webSdkScript.onload = () => initFaro();
        document.head.appendChild(webSdkScript);
    }, []);

    return null;
}

