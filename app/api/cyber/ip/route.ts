import { NextRequest } from "next/server";
import { isIP } from "node:net";
import { guarded, readBody } from "@/lib/guard";
import { SourceError, request, fail, reason, requireEnv, J } from "@/lib/http";
import type { IpResult, Risk, SourceNote } from "@/lib/types";

export const dynamic = "force-dynamic";

async function internetDb(ip: string) {
  const r = await request("InternetDB", `https://internetdb.shodan.io/${ip}`);
  if (r.status === 404) return { ports: [], hostnames: [], tags: [], vulns: [] } as J;
  if (!r.ok) fail("InternetDB", r);
  return r.data as J;
}

async function abuseIpdb(ip: string) {
  const key = requireEnv("ABUSEIPDB_KEY");
  const r = await request("AbuseIPDB", `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`, {
    headers: { Key: key, Accept: "application/json" },
  });
  if (!r.ok) fail("AbuseIPDB", r);
  return (r.data?.data ?? {}) as J;
}

async function greynoise(ip: string) {
  const r = await request("GreyNoise", `https://api.greynoise.io/v3/community/${ip}`, { headers: { Accept: "application/json" } });
  if (r.status === 404) return { noise: false, classification: "unknown" } as J;
  if (!r.ok) fail("GreyNoise", r);
  return r.data as J;
}

export function POST(req: NextRequest) {
  return guarded(req, "cyber-ip", { perSec: 2, perDay: 200 }, async (): Promise<IpResult> => {
    const b = await readBody(req);
    const ip = String(b.ip ?? "").trim();
    if (!isIP(ip)) throw new SourceError("input", "Enter a valid IPv4 or IPv6 address", 400);

    const [idb, abuse, gn] = await Promise.allSettled([internetDb(ip), abuseIpdb(ip), greynoise(ip)]);
    const errors: SourceNote[] = [];
    const note = (source: string, r: PromiseSettledResult<unknown>) => {
      if (r.status === "rejected") errors.push({ source, error: reason(r) });
    };
    note("InternetDB", idb);
    note("AbuseIPDB", abuse);
    note("GreyNoise", gn);
    if (errors.length === 3) throw new SourceError("InternetDB+AbuseIPDB+GreyNoise", errors.map((e) => `${e.source}: ${e.error}`).join(" | "));

    const d = idb.status === "fulfilled" ? idb.value : {};
    const a = abuse.status === "fulfilled" ? abuse.value : null;
    const g = gn.status === "fulfilled" ? gn.value : null;
    const abuseScore = a ? Number(a.abuseConfidenceScore ?? 0) : null;
    const classification = g ? String(g.classification ?? "unknown") : null;
    const cves: string[] = Array.isArray(d.vulns) ? d.vulns : [];

    let risk: Risk = "LOW";
    if ((abuseScore ?? 0) > 50 || classification === "malicious") risk = "HIGH";
    else if ((abuseScore ?? 0) > 20 || cves.length > 0 || classification === "unknown" && g?.noise === true) risk = "MEDIUM";

    return {
      ip,
      risk,
      ports: Array.isArray(d.ports) ? d.ports : [],
      hostnames: Array.isArray(d.hostnames) ? d.hostnames : [],
      tags: Array.isArray(d.tags) ? d.tags : [],
      cves,
      abuseScore,
      totalReports: a ? Number(a.totalReports ?? 0) : null,
      noise: g ? Boolean(g.noise) : null,
      classification,
      errors,
    };
  });
}
