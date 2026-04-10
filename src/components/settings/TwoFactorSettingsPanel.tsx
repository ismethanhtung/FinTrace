"use client";

import { FormEvent, useEffect, useState } from "react";
import { ShieldCheck, Smartphone } from "lucide-react";
import { useI18n } from "../../context/I18nContext";
import { cn } from "../../lib/utils";

type TwoFactorStatus = {
    enabled: boolean;
    enabledAt: string | null;
};

type SetupPayload = {
    manualKey: string;
    qrCodeDataUrl: string;
    expiresAt: string;
};

export function TwoFactorSettingsPanel() {
    const { t } = useI18n();
    const [status, setStatus] = useState<TwoFactorStatus>({
        enabled: false,
        enabledAt: null,
    });
    const [setup, setSetup] = useState<SetupPayload | null>(null);
    const [code, setCode] = useState("");
    const [disableCode, setDisableCode] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const refreshStatus = async () => {
        const response = await fetch("/api/auth/2fa", { cache: "no-store" });
        const json = (await response.json()) as TwoFactorStatus & { error?: string };
        if (!response.ok) {
            throw new Error(json.error || "Failed to load 2FA status");
        }
        setStatus({
            enabled: Boolean(json.enabled),
            enabledAt: json.enabledAt ?? null,
        });
    };

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        refreshStatus()
            .catch(() => {
                if (!active) return;
                setError(t("settingsPage.twoFactorLoadFailed"));
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });
        return () => {
            active = false;
        };
    }, [t]);

    const startSetup = async () => {
        setError(null);
        setMessage(null);
        setIsBusy(true);
        try {
            const response = await fetch("/api/auth/2fa/setup", { method: "POST" });
            const json = (await response.json()) as SetupPayload & { error?: string };
            if (!response.ok) {
                throw new Error(json.error || t("settingsPage.twoFactorSetupFailed"));
            }
            setSetup({
                manualKey: json.manualKey,
                qrCodeDataUrl: json.qrCodeDataUrl,
                expiresAt: json.expiresAt,
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : t("settingsPage.twoFactorSetupFailed"),
            );
        } finally {
            setIsBusy(false);
        }
    };

    const confirmEnable = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        setIsBusy(true);
        try {
            const response = await fetch("/api/auth/2fa/enable", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const json = (await response.json().catch(() => ({}))) as { error?: string };
            if (!response.ok) {
                throw new Error(json.error || t("settingsPage.twoFactorEnableFailed"));
            }
            setSetup(null);
            setCode("");
            await refreshStatus();
            setMessage(t("settingsPage.twoFactorEnabledSuccess"));
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : t("settingsPage.twoFactorEnableFailed"),
            );
        } finally {
            setIsBusy(false);
        }
    };

    const disable = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        setIsBusy(true);
        try {
            const response = await fetch("/api/auth/2fa/disable", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: disableCode }),
            });
            const json = (await response.json().catch(() => ({}))) as { error?: string };
            if (!response.ok) {
                throw new Error(json.error || t("settingsPage.twoFactorDisableFailed"));
            }
            setDisableCode("");
            await refreshStatus();
            setMessage(t("settingsPage.twoFactorDisabledSuccess"));
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : t("settingsPage.twoFactorDisableFailed"),
            );
        } finally {
            setIsBusy(false);
        }
    };

    const setupExpired =
        setup && new Date(setup.expiresAt).getTime() <= Date.now();

    if (isLoading) {
        return (
            <div className="rounded-xl border border-main bg-secondary/20 p-4 text-[12px] text-muted">
                {t("settingsPage.loading")}...
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-main bg-secondary/20 p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-accent" />
                        <p className="text-[13px] font-semibold">
                            {t("settingsPage.googleAuthenticator")}
                        </p>
                    </div>
                    <p className="text-[12px] text-muted mt-1 leading-relaxed">
                        {t("settingsPage.twoFactorAuthenticatorHint")}
                    </p>
                </div>
                <span
                    className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        status.enabled
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                            : "border-main text-muted",
                    )}
                >
                    {status.enabled
                        ? t("settingsPage.enabled")
                        : t("settingsPage.disabled")}
                </span>
            </div>

            {status.enabled ? (
                <div className="space-y-3">
                    <p className="text-[12px] text-muted">
                        {t("settingsPage.twoFactorEnabledAt", {
                            date: status.enabledAt
                                ? new Date(status.enabledAt).toLocaleString()
                                : "-",
                        })}
                    </p>
                    <form onSubmit={disable} className="space-y-2">
                        <input
                            value={disableCode}
                            onChange={(e) => setDisableCode(e.target.value)}
                            inputMode="numeric"
                            maxLength={6}
                            placeholder={t("settingsPage.twoFactorDisablePlaceholder")}
                            className="w-full bg-main border border-main rounded-lg py-2 px-3 text-[13px] tracking-[0.22em] text-center font-semibold focus:outline-none focus:ring-1 focus:ring-accent/30"
                        />
                        <button
                            type="submit"
                            disabled={isBusy}
                            className="rounded-lg border border-main px-3 py-2 text-[12px] font-medium text-muted hover:text-main hover:bg-main transition-colors disabled:opacity-60"
                        >
                            {t("settingsPage.disableTwoFactor")}
                        </button>
                    </form>
                </div>
            ) : setup ? (
                <div className="space-y-3">
                    <div className="rounded-xl border border-main bg-main p-3 flex items-center gap-3">
                        <div className="rounded-lg border border-main bg-white p-2 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={setup.qrCodeDataUrl}
                                alt={t("settingsPage.twoFactorQrAlt")}
                                className="h-28 w-28"
                            />
                        </div>
                        <div className="min-w-0 space-y-1">
                            <p className="text-[12px] font-medium">
                                {t("settingsPage.scanQrWithApp")}
                            </p>
                            <p className="text-[11px] text-muted break-all">
                                {setup.manualKey}
                            </p>
                            <p className="text-[10px] text-muted">
                                {t("settingsPage.twoFactorExpiresAt", {
                                    date: new Date(setup.expiresAt).toLocaleTimeString(),
                                })}
                            </p>
                        </div>
                    </div>
                    <form onSubmit={confirmEnable} className="space-y-2">
                        <input
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            inputMode="numeric"
                            maxLength={6}
                            placeholder={t("settingsPage.twoFactorCodePlaceholder")}
                            className="w-full bg-main border border-main rounded-lg py-2 px-3 text-[13px] tracking-[0.22em] text-center font-semibold focus:outline-none focus:ring-1 focus:ring-accent/30"
                        />
                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                disabled={isBusy || setupExpired}
                                className="rounded-lg bg-accent text-white px-3 py-2 text-[12px] font-semibold hover:bg-accent/90 disabled:opacity-60"
                            >
                                {t("settingsPage.verifyAndEnable")}
                            </button>
                            <button
                                type="button"
                                onClick={startSetup}
                                disabled={isBusy}
                                className="rounded-lg border border-main px-3 py-2 text-[12px] font-medium text-muted hover:text-main hover:bg-main transition-colors disabled:opacity-60"
                            >
                                {t("settingsPage.generateNewQr")}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={startSetup}
                    disabled={isBusy}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-3 py-2 text-[12px] font-semibold hover:bg-accent/90 disabled:opacity-60"
                >
                    <Smartphone size={13} />
                    {t("settingsPage.setupGoogleAuthenticator")}
                </button>
            )}

            {error ? <p className="text-[12px] text-rose-500">{error}</p> : null}
            {message ? <p className="text-[12px] text-emerald-500">{message}</p> : null}
        </div>
    );
}

