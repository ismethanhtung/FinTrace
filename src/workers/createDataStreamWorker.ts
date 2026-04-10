/**
 * Use `globalThis.Worker` so Turbopack does not apply TP1001 static analysis on
 * `new Worker(...)` (still resolves the module URL at runtime / build).
 */
export function createDataStreamWorker(): Worker {
    const WorkerCtor = globalThis.Worker;
    return new WorkerCtor(
        new URL("./dataStreamWorker.ts", import.meta.url),
        { type: "module" },
    );
}
