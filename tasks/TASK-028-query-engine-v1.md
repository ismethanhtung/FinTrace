# TASK-028: Query Engine v1 (Cross-chain + NLQ)

**Status:** [ ] Draft | [ ] In Progress | [ ] Blocked | [x] Done  
**Priority:** Critical  
**Type:** Feature  
**Created:** 2026-03-25  
**Updated:** 2026-03-25  
**Assignee:** AI Agent / GPT-5.4 Nano  

## Context
Người dùng muốn một trang “Query Engine” chuyên nghiệp, bám kiến trúc theo `docs/ARCHITECTURE.md` và `AGENT_RULES.md`, bao gồm:
- Cross-chain search theo địa chỉ contract/token address
- Advanced screening theo bộ lọc (ít nhất ở mức v1: lọc theo metric có sẵn)
- Natural Language Query (NLQ): dịch câu chat thành structured query
- Security check engine và Wallet/Whale tracking (dự kiến triển khai theo giai đoạn vì phụ thuộc API/indexer)

Repo hiện tại đang có UI layout + AI proxy routes + cơ chế network-map (dùng CoinGecko).

## Acceptance Criteria
- [x] Có route UI tĩnh `src/app/query/page.tsx` (không dùng placeholder `[slug]`).
- [x] UI có input truy vấn (NLQ) + selector mode: `Simple / Filtering / Wallet / Security` (ít nhất hiển thị đúng layout và trạng thái loading/error).
- [x] Có server API route xử lý NLQ -> “query spec” JSON (dùng AI provider proxy sẵn có).
- [x] Cross-chain search (v1) theo `tokenAddress`: trả về danh sách match theo nhiều mạng, kèm giá/volume/liquidity (sourced từ DexScreener hoặc provider tương đương).
- [x] Advanced screening (v1) chỉ chạy trên “candidate set” lấy được từ cross-chain search (để tránh phải quét toàn bộ vũ trụ token).
- [x] Security check engine (v1) chạy được các scan “nhanh” nếu provider cấu hình sẵn; nếu chưa có provider key thì hiển thị thông báo user-facing rõ ràng (không mock).
- [x] Wallet/Whale tracking (v1) có luồng gọi API và hiển thị kết quả P&L/portfolio/activity nếu provider cấu hình sẵn; nếu chưa có thì hiển thị thông báo user-facing rõ ràng (không mock).
- [x] Tất cả logic fetch nằm ở `src/services/` và/hoặc Route Handlers `src/app/api/**/` theo đúng layered architecture (không fetch trực tiếp trong component).
- [x] Có unit test cho các function/service mới (parse DexScreener response + validator QuerySpec).

## Implementation Plan
1. Chuẩn hoá UI layout: lấy pattern từ `PageLayout`, `Market` table, `UserMenu`, các class token.
2. Tạo “query domain types” (`src/lib/queryEngine/types.ts`) và validator (Zod nếu đã có; nếu chưa thì viết custom validator rõ ràng).
3. Tạo API route:
   - `src/app/api/query/nlq/route.ts`: NLQ -> JSON query spec
   - `src/app/api/query/search/route.ts`: query spec -> kết quả (cross-chain + screening candidate set)
4. Tạo services:
   - `src/services/dexScreenerService.ts`: cross-chain token/pair fetch + transform sang model thống nhất
   - `src/services/queryEngineService.ts`: orchestrator: search -> screening -> format response
   - (tuỳ chọn v1) `src/services/walletTrackingService.ts`, `src/services/securityAuditService.ts` dưới dạng provider adapters
5. UI wiring:
   - Loading skeleton + error states
   - Render kết quả theo bảng/tóm tắt “như web” (metric cards + table)
6. Tests:
   - Test schema validation & mapping
7. Manual checklist:
   - Thử 3 input: contract address, NLQ filtering, wallet/security khi provider có cấu hình
8. Cập nhật docs nếu cần: `docs/ARCHITECTURE.md` hoặc thêm `docs/API.md` cho endpoints query.

## Files Changed
<!-- Update as you work -->

- `src/app/query/page.tsx`
- `src/app/api/query/nlq/route.ts`
- `src/app/api/query/search/route.ts`
- `src/hooks/useQueryEngine.ts`
- `src/services/dexScreenerService.ts`
- `src/services/queryEngineService.ts`
- `src/services/securityAuditService.ts`
- `src/services/walletTrackingService.ts`
- `src/lib/queryEngine/types.ts`
- `src/lib/queryEngine/validateQuerySpec.ts`
- Tests: `src/services/dexScreenerService.test.ts`, `src/lib/queryEngine/validateQuerySpec.test.ts`

## Notes
- Với Cross-chain v1: ưu tiên provider không cần API key (DexScreener public).
- Với Wallet/Security v1: cần xác nhận provider + quyền truy cập/API key từ bạn; nếu không có thì chỉ implement “luồng API + message rõ ràng” (không mock).

