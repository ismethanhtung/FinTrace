"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function PageLayout({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
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
                            width={18}
                            height={18}
                            className="rounded-sm"
                        />
                        <span className="font-bold text-[15px] tracking-tight">
                            FinTrace
                        </span>
                    </div>
                    <div className="h-4 w-[1px] bg-main border-l border-main mx-2"></div>
                    <h1 className="text-[14px] font-semibold">{title}</h1>
                </div>
            </header>
            <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
                {children}
            </main>
        </div>
    );
}
