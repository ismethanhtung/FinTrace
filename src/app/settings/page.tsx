"use client";

import React, { useState } from 'react';
import PageLayout from "../../components/PageLayout";
import {
  Settings, User, Bell, Shield, Database, Globe,
  Type, Palette, Check,
} from "lucide-react";
import { useAppSettings, AppFont, AppTheme, FONT_STACKS, THEME_CYCLE } from "../../context/AppSettingsContext";
import { cn } from "../../lib/utils";

// ─── Font preview card ────────────────────────────────────────────────────────
const FONT_OPTIONS: { value: AppFont; description: string }[] = [
  { value: 'Inter',             description: 'Clean, neutral — default sans-serif for UI' },
  { value: 'Outfit',            description: 'Geometric and airy — more breathing room' },
  { value: 'Plus Jakarta Sans', description: 'Modern, wider letterforms — very readable' },
  { value: 'IBM Plex Sans',     description: 'Technical, slightly wider — great for data' },
  { value: 'Space Grotesk',     description: 'Distinctive, rounded — unique personality' },
];

// ─── Theme card ───────────────────────────────────────────────────────────────
const THEME_OPTIONS: {
  value: AppTheme;
  label: string;
  bg: string;
  text: string;
  border: string;
  secondaryBg: string;
}[] = [
  { value: 'light',  label: 'Light',    bg: '#FFFFFF', text: '#171717', border: '#EDEDED', secondaryBg: '#F5F7F9' },
  { value: 'dark1',  label: 'Dark I',   bg: '#1C1C1F', text: '#F0EFEC', border: '#3A3A3F', secondaryBg: '#252528' },
  { value: 'dark2',  label: 'Dark II',  bg: '#0E1520', text: '#CDD6E8', border: '#243045', secondaryBg: '#16202E' },
  { value: 'dark3',  label: 'Dark III', bg: '#13111C', text: '#E8E4F5', border: '#2E2A40', secondaryBg: '#1C1928' },
  { value: 'dark4',  label: 'Dark IV',  bg: '#0D1714', text: '#D4EDE1', border: '#1E3328', secondaryBg: '#142119' },
  { value: 'dark5',  label: 'Dark V',   bg: '#090909', text: '#E8E8E8', border: '#222222', secondaryBg: '#131313' },
];

// ─── Sidebar sections ────────────────────────────────────────────────────────
const SIDEBAR_SECTIONS = [
  { id: 'profile',    icon: User,    label: 'Profile' },
  { id: 'ui',         icon: Type,    label: 'UI Preferences' },
  { id: 'appearance', icon: Palette, label: 'Appearance' },
  { id: 'notif',      icon: Bell,    label: 'Notifications' },
  { id: 'security',   icon: Shield,  label: 'Security' },
  { id: 'data',       icon: Database,label: 'Data & Privacy' },
  { id: 'locale',     icon: Globe,   label: 'Language & Region' },
];

