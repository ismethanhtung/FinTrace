---
description: Integrate a new external API or data source
---

# Workflow: New API Integration

## Steps

1. **Research the API first** — Before writing any code, document:
   - Base URL and authentication method
   - Rate limits (requests per minute/second)
   - Whether it requires server-side secrets
   - Response shape for the data you need

// turbo
2. **Find next task number** — `ls tasks/ | grep TASK | sort | tail -1`

3. **Create task file** — `tasks/TASK-{NNN}-api-{service-name}.md`  
   Include in Context: the API docs summary from step 1.  
   Include in Acceptance Criteria:
   - [ ] Service functions have explicit TypeScript types
   - [ ] All fetch calls have error handling
   - [ ] Rate limits are respected (no aggressive polling)
   - [ ] Secrets are NOT exposed client-side
   - [ ] Tests mock the API — no real HTTP calls in tests
   - [ ] `docs/API.md` is updated

4. **Add to docs/API.md** — Document the new API endpoints following the existing format.

5. **Add env variables** — If the API requires a key:
   - Add to `.env.example` with placeholder
   - Add to `.env.local` with real value (gitignored)
   - Document in `docs/API.md §3 Environment Variables`

6. **Create service file** — `src/services/{name}Service.ts`
   - Export a singleton service object
   - All functions are `async` and return typed Promises
   - Transform raw API responses into FinTrace internal types
   - Never import React in service files

7. **Create/update hook** — `src/hooks/use{Name}Data.ts`
   - Wraps the service in useState + useEffect
   - Handles loading, error, and data states
   - Uses `useCallback` to prevent re-fetch loops

8. **Integrate into Context** (if globally needed) — Update `MarketContext.tsx` or create a new context if it's a separate domain.

9. **Update components** — Connect the new data to UI via context hooks.

10. **Write tests** — Mock `fetch` using `vi.fn()` or `msw`. Test happy path + error path.

// turbo
11. **Run lint** — `npm run lint`

12. **Update task and report**.
