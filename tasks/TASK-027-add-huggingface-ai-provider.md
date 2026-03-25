# TASK-027: Add Hugging Face AI Provider

**Status:** [ ] Draft | [ ] In Progress | [ ] Done | [ ] Blocked
**Priority:** High
**Type:** Feature
**Created:** 2026-03-25
**Updated:** 2026-03-25
**Assignee:** AI Agent

## Context
FinTrace AI hiện hỗ trợ `openrouter` và `groq` qua:
- `src/services/aiProviderService.ts` (routing + SSE stream parser)
- các proxy route `src/app/api/<provider>/...`:
  - `/models`
  - `/chat/completions`
- fallback key được giải quyết server-side theo docs.

Yêu cầu: thêm `huggingface` (Hugging Face Inference Providers qua router OpenAI-compatible) để có thể:
- chọn model trong UI
- chat streaming hoạt động tương tự các provider hiện tại
- có fallback token server-side khi user chưa nhập key trong Settings.

## Acceptance Criteria
1. `huggingface` xuất hiện như 1 provider built-in trong Settings và ChatPanel.
2. `/api/ai/key-status` trả về thêm trường `huggingface`.
3. Nếu user chưa nhập HF token, proxy server vẫn có thể gọi upstream bằng fallback key (env/AWS).
4. Model selector dùng được `/api/huggingface/models`; nếu thất bại thì dùng curated fallback models.
5. Chat streaming:
   - SSE parsing theo `choices[0].delta.content` giống contract OpenAI.
   - UI không bị crash khi upstream trả lỗi 401/403 (fallback logic giữ UI hoạt động).

## Implementation Plan
1. `src/context/AppSettingsContext.tsx`
   - Add built-in provider config `huggingface`
   - cập nhật mapping `serverKeyStatus` để gồm `huggingface`
2. `src/services/aiProviderService.ts`
   - extend `getProxyBase()` cho `huggingface` => `/api/huggingface`
   - extend `buildHeaders()` để gửi `Authorization: Bearer <hf_token>` cho provider này
3. `src/lib/aiModelDefaults.ts`
   - add default model + fallback models cho `huggingface`
4. `src/lib/getHuggingFaceKey.ts` (new)
   - resolve key ưu tiên env local, fallback AWS Secrets Manager
5. `src/app/api/ai/key-status/route.ts`
   - extend thêm `huggingface`
6. Proxy routes (new)
   - `src/app/api/huggingface/models/route.ts` => gọi `https://router.huggingface.co/v1/models`
   - `src/app/api/huggingface/chat/completions/route.ts` => gọi `https://router.huggingface.co/v1/chat/completions`
7. Docs/env
   - update `.env.example`
   - update `docs/ARCHITECTURE.md` phần AI key fallback.

## Files Changed
- `src/context/AppSettingsContext.tsx`
- `src/services/aiProviderService.ts`
- `src/lib/aiModelDefaults.ts`
- `src/lib/getHuggingFaceKey.ts` (new)
- `src/app/api/ai/key-status/route.ts`
- `src/app/api/huggingface/models/route.ts` (new)
- `src/app/api/huggingface/chat/completions/route.ts` (new)
- `.env.example`
- `docs/ARCHITECTURE.md`

