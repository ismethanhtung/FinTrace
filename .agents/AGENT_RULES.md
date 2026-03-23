# FinTrace — AI Agent Master Rules

> **Version:** 1.0.0 | **Updated:** 2026-03-23  
> This file is the single source of truth for every AI agent working on FinTrace.  
> **Read this file entirely before making any change.**

---

## 0. Core Principles

1. **Safety first.** This is a financial application. Bad data, broken logic, or unhandled errors can mislead users into making wrong financial decisions. Every change must be deliberate and verified.
2. **No vague or exploratory code in production.** Never commit code with TODOs left as placeholders, `console.log` debugging, or mock data that was not explicitly requested.
3. **Traceability.** Every non-trivial feature must have a corresponding task file in `/tasks/`. Always create the task file first, work through it, then mark tasks done.
4. **Minimal blast radius.** When modifying shared utilities or context providers, think about every consumer. Run tests before and after.
5. **Ask before assuming.** If the requirements are ambiguous, stop and ask the user. Do not invent requirements.

---

## 1. Task Management Protocol

### 1.1 Before Starting Any Work

1. Check `/tasks/` for existing active tasks related to your change.
2. If no task file exists, **create one** following the Task File Format (see §1.2).
3. Get acknowledgement (or self-confirm if auto-mode) before writing a single line of code.

### 1.2 Task File Format

**File name:** `tasks/TASK-{NNN}-{kebab-case-title}.md`  
**Numbering:** Auto-increment from the highest existing TASK number. Check `tasks/` directory first.

```markdown
# TASK-{NNN}: {Title}

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** Critical | High | Medium | Low  
**Type:** Feature | Bugfix | Refactor | Docs | Test | Chore  
**Created:** YYYY-MM-DD  
**Updated:** YYYY-MM-DD  
**Assignee:** AI Agent / {name}

## Context
<!-- Why is this task needed? What problem does it solve? -->

## Acceptance Criteria
<!-- Precise, testable conditions that define "done" -->
- [ ] Criterion 1
- [ ] Criterion 2

## Implementation Plan
<!-- Step-by-step breakdown. Check off each step as you complete it. -->
- [ ] Step 1
- [ ] Step 2

## Files Changed
<!-- Update as you work -->
- `src/...`

## Notes
<!-- Edge cases, decisions made, references -->
```

### 1.3 After Completing Work

- Mark each acceptance criterion `[x]` as done.
- Update `Status` to `[x] Done`.
- Update `Updated` date.
- Do **not** delete task files. They are the audit trail.

---

## 2. Code Quality Rules

### 2.1 TypeScript

- **Strict types are mandatory.** `strict: true` is the target. Do not use `any` unless wrapping a third-party API with a documented reason in a comment.
- Every function exported from a service or utility must have explicit parameter and return types.
- Prefer `type` for object shapes, `interface` for extensible contracts (e.g., component props).
- No implicit `any`. No `@ts-ignore` without a comment explaining why.

### 2.2 React & Next.js

- Follow the App Router conventions (Next.js 14+). Do not mix Pages Router patterns.
- Mark client components with `"use client"` at the top. Prefer Server Components by default unless interactivity or browser APIs are needed.
- Never call browser APIs directly in Server Components.
- Keep components **single-responsibility**. If a component exceeds ~150 lines, consider splitting it.
- All data fetching from external APIs (Binance, etc.) must go through `/src/services/`. Never `fetch()` directly inside a component.
- Custom hooks live in `/src/hooks/`. They handle state and side-effects only — no JSX.
- Context providers live in `/src/context/`. Keep them lean (no business logic).

### 2.3 File & Folder Naming

| Kind | Convention | Example |
|---|---|---|
| Components | PascalCase | `MainChart.tsx` |
| Hooks | camelCase, prefix `use` | `useMarketData.ts` |
| Services | camelCase, suffix `Service` | `binanceService.ts` |
| Context | PascalCase, suffix `Context` | `MarketContext.tsx` |
| Types/interfaces | PascalCase | `Asset`, `Ticker` |
| Task files | `TASK-NNN-title.md` | `TASK-001-binance-integration.md` |
| Page routes | lowercase, kebab | `app/portfolio/page.tsx` |

### 2.4 CSS & Styling

