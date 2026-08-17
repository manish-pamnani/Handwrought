const PADDLE_IPS_URL = "https://api.paddle.com/ips";
const CACHE_TTL_MS = 60 * 60 * 1000;

let cachedCidrs: string[] | null = null;
let cachedAt = 0;

async function getAllowedCidrs(): Promise<string[]> {
  const now = Date.now();
  if (cachedCidrs && now - cachedAt < CACHE_TTL_MS) {
    return cachedCidrs;
  }

  const res = await fetch(PADDLE_IPS_URL);
  if (!res.ok) {
    // Serve a stale-but-known-good list rather than failing every delivery
    // on a transient fetch error; only throw if we've never fetched at all.
    if (cachedCidrs) return cachedCidrs;
    throw new Error(`Failed to fetch Paddle IP allowlist: ${res.status}`);
  }

  const data = (await res.json()) as { data?: { ipv4_cidrs?: string[] } };
  const cidrs = data.data?.ipv4_cidrs ?? [];
  if (cidrs.length === 0) {
    if (cachedCidrs) return cachedCidrs;
    throw new Error("Paddle IP allowlist response had no ipv4_cidrs");
  }

  cachedCidrs = cidrs;
  cachedAt = now;
  return cidrs;
}

function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(range) & mask);
}

/** Fetched fresh from Paddle (with caching) rather than hard-coded — the list can change. */
export async function isPaddleIp(ip: string): Promise<boolean> {
  const cidrs = await getAllowedCidrs();
  return cidrs.some((cidr) => isIpInCidr(ip, cidr));
}
