import React, { useState } from "react";
import Link from "next/link";
import {
    User,
    Settings,
    LogOut,
    LayoutDashboard,
    Activity,
    Wallet,
    Database,
    Terminal,
    Cpu,
    History,
    Bell,
    ChevronDown,
    AlertTriangle,
    Waves,
    LayoutGrid,
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useI18n } from "../context/I18nContext";
import { type TranslationKey } from "../i18n/translate";

export const UserMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useI18n();

    const menuItems = [
        {
            groupKey: "userMenu.overview" as TranslationKey,
            items: [
                {
                    icon: LayoutDashboard,
                    labelKey: "userMenu.dashboardSoon" as TranslationKey,
                    href: "/dashboard",
                },
                {
                    icon: Activity,
                    labelKey: "userMenu.marketExplorerSoon" as TranslationKey,
                    href: "/explorer",
                },
                {
                    icon: Wallet,
                    labelKey: "userMenu.portfolioSoon" as TranslationKey,
                    href: "/portfolio",
                },
                {
                    icon: LayoutGrid,
                    labelKey: "navigation.heatmap" as TranslationKey,
                    href: "/heatmap",
                },
            ],
        },
        {
            groupKey: "userMenu.analysis" as TranslationKey,
            items: [
                {
                    icon: Database,
                    labelKey: "navigation.dataStreams" as TranslationKey,
                    href: "/data-stream",
                },
                {
                    icon: Terminal,
                    labelKey: "navigation.queryEngine" as TranslationKey,
                    href: "/query",
                },
                {
                    icon: Cpu,
                    labelKey: "userMenu.aiInsightsSoon" as TranslationKey,
                    href: "/ai",
                },
                {
                    icon: AlertTriangle,
                    labelKey: "navigation.liquidation" as TranslationKey,
                    href: "/liquidation",
                },
                {
                    icon: Waves,
                    labelKey: "navigation.smartMoney" as TranslationKey,
                    href: "/smart-money",
                },
            ],
        },
        {
            groupKey: "userMenu.account" as TranslationKey,
            items: [
                {
                    icon: History,
                    labelKey: "navigation.transactions" as TranslationKey,
                    href: "/transactions",
                },
                {
                    icon: Bell,
                    labelKey: "userMenu.alertsSoon" as TranslationKey,
                    href: "/alerts",
                },
                {
                    icon: Settings,
                    labelKey: "common.settings" as TranslationKey,
                    href: "/settings",
                },
            ],
        },
    ];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 p-1 rounded-md hover:bg-secondary transition-colors"
            >
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                    <User size={16} className="text-muted" />
                </div>
                <ChevronDown
                    size={12}
                    className={cn(
                        "text-muted transition-transform",
                        isOpen && "rotate-180",
                    )}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.14, ease: "easeOut" }}
                            className="absolute right-0 mt-2 w-56 bg-main border border-main rounded-lg shadow-xl z-50 overflow-hidden"
                        >
                            <div className="p-3 border-b border-main">
                                <div className="text-[13px] font-semibold">
                                    Nguyen Thanh Tung
                                </div>
                                <div className="text-[11px] text-muted">
                                    ismethanhtung@gmail.com
                                </div>
                            </div>

                            <div className="max-h-[600px] overflow-y-auto thin-scrollbar py-1">
                                {menuItems.map((group, idx) => (
                                    <div key={idx} className="py-1">
                                        <div className="px-3 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">
                                            {t(group.groupKey)}
                                        </div>
                                        {group.items.map((item, i) => (
                                            <Link
                                                key={i}
                                                href={item.href}
                                                onClick={() => setIsOpen(false)}
                                                className="w-full flex items-center px-3 py-1.5 text-[12px] text-main hover:bg-secondary transition-colors"
                                            >
                                                <item.icon
                                                    size={14}
                                                    className="mr-2.5 text-muted"
                                                    strokeWidth={1.5}
                                                />
                                                {t(item.labelKey)}
                                            </Link>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            <div className="p-1 border-t border-main bg-secondary/50">
                                <button className="w-full flex items-center px-3 py-2 text-[12px] text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors">
                                    <LogOut
                                        size={14}
                                        className="mr-2.5"
                                        strokeWidth={1.5}
                                    />
                                    {t("common.signOut")}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
