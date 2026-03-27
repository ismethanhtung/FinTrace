import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../services/queryEngineService", () => ({
    executeQueryV1: vi.fn(),
}));
vi.mock("../../../../services/securityAuditService", () => ({
    scanTokenSecurityV1: vi.fn(),
}));
vi.mock("../../../../services/walletTrackingService", () => ({
    trackWalletV1: vi.fn(),
}));

import { executeQueryV1 } from "../../../../services/queryEngineService";
import { scanTokenSecurityV1 } from "../../../../services/securityAuditService";
import { trackWalletV1 } from "../../../../services/walletTrackingService";

describe("POST /api/query/search", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("returns 400 for invalid json", async () => {
        const { POST } = await import("./route");
        const req = new Request("http://localhost/api/query/search", {
            method: "POST",
            body: "not-json",
            headers: { "Content-Type": "application/json" },
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it("dispatches simple/filtering mode to query engine", async () => {
        vi.mocked(executeQueryV1).mockResolvedValue({
            mode: "simple",
            intent: "tokenAddress",
            matches: [],
            filteredCount: 0,
            totalCandidateCount: 0,
            appliedFilters: [],
            warnings: [],
        } as any);
        const { POST } = await import("./route");
        const req = new Request("http://localhost/api/query/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                spec: {
                    mode: "simple",
                    intent: "tokenAddress",
                    tokenAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                },
            }),
        });
        const res = await POST(req);
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.result.mode).toBe("simple");
    });

    it("handles security and wallet mode contracts", async () => {
        vi.mocked(scanTokenSecurityV1).mockResolvedValue({ safe: true } as any);
        vi.mocked(trackWalletV1).mockResolvedValue({ wallet: "ok" } as any);
        const { POST } = await import("./route");

        const securityReq = new Request("http://localhost/api/query/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                spec: {
                    mode: "security",
                    intent: "tokenAddress",
                    tokenAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                },
            }),
        });
        const secRes = await POST(securityReq);
        expect(secRes.status).toBe(200);

        const walletReq = new Request("http://localhost/api/query/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                spec: {
                    mode: "wallet",
                    intent: "walletAddress",
                    walletAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                },
            }),
        });
        const walRes = await POST(walletReq);
        expect(walRes.status).toBe(200);
    });
});
