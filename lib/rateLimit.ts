import type { NextRequest } from "next/server";

type Bucket = { last: number; dayStart: number; dayCount: number };
type Limits = { perSec: number; perDay: number };

const DAY = 86400000;
const buckets = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();
  buckets.forEach((b, k) => {
    if (now - b.dayStart > DAY) buckets.delete(k);
  });
}, 3600000).unref?.();

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function checkRate(route: string, ip: string, limits: Limits): string | null {
  const now = Date.now();
  const key = `${route}:${ip}`;
  let b = buckets.get(key);
  if (!b || now - b.dayStart >= DAY) b = { last: 0, dayStart: now, dayCount: 0 };
  buckets.set(key, b);
  if (b.dayCount >= limits.perDay) return `Daily limit of ${limits.perDay} requests reached`;
  if (now - b.last < 1000 / limits.perSec) return "Too many requests, slow down";
  b.last = now;
  b.dayCount += 1;
  return null;
}
