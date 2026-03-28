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
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

export const UserMenu = () => {
    const [isOpen, setIsOpen] = useState(false);

    const menuItems = [
        {
            group: "Overview",
            items: [
                {
                    icon: LayoutDashboard,
                    label: "Dashboard (Soon)",
                    href: "/dashboard",
                },
                {
                    icon: Activity,
                    label: "Market Explorer (Soon)",
                    href: "/explorer",
                },
                { icon: Wallet, label: "Portfolio (Soon)", href: "/portfolio" },
            ],
        },
        {
            group: "Analysis",
            items: [
                { icon: Database, label: "Data Streams", href: "/data-stream" },
                {
                    icon: Terminal,
                    label: "Query Engine",
                    href: "/query",
                },
                { icon: Cpu, label: "AI Insights (Soon)", href: "/ai" },
                {
                    icon: AlertTriangle,
                    label: "Liquidation",
                    href: "/liquidation",
                },
                {
                    icon: Waves,
                    label: "Smart Money",
                    href: "/smart-money",
                },
            ],
        },
        {
            group: "Account",
            items: [
                { icon: History, label: "Transactions", href: "/transactions" },
                { icon: Bell, label: "Alerts (Soon)", href: "/alerts" },
                { icon: Settings, label: "Settings", href: "/settings" },
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
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute right-0 mt-2 w-56 bg-main border border-main rounded-lg shadow-xl z-50 overflow-hidden"
                        >
                            <div className="p-3 border-b border-main">
                                <div className="text-[13px] font-semibold">
                                    John Doe
                                </div>
                                <div className="text-[11px] text-muted">
                                    john.doe@fintrace.io
                                </div>
                            </div>

                            <div className="max-h-[600px] overflow-y-auto thin-scrollbar py-1">
                                {menuItems.map((group, idx) => (
                                    <div key={idx} className="py-1">
                                        <div className="px-3 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">
                                            {group.group}
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
                                                {item.label}
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
                                    Sign Out
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
