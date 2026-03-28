"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { cn } from "../lib/utils";
import { WorldSwitch } from "./shell/WorldSwitch";

export default function PageLayout({
    title,
    children,
    wide,
}: {
    title: string;
    children: React.ReactNode;
    /** Bố cục rộng (vd. /transactions: sidebar + tape) */
    wide?: boolean;
}) {
    return (
        <div className="min-h-screen bg-main text-main flex flex-col">
            <header className="h-12 border-b border-main flex items-center justify-between px-4 bg-main sticky top-0 z-50">
                <div className="flex items-center space-x-4">
                    <Link
                        href="/"
                        className="p-2 hover:bg-secondary rounded-md transition-colors"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div className="flex items-center space-x-2">
                        <Image
                            src="/logo.gif"
                            alt="FinTrace logo"
                            width={36}
                            height={36}
                            className="rounded-sm"
                            unoptimized
                            priority
                        />
                        <span className="font-bold text-[15px] tracking-tight">
                            FinTrace
                        </span>
                    </div>
                    <div className="h-4 w-[1px] bg-main border-l border-main mx-2"></div>
                    <h1 className="text-[14px] font-semibold">{title}</h1>
                </div>
                <WorldSwitch />
            </header>
            <main
                className={cn(
                    "flex-1 min-h-0 flex flex-col p-6 sm:p-8 mx-auto w-full",
                    wide ? "max-w-[1600px]" : "max-w-6xl",
                )}
            >
                {children}
            </main>
        </div>
    );
}
