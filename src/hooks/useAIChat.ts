import { useState, useCallback, useRef, useEffect } from 'react';
import { openrouterService, ChatMessage } from '../services/openrouterService';

// ─── Types ────────────────────────────────────────────────────────────────────
export type MessageRole = 'user' | 'assistant' | 'system';

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  isStreaming?: boolean;
  error?: boolean;
  timestamp: number;
};

export type ChatSession = {
  id: string;
  title: string;
  symbol: string;         // coin symbol at time of creation
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

// ─── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'ft-ai-sessions';

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatSession[]) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    console.warn('[useAIChat] Failed to persist sessions');
  }
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateTitle(firstUserMessage: string): string {
  const cleaned = firstUserMessage.trim().replace(/\s+/g, ' ');
  return cleaned.length > 50 ? cleaned.slice(0, 47) + '…' : cleaned;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
interface UseAIChatOptions {
  apiKey: string;
  model: string;
  systemPromptTemplate: string;  // may contain {CONTEXT} placeholder
  symbol: string;
  contextSummary: string;        // current market data injected into system prompt
  resolveDynamicContext?: (userText: string) => Promise<string | null>;
}

export const useAIChat = ({
  apiKey,
  model,
  systemPromptTemplate,
  symbol,
  contextSummary,
  resolveDynamicContext,
}: UseAIChatOptions) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Load sessions from localStorage on mount ──
  useEffect(() => {
    const saved = loadSessions();
    setSessions(saved);
    if (saved.length > 0) {
      setActiveSessionId(saved[saved.length - 1].id);
    }
  }, []);

  // Derived: active session object
  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null;

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const createSession = useCallback((sym?: string): string => {
    const newSession: ChatSession = {
      id: uid(),
      title: `New chat · ${(sym ?? symbol).replace('USDT', '')}`,
      symbol: sym ?? symbol,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions(prev => {
      const next = [...prev, newSession];
      saveSessions(next);
      return next;
    });
    setActiveSessionId(newSession.id);
    return newSession.id;
  }, [symbol]);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      saveSessions(next);
      return next;
    });
    setActiveSessionId(prev => {
      if (prev === id) {
        const remaining = sessions.filter(s => s.id !== id);
        return remaining.length > 0 ? remaining[remaining.length - 1].id : null;
      }
      return prev;
    });
  }, [sessions]);

  const clearSession = useCallback((id: string) => {
    setSessions(prev => {
      const next = prev.map(s =>
        s.id === id
          ? { ...s, messages: [], updatedAt: Date.now(), title: `New chat · ${s.symbol.replace('USDT', '')}` }
          : s
      );
      saveSessions(next);
      return next;
    });
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (userText: string): Promise<void> => {
    if (!userText.trim() || isStreaming) return;

    // Ensure we have an active session
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = createSession(symbol);
    }

    // Build system prompt with injected market context
    let dynamicText = '';
    if (resolveDynamicContext) {
      try {
        const ext = await resolveDynamicContext(userText);
        if (ext) dynamicText = `\n\n---\n**DYNAMIC RAG CONTEXT (User Mentioned Assets):**\n${ext}`;
      } catch (err) {
        console.warn('RAG Context failed:', err);
      }
    }

    const systemContent = systemPromptTemplate.replace('{CONTEXT}', contextSummary) +
      `\n\n---\n**Current Market Context (${symbol}):**\n${contextSummary}` +
      dynamicText +
      `\n\nCRITICAL INSTRUCTION: You MUST process and answer the user's message in the EXACT SAME LANGUAGE the user used. If the user asks in Vietnamese, you MUST reply entirely in Vietnamese. If the user asks in English, reply in English.`;

    const userMsg: Message = {
      id: uid(),
      role: 'user',
      content: userText.trim(),
      timestamp: Date.now(),
    };

    const assistantMsg: Message = {
      id: uid(),
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: Date.now(),
    };

    // Append user message + empty assistant placeholder
    let updatedMessages: Message[] = [];
    setSessions(prev => {
      const next = prev.map(s => {
        if (s.id !== sessionId) return s;
        const msgs = [...s.messages, userMsg, assistantMsg];
        updatedMessages = msgs;
        const title = s.messages.length === 0
          ? generateTitle(userText)
          : s.title;
        return { ...s, messages: msgs, title, updatedAt: Date.now() };
      });
      saveSessions(next);
      return next;
    });

    setIsStreaming(true);
    abortRef.current = new AbortController();

    try {
      // Build OpenRouter messages array (filter out streaming placeholder)
      const chatMsgs: ChatMessage[] = [
        { role: 'system', content: systemContent },
        ...updatedMessages
          .filter(m => m.role !== 'assistant' || m.content !== '')
          .filter(m => m.id !== assistantMsg.id)
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: userText.trim() },
      ];

      let accumulated = '';

      await openrouterService.chatStream(
        apiKey,
        model,
        chatMsgs,
        (chunk) => {
          accumulated += chunk;
          // Update the streaming assistant message in real-time
          setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            return {
              ...s,
              messages: s.messages.map(m =>
                m.id === assistantMsg.id
                  ? { ...m, content: accumulated }
                  : m
              ),
            };
          }));
        },
        abortRef.current.signal,
      );

      // Finalize: mark streaming done
      setSessions(prev => {
        const next = prev.map(s => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            messages: s.messages.map(m =>
              m.id === assistantMsg.id
                ? { ...m, isStreaming: false, content: accumulated }
                : m
            ),
            updatedAt: Date.now(),
          };
        });
        saveSessions(next);
        return next;
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('[useAIChat] Stream error:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setSessions(prev => {
        const next = prev.map(s => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            messages: s.messages.map(m =>
              m.id === assistantMsg.id
                ? { ...m, isStreaming: false, content: `Error: ${errMsg}`, error: true }
                : m
            ),
          };
        });
        saveSessions(next);
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [
    activeSessionId, apiKey, model, systemPromptTemplate,
    contextSummary, symbol, isStreaming, createSession, resolveDynamicContext,
  ]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    clearSession,
    sendMessage,
    isStreaming,
    stopStreaming,
  };
};
