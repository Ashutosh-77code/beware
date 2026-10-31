import { NextRequest } from "next/server";
import { guarded } from "@/lib/guard";
import { request, fail, J } from "@/lib/http";
import { readSession } from "@/lib/session";
import type { AppRow, AuditResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const FALLBACK = "https://myaccount.google.com/security-checkup";
const BASE = "https://admin.googleapis.com/admin/reports/v1/activity/users/all/applications/token";

const isMailScope = (s: string) => /gmail|mail\.google\.com/i.test(s);

export function GET(req: NextRequest) {
  return guarded(req, "audit-apps", { perSec: 2, perDay: 200 }, async (): Promise<AuditResult> => {
    const s = readSession(req);
    if (!s) return { signedIn: false, workspace: false, apps: [] };
    if (!s.hd) return { signedIn: true, workspace: false, email: s.email, fallbackUrl: FALLBACK, apps: [] };

    const byApp = new Map<string, AppRow>();
    let pageToken = "";
    for (let page = 0; page < 5; page++) {
      const q = new URLSearchParams({ maxResults: "1000" });
      if (pageToken) q.set("pageToken", pageToken);
      const r = await request("Google Admin Reports", `${BASE}?${q}`, { headers: { Authorization: `Bearer ${s.at}` } }, 30000);
      if (!r.ok) fail("Google Admin Reports", r);
      for (const item of (r.data?.items ?? []) as J[]) {
        for (const ev of (item.events ?? []) as J[]) {
          const params = (ev.parameters ?? []) as J[];
          const get = (n: string) => params.find((x) => x.name === n);
          const name = String(get("app_name")?.value ?? "");
          if (!name) continue;
          const scopes: string[] = get("scope")?.multiValue ?? [];
          const time = String(item.id?.time ?? "");
          const row = byApp.get(name) ?? { appName: name, clientType: String(get("client_type")?.value ?? "UNKNOWN"), scopes: [], lastAccess: time, highRisk: false };
          row.scopes = [...new Set([...row.scopes, ...scopes])];
          if (time > row.lastAccess) row.lastAccess = time;
          byApp.set(name, row);
        }
      }
      pageToken = String(r.data?.nextPageToken ?? "");
      if (!pageToken) break;
    }

    const apps = [...byApp.values()].map((a) => ({ ...a, highRisk: a.scopes.length > 0 && a.scopes.every(isMailScope) }));
    apps.sort((a, b) => Number(b.highRisk) - Number(a.highRisk) || b.lastAccess.localeCompare(a.lastAccess));
    return { signedIn: true, workspace: true, email: s.email, apps };
  });
}
