"use client";

import PageLayout from "../../components/PageLayout";
import { LayoutDashboard, TrendingUp, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { MainChart } from "../../components/MainChart";

export default function DashboardPage() {
  return (
    <PageLayout title="Dashboard">
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-secondary rounded-xl border border-main">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-medium text-muted uppercase tracking-wider">Total Balance</span>
              <TrendingUp size={16} className="text-accent" />
            </div>
            <div className="text-[28px] font-mono font-bold">$124,532.80</div>
            <div className="flex items-center space-x-1 mt-2 text-emerald-500 text-[12px] font-medium">
              <ArrowUpRight size={14} />
              <span>+12.4% this month</span>
            </div>
          </div>
          <div className="p-6 bg-secondary rounded-xl border border-main">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-medium text-muted uppercase tracking-wider">Active Trades</span>
              <Activity size={16} className="text-accent" />
            </div>
            <div className="text-[28px] font-mono font-bold">12</div>
            <div className="flex items-center space-x-1 mt-2 text-muted text-[12px]">
              <span>8 long, 4 short</span>
            </div>
          </div>
          <div className="p-6 bg-secondary rounded-xl border border-main">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-medium text-muted uppercase tracking-wider">Market Sentiment</span>
              <LayoutDashboard size={16} className="text-accent" />
            </div>
            <div className="text-[28px] font-mono font-bold">Bullish</div>
            <div className="flex items-center space-x-1 mt-2 text-emerald-500 text-[12px] font-medium">
              <span>Strong Buy</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-main rounded-xl border border-main overflow-hidden">
          <h3 className="text-[16px] font-semibold mb-6">Portfolio Performance</h3>
          <div className="h-[400px]">
            <MainChart />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
