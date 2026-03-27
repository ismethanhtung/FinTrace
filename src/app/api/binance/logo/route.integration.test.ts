import { describe, expect, it, vi } from "vitest";

describe("GET /api/binance/logo", () => {
    it("returns 400 for invalid source URL", async () => {
        const { GET } = await import("./route");
        const req = {
            nextUrl: new URL("http://localhost/api/binance/logo?url=http://evil.com/a.png"),
        } as any;
        const res = await GET(req);
        expect(res.status).toBe(400);
    });

    it("proxies allowed logo URL", async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn(async () => {
            const headers = new Headers();
            headers.set("content-type", "image/png");
            return new Response(new Uint8Array([1, 2, 3]).buffer, {
                status: 200,
                headers,
            });
        }) as typeof global.fetch;

        const { GET } = await import("./route");
        const req = {
            nextUrl: new URL(
                "http://localhost/api/binance/logo?url=https://bin.bnbstatic.com/image/admin_mgs_image_upload/a.png",
            ),
        } as any;
        const res = await GET(req);
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("image/png");
        global.fetch = originalFetch;
    });
});
