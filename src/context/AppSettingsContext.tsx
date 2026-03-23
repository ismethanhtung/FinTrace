"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type AppFont =
  | 'Inter'
  | 'Outfit'
  | 'Plus Jakarta Sans'
  | 'IBM Plex Sans'
  | 'Space Grotesk';

export type AppTheme = 'light' | 'dark1' | 'dark2' | 'dark3' | 'dark4' | 'dark5';

// Font stack map
export const FONT_STACKS: Record<AppFont, string> = {
  'Inter':             '"Inter", ui-sans-serif, system-ui, sans-serif',
  'Outfit':            '"Outfit", ui-sans-serif, system-ui, sans-serif',
  'Plus Jakarta Sans': '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  'IBM Plex Sans':     '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  'Space Grotesk':     '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
};

export const THEME_CYCLE: AppTheme[] = ['light', 'dark1', 'dark2', 'dark3', 'dark4', 'dark5'];

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppSettingsValue {
  font: AppFont;
  setFont: (f: AppFont) => void;
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  toggleTheme: () => void;
}

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AppSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [font, setFontState] = useState<AppFont>('Inter');
  const [theme, setThemeState] = useState<AppTheme>('dark1');

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const savedFont = localStorage.getItem('ft-font') as AppFont | null;
    const savedTheme = localStorage.getItem('ft-theme') as AppTheme | null;
    if (savedFont && FONT_STACKS[savedFont]) setFontState(savedFont);
    if (savedTheme && THEME_CYCLE.includes(savedTheme)) setThemeState(savedTheme);
  }, []);

  // Apply font to document
  useEffect(() => {
    document.documentElement.style.setProperty('--font-sans', FONT_STACKS[font]);
  }, [font]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setFont = useCallback((f: AppFont) => {
    setFontState(f);
    localStorage.setItem('ft-font', f);
  }, []);

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t);
    localStorage.setItem('ft-theme', t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const idx = THEME_CYCLE.indexOf(prev);
      const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
      localStorage.setItem('ft-theme', next);
      return next;
    });
  }, []);

  return (
    <AppSettingsContext.Provider value={{ font, setFont, theme, setTheme, toggleTheme }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAppSettings = (): AppSettingsValue => {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used inside AppSettingsProvider');
  return ctx;
};
