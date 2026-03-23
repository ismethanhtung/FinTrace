---
description: Start a new feature - creates task file, confirms plan, then codes
---

# Workflow: New Feature

This workflow ensures every new feature follows the FinTrace agent rules.

## Steps

1. **Read the rules** — Open `.agents/AGENT_RULES.md` and `docs/ARCHITECTURE.md`. Confirm you understand the current architecture before proceeding.

// turbo
2. **Find next task number** — Run: `ls tasks/ | grep TASK | sort | tail -1` to find the highest existing TASK number. Increment by 1 for the new task.

3. **Create task file** — Create `tasks/TASK-{NNN}-{feature-slug}.md` following the Task File Format in `AGENT_RULES.md §1.2`. Fill in: Title, Context, Acceptance Criteria, and Implementation Plan. Leave "Files Changed" empty for now.

4. **Show the task to the user** — Present the task file contents and wait for explicit approval before writing any code.

5. **Implement** — Work through each step in the Implementation Plan one at a time. Check off `[x]` as you go. Follow all rules in `AGENT_RULES.md`:
   - Components in `src/components/`
   - Hooks in `src/hooks/`
   - Services in `src/services/`
   - Types follow existing patterns in `binanceService.ts`

6. **Write tests** — Create or update test files in `__tests__/`. Every new service function and hook must have at least one test.

// turbo
7. **Run linter** — `npm run lint`

8. **Check acceptance criteria** — Go through each criterion in the task file one by one. Mark `[x]` for each that is met.

9. **Update task file** — Update `Status` to `[x] Done`, fill `Files Changed`, add any notes.

10. **Report to user** — Summarize: what was done, what files were changed, what tests pass.
