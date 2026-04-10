type AuditLevel = "info" | "warn";

type AuditEvent = {
    action: string;
    userId?: string;
    providerId?: string;
    metadata?: Record<string, unknown>;
};

function sanitizeMetadata(metadata?: Record<string, unknown>) {
    if (!metadata) return undefined;
    const safe: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
        if (key.toLowerCase().includes("key") || key.toLowerCase().includes("secret")) {
            safe[key] = "[REDACTED]";
            continue;
        }
        safe[key] = value;
    }
    return safe;
}

export function auditLog(level: AuditLevel, event: AuditEvent): void {
    const payload = {
        ts: new Date().toISOString(),
        level,
        action: event.action,
        userId: event.userId,
        providerId: event.providerId,
        metadata: sanitizeMetadata(event.metadata),
    };
    if (level === "warn") {
        console.warn("[audit]", payload);
        return;
    }
    console.info("[audit]", payload);
}
