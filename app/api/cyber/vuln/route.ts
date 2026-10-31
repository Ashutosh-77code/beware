import { NextRequest } from "next/server";
import { guarded, readBody } from "@/lib/guard";
import { SourceError, request, fail, reason, J } from "@/lib/http";
import type { CveRow, SourceNote, VulnResult } from "@/lib/types";

export const dynamic = "force-dynamic";

async function crt(domain: string): Promise<string[]> {
  const r = await request("crt.sh", `https://crt.sh/?q=${encodeURIComponent(`%.${domain}`)}&output=json`, {}, 40000);
  if (!r.ok) fail("crt.sh", r);
  if (!Array.isArray(r.data)) throw new SourceError("crt.sh", `Unexpected response: ${r.text.slice(0, 160)}`);
  const set = new Set<string>();
  for (const row of r.data as J[]) {
    for (const n of String(row.name_value ?? "").split("\n")) {
      const name = n.trim().toLowerCase().replace(/^\*\./, "");
      if (name === domain || name.endsWith(`.${domain}`)) set.add(name);
    }
  }
  return [...set].sort();
}

async function nvd(keyword: string): Promise<CveRow[]> {
  const headers: Record<string, string> = {};
  if (process.env.NVD_API_KEY) headers.apiKey = process.env.NVD_API_KEY;
  const r = await request("NVD", `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=20`, { headers }, 30000);
  if (!r.ok) fail("NVD", r);
  return ((r.data?.vulnerabilities ?? []) as J[]).map((v) => {
    const c: J = v.cve ?? {};
    const m: J = c.metrics ?? {};
    const metric = (m.cvssMetricV31 ?? m.cvssMetricV40 ?? m.cvssMetricV30 ?? m.cvssMetricV2 ?? [])[0];
    const desc = (c.descriptions ?? []).find((d: J) => d.lang === "en");
    return { id: String(c.id), score: metric?.cvssData?.baseScore ?? null, summary: String(desc?.value ?? "").slice(0, 280) };
  });
}

async function osv(name: string, version: string, ecosystem: string) {
  const r = await request("OSV.dev", "https://api.osv.dev/v1/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ package: { name, ecosystem }, version }),
  });
  if (!r.ok) fail("OSV.dev", r);
  return ((r.data?.vulns ?? []) as J[]).map((v) => ({ id: String(v.id), summary: String(v.summary ?? "").slice(0, 240) }));
}

export function POST(req: NextRequest) {
  return guarded(req, "cyber-vuln", { perSec: 1, perDay: 100 }, async (): Promise<VulnResult> => {
    const b = await readBody(req);
    const domain = String(b.domain ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)) throw new SourceError("input", "Enter a valid domain such as example.com", 400);
    const tech = String(b.tech ?? "").trim();
    const pkgName = String(b.packageName ?? "").trim();
    const pkgVersion = String(b.packageVersion ?? "").trim();

    const jobs: [string, Promise<unknown>][] = [
      ["crt.sh", crt(domain)],
      ["NVD", nvd(tech || domain)],
    ];
    if (pkgName && pkgVersion) jobs.push(["OSV.dev", osv(pkgName, pkgVersion, "npm")]);
    const settled = await Promise.allSettled(jobs.map((j) => j[1]));

    const errors: SourceNote[] = [];
    const out: Record<string, unknown> = {};
    settled.forEach((s, i) => {
      if (s.status === "fulfilled") out[jobs[i][0]] = s.value;
      else errors.push({ source: jobs[i][0], error: reason(s) });
    });
    if (errors.length === jobs.length) throw new SourceError(errors.map((e) => e.source).join("+"), errors.map((e) => `${e.source}: ${e.error}`).join(" | "));

    const cves = (out["NVD"] as CveRow[] | undefined) ?? [];
    return {
      domain,
      subdomains: (out["crt.sh"] as string[] | undefined) ?? [],
      cves,
      maxScore: Math.max(0, ...cves.map((c) => c.score ?? 0)),
      osv: (out["OSV.dev"] as { id: string; summary: string }[] | undefined) ?? [],
      errors,
    };
  });
}
