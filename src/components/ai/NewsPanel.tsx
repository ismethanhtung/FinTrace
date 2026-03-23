"use client";

import React, { useState } from 'react';
import { ExternalLink, RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import { useCoinNews } from '../../hooks/useCoinNews';
import { useAppSettings } from '../../context/AppSettingsContext';
import { NewsItem } from '../../services/newsService';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

const NewsItemCard = ({ item }: { item: NewsItem }) => {
  const { openrouterApiKey, selectedModel } = useAppSettings();
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSummarize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!openrouterApiKey) {
      setError('Vui lòng thêm API Key trong Cài đặt');
      return;
    }
    
    setIsSummarizing(true);
    setError(null);
    
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'HTTP-Referer': 'https://fintrace.app',
          'X-Title': 'FinTrace',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel || 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'Bạn là chuyên gia phân tích tài chính AI. Dựa trên tiêu đề và mô tả của bài báo, hãy tóm tắt ý chính và tác động thị trường (nếu có). Trả về dưới dạng 2-3 gạch đầu dòng (bullet points) vô cùng ngắn gọn, xúc tích bằng tiếng Việt. Bắt buộc dùng Markdown (dấu -).'
            },
            {
              role: 'user',
              content: `Title: ${item.title}\nContent: ${item.description || 'No additional content.'}`
            }
          ]
        })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setSummary(data.choices[0].message.content);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tóm tắt');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="group block p-4 bg-secondary/40 hover:bg-secondary rounded-lg border border-transparent hover:border-main transition-all relative"
    >
      <a href={item.url} target="_blank" rel="noreferrer" className="block">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="text-[12.5px] font-semibold leading-snug group-hover:text-accent transition-colors text-main pr-8">
            {item.title}
          </h4>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-2">
            <span className="px-1.5 py-0.5 bg-main border border-main rounded text-[9px] font-medium text-muted uppercase">
              {item.source}
            </span>
            <span className="text-[10px] text-muted">{item.relativeTime}</span>
          </div>
          <ExternalLink size={12} className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </a>

      {/* ── Summarize Button ── */}
      <button
        onClick={handleSummarize}
        disabled={isSummarizing || summary !== null}
        className={cn(
          "absolute top-3 right-3 p-1.5 rounded-md transition-colors z-10",
          summary ? "text-accent bg-accent/10 cursor-default" : "text-muted hover:text-accent hover:bg-accent/10"
        )}
        title="AI Summarize"
      >
        {isSummarizing ? <Loader2 size={13} className="animate-spin text-accent" /> : <Sparkles size={13} />}
      </button>

      {/* ── Summary Block ── */}
      <AnimatePresence>
        {(summary || error) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-main overflow-hidden w-full relative z-10"
          >
            {error ? (
              <div className="text-rose-500 text-[11px] font-medium p-2 bg-rose-500/10 rounded border border-rose-500/20">{error}</div>
            ) : (
              <div className="prose prose-invert prose-p:my-0 prose-ul:my-1 prose-li:my-0.5 max-w-none text-[12px] leading-relaxed text-main/90 marker:text-accent">
                 <ReactMarkdown>{summary || ''}</ReactMarkdown>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const NewsPanel = () => {
  const { selectedSymbol } = useMarket();

  const { news, isLoading, error, refetch, baseSymbol } = useCoinNews({
    symbol: selectedSymbol,
  });

  return (
    <div className="flex-1 overflow-y-auto thin-scrollbar p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2 text-muted">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-main">
            Latest News · {baseSymbol}
          </span>
        </div>
        <button
          onClick={refetch}
          disabled={isLoading}
          className={cn(
            "p-1.5 rounded-md text-muted hover:text-main hover:bg-secondary transition-colors",
            isLoading && "animate-spin"
          )}
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {error ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-[12px] flex flex-col items-center justify-center text-center space-y-2">
          <span>Failed to load news via RSS.</span>
          <span className="text-[10px] opacity-80">{error}</span>
          <button onClick={refetch} className="px-3 py-1 bg-rose-500/20 rounded hover:bg-rose-500/30 transition-colors mt-2">
            Retry
          </button>
        </div>
      ) : isLoading && news.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 space-y-3 opacity-60">
          <RefreshCw size={18} className="animate-spin text-muted" />
          <span className="text-[11px] text-muted">Fetching {baseSymbol} news...</span>
        </div>
      ) : (
        <div className="space-y-4 pb-10 flex flex-col">
          {news.length === 0 ? (
            <div className="text-center text-muted text-[12px] py-10 border border-main border-dashed rounded-lg bg-secondary/20">
              No recent news found for {baseSymbol}.
            </div>
          ) : (
            news.map((item) => <NewsItemCard key={item.id} item={item} />)
          )}
        </div>
      )}
    </div>
  );
};
