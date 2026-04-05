# Home Stock Depth Uses Board Data Pipeline

## Summary

From 2026-04-05, stock `OrderBook` on home route `/` uses the same source-of-truth pipeline as `/board`:

- Vietcap snapshot (`/api/board/vietcap-snapshot`) as base depth fallback
- DNSE realtime stream (`/api/dnse/realtime/stream`) as live overlay

This replaces the old stock-only polling path using Lambda `price_depth` inside `useOrderBook`.

## Why

- Keep stock depth values on `/` and `/board` consistent.
- Reuse the same realtime channel so home depth can update immediately when DNSE stream emits.
- Avoid having separate, potentially divergent stock depth pipelines.

## Data Flow

1. `useOrderBook` (stock branch) fetches Vietcap snapshot for groups:
`VN30`, `HNX30`, `HOSE`, `HNX`, `UPCOM`.
2. `useOrderBook` subscribes DNSE stream for current stock symbol on boards `G1,G2,G3`.
3. For each side:
- if DNSE depth exists: use DNSE levels
- else: fallback to Vietcap snapshot levels
4. DNSE quantity is multiplied by `10` to match existing board volume normalization.
5. Merged levels are converted into the shared orderbook model (`bids`, `asks`, `spread`, `midPrice`, cumulative totals/depth).

## UI Behavior on `/`

- Center orderbook section now renders real stock bids/asks instead of `Soon`.
- Right depth section now has:
- depth table (`KL | Gia mua | Gia ban | KL`) with top 3 levels
- simple depth bars for the same levels
- Coin orderbook path is unchanged (Binance snapshot + websocket depth + bookTicker).

## Files

- `src/hooks/useOrderBook.ts`
- `src/components/OrderBook.tsx`
- `tasks/TASK-051-home-stock-depth-from-board-pipeline.md`
