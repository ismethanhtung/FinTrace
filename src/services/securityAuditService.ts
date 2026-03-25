export type SecurityScanResult = {
    tokenAddress: string;
    status: "not_configured" | "scanned" | "error";
    message: string;
    findings?: Array<{ label: string; severity: "low" | "medium" | "high"; value?: string }>;
};

function buildProviderUrl(args: { providerUrl: string; tokenAddress: string }): string {
    const { providerUrl, tokenAddress } = args;
    // Support a few common placeholders.
    return providerUrl
        .replaceAll("{tokenAddress}", tokenAddress)
        .replaceAll("{{tokenAddress}}", tokenAddress)
        .replaceAll(":tokenAddress", tokenAddress);
}

/**
 * Security audit adapter (v1).
 *
 * v1 requires provider configuration (API key / endpoint).
 * If not configured, return a user-facing message rather than throwing.
 */
export async function scanTokenSecurityV1(args: {
    tokenAddress: string;
}): Promise<SecurityScanResult> {
    const tokenAddress = args.tokenAddress.trim();

    // Intentionally minimal: security providers typically require API keys.
    const providerUrl = process.env.SECURITY_AUDIT_PROVIDER_URL;
    const apiKey = process.env.SECURITY_AUDIT_API_KEY;

    if (!providerUrl || !apiKey) {
        return {
            tokenAddress,
            status: "not_configured",
            message:
                "Security audit (honeypot/liquidity/dev-hold scans) chưa được cấu hình provider ở server. Vui lòng thiết lập `SECURITY_AUDIT_API_KEY` và `SECURITY_AUDIT_PROVIDER_URL` trong `.env.local`.",
        };
    }

    const url = buildProviderUrl({ providerUrl, tokenAddress });

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12_000);
        try {
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    // Common auth patterns (provider-specific):
                    Authorization: `Bearer ${apiKey}`,
                    "x-api-key": apiKey,
                },
                signal: controller.signal,
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                return {
                    tokenAddress,
                    status: "error",
                    message: `Security audit provider error (${res.status}).`,
                    findings: text
                        ? [
                              { label: "raw", severity: "low", value: text.slice(0, 200) },
                          ]
                        : undefined,
                };
            }

            const data: unknown = await res.json().catch(() => null);

            // Best-effort mapping. Providers vary; we only map common shapes.
            const rec = (data && typeof data === "object" ? (data as Record<string, unknown>) : {}) as Record<string, unknown>;
            const message =
                typeof rec.message === "string"
                    ? rec.message
                    : typeof rec.statusMessage === "string"
                      ? rec.statusMessage
                      : "Security scan completed.";

            const findingsRaw = rec.findings ?? rec.scamReport ?? rec.result;
            const findingsArr = Array.isArray(findingsRaw) ? findingsRaw : [];

            const findings = findingsArr
                .map((f: unknown) => {
                    if (!f || typeof f !== "object") return null;
                    const fr = f as Record<string, unknown>;
                    const label = typeof fr.label === "string" ? fr.label : typeof fr.name === "string" ? fr.name : "finding";
                    const sevRaw = fr.severity;
                    const severity: "low" | "medium" | "high" =
                        sevRaw === "high"
                            ? "high"
                            : sevRaw === "medium"
                              ? "medium"
                              : sevRaw === "low"
                                ? "low"
                                : "low";
                    const value = typeof fr.value === "string" ? fr.value : undefined;
                    return { label, severity, value };
                })
                .filter((x): x is NonNullable<typeof x> => Boolean(x));

            return {
                tokenAddress,
                status: "scanned",
                message,
                findings: findings.length ? findings : undefined,
            };
        } finally {
            clearTimeout(timer);
        }
    } catch (err: unknown) {
        return {
            tokenAddress,
            status: "error",
            message: err instanceof Error ? err.message : "Security audit failed",
        };
    }
}

