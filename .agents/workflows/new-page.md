---
description: Add a new page or route to the Next.js App Router
---

# Workflow: New Page / Route

## Steps

1. **Read architecture** — Review `docs/ARCHITECTURE.md §2` (folder structure) and understand what page routes look like.

// turbo
2. **Find next task number** — `ls tasks/ | grep TASK | sort | tail -1`

3. **Create task file** — `tasks/TASK-{NNN}-page-{route-name}.md`  
   Include in Acceptance Criteria:
   - [ ] Route is accessible at the correct URL
   - [ ] Page has correct `<title>` and `<meta description>`
   - [ ] Responsive on desktop (1440px) and tablet (768px)
   - [ ] Matches the theme system (light/dark/night)
   - [ ] No console errors

4. **Create route folder** — `src/app/{route-name}/` with:
   - `page.tsx` — the page component (Server Component by default)
   - `layout.tsx` (optional) — if this route needs its own layout
   - `loading.tsx` (optional) — skeleton/loading state

5. **Set page metadata** — Export `metadata` from the page file:
   ```typescript
   export const metadata: Metadata = {
     title: 'Page Title | FinTrace',
     description: '...',
   };
   ```

6. **Build the page** — Follow all rules in `AGENT_RULES.md §2`.  
   - Mark with `"use client"` ONLY if the page needs interactivity.
   - Data fetching in Server Components: use `async` directly in the component.
   - Data fetching in Client Components: use a custom hook from `src/hooks/`.

7. **Add navigation link** — Update the nav in `src/app/page.tsx` header if needed.

8. **Test** — Verify in browser: correct URL, correct title, correct theme, mobile layout.

9. **Update task and report**.
