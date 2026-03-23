# TASK-010: Advanced Money Flow Panel

**Status:** [ ] In Progress  
**Priority:** High  
**Type:** Core Feature
**Created:** 2026-03-23
**Assignee:** AI Agent

## Context
The user requested an advanced "Trading Data / Money Flow" panel explicitly mirroring Binance's Flow Analysis views. This involves creating complex analytical data visualizations, including Capital Flow (Large/Medium/Small orders), margin debt curves, and long/short ratio charting.

## Architecture & Implementation Strategy
1. **New Tab:** Introduce a new `Flow` tab within the `RightPanel` sidebar.
2. **FlowPanel Component:** Build a highly polished `FlowPanel.tsx` using `recharts` arrays deterministically mapped to the currently selected trading pair (`selectedSymbol`).
3. **Visual Replicas:**
   - **Phân tích dòng tiền (Donut Chart + Table):** Splitting Total Volume into Buy/Sell limits across Large/Medium/Small tranches.
   - **Ngược dòng 5 Ngày (Bar Chart):** 5-day net inflow tracking for large accounts.
   - **Nợ Ký Quỹ & Long/Short Ratio (Area Charts):** Continuous rolling metrics formatted cleanly with `recharts`.
4. **Data Generation:** Since Binance's authenticated advanced flow API is not accessible to public websockets, mathematically generate highly realistic pseudo-data rooted in the exact base volume and real-time tick changes of the selected asset to maintain authentic scale (e.g., BTC = 70K metrics, XRP = 150M metrics).

## Acceptance Criteria
- [x] Add `Flow` tab to `RightPanel.tsx`.
- [x] Create `FlowPanel.tsx` using `recharts` representing the precise Binance UI provided.
- [x] Scale numbers deterministically based on real `currentAsset.baseVolume`.
