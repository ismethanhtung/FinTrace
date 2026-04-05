# I18n Architecture (vi + en)

## Goals

- Dễ mở rộng theo `page/module`.
- Dễ bảo trì nhờ key dịch có cấu trúc và type-safe.
- Không phá route hiện tại, không bắt buộc locale prefix trong URL.

## Current Design

- Locale được quản lý qua `I18nContext`:
  - `locale`, `setLocale`, `t(key, values)`.
- Dictionary đặt tại `src/i18n/messages/`:
  - `en.ts` là schema chuẩn.
  - `vi.ts` bám type của `en.ts` để đảm bảo đủ key.
- Locale persistence:
  - cookie: `ft-locale`
  - localStorage: `ft-locale`
- `middleware.ts`:
  - bootstrap locale lần đầu từ `Accept-Language`.
  - vẫn giữ logic redirect `/market` <-> `/board` theo universe.

## Module Strategy

Tổ chức key theo module để scale:

- `common.*`: text dùng chung.
- `navigation.*`: menu/topbar/nav.
- `settingsLayout.*`: shell settings.
- Có thể mở rộng:
  - `marketPage.*`
  - `boardPage.*`
  - `newsPage.*`
  - `queryPage.*`

## Convention

- Đặt key theo `module.intent`, ví dụ:
  - `navigation.market`
  - `marketPage.filters.marketType`
- Tránh key mơ hồ như `title1`, `labelA`.
- Text động dùng placeholder:
  - `"Switch to {label}"`
  - gọi `t("common.switchTo", { label: "Coin" })`

## Rollout Plan

1. Migrate shell dùng chung trước (`AppTopBar`, `UserMenu`, `SettingsLayout`).
2. Migrate từng page theo thứ tự ưu tiên business (`market` -> `board` -> `news` ...).
3. Thêm checklist kiểm tra key mới trong code review:
   - key đúng module
   - không hardcode text mới
   - đủ cả `vi/en`.
