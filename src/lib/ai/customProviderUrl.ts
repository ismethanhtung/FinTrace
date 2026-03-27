const PRIVATE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
]);

function isPrivateIp(hostname: string): boolean {
  // Minimal SSRF protection: block obvious private IPv4 ranges.
  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const octets = m.slice(1).map((x) => Number(x));
  if (octets.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function validateCustomBaseUrl(baseUrl: string): { ok: true; url: URL } | { ok: false; reason: string } {
  const raw = baseUrl.trim();
  if (!raw) return { ok: false, reason: 'Missing baseUrl' };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'Invalid baseUrl' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, reason: 'baseUrl must be http(s)' };
  }
  if (PRIVATE_HOSTS.has(url.hostname.toLowerCase())) {
    return { ok: false, reason: 'baseUrl host is not allowed' };
  }
  if (isPrivateIp(url.hostname)) {
    return { ok: false, reason: 'baseUrl IP range is not allowed' };
  }
  // Normalize to no trailing slash for predictable path joins.
  url.pathname = url.pathname.replace(/\/+$/, '');
  return { ok: true, url };
}

