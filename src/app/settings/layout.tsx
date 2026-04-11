import { Suspense } from "react";

export default function SettingsRouteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center bg-main text-[13px] text-muted">
                    Loading…
                </div>
            }
        >
            {children}
        </Suspense>
    );
}
