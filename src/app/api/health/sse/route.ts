export const dynamic = "force-dynamic";

/**
 * Minimal SSE endpoint for /connection-test — verifies the app can stream
 * `text/event-stream` through Next.js in the current environment.
 */
export async function GET() {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            let seq = 0;
            const tick = () => {
                seq += 1;
                const payload = JSON.stringify({
                    seq,
                    at: new Date().toISOString(),
                });
                controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                if (seq >= 5) {
                    controller.close();
                    return;
                }
                setTimeout(tick, 250);
            };
            tick();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
