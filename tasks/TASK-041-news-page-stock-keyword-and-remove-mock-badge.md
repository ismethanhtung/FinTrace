# TASK-041: News Page Stock Keywords (`chứng khoán`) + Remove Mock Badge

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Bugfix / UX  
**Created:** 2026-03-30  
**Updated:** 2026-03-30  
**Assignee:** AI Agent

## Context

Khi người dùng chuyển sang stock universe trên trang News:

1. Nguồn `/api/general-news` vẫn dùng bộ từ khóa crypto mặc định nên kết quả lệch ngữ cảnh.
2. UI hiển thị badge `Mock`, gây hiểu nhầm trong chế độ stock.

Yêu cầu:

- Với stock, truy vấn tin theo hướng tiếng Việt và ngữ nghĩa chứng khoán (thay vì crypto).
- Vẫn lấy tối đa 90 bài mới nhất.
- Bỏ chữ `Mock` trên trang News khi ở stock.

## Acceptance Criteria

- [x] `NewsPageClient` gọi `/api/general-news` kèm `universe` hiện tại và `limit=90`.
- [x] `/api/general-news` dùng bộ query + locale theo universe:
  - coin: crypto (en-US)
  - stock: chứng khoán (vi-VN)
- [x] Cache của `/api/general-news` tách theo universe để không lẫn data coin/stock.
- [x] Trang News không còn hiển thị badge `Mock` ở stock.
- [x] Integration tests pass.

## Files Changed

- `tasks/TASK-041-news-page-stock-keyword-and-remove-mock-badge.md`
- `src/components/news/NewsPageClient.tsx`
- `src/app/api/general-news/route.ts`
- `src/app/api/general-news/route.integration.test.ts`
