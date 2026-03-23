---
description: Add or update tests for a module
---

# Workflow: Write Tests

## Steps

1. **Identify scope** — Clarify which module needs tests: service, hook, component, or utility.

// turbo
2. **Find next task number** — `ls tasks/ | grep TASK | sort | tail -1`

3. **Create task file** — `tasks/TASK-{NNN}-test-{module-name}.md`

4. **Check existing tests** — `ls __tests__/` and look for existing test files for the module. Do not duplicate coverage.

5. **Write unit tests** — For services and utilities:
   - Use Vitest (`describe`, `it`, `expect`)
   - Mock all `fetch` calls — never make real HTTP calls in tests
   - Cover: happy path, edge cases, error handling

6. **Write hook tests** — For custom hooks:
   - Wrap with `renderHook` from `@testing-library/react`
   - Test state changes, effect cleanup, and error states

7. **Write component tests** (if needed):
   - Use `@testing-library/react`
   - Test user interactions, not implementation details
   - Snapshot tests only for static components

// turbo
8. **Run tests** — `npm run test` (or `npx vitest run`)

9. **Check coverage** — Ensure all acceptance criteria are covered.

10. **Update task and report**.
