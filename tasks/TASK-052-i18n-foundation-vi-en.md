# TASK-052: Establish I18n Foundation (Vietnamese + English)

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Critical  
**Type:** Feature  
**Created:** 2026-04-05  
**Updated:** 2026-04-05  
**Assignee:** AI Agent

## Context

Website hiện còn nhiều text hardcode tiếng Anh, chưa có nền i18n chuẩn để mở rộng theo trang/module. Cần dựng nền tảng i18n chuyên nghiệp trước, ưu tiên 2 ngôn ngữ `vi` + `en`, đảm bảo maintainable và dễ rollout theo từng màn hình.

## Acceptance Criteria

- [x] Có i18n core với locale chuẩn `vi/en`, có fallback.
- [x] Có dictionary tách module, dễ mở rộng theo page/module.
- [x] Có `t(key, values)` hỗ trợ placeholder.
- [x] Có `I18nProvider` + hook để dùng xuyên app.
- [x] Locale được persist bằng cookie + localStorage.
- [x] Middleware bootstrap locale ban đầu từ `Accept-Language`.
- [x] Đã migrate một phần shell quan trọng làm mẫu (`topbar/menu/settings layout/world switch`).
- [x] Có docs kiến trúc rollout i18n.

## Implementation Plan

- [x] Tạo cấu trúc `src/i18n/*` cho config/messages/translate.
- [x] Tạo `src/context/I18nContext.tsx` để quản lý locale + translate.
- [x] Nối `I18nProvider` vào `src/app/layout.tsx`.
- [x] Cập nhật `middleware.ts` để set locale cookie lần đầu.
- [x] Migrate text hardcode trong các shell component mẫu.
- [x] Viết docs kiến trúc `docs/i18n-architecture.md`.

## Files Changed

- `src/i18n/messages/en.ts`
- `src/i18n/messages/vi.ts`
- `src/i18n/config.ts`
- `src/i18n/translate.ts`
- `src/context/I18nContext.tsx`
- `src/components/shell/LocaleSwitch.tsx`
- `src/components/shell/AppTopBar.tsx`
- `src/components/shell/WorldSwitch.tsx`
- `src/components/UserMenu.tsx`
- `src/components/SettingsLayout.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `middleware.ts`
- `docs/i18n-architecture.md`
- `tasks/TASK-052-i18n-foundation-vi-en.md`

## Notes

- Chưa chuyển hết toàn bộ text ở tất cả page/component; đã chuẩn bị nền + mẫu để rollout incremental.
- Route hiện tại giữ nguyên, chưa thêm locale prefix vào URL để tránh ảnh hưởng SEO/routing hiện hữu.
