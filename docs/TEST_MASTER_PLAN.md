# FinTrace Test Master Plan

> Version: 1.0.0  
> Updated: 2026-03-27

## 1) Quality Goal

- Test all critical paths across `unit`, `integration`, `e2e`, `contract`, `perf`, and `security`.
- Enforce CI quality gates on every pull request.
- Target coverage: 100% line/branch/function, with temporary exceptions documented and time-boxed.

## 2) Test Pyramid and Scope

- Unit tests (largest layer)
  - `src/lib/**`
  - `src/services/**`
  - pure helpers and transformers
- Integration tests
  - API route handlers under `src/app/api/**`
  - service-to-provider boundaries with network mocked
- Contract tests
  - request/response schemas for critical endpoints and query spec payloads
- E2E tests
  - user flows for main pages (`/market`, `/news`, `/query`, `/data-stream`)
- Performance smoke tests
  - query engine and data stream hot paths
- Security checks
  - dependency audit, static analysis, and secret scanning

## 3) Definition of Done (Per PR)

- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm run test:coverage` passes with configured thresholds.
- `npm run test:integration` passes.
- `npm run test:e2e` passes for merge-blocking smoke suite.
- Security jobs pass (`audit`, `CodeQL`, secret scan).
- Task file is updated with test evidence.

## 4) Mocking and Isolation Policy

- Unit tests must not call real external APIs.
- Always mock:
  - `fetch`
  - provider SDK/network clients
  - time-sensitive or random behavior (`Date`, timers, random IDs)
- Keep integration tests deterministic by mocking provider edge cases:
  - timeout
  - malformed payload
  - non-2xx responses

## 5) Module-to-Test Mapping

- `src/lib/queryEngine/**`
  - unit: parser/validator logic
  - contract: accepted query schema and rejection schema
  - perf: parse/validate throughput smoke
- `src/services/**`
  - unit: normalization, guards, fallback handling, error propagation
  - integration: route handler wiring with mocked services
- `src/app/api/**`
  - integration: status codes, payload shape, error body contract
- `src/hooks/**`
  - unit/integration: state transitions, effect cleanup, error and loading states
- `src/components/**`
  - component tests for key user interactions and render states

## 6) Coverage Policy

- Global threshold in CI is set to 100% for lines/functions/branches/statements.
- Any temporary exclude requires:
  - explicit reason
  - owner
  - expiry date
  - follow-up task ID
- Excludes are reviewed weekly and removed as soon as feasible.

## 7) CI Gate Strategy

- Required workflows:
  - `ci.yml` for build, lint, typecheck, test suites
  - `security.yml` for security scans
- Block merge if any required check fails.
- Use matrix for supported Node LTS versions.

## 8) Flaky Test Management

- Mark flaky tests immediately and open a fixing task.
- Do not keep unstable tests in merge-blocking suites.
- Keep nightly-only tests separate from PR-blocking tests.

## 9) Reporting

- Coverage artifacts stored in CI (`lcov`, `json-summary`).
- Publish concise PR summary:
  - changed files
  - tests added
  - coverage delta
  - known risks (if any)

## 10) Rollout Plan

1. Standardize runner/scripts and migrate existing tests.
2. Fill missing unit and integration tests by module backlog.
3. Add E2E and contract suites.
4. Add perf/security jobs.
5. Enforce branch protection checks.
