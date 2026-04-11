"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useI18n } from "../../context/I18nContext";
import { cn } from "../../lib/utils";

const MIN_LEN = 8;
const MAX_LEN = 4000;

export function TopbarFeedback() {
    const { t, locale } = useI18n();
    const pathname = usePathname();
    const labelId = useId();
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [text, setText] = useState("");
    const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">(
        "idle",
    );

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    const close = useCallback(() => {
        setOpen(false);
        setStatus("idle");
    }, []);

    const openModal = useCallback(() => {
        setOpen(true);
        setStatus("idle");
        setText("");
    }, []);

    const submit = useCallback(async () => {
        const trimmed = text.trim();
        if (trimmed.length < MIN_LEN || trimmed.length > MAX_LEN) {
            setStatus("err");
            return;
        }
        setStatus("sending");
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: trimmed,
                    locale,
                    path: pathname || null,
                }),
            });
            if (!res.ok) {
                setStatus("err");
                return;
            }
            setStatus("ok");
            setText("");
        } catch {
            setStatus("err");
        }
    }, [text, locale, pathname]);

    const len = text.trim().length;
    const lenOk = len >= MIN_LEN && len <= MAX_LEN;

    return (
        <>
            <button
                type="button"
                onClick={openModal}
                title={t("feedback.topbarTitle")}
                aria-haspopup="dialog"
                aria-expanded={open}
                className={cn(
                    "m-0 border-0 bg-transparent cursor-pointer shrink-0",
                    "inline-flex items-center py-1.5 px-0.5 rounded-sm",
                    "text-[12px] font-normal leading-none text-muted hover:text-main",
                    "underline underline-offset-[3px] decoration-muted/55 hover:decoration-main",
                )}
            >
                {t("feedback.topbarButton")}
            </button>

            {mounted &&
                createPortal(
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                role="presentation"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px]"
                                onMouseDown={(e) => {
                                    if (e.target === e.currentTarget) close();
                                }}
                            >
                                <motion.div
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby={labelId}
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                    transition={{
                                        duration: 0.18,
                                        ease: [0.16, 1, 0.3, 1],
                                    }}
                                    className={cn(
                                        "w-full max-w-md rounded-xl border border-main bg-main shadow-2xl",
                                        "text-main",
                                    )}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2 border-b border-main">
                                        <div className="min-w-0">
                                            <h2
                                                id={labelId}
                                                className="text-[15px] font-bold leading-tight"
                                            >
                                                {t("feedback.modalTitle")}
                                            </h2>
                                            <p className="text-[11px] text-muted mt-1.5 leading-snug">
                                                {t("feedback.hint")}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={close}
                                            className="p-1.5 rounded-md text-muted hover:text-main hover:bg-secondary transition-colors"
                                            aria-label={t("feedback.close")}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="p-4 space-y-3">
                                        {status === "ok" ? (
                                            <p className="text-[13px] leading-relaxed text-main">
                                                {t("feedback.successBody")}
                                            </p>
                                        ) : (
                                            <>
                                                <textarea
                                                    value={text}
                                                    onChange={(e) =>
                                                        setText(e.target.value)
                                                    }
                                                    maxLength={MAX_LEN}
                                                    rows={6}
                                                    placeholder={t(
                                                        "feedback.placeholder",
                                                    )}
                                                    className={cn(
                                                        "w-full resize-y min-h-[120px] rounded-lg border border-main bg-secondary/30",
                                                        "px-3 py-2 text-[13px] leading-relaxed placeholder:text-muted",
                                                        "focus:outline-none focus:ring-2 focus:ring-amber-500/40",
                                                    )}
                                                    disabled={
                                                        status === "sending"
                                                    }
                                                />
                                                <div className="flex items-center justify-between text-[10px] text-muted">
                                                    <span>
                                                        {len < MIN_LEN
                                                            ? t(
                                                                  "feedback.charHintMin",
                                                                  {
                                                                      min: MIN_LEN,
                                                                      current:
                                                                          len,
                                                                  },
                                                              )
                                                            : t(
                                                                  "feedback.charHintOk",
                                                                  {
                                                                      max: MAX_LEN,
                                                                      current:
                                                                          len,
                                                                  },
                                                              )}
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        {status === "err" && (
                                            <p className="text-[12px] text-red-600 dark:text-red-400">
                                                {!lenOk
                                                    ? len > MAX_LEN
                                                        ? t(
                                                              "feedback.validationTooLong",
                                                              {
                                                                  max: MAX_LEN,
                                                              },
                                                          )
                                                        : t(
                                                              "feedback.validationTooShort",
                                                              {
                                                                  min: MIN_LEN,
                                                              },
                                                          )
                                                    : t(
                                                          "feedback.errorGeneric",
                                                      )}
                                            </p>
                                        )}

                                        <div className="flex justify-end gap-2 pt-1">
                                            {status === "ok" ? (
                                                <button
                                                    type="button"
                                                    onClick={close}
                                                    className="px-3 py-1.5 rounded-md text-[12px] font-medium bg-secondary hover:bg-secondary/80 border border-main"
                                                >
                                                    {t("feedback.close")}
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={close}
                                                        className="px-3 py-1.5 rounded-md text-[12px] font-medium text-muted hover:text-main hover:bg-secondary/60"
                                                    >
                                                        {t("feedback.cancel")}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={submit}
                                                        disabled={
                                                            status ===
                                                                "sending" ||
                                                            !lenOk
                                                        }
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-md text-[12px] font-semibold",
                                                            "bg-amber-500/90 text-amber-950 hover:bg-amber-500",
                                                            "disabled:opacity-45 disabled:pointer-events-none",
                                                        )}
                                                    >
                                                        {status === "sending"
                                                            ? t(
                                                                  "feedback.sending",
                                                              )
                                                            : t(
                                                                  "feedback.submit",
                                                              )}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body,
                )}
        </>
    );
}
