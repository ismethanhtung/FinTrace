# TASK-021: Replace CoinGecko logos with Binance logo provider

**Status:** [ ] Draft | [ ] In Progress | [x] Done | [ ] Blocked  
**Priority:** High  
**Type:** Feature  
**Created:** 2026-03-24  
**Updated:** 2026-03-24  
**Assignee:** AI Agent

## Context

FinTrace currently resolves token logos through CoinGecko, which introduces rate-limit issues and incomplete coverage for the futures market. The user wants a Binance-first solution that is faster, more reliable, and careful about symbol handling for both spot and futures pairs.

## Acceptance Criteria

- [x] Logo resolution no longer depends on CoinGecko public API during normal runtime.
- [x] Spot assets resolve logos from Binance marketing data with stable matching.
- [x] Futures assets also resolve logos correctly, including perpetual USDT contracts.
- [x] Logo fetch path is cached to minimize repeated network work and improve render speed.
- [x] Failure cases degrade safely without breaking asset loading or UI rendering.
- [x] Tests cover the new logo provider matching and caching behavior.
- [x] Relevant documentation is updated to reflect the new provider.

## Implementation Plan

- [x] Step 1: Audit current logo flow and identify all consumers of `Asset.logoUrl`.
- [x] Step 2: Implement a Binance logo provider service backed by Binance marketing symbol data and local in-memory caching.
- [x] Step 3: Add careful matching logic for spot symbols, futures symbols, and base asset fallbacks.
- [x] Step 4: Integrate the new provider into `MarketContext` for both spot and futures asset enrichment.
- [x] Step 5: Add tests for matching, fallback, and cache reuse.
- [x] Step 6: Update token logo documentation and close the task.

## Files Changed

- `tasks/TASK-021-binance-logo-provider-for-spot-and-futures.md`
- `package.json`
- `docs/token-logos.md`
- `src/app/api/binance/marketing-symbols/route.ts`
- `src/config/tokenLogoOverrides.ts`
- `src/context/MarketContext.tsx`
- `src/services/binanceService.ts`
- `src/services/tokenLogoService.test.ts`
- `src/services/tokenLogoService.ts`

## Notes

- Binance ticker endpoints do not expose logos directly; logo metadata must be resolved through Binance marketing symbol data.
- Futures symbols must be handled carefully because some symbols differ in naming conventions from spot display assets.
- Verified live schema against Binance marketing endpoint during implementation (`symbol`, `baseAsset`, `quoteAsset`, `logo`, `mapperName`, `hidden` present).
