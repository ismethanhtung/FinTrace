"use client";

import React, { useState } from "react";
import {
    Waves,
} from "lucide-react";
import { LeftSidebar } from "../../components/LeftSidebar";
import { SmartMoneyWhalePanel } from "../../components/SmartMoneyWhalePanel";
import { AppTopBar } from "../../components/shell/AppTopBar";

export default function SmartMoneyPage() {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [panelKey, setPanelKey] = useState(0);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setPanelKey((prev) => prev + 1);
        setTimeout(() => setIsRefreshing(false), 800);
    };

    return (
        <div className="flex flex-col h-screen w-full bg-main text-main overflow-hidden">
            <AppTopBar
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                refreshTitle="Reload smart money stream"
                refreshAriaLabel="Reload smart money stream"
            />

            <main className="flex-1 min-h-0 flex flex-col overflow-hidden p-6 sm:p-8 mx-auto w-full max-w-[1600px]">
                <div className="flex min-h-0 flex-1 w-full rounded-xl border border-main overflow-hidden bg-main">
                    <LeftSidebar embedded />

                    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-main">
                        <div className="px-4 py-3 border-b border-main bg-gradient-to-r from-secondary/25 via-secondary/10 to-transparent shrink-0">
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-accent font-bold">
                                <Waves size={14} />
                                Smart Money - Sau này sẽ thành tính năng nhỏ
                                giống thông báo toàn server
                            </div>
                            <div className="mt-1 text-[12px] text-muted leading-relaxed">
                                Theo dõi Whale Trades realtime dựa trên aggTrade
                                và lọc các lệnh lớn theo ngưỡng USD.
                            </div>
                        </div>

                        <div className="flex-1 min-h-0">
                            <SmartMoneyWhalePanel key={panelKey} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
