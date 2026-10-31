import { NextRequest } from "next/server";
import { guarded, readBody } from "@/lib/guard";
import { SourceError, request, fail } from "@/lib/http";
import { cacheGet, cacheSet } from "@/lib/cache";
import type { EmailResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export function POST(req: NextRequest) {
  return guarded(req, "scan-email", { perSec: 2, perDay: 100 }, async () => {
    const b = await readBody(req);
    const email = String(b.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new SourceError("input", "Enter a valid email address", 400);

    const key = `email:${email}`;
    const hit = cacheGet<EmailResult>(key);
    if (hit) return hit;

    const r = await request("XposedOrNot", `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`);
    let breaches: string[] = [];
    if (r.status !== 404) {
      if (!r.ok) fail("XposedOrNot", r);
      const raw = r.data?.breaches;
      breaches = Array.isArray(raw) ? raw.flat().map(String) : [];
    }
    const result: EmailResult = { email, breaches, count: breaches.length, subScore: Math.max(0, 100 - breaches.length * 8) };
    cacheSet(key, result, 86400000);
    return result;
  });
}
