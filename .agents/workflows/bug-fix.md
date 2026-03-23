---
description: Fix a bug - diagnose, create task, implement fix, verify
---

# Workflow: Bug Fix

## Steps

1. **Understand the bug** — Ask the user (or read context) to get: what is the expected behavior, what actually happens, and any error messages or stack traces.

// turbo  
2. **Find next task number** — `ls tasks/ | grep TASK | sort | tail -1`

3. **Create task file** — Create `tasks/TASK-{NNN}-fix-{slug}.md` with:
   - Type: `Bugfix`
   - Context: describe the bug and how to reproduce it
   - Acceptance Criteria: "Bug no longer occurs when..." + "No regression in..."

4. **Diagnose** — Read the relevant source files. Trace the data flow from the component down to the service. Do not guess — find the actual root cause before writing a fix.

5. **Propose fix** — Write out the fix you plan to make and show it to the user before applying it.

6. **Implement fix** — Apply the minimal change necessary. Avoid "while I'm here" refactors — those go in separate tasks.

7. **Write/update tests** — If a test would have caught this bug, write it now.

// turbo
8. **Run linter** — `npm run lint`

9. **Verify** — Confirm the bug no longer exists. Check for regressions in adjacent functionality.

10. **Update task and report** — Mark done, note root cause in the task file's Notes section.
