"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, MessageSquare, Newspaper, FileText, GripVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import { ChatPanel } from './ai/ChatPanel';
import { NewsPanel } from './ai/NewsPanel';
import { SummaryPanel } from './ai/SummaryPanel';

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 340;

type Tab = 'chat' | 'news' | 'summary';

export const RightPanel = () => {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, [width]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      // Dragging left edge: drag left = wider (negative delta = more width)
      const delta = startX.current - e.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(next);
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <div
      className="h-full flex flex-col bg-main border-l border-main relative shrink-0"
      style={{ width }}
    >
      {/* ── Left-edge resize handle ── */}
      <div
        onMouseDown={onMouseDown}
        className="absolute left-0 top-0 w-1.5 h-full z-20 cursor-col-resize flex items-center justify-center hover:bg-accent/10 active:bg-accent/20 transition-colors"
        title="Drag to resize panel"
      >
        <div className="w-0.5 h-10 rounded-full bg-main border border-main pointer-events-none" />
      </div>

      {/* ── Header w/ Tabs ── */}
      <div className="pl-4 pr-3 py-2 border-b border-main flex items-center justify-between shrink-0 bg-main">
        <div className="flex items-center space-x-2 bg-secondary p-1 rounded-lg border border-main">
          {[
            { id: 'chat', label: 'AI Chat', icon: MessageSquare },
            { id: 'news', label: 'News', icon: Newspaper },
            { id: 'summary', label: 'Summary', icon: FileText },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={cn(
                  'flex items-center space-x-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all',
                  isActive
                    ? 'bg-main text-accent shadow-sm border border-main/50'
                    : 'text-muted hover:text-main hover:bg-main/50 border border-transparent'
                )}
              >
                <Icon size={12} className={isActive ? 'text-accent' : 'opacity-70'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-1 pl-2" title="FinTrace AI">
          <Sparkles size={13} className="text-accent hover:opacity-80 transition-opacity cursor-pointer" />
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 min-h-0 relative">
        {activeTab === 'chat' && <ChatPanel />}
        {activeTab === 'news' && <NewsPanel />}
        {activeTab === 'summary' && <SummaryPanel />}
      </div>
    </div>
  );
};
