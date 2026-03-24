# TASK-022: Market Page Redesign — CryptoWall Layout adapted to FinTrace Design System

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** UI Redesign  
**Created:** 2026-03-24  
**Updated:** 2026-03-24  
**Assignee:** AI Agent

## Context

Trang `/market` hiện tại có layout không thu hút, thiếu chiều sâu visual, và chứa nhiều dấu hiệu "AI-generated UI".  
User cung cấp template mẫu (CryptoWall style) với layout bao gồm:
- Sub-nav tabs (Top / Trending / New / Gainers)
- Stats Grid với miniature sparkline chart
- Network filter pill bar
- Table đầy đủ cột với sparkline 7 ngày, sentiment badge, Buy button on hover
- Pagination
- Blog Section + Footer

Yêu cầu: **Áp dụng layout và pattern từ template, giữ nguyên design system màu sắc FinTrace** (CSS variables --bg-main, --accent, --border-color...).  
Giai đoạn 1: mock data, chưa cần heatmap.

## Acceptance Criteria

- [x] Header giữ nguyên style FinTrace (đồng bộ trang chủ)
- [x] Sub-tabs bar (Top / Trending / Gainers / New) render đúng
- [x] Stats Grid (6 cards) với sparkline từ recharts
- [x] Filter pills (All / BSC / Solana / Ethereum...) hoạt động
- [x] Table: full columns (#, Name/Buy hover, Price, 1h%, 24h%, 7d%, MarketCap, Volume, Supply, Sentiment, Sparkline 7d)
- [x] Pagination UI
- [x] Dùng mock data hoàn toàn (không kéo API), phù hợp với đặc điểm giai đoạn này
- [x] Không sử dụng màu hardcode của CryptoWall (green #00FF00, bg #0F0E1E) — dùng CSS variables FinTrace
- [x] Heatmap chưa được thêm vào giai đoạn này
- [x] Lint sạch, build không lỗi

## Implementation Plan

- [x] Step 1: Viết task file (file này)
- [x] Step 2: Cài dependency recharts nếu chưa có
- [x] Step 3: Tạo mock data (cryptoData, sparklines, stats) FinTrace-adapted
- [x] Step 4: Build StatCard + Sparkline component dùng recharts + CSS vars
- [x] Step 5: Build filter pills, sub-tabs
- [x] Step 6: Build Table rows: TokenAvatar + all columns + sentiment badge + Buy hover
- [x] Step 7: Build Pagination
- [x] Step 8: Assemble full page, lint check

## Files Changed

- `src/app/market/page.tsx` — complete rewrite