export default function SettingsPage() {
  const { font, setFont, theme, setTheme } = useAppSettings();
  const [activeSection, setActiveSection] = useState('profile');

  return (
    <PageLayout title="Settings">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* ── Sidebar ── */}
        <div className="md:col-span-1 space-y-1">
          {SIDEBAR_SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                'w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors text-[14px] font-medium',
                activeSection === s.id
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:bg-secondary hover:text-main',
              )}
            >
              <s.icon size={18} />
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="md:col-span-3 space-y-8">

          {/* ── Profile ── */}
          {activeSection === 'profile' && (
            <div className="p-8 bg-secondary rounded-2xl border border-main space-y-8">
              <div className="flex items-center justify-between border-b border-main pb-6">
                <div>
                  <h3 className="text-[18px] font-bold">Profile Information</h3>
                  <p className="text-muted text-[13px]">Update your personal details here.</p>
                </div>
                <button className="px-6 py-2 bg-accent text-white rounded-lg text-[13px] font-semibold hover:bg-accent/90 transition-colors shadow-sm">
                  Save Changes
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'Full Name', type: 'text', value: 'John Doe' },
                  { label: 'Email Address', type: 'email', value: 'john.doe@fintrace.io' },
                  { label: 'Username', type: 'text', value: 'johndoe_trader' },
                ].map(f => (
                  <div key={f.label} className="space-y-2">
                    <label className="text-[12px] font-bold text-muted uppercase tracking-wider">{f.label}</label>
                    <input
                      type={f.type}
                      defaultValue={f.value}
                      className="w-full bg-main border border-main rounded-lg py-2.5 px-4 text-[14px] focus:outline-none focus:ring-1 focus:ring-accent/30"
                    />
                  </div>
                ))}
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-muted uppercase tracking-wider">Timezone</label>
                  <select className="w-full bg-main border border-main rounded-lg py-2.5 px-4 text-[14px] focus:outline-none focus:ring-1 focus:ring-accent/30">
                    <option>UTC (Coordinated Universal Time)</option>
                    <option>EST (Eastern Standard Time)</option>
                    <option>PST (Pacific Standard Time)</option>
                    <option>GMT+7 (Indochina Time)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── UI Preferences (Font Picker) ── */}
          {activeSection === 'ui' && (
            <div className="space-y-6">
              <div className="p-8 bg-secondary rounded-2xl border border-main space-y-6">
                <div className="border-b border-main pb-5">
                  <h3 className="text-[18px] font-bold flex items-center space-x-2">
                    <Type size={20} className="text-accent" />
                    <span>Interface Font</span>
                  </h3>
                  <p className="text-muted text-[13px] mt-1">
                    Choose the font used across the entire FinTrace interface. Changes apply immediately.
                  </p>
                </div>

                <div className="space-y-3">
                  {FONT_OPTIONS.map(({ value, description }) => {
                    const isActive = font === value;
                    return (
                      <button
                        key={value}
                        onClick={() => setFont(value)}
                        className={cn(
                          'w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left',
                          isActive
                            ? 'border-accent bg-accent/5 ring-1 ring-accent/20'
                            : 'border-main bg-main hover:bg-secondary hover:border-accent/30',
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-[20px] font-medium mb-0.5 truncate"
                            style={{ fontFamily: FONT_STACKS[value] }}
                          >
                            {value}
                          </div>
                          <div
                            className="text-[13px] text-muted"
                            style={{ fontFamily: FONT_STACKS[value] }}
                          >
                            AaBbCcDd 0123456789 — {description}
                          </div>
                        </div>
                        {isActive && (
                          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0 ml-4">
                            <Check size={13} strokeWidth={3} className="text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Appearance (Theme Picker) ── */}
          {activeSection === 'appearance' && (
            <div className="p-8 bg-secondary rounded-2xl border border-main space-y-6">
              <div className="border-b border-main pb-5">
                <h3 className="text-[18px] font-bold flex items-center space-x-2">
                  <Palette size={20} className="text-accent" />
                  <span>Color Theme</span>
                </h3>
                <p className="text-muted text-[13px] mt-1">
                  Select your preferred color scheme. Each dark theme has a distinct palette and mood.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {THEME_OPTIONS.map(t => {
                  const isActive = theme === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value)}
                      className={cn(
                        'relative rounded-xl overflow-hidden border-2 transition-all',
                        isActive ? 'border-accent shadow-lg shadow-accent/20' : 'border-transparent hover:border-accent/30',
                      )}
                    >
                      {/* Preview swatch */}
                      <div
                        className="h-20 p-3 flex flex-col justify-between"
                        style={{ backgroundColor: t.bg, borderBottom: `1px solid ${t.border}` }}
                      >
                        {/* Fake header bar */}
                        <div className="flex items-center space-x-1.5">
                          <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: '#007AFF' }} />
                          <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: t.border }} />
                          <div className="w-6 h-1.5 rounded-full" style={{ backgroundColor: t.border }} />
                        </div>
                        {/* Fake content rows */}
                        <div className="space-y-1">
                          <div className="flex space-x-1">
                            <div className="flex-1 h-1.5 rounded" style={{ backgroundColor: t.secondaryBg }} />
                            <div className="w-8 h-1.5 rounded" style={{ backgroundColor: '#10b981', opacity: 0.7 }} />
                          </div>
                          <div className="flex space-x-1">
                            <div className="flex-1 h-1.5 rounded" style={{ backgroundColor: t.secondaryBg }} />
                            <div className="w-6 h-1.5 rounded" style={{ backgroundColor: '#f43f5e', opacity: 0.7 }} />
                          </div>
                        </div>
                      </div>
                      {/* Label */}
                      <div
                        className="px-3 py-2 flex items-center justify-between"
                        style={{ backgroundColor: t.secondaryBg }}
                      >
                        <span
                          className="text-[12px] font-semibold"
                          style={{ color: t.text }}
                        >
                          {t.label}
                        </span>
                        {isActive && (
                          <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                            <Check size={9} strokeWidth={3} className="text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeSection === 'notif' && (
            <div className="p-8 bg-secondary rounded-2xl border border-main space-y-6">
              <h3 className="text-[18px] font-bold">Notifications</h3>
              <div className="space-y-4">
                {[
                  { label: 'Price Alerts', desc: 'Get notified when assets hit your target prices.' },
                  { label: 'Portfolio Updates', desc: 'Daily portfolio performance summaries.' },
                  { label: 'Market News', desc: 'Breaking news affecting your watchlist.' },
                ].map((n, i) => (
                  <div key={n.label} className="flex items-center justify-between p-4 bg-main rounded-xl border border-main">
                    <div>
                      <div className="text-[14px] font-semibold">{n.label}</div>
                      <p className="text-[12px] text-muted">{n.desc}</p>
                    </div>
                    <div className={cn('w-12 h-6 rounded-full relative cursor-pointer transition-colors', i === 0 ? 'bg-accent' : 'bg-secondary border border-main')}>
                      <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all', i === 0 ? 'right-1' : 'left-1')} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Fallback placeholder ── */}
          {!['profile', 'ui', 'appearance', 'notif'].includes(activeSection) && (
            <div className="p-8 bg-secondary rounded-2xl border border-main flex items-center justify-center min-h-[200px]">
              <p className="text-muted text-[14px]">This section is coming soon.</p>
            </div>
          )}

        </div>
      </div>
    </PageLayout>
  );
}
