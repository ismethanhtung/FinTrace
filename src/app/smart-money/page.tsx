"use client";

import React, { useState } from "react";
import { Waves } from "lucide-react";
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

            <main className="flex-1 min-h-0 flex overflow-hidden">
                <div className="flex min-h-0 flex-1 w-full overflow-hidden bg-main">
                    <LeftSidebar embedded />

                    <div className="flex-1 min-h-0">
                        <SmartMoneyWhalePanel key={panelKey} />
                    </div>
                </div>
            </main>
        </div>
    );
}
