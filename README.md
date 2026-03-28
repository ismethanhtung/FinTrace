# FinTrace

> Real-time financial tracking and AI-driven market analysis dashboard.

Built with **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS v4** · **Recharts** · **Binance API** · **Google Gemini AI**

---

## Quick Start

```bash
npm install
cp .env.example .env.local
# Add your API keys to .env.local
npm run dev
```

App runs at: **http://localhost:3000**

---

## Documentation

| Document | Description |
|---|---|
| [`.agents/AGENT_RULES.md`](.agents/AGENT_RULES.md) | **Master rules for AI agents** — read before any change |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture, folder structure, data flow |
| [`docs/API.md`](docs/API.md) | External API documentation (Binance, Gemini) |
| [`docs/CODING_CONVENTIONS.md`](docs/CODING_CONVENTIONS.md) | Code style guide with examples |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) | How to contribute — setup, branching, commits |
| [`docs/universe-adapter-guide.md`](docs/universe-adapter-guide.md) | Coin/Stock universe switch and adapter extension guide |

---

## Agent Workflows

Use slash commands to trigger structured workflows:

| Command | Description |
|---|---|
| `/new-feature` | Start a new feature with task tracking |
| `/bug-fix` | Diagnose and fix a bug safely |
| `/new-page` | Add a new Next.js App Router page |
| `/new-api-integration` | Integrate a new external API |
| `/refactor` | Refactor code without changing behavior |
| `/write-tests` | Add or update tests for a module |

---

## Task Tracking

All tasks live in [`/tasks/`](tasks/). Each task follows the format `TASK-NNN-title.md`.

- New tasks: check `tasks/` for the highest existing number, then increment.
- Never start coding without a task file.
- Mark tasks `[x] Done` after completion — do not delete them.

---

## Project Structure

```
src/
  app/          → Next.js App Router (pages, layout, global styles)
  components/   → UI components
  context/      → React Context providers
  hooks/        → Custom React hooks
  services/     → External API clients
  lib/          → Shared utilities
docs/           → Project documentation
tasks/          → Task tracking
.agents/        → AI agent rules & workflows
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | For AI features | Google Gemini API Key (server-side only) |
| `NEXT_PUBLIC_APP_ENV` | No | `development` or `production` |

See [`.env.example`](.env.example) for the full template.
