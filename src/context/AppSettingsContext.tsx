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

export const FONT_STACKS: Record<AppFont, string> = {
  'Inter':             '"Inter", ui-sans-serif, system-ui, sans-serif',
  'Outfit':            '"Outfit", ui-sans-serif, system-ui, sans-serif',
  'Plus Jakarta Sans': '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  'IBM Plex Sans':     '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  'Space Grotesk':     '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
};

export const THEME_CYCLE: AppTheme[] = ['light', 'dark1', 'dark2', 'dark3', 'dark4', 'dark5'];

export const DEFAULT_SYSTEM_PROMPT = `You are FinTrace AI, an expert crypto market analyst embedded in the FinTrace trading platform.

You have access to real-time market data for the coin the user is currently viewing. This data will be injected at the start of each conversation.

Your role:
- Provide sharp, data-driven analysis of price action, trends, and momentum
- Explain technical indicators (MA, EMA, RSI, MACD, support/resistance)
- Assess risk/reward and market context
- Answer questions clearly, concisely, and in the user's language

You do NOT give financial advice or buy/sell recommendations. Always state that decisions are the user's own.`;

export const DEFAULT_MODEL = 'arcee-ai/trinity-large-preview:free';

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppSettingsValue {
  // Appearance
  font: AppFont;
  setFont: (f: AppFont) => void;
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  toggleTheme: () => void;

  // AI / Integrations
  openrouterApiKey: string;
  setOpenrouterApiKey: (key: string) => void;
  cryptoPanicApiKey: string;
  setCryptoPanicApiKey: (key: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
}

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AppSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [font, setFontState] = useState<AppFont>('Inter');
  const [theme, setThemeState] = useState<AppTheme>('dark1');
  const [openrouterApiKey, setOpenrouterApiKeyState] = useState('');
  const [cryptoPanicApiKey, setCryptoPanicApiKeyState] = useState('');
  const [selectedModel, setSelectedModelState] = useState(DEFAULT_MODEL);
  const [systemPrompt, setSystemPromptState] = useState(DEFAULT_SYSTEM_PROMPT);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const savedFont        = localStorage.getItem('ft-font') as AppFont | null;
    const savedTheme       = localStorage.getItem('ft-theme') as AppTheme | null;
    const savedORKey       = localStorage.getItem('ft-openrouter-key');
    const savedCPKey       = localStorage.getItem('ft-cryptopanic-key');
    const savedModel       = localStorage.getItem('ft-model');
    const savedPrompt      = localStorage.getItem('ft-system-prompt');

    if (savedFont && FONT_STACKS[savedFont])          setFontState(savedFont);
    if (savedTheme && THEME_CYCLE.includes(savedTheme)) setThemeState(savedTheme);
    if (savedORKey)   setOpenrouterApiKeyState(savedORKey);
    if (savedCPKey)   setCryptoPanicApiKeyState(savedCPKey);
    if (savedModel)   setSelectedModelState(savedModel);
    if (savedPrompt)  setSystemPromptState(savedPrompt);
  }, []);

  // Apply font
  useEffect(() => {
    document.documentElement.style.setProperty('--font-sans', FONT_STACKS[font]);
  }, [font]);

  // Apply theme
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

  const setOpenrouterApiKey = useCallback((key: string) => {
    setOpenrouterApiKeyState(key);
    localStorage.setItem('ft-openrouter-key', key);
  }, []);

  const setCryptoPanicApiKey = useCallback((key: string) => {
    setCryptoPanicApiKeyState(key);
    localStorage.setItem('ft-cryptopanic-key', key);
  }, []);

  const setSelectedModel = useCallback((model: string) => {
    setSelectedModelState(model);
    localStorage.setItem('ft-model', model);
  }, []);

  const setSystemPrompt = useCallback((prompt: string) => {
    setSystemPromptState(prompt);
    localStorage.setItem('ft-system-prompt', prompt);
  }, []);

  return (
    <AppSettingsContext.Provider
      value={{
        font, setFont,
        theme, setTheme, toggleTheme,
        openrouterApiKey, setOpenrouterApiKey,
        cryptoPanicApiKey, setCryptoPanicApiKey,
        selectedModel, setSelectedModel,
        systemPrompt, setSystemPrompt,
      }}
    >
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
