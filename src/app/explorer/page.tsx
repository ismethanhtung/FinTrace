"use client";

import PageLayout from "../../components/PageLayout";
import { Activity, Search, TrendingUp, Globe } from "lucide-react";

// Số giả ngẫu nhiên deterministic để tránh hydration mismatch (SSR != Client).
function seeded01(seed: number) {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // 0..1
}

export default function ExplorerPage() {
  return (
    <PageLayout title="Market Explorer">
      <div className="space-y-8">
        <div className="p-8 bg-secondary rounded-2xl border border-main text-center space-y-4">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
            <Globe size={32} className="text-accent" />
          </div>
          <h2 className="text-[20px] font-bold">Global Market Explorer</h2>
          <p className="text-muted max-w-md mx-auto">Discover new assets and market trends across the globe using our advanced discovery engine.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-main rounded-xl border border-main space-y-4">
            <h3 className="font-semibold">Trending Assets</h3>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-main rounded-full" />
                    <div className="font-medium text-[14px]">Asset {i}</div>
                  </div>
                  <div className="text-emerald-500 font-mono text-[12px]">+{(seeded01(3000 + i) * 5).toFixed(2)}%</div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6 bg-main rounded-xl border border-main space-y-4">
            <h3 className="font-semibold">New Listings</h3>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-main rounded-full" />
                    <div className="font-medium text-[14px]">New Asset {i}</div>
                  </div>
                  <div className="text-muted text-[11px]">Listed 2h ago</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
