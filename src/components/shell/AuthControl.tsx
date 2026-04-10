"use client";

import { LogIn, LogOut } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useI18n } from "../../context/I18nContext";
import { cn } from "../../lib/utils";

export function AuthControl() {
    const { status, data } = useSession();
    const { t } = useI18n();

    if (status === "loading") {
        return (
            <button
                type="button"
                disabled
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-main text-[11px] text-muted opacity-70"
            >
                <span className="w-2 h-2 rounded-full bg-muted/60 animate-pulse" />
                {t("auth.loading")}
            </button>
        );
    }

    if (status !== "authenticated") {
        return (
            <button
                type="button"
                onClick={() => signIn("google")}
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-colors",
                    "border-accent/40 bg-accent/10 text-main hover:bg-accent/20",
                )}
            >
                <LogIn size={12} />
                {t("auth.signIn")}
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-colors",
                "border-main text-muted hover:text-main hover:bg-secondary",
            )}
            title={data.user?.email || undefined}
        >
            <LogOut size={12} />
            {t("auth.signOut")}
        </button>
    );
}
