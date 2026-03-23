# TASK-018: Separate 3 Panels and Localize Grouping Filter to OrderBook

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** UX Refactor  
**Created:** 2026-03-24  
**Updated:** 2026-03-24  
**Assignee:** AI Agent

## Context

User feedback: không cần thanh top chung cho cả 3 phần. Cần tách rõ từng panel:
- Recent Trades
- Order Book
- Depth

Và bộ lọc grouping chỉ thuộc Order Book (không dùng chung toàn khối).

## Acceptance Criteria

- [x] Không còn top header chung `RECENT TRADES | ORDER BOOK | DEPTH`
- [x] Mỗi panel có header riêng, tách biệt rõ ràng
- [x] Grouping filter đặt riêng trong header panel `Order Book`
- [x] Layout vẫn giữ thứ tự: Recent Trades trái, Order Book giữa, Depth phải
- [x] Build pass

## Implementation Plan

- [x] Refactor `src/components/OrderBook.tsx` panel headers
- [x] Move grouping controls into center panel only
- [x] Build verify + close task

## Files Changed

- `src/components/OrderBook.tsx`
