# FinTrace — Contributing Guide

> **Version:** 1.0.0 | **Updated:** 2026-03-23

---

## Quick Start

```bash
git clone <repo-url>
cd fintrace
npm install
cp .env.example .env.local
# Edit .env.local with your API keys
npm run dev
```

App runs at: <http://localhost:3000>

---

## Before Contributing

1. Read `.agents/AGENT_RULES.md` — the master rulebook
2. Read `docs/ARCHITECTURE.md` — understand the layer structure
3. Read `docs/CODING_CONVENTIONS.md` — code style reference

---

## Making Changes

### Always create a task file first

```bash
# Find the next task number
ls tasks/ | sort | tail -1

# Create your task
touch tasks/TASK-004-my-feature.md
```

Fill in the task template from `AGENT_RULES.md §1.2` before writing any code.

### Branch Naming

```
feat/TASK-004-add-portfolio-page
fix/TASK-005-chart-not-loading
refactor/TASK-006-extract-price-formatter
docs/TASK-007-update-architecture
test/TASK-008-binance-service-tests
```

### Commit Messages

```
feat(chart): TASK-004 add candlestick view with interval selection
fix(market): TASK-005 handle Binance API rate limit with backoff
refactor(utils): TASK-006 extract formatPrice to shared utility
```

---

## Development Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Build for production |
| `npm run lint` | Run static check (TypeScript no-emit) |
| `npm run typecheck` | TypeScript type check (`tsc --noEmit`) |
| `npm run test` | Run Vitest unit tests |
| `npm run test:coverage` | Run test suite with coverage gate |
| `npm run test:integration` | Run integration tests |
| `npm run test:e2e` | Run E2E smoke tests |

---

## Testing and Quality Gates

All contributions must follow the test strategy in `docs/TEST_MASTER_PLAN.md`.

Before opening a PR, run:

```bash
npm run typecheck
npm run lint
npm run test:coverage
npm run test:integration
npm run test:e2e
```

Your PR should include:

- Updated task file in `tasks/`
- Test evidence (what was tested and why)
- Notes for any temporary test exclusions with owner + expiry

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
# AI Features
GEMINI_API_KEY=your_key_here

# App config  
NEXT_PUBLIC_APP_ENV=development
```

**Never commit `.env.local`** — it is gitignored.

---

## Project Structure Summary

```
src/
  app/          → Next.js routes + global styles
  components/   → UI components (no fetch, no business logic)
  context/      → React Context providers
  hooks/        → Custom hooks (state + effects)
  services/     → External API clients (pure TypeScript)
  lib/          → Shared utilities
tasks/          → Task tracking files
docs/           → Project documentation
.agents/        → AI agent rules and workflows
```

See `docs/ARCHITECTURE.md` for the full architecture diagram.
