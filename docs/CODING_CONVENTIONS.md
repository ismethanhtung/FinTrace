# FinTrace — Coding Conventions

> **Version:** 1.0.0 | **Updated:** 2026-03-23  
> Quick-reference guide for code style. See `AGENT_RULES.md` for the full ruleset.

---

## TypeScript

```typescript
// ✅ GOOD: Explicit types everywhere
export async function fetchTicker(symbol: string): Promise<Asset> { ... }

// ❌ BAD: Implicit any, no return type
async function fetchTicker(symbol) { ... }
```

```typescript
// ✅ GOOD: Discriminated union for API states
type ApiState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

// ❌ BAD: Separate booleans for loading/error (boolean explosion)
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
```

```typescript
// ✅ GOOD: type for data shapes
type Asset = { id: string; price: number; };

// ✅ GOOD: interface for component props (extensible)
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'ghost';
}
```

---

## React Components

```tsx
// ✅ GOOD: Named export, explicit props type, single responsibility
interface PriceDisplayProps {
  price: number;
  changePercent: number;
}

export const PriceDisplay = ({ price, changePercent }: PriceDisplayProps) => {
  const isPositive = changePercent >= 0;
  return (
    <div>
      <span className="font-mono">${price.toLocaleString('en-US')}</span>
      <span className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>
        {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
      </span>
    </div>
  );
};
```

```tsx
// ❌ BAD: Default export (harder to grep/refactor), no types, logic in JSX
export default function({ price, changePercent }) {
  return (
    <span style={{ color: changePercent >= 0 ? '#10b981' : '#ef4444' }}>
      ${price} ({changePercent >= 0 ? '+' : ''}{changePercent}%)
    </span>
  );
}
```

---

## Hooks

```typescript
// ✅ GOOD: Single concern, cleanup, memoized callbacks
export const usePriceHistory = (symbol: string) => {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await binanceService.getKlines(symbol);
      setData(mapKlinesToChartPoints(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval); // ← Always clean up!
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
};
```

---

## Services

```typescript
// ✅ GOOD: Service object, typed inputs/outputs, error propagates
export const binanceService = {
  async getTickers(): Promise<BinanceTicker[]> {
    const res = await fetch(`${BASE_URL}/ticker/24hr`);
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    return res.json() as Promise<BinanceTicker[]>;
  },

  transformTicker(raw: BinanceTicker): Asset {
    return {
      id: raw.symbol,
      price: parseFloat(raw.lastPrice),
      // ...
    };
  }
};
```

---

## Error Handling

```typescript
// ✅ GOOD: Structured error logging + user feedback
try {
  const data = await binanceService.getTickers();
  setAssets(data);
} catch (err) {
  console.error('[useMarketData] Failed to fetch tickers:', err);
  setError(err instanceof Error ? err.message : 'Failed to load market data');
}

// ❌ BAD: Silent failure
try {
  const data = await binanceService.getTickers();
  setAssets(data);
} catch {}
```

---

## CSS / Styling

```tsx
// ✅ GOOD: CSS variable tokens, Tailwind utils, cn() for conditionals
import { cn } from '@/lib/utils';

<div className={cn(
  'px-3 py-1 text-[12px] rounded-md border',
  isActive
    ? 'bg-accent text-white border-accent'
    : 'bg-secondary text-muted border-main hover:border-accent/40'
)}>
  {label}
</div>

// ❌ BAD: Inline styles with hardcoded colors
<div style={{ backgroundColor: '#007AFF', color: 'white', padding: '4px 12px' }}>
  {label}
</div>
```

---

## Formatting Numbers (Finance-Critical)

```typescript
// ✅ GOOD: Always specify decimal precision and locale
const formatted = price.toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
// → "42,580.00"

// ✅ GOOD: Use a shared formatter utility in src/lib/utils.ts
export function formatPrice(price: number, decimals = 2): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ❌ BAD: Uncontrolled floating point
const formatted = `$${price.toFixed(2)}`; // No thousands separator
const raw = price;                          // Raw float → "42580.123456789"
```

---

## Comments

```typescript
// ✅ GOOD: JSDoc for exported functions
/**
 * Transforms a raw Binance ticker response into a FinTrace Asset.
 * Market cap is not available from the ticker endpoint; it returns "-".
 */
export function transformTicker(raw: BinanceTicker): Asset { ... }

// ✅ GOOD: Intent comment for non-obvious code
// Seeded random for deterministic SSR/CSR output — prevents hydration mismatch
function seeded01(seed: number): number { ... }

// ❌ BAD: Commenting the obvious
// Set loading to true
setIsLoading(true);
```
