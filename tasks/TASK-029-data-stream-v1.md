# TASK-029: Data Stream v1 (Live Trades + Highlight + Funding)

**Status:** [x] Done  
**Priority:** High  
**Type:** Feature  
**Created:** 2026-03-25  
**Updated:** 2026-03-25  
**Assignee:** AI Agent / GPT-5.4 Nano

## Context
Người dùng muốn trang `Data Stream` (real-time tape) hoạt động như “nhịp đập” thị trường: mượt, ít giật UI, có filtering thông minh, có chỉ báo tốc độ và Panic/FOMO.

## Scope / Acceptance Criteria (v1)
1. Có route UI mới: `src/app/data-stream/page.tsx` và menu link sang đúng route.
2. Tape hiển thị real-time `Live Trades` từ Binance WebSocket theo cặp đang chọn (`selectedSymbol`) và market mode (`spot`/`futures`).
3. Có `Highlight` cho `BUY` lớn theo ngưỡng USD (mặc định `50,000`).
4. Có `Funding Rates` (futures) từ `Mark Price Stream` (public, không cần API key).
5. Smart Filtering:
   - `Min Volume (USD)` cho trade events.
   - Toggle `BUY / SELL / FUNDING`.
6. UI có `Speed Meter` và `Panic/FOMO Meter` dựa trên dữ liệu trong cửa sổ thời gian gần nhất.
7. Buffer + filtering chạy trên **Web Worker** để tránh giật UI, chỉ giữ tối đa `100` record mới nhất.
8. Sound alert “ting” cho highlight (yêu cầu người dùng click để cho phép autoplay).

## Implementation Notes
- Không có on-chain realtime (Whale/Liquidity/Social) vì hiện tại không dùng provider realtime có API key.
- Trong `DataStreamFilters` có các toggle “Soon” cho các mục còn thiếu để UI rõ ràng.

## Files Changed / Added
- Added: `src/app/data-stream/page.tsx`
- Added: `src/app/data/page.tsx` (redirect back-compat)
- Updated: `src/components/UserMenu.tsx`
- Added: `src/hooks/useDataStream.ts`
- Added: `src/workers/dataStreamWorker.ts`
- Added: `src/lib/dataStream/types.ts`
- Added: `src/services/dataStream/normalizeBinanceEvent.ts`
- Added UI: `src/components/dataStream/*` (Tape, Filters, SpeedMeter, PanicFomoMeter)

## Remaining (Coming Soon)
- Whale Alert (on-chain)
- Liquidity Changes / Rugpull alerts (pool realtime)
- Social Pulse (KOL/project realtime)
- Aggregated View theo “wallet aggregation” (cần on-chain/wallet event)

## Manual Checklist
- Vào `/data-stream`, chọn cặp từ sidebar, đổi Spot/Futures: tape cập nhật đúng.
- Tắt/bật `BUY/SELL` và chỉnh `Min Volume`: tape lọc đúng.
- Chỉnh `Highlight (BUY >= USD)`: phát âm thanh + highlight record đúng.
- Khi bật Futures: có record `FUNDING`.
- Không giật UI khi dữ liệu dày (worker buffer 100 rows).

