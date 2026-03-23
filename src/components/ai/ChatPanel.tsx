"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAIChat, Message } from '../../hooks/useAIChat';
import { useMarket } from '../../context/MarketContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import { 
  Send, Bot, User, RefreshCw, Trash2, Plus, 
  MessageSquare, History, XCircle, TerminalSquare
} from 'lucide-react';
import { cn } from '../../lib/utils';
import ReactMarkdown from 'react-markdown';

export const ChatPanel = () => {
  const { selectedSymbol, assets } = useMarket();
  const { openrouterApiKey, selectedModel, systemPrompt } = useAppSettings();

  // Determine current market context to inject into prompt
  const currentAsset = assets.find(a => a.id === selectedSymbol);
  const contextSummary = currentAsset ? 
    `Symbol: ${selectedSymbol}
Price: $${currentAsset.price.toLocaleString()}
24h Change: ${currentAsset.changePercent.toFixed(2)}%
24h High: $${currentAsset.high24h?.toLocaleString()}
24h Low: $${currentAsset.low24h?.toLocaleString()}
Volume (Base): ${currentAsset.baseVolume}`
    : `No market data available for ${selectedSymbol}`;

  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    sendMessage,
    isStreaming,
    stopStreaming,
  } = useAIChat({
    apiKey: openrouterApiKey,
    model: selectedModel,
    systemPromptTemplate: systemPrompt,
    symbol: selectedSymbol,
    contextSummary,
  });

  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isStreaming]);

  // Handle send
  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput('');
  };

  const hasApiKey = openrouterApiKey && openrouterApiKey.trim().length > 0;

  return (
    <div className="h-full flex flex-col relative bg-main animate-in fade-in duration-300">
      
      {/* ── Chat Header bar ── */}
      <div className="px-5 py-3 border-b border-main flex items-center justify-between shrink-0 bg-secondary/30">
        <div className="flex items-center space-x-2 text-muted">
          <TerminalSquare size={14} className="text-accent" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-main truncate max-w-[150px]">
            {activeSession ? activeSession.title : 'New Chat'}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={() => createSession(selectedSymbol)}
            className="p-1.5 rounded-md text-muted hover:text-main hover:bg-secondary transition-colors"
            title="New Chat"
          >
            <Plus size={14} />
          </button>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={cn("p-1.5 rounded-md transition-colors", showHistory ? "text-accent bg-accent/10" : "text-muted hover:text-main hover:bg-secondary")}
            title="Chat History"
          >
            <History size={14} />
          </button>
        </div>
      </div>

      {/* ── Session History Sidebar Overlay ── */}
      {showHistory && (
        <div className="absolute inset-x-0 top-[45px] bottom-0 z-10 bg-main/95 backdrop-blur-sm flex flex-col border-b border-main animate-in slide-in-from-top-2">
          <div className="p-4 border-b border-main flex items-center justify-between">
            <span className="text-[12px] font-bold">Past Sessions</span>
            <button onClick={() => setShowHistory(false)} className="text-muted hover:text-rose-500 transition-colors">
              <XCircle size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto thin-scrollbar p-3 space-y-1">
            {sessions.length === 0 ? (
              <div className="text-[11px] text-muted text-center py-6">No previous chats.</div>
            ) : (
              sessions.slice().reverse().map(session => (
                <div 
                  key={session.id} 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border group transition-all cursor-pointer",
                    activeSessionId === session.id ? "bg-accent/10 border-accent/30" : "hover:bg-secondary border-transparent"
                  )}
                  onClick={() => {
                    setActiveSessionId(session.id);
                    setShowHistory(false);
                  }}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                    <MessageSquare size={12} className={activeSessionId === session.id ? "text-accent" : "text-muted"} />
                    <div className="truncate text-[12px] font-medium text-main">
                      {session.title}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-rose-500 transition-all p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Message Area ── */}
      <div className="flex-1 overflow-y-auto thin-scrollbar p-5 space-y-5">
        {!activeSession || activeSession.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-main flex items-center justify-center bg-secondary/30 text-accent">
              <Bot size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="text-[14px] font-bold">FinTrace AI Analyst</h3>
              <p className="text-[11px] text-muted max-w-[220px]">
                I can analyze price trends, interpret technical indicators, and answer questions about <strong className="text-main">{selectedSymbol.replace('USDT', '')}</strong>.
              </p>
            </div>
          </div>
        ) : (
          activeSession.messages.map(msg => (
            <div 
              key={msg.id} 
              className={cn("flex flex-col space-y-2 max-w-[92%]", msg.role === 'user' ? "ml-auto items-end" : "mr-auto")}
            >
              <div className="flex items-center space-x-2 px-1 text-[9px] font-bold uppercase tracking-widest text-muted">
                {msg.role === 'user' ? (
                  <><span>You</span><User size={10} /></>
                ) : (
                  <><Bot size={10} className="text-accent" /><span>Agent</span></>
                )}
              </div>
              
              <div className={cn(
                "p-3.5 rounded-2xl text-[12.5px] leading-relaxed break-words",
                msg.role === 'user' ? "bg-accent text-white rounded-br-sm" : "bg-secondary border border-main rounded-bl-sm",
                msg.error ? "border-rose-500/50 text-rose-500 bg-rose-500/10" : ""
              )}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-p:my-1 prose-pre:bg-main/50 prose-pre:border prose-pre:border-main prose-sm max-w-none">
                     <ReactMarkdown>{msg.content || '...'}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="p-4 border-t border-main bg-main shrink-0">
        {!hasApiKey ? (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[11px] text-center">
            <span className="text-rose-500 font-semibold mb-1 block">No OpenRouter API Key</span>
            <span className="text-muted leading-snug">Please configure your API key in Settings to use the AI Analysis agent.</span>
          </div>
        ) : (
          <form onSubmit={handleSend} className="relative flex items-end">
            <textarea
              rows={Math.min(4, Math.max(1, input.split('\n').length))}
              placeholder={`Ask about ${selectedSymbol.replace('USDT', '')}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="w-full bg-secondary border border-main rounded-xl py-2.5 pl-4 pr-12 text-[12px] focus:outline-none focus:ring-1 focus:ring-accent/40 resize-none thin-scrollbar leading-relaxed block"
              style={{ minHeight: '40px' }}
            />
            {isStreaming ? (
              <button 
                type="button" 
                onClick={stopStreaming}
                className="absolute right-2 bottom-2 p-1.5 w-7 h-7 flex items-center justify-center bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors shadow-sm"
              >
                <div className="w-2.5 h-2.5 bg-current rounded-sm" />
              </button>
            ) : (
              <button 
                type="submit"
                disabled={!input.trim()}
                className="absolute right-2 bottom-2 p-1.5 w-7 h-7 flex items-center justify-center bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:hover:bg-accent transition-colors shadow-sm"
              >
                <Send size={12} className="ml-0.5" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
