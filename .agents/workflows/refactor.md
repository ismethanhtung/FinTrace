---
description: Refactor a component, hook, or service without changing behavior
---

# Workflow: Refactor

## Steps

1. **Define scope** — Clearly identify what is being refactored and why. Refactoring must not change observable behavior.

// turbo
2. **Find next task number** — `ls tasks/ | grep TASK | sort | tail -1`

3. **Create task file** — `tasks/TASK-{NNN}-refactor-{slug}.md`  
   Acceptance Criteria must include:
   - [ ] All existing tests still pass after refactor
   - [ ] No change in external API/props interface (or change is intentional and documented)
   - [ ] Bundle size does not increase significantly

4. **Write tests BEFORE refactoring** (if not already present) — You need a safety net. Tests verify behavior is preserved after the refactor. This is non-negotiable.

// turbo
5. **Run existing tests before touching code** — `npm run test`. Record the baseline. All tests must pass before you start.

6. **Refactor incrementally** — Make one logical change at a time. Do not refactor everything at once.

// turbo
7. **Run tests after each increment** — `npm run test` after each change.

8. **Review against rules** — Check `AGENT_RULES.md §2` to ensure the refactored code follows all naming, typing, and structural rules.

9. **Update task and report** — Note any decisions made during refactor in the Notes section.
