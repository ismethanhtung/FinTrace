import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    LayoutGrid,
    AlertTriangle,
    Waves,
    LogIn,
    type LucideIcon,
} from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useI18n } from "../context/I18nContext";
import { useUniverse } from "../context/UniverseContext";
import { type TranslationKey } from "../i18n/translate";

type UserMenuLinkItem = {
    icon: LucideIcon;
    labelKey: TranslationKey;
    href: string;
    /** Mở trong vũ trụ cổ phiếu khi đang ở coin (bảng giá, heatmap, …). */
    switchToStockWhenCoin?: boolean;
};

type UserMenuGroup = {
    groupKey: TranslationKey;
    items: UserMenuLinkItem[];
};

export const UserMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const { universe, setUniverse } = useUniverse();
    const { t } = useI18n();
    const { status, data } = useSession();
    const isAuthenticated = status === "authenticated";
    const displayName = data?.user?.name?.trim() || "User";
    const displayEmail = data?.user?.email?.trim() || "";
    const avatarUrl = data?.user?.image?.trim() || "";

    const menuItems: UserMenuGroup[] = [
        {
            groupKey: "userMenu.overview" as TranslationKey,
            items: [
                {
                    icon: LayoutDashboard,
                    labelKey: "userMenu.dashboardSoon" as TranslationKey,
                    href: "/dashboard",
                    switchToStockWhenCoin: true,
                },
                {
                    icon: Activity,
                    labelKey: "userMenu.board" as TranslationKey,
                    href: "/board",
                    switchToStockWhenCoin: true,
                },
                {
                    icon: Wallet,
                    labelKey: "userMenu.portfolioSoon" as TranslationKey,
                    href: "/portfolio",
                    switchToStockWhenCoin: true,
                },
                {
                    icon: LayoutGrid,
                    labelKey: "navigation.heatmap" as TranslationKey,
                    href: "/heatmap",
                    switchToStockWhenCoin: true,
                },
            ],
        },
        {
            groupKey: "userMenu.analysis" as TranslationKey,
            items: [
                // {
                //     icon: Database,
                //     labelKey: "navigation.dataStreams" as TranslationKey,
                //     href: "/data-stream",
                // },
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
                // {
                //     icon: History,
                //     labelKey: "navigation.transactions" as TranslationKey,
                //     href: "/transactions",
                // },
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
                className="flex items-center gap-2 p-1 rounded-md hover:bg-secondary transition-colors border border-transparent hover:border-main"
            >
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <User size={16} className="text-muted" />
                    )}
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
                            <div
                                className={cn(
                                    "p-3 border-b border-main flex items-center gap-2.5",
                                    !isAuthenticated && "cursor-pointer",
                                )}
                                onClick={() => {
                                    if (!isAuthenticated) {
                                        setIsOpen(false);
                                        signIn("google");
                                    }
                                }}
                            >
                                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                                    {avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={avatarUrl}
                                            alt={displayName}
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <User
                                            size={16}
                                            className="text-muted"
                                        />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[13px] font-semibold truncate">
                                        {isAuthenticated
                                            ? displayName
                                            : t("auth.signIn")}
                                    </div>
                                    {isAuthenticated && displayEmail && (
                                        <div className="text-[11px] text-muted truncate">
                                            {displayEmail}
                                        </div>
                                    )}
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
                                                onClick={(e) => {
                                                    if (
                                                        item.switchToStockWhenCoin &&
                                                        universe === "coin"
                                                    ) {
                                                        e.preventDefault();
                                                        setUniverse("stock");
                                                        router.push(item.href);
                                                    }
                                                    setIsOpen(false);
                                                }}
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

                            <div className="p-1 border-t border-main bg-secondary/50 space-y-1">
                                {!isAuthenticated && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOpen(false);
                                            signIn("google");
                                        }}
                                        className="w-full flex items-center px-3 py-2 text-[12px] text-main hover:bg-secondary rounded-md transition-colors cursor-pointer"
                                    >
                                        <LogIn
                                            size={14}
                                            className="mr-2.5"
                                            strokeWidth={1.5}
                                        />
                                        {t("auth.signIn")}
                                    </button>
                                )}
                                {isAuthenticated && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOpen(false);
                                            signOut({ callbackUrl: "/" });
                                        }}
                                        className="w-full flex items-center px-3 py-2 text-[12px] text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                                    >
                                        <LogOut
                                            size={14}
                                            className="mr-2.5"
                                            strokeWidth={1.5}
                                        />
                                        {t("common.signOut")}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
