"use client";

import { FormEvent, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { signOut } from "next-auth/react";
import { useI18n } from "../../context/I18nContext";

export function TwoFactorLoginGate() {
    const { t } = useI18n();
    const [code, setCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;
        setError(null);
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/auth/2fa/verify-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const json = (await response.json().catch(() => ({}))) as {
                error?: string;
            };
            if (!response.ok) {
                throw new Error(
                    json.error || t("settingsPage.twoFactorInvalidCode"),
                );
            }
            window.location.reload();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : t("settingsPage.twoFactorInvalidCode"),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-main text-main flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-main bg-secondary/40 p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-accent" />
                    <h1 className="text-[16px] font-semibold">
                        {t("settingsPage.twoStepVerification")}
                    </h1>
                </div>
                <p className="text-[12px] text-muted leading-relaxed">
                    {t("settingsPage.twoFactorGateDescription")}
                </p>
                <form onSubmit={submit} className="space-y-3">
                    <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        inputMode="numeric"
                        maxLength={6}
                        placeholder={t("settingsPage.twoFactorCodePlaceholder")}
                        className="w-full bg-main border border-main rounded-lg py-2.5 px-3 text-[14px] tracking-[0.24em] text-center font-semibold focus:outline-none focus:ring-1 focus:ring-accent/30"
                    />
                    {error ? <p className="text-[12px] text-rose-500">{error}</p> : null}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-lg bg-accent text-white py-2.5 text-[13px] font-semibold hover:bg-accent/90 disabled:opacity-60"
                    >
                        {isSubmitting
                            ? `${t("settingsPage.loading")}...`
                            : t("settingsPage.verifyAndContinue")}
                    </button>
                </form>
                <button
                    type="button"
                    onClick={() => void signOut({ callbackUrl: "/" })}
                    className="w-full rounded-lg border border-main py-2 text-[12px] text-muted hover:text-main hover:bg-main transition-colors"
                >
                    {t("settingsPage.signOut")}
                </button>
            </div>
        </div>
    );
}

