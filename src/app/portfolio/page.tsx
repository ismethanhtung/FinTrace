"use client";

import PageLayout from "../../components/PageLayout";
import { Wallet, ArrowUpRight, ArrowDownRight, PieChart, TrendingUp } from "lucide-react";
import { MOCK_ASSETS } from "../../lib/mockData";
import { cn } from "../../lib/utils";

// Format cố định để SSR/Client không khác theo locale người dùng.
const usdFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

// Số giả ngẫu nhiên deterministic để tránh hydration mismatch (SSR != Client).
function seeded01(seed: number) {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // 0..1
}

export default function PortfolioPage() {
  return (
    <PageLayout title="Portfolio">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[24px] font-bold">Your Portfolio</h2>
            <p className="text-muted text-[14px]">Manage your assets and track performance.</p>
          </div>
          <button className="px-6 py-2 bg-accent text-white rounded-lg text-[14px] font-semibold hover:bg-accent/90 transition-colors shadow-md">
            Add Asset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 bg-secondary rounded-2xl border border-main flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-3 text-muted mb-4 uppercase tracking-widest text-[11px] font-bold">
                <Wallet size={16} />
                <span>Total Net Worth</span>
              </div>
              <div className="text-[42px] font-mono font-bold tracking-tighter">$124,532.80</div>
              <div className="flex items-center space-x-2 mt-4 text-emerald-500 font-semibold">
                <ArrowUpRight size={20} />
                <span>+$12,402.20 (11.2%)</span>
              </div>
            </div>
            <div className="mt-12 flex items-center space-x-6">
              <div className="flex flex-col">
                <span className="text-muted text-[11px] uppercase font-bold">Cash Balance</span>
                <span className="text-[18px] font-mono font-semibold">$12,402.00</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted text-[11px] uppercase font-bold">Invested</span>
                <span className="text-[18px] font-mono font-semibold">$112,130.80</span>
              </div>
            </div>
          </div>

          <div className="p-8 bg-main rounded-2xl border border-main flex flex-col">
            <div className="flex items-center space-x-3 text-muted mb-6 uppercase tracking-widest text-[11px] font-bold">
              <PieChart size={16} />
              <span>Asset Allocation</span>
            </div>
            <div className="flex-1 flex flex-col justify-center space-y-4">
              {[
                { label: 'Bitcoin', percent: 45, color: 'bg-accent' },
                { label: 'Ethereum', percent: 30, color: 'bg-emerald-500' },
                { label: 'Solana', percent: 15, color: 'bg-violet-500' },
                { label: 'Others', percent: 10, color: 'bg-muted' },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-[12px] font-medium">
                    <span>{item.label}</span>
                    <span>{item.percent}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", item.color)} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-main rounded-2xl border border-main overflow-hidden">
          <div className="px-6 py-4 border-b border-main bg-secondary/30">
            <h3 className="text-[16px] font-semibold">Asset Breakdown</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-muted text-[12px] uppercase tracking-wider border-b border-main">
                <th className="px-6 py-4 font-bold">Asset</th>
                <th className="px-6 py-4 font-bold">Price</th>
                <th className="px-6 py-4 font-bold">Holdings</th>
                <th className="px-6 py-4 font-bold">Value</th>
                <th className="px-6 py-4 font-bold text-right">Change</th>
              </tr>
            </thead>
            <tbody className="text-[14px]">
              {MOCK_ASSETS.map((asset) => (
                <tr key={asset.id} className="border-b border-main last:border-0 hover:bg-secondary transition-colors">
                  <td className="px-6 py-4 font-semibold">{asset.symbol}</td>
                  <td className="px-6 py-4 font-mono">${usdFmt.format(asset.price)}</td>
                  <td className="px-6 py-4 font-mono">
                    {(seeded01(Number(asset.id) * 100 + 1) * 2).toFixed(4)} {asset.symbol}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold">
                    ${usdFmt.format(seeded01(Number(asset.id) * 100 + 2) * 50000)}
                  </td>
                  <td className={cn(
                    "px-6 py-4 text-right font-medium",
                    asset.change >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {asset.changePercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
}
