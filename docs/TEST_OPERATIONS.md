# Test Operations Playbook

## Daily Workflow

Run this before opening a PR:

```bash
npm run typecheck
npm run lint
npm run test:coverage
npm run test:integration
npm run test:contract
npm run test:perf
npm run test:e2e
npm run security:secrets
```

## Handling Regressions

- If a test fails, open or update the related `TASK-XXX` file immediately.
- Fix the root cause first; avoid weakening assertions.
- If failure is flaky, move it out of blocking suites only with a follow-up task and owner.

## Flaky Test Policy

- Identify flaky behavior within 24h.
- Add deterministic mocks for time, random values, and network.
- Keep smoke tests small and deterministic for PR pipelines.

## Coverage Policy Enforcement

- CI uses `scripts/check-coverage-threshold.mjs` to enforce 100%.
- Any temporary exception must include:
  - file path
  - reason
  - owner
  - expiry date
  - follow-up task

## Release Checklist

- CI green on all required checks.
- No skipped tests in merge-blocking suites.
- Task files updated with evidence and final status.
- Security workflow passed for the target branch.