- Use **Tailwind CSS v4** utility classes for layout, spacing, and responsive design.
- Use **CSS custom properties** (in `globals.css`) for theme tokens: colors, bg, border.
- Never hard-code hex colors in component files. Use the `--color-*` variables or Tailwind configured theme values.
- The accent color token is `--color-accent: #007AFF`. Use `text-accent`, `bg-accent`, etc.
- Do not install a new UI library without creating a TASK and discussing it first.

### 2.5 Error Handling

- Every `async` service call must be wrapped in `try/catch`.
- User-facing errors must be surfaced through the UI (toast, error state), never silently swallowed.
- Log errors with `console.error('[ServiceName] message', err)` — structured, not bare `console.log`.
- Financial data display must show a loading skeleton, not an empty/undefined state.

---

## 3. Architecture Rules

See full architecture details in `docs/ARCHITECTURE.md`.  
Key rules that agents must always follow:

1. **Layered architecture, no skipping layers:**
   ```
   UI Components → Context / Hooks → Services → External APIs
   ```
   Components do not call external APIs. Services do not import React.

2. **Single source of truth for market data:** `MarketContext` → `useMarketData` → `binanceService`.  
   No component should maintain its own separate fetch for market data.

3. **Environment secrets belong in `.env.local` only.** Never hard-code API keys, secrets, or credentials.

4. **No business logic in UI components.** Calculations, formatting, and data transforms go in utils (`src/lib/`) or the service layer.

---

## 4. Testing Rules

- Every new service function **must** have a unit test.
- Every new custom hook **must** have a test using `@testing-library/react-hooks` or equivalent.
- Tests live in `__tests__/` or beside the source file as `*.test.ts`.
- Test naming: `describe('ServiceName')` → `it('should {do something} when {condition}')`.
- Do not ship a feature with 0 tests unless explicitly approved by the user.
- Run `npm run test` after every significant change and record the result in the task file.

---

## 5. Git & Version Control

- **Never push directly to `main`.** Work on feature branches: `feat/TASK-{NNN}-{slug}`.
- Commit message format: `type(scope): TASK-NNN short description`
  - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
  - Example: `feat(chart): TASK-004 add candlestick chart support`
- One logical change per commit. Do not bundle unrelated changes.
- Never commit: `.env`, `.env.local`, secrets, `node_modules`, `.DS_Store`.

---

## 6. Security Rules (Finance-Critical)

- All external API calls must use HTTPS. No plain HTTP.
- Never expose Binance API keys on the client. Secret keys → server-side only.
- Sanitize any user input before using it in API query strings.
- XSS: Never `dangerouslySetInnerHTML` without explicit sanitization.
- Do not store sensitive financial data in `localStorage` or `sessionStorage`.

---

## 7. Performance Rules

- Data polling intervals: Asset list ≥ 30s. Chart data ≥ 5s. Never faster unless justified.
- Use `useCallback` and `useMemo` for expensive computations and callback references in providers.
- Avoid unnecessary re-renders. Use React DevTools Profiler to check if unsure.
- Images must use `next/image` for automatic optimization.
- Bundle size: run `npm run build` and check the output if adding a new large dependency.

---

## 8. Documentation Rules

- Every new public function/hook/service must have a JSDoc comment.
- Major architectural decisions go in `docs/decisions/` as ADR files.
- Update `docs/ARCHITECTURE.md` if the structure changes.
- Keep `README.md` up to date with setup instructions.

---

## 9. Agent Workflow

When given a new feature request, agents must follow this exact sequence:

```
1. READ: Review AGENT_RULES.md + ARCHITECTURE.md
2. PLAN: Create task file in /tasks/ with acceptance criteria
3. CONFIRM: Show the task plan to the user before coding
4. CODE: Implement following these rules
5. TEST: Write/run tests
6. VERIFY: Manually checklist of acceptance criteria
7. DOCUMENT: Update relevant docs
8. CLOSE: Mark task as Done
```

Do not skip steps. Do not start a new feature while a previous task is `In Progress` unless explicitly instructed.

---

## 10. Forbidden Actions

The following actions are **strictly forbidden** without explicit user approval:

- [ ] Deleting any file not listed in the task's "Files Changed"
- [ ] Changing the database schema / API contracts without a dedicated TASK
- [ ] Installing new npm packages without proposing them in a task first
- [ ] Using `any` type in financial calculation functions
- [ ] Hardcoding prices, percentages, or financial figures in components
- [ ] Disabling ESLint rules with `eslint-disable`
- [ ] Modifying `.gitignore`, `next.config.js`, or `tsconfig.json` without a TASK
