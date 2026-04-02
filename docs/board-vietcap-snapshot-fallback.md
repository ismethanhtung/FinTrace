# Board Stock Data via Vietcap

## Goal

Use Vietcap priceboard as the primary stock source for:
- stock list generation
- stock snapshot pricing data
- board fallback fields when DNSE stream has not produced symbol data yet

DNSE realtime still has higher priority for live updates.

## Source API

- URL: `https://trading.vietcap.com.vn/api/price/v1/w/priceboard/tickers/price/group`
- Method: `POST`
- Body: `{ "group": "VN30" }`

## Architecture

1. Server proxy route: [route.ts](/Users/thanhtung/Downloads/tung/fintrace/src/app/api/board/vietcap-snapshot/route.ts)
- Calls Vietcap via POST (server-side).
- Validates and sanitizes `group` (`VN30` default).
- Uses `no-store` cache headers.
- Returns normalized envelope: `{ group, fetchedAt, rows }`.

2. Mapping layer: [boardSnapshot.ts](/Users/thanhtung/Downloads/tung/fintrace/src/lib/vietcap/boardSnapshot.ts)
- Converts raw Vietcap rows into board-friendly symbol state.
- Normalizes:
- symbol (`s`)
- reference/ceiling/floor (`ref`, `cei`, `flo`)
- match + volume (`c`, `mv`, `vo`)
- day high/low (`h`, `l`)
- depth levels (`bp*`, `bv*`, `ap*`, `av*`)
- foreign fields (`frbv`, `frsv`, `frcrr`)
- Exposes a symbol map for O(1) lookup.

3. Stock source service (primary list/snapshot):
- [vietcapStockService.ts](/Users/thanhtung/Downloads/tung/fintrace/src/services/vietcapStockService.ts)
- Fetches and merges configured groups (`VN30,HNX30,HOSE,HNX,UPCOM` by default).
- Produces `Asset[]` directly for stock universe list.
- Supplies fast symbol snapshot maps for hydrate/update flows.

4. Client service + hook for board-side periodic snapshot:
- [vietcapBoardSnapshotService.ts](/Users/thanhtung/Downloads/tung/fintrace/src/services/vietcapBoardSnapshotService.ts)
- [useVietcapBoardSnapshot.ts](/Users/thanhtung/Downloads/tung/fintrace/src/hooks/useVietcapBoardSnapshot.ts)
- Polls every 45s (configurable), supports single or multiple groups.
- Returns `snapshotBySymbol`, `isLoading`, `error`, `count`.

5. Board merge logic:
- [page.tsx](/Users/thanhtung/Downloads/tung/fintrace/src/app/board/page.tsx)
- Merge order (per field): `DNSE realtime` -> `Vietcap snapshot` -> existing asset fallback.
- Keeps DNSE as primary source once data arrives.
- `TC` column is set from `Ref` (`TC = Ref`) as requested.

## Why this shape

- UI does not need direct knowledge of Vietcap raw schema.
- Server proxy avoids browser CORS issues and isolates external API risk.
- Realtime updates still win immediately due to explicit field-level priority.

## Config

- `NEXT_PUBLIC_VIETCAP_STOCK_GROUPS`:
  Comma-separated list of groups to merge into stock universe list.
  Default: `VN30,HNX30,HOSE,HNX,UPCOM`
- `NEXT_PUBLIC_VIETCAP_SNAPSHOT_CACHE_TTL_MS`:
  Client-side merged snapshot cache TTL for list/hydrate service.
  Default: `15000`

## Rollback / remove plan

If Vietcap source is no longer desired:

1. Revert stock source to previous lambda listing/snapshot logic in [stockLambdaService.ts](/Users/thanhtung/Downloads/tung/fintrace/src/services/stockLambdaService.ts).
2. Delete:
- [useVietcapBoardSnapshot.ts](/Users/thanhtung/Downloads/tung/fintrace/src/hooks/useVietcapBoardSnapshot.ts)
- [vietcapBoardSnapshotService.ts](/Users/thanhtung/Downloads/tung/fintrace/src/services/vietcapBoardSnapshotService.ts)
- [vietcapStockService.ts](/Users/thanhtung/Downloads/tung/fintrace/src/services/vietcapStockService.ts)
- [boardSnapshot.ts](/Users/thanhtung/Downloads/tung/fintrace/src/lib/vietcap/boardSnapshot.ts)
- [route.ts](/Users/thanhtung/Downloads/tung/fintrace/src/app/api/board/vietcap-snapshot/route.ts)
3. Delete tests:
- [boardSnapshot.test.ts](/Users/thanhtung/Downloads/tung/fintrace/src/lib/vietcap/boardSnapshot.test.ts)
