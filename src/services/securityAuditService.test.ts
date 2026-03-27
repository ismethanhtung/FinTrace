import { describe, expect, it, vi } from "vitest";

import { scanTokenSecurityV1 } from "./securityAuditService";

describe("securityAuditService", () => {
    it("returns not_configured when provider config is missing", async () => {
        delete process.env.SECURITY_AUDIT_PROVIDER_URL;
        delete process.env.SECURITY_AUDIT_API_KEY;
        const out = await scanTokenSecurityV1({
            tokenAddress: " 0xabc ",
        });
        expect(out.status).toBe("not_configured");
        expect(out.tokenAddress).toBe("0xabc");
    });

    it("maps successful provider response", async () => {
        process.env.SECURITY_AUDIT_PROVIDER_URL =
            "https://provider/security/{tokenAddress}";
        process.env.SECURITY_AUDIT_API_KEY = "key";
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    message: "done",
                    findings: [{ label: "honeypot", severity: "high", value: "yes" }],
                }),
                { status: 200 },
            ),
        ) as typeof global.fetch;

        const out = await scanTokenSecurityV1({
            tokenAddress: "0xtoken",
        });
        expect(out.status).toBe("scanned");
        expect(out.findings?.[0].severity).toBe("high");
        global.fetch = originalFetch;
    });

    it("returns error status when provider returns non-2xx", async () => {
        process.env.SECURITY_AUDIT_PROVIDER_URL =
            "https://provider/security/:tokenAddress";
        process.env.SECURITY_AUDIT_API_KEY = "key";
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () => new Response("bad", { status: 500 })) as typeof global.fetch;

        const out = await scanTokenSecurityV1({
            tokenAddress: "0xtoken",
        });
        expect(out.status).toBe("error");
        expect(out.message).toContain("500");
        global.fetch = originalFetch;
    });
});
