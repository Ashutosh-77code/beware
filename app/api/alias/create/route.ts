import { NextRequest } from "next/server";
import { guarded, readBody } from "@/lib/guard";
import { SourceError, request, fail, requireEnv, J } from "@/lib/http";
import type { AliasResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const BLOCKED = new Set(["IN", "NG", "ID", "PK", "PH", "VN"]);
const LIMIT = 10;
const API = "https://proxiedmail.com/api/v1/proxy-bindings";

export function POST(req: NextRequest) {
  return guarded(req, "alias-create", { perSec: 1, perDay: 50 }, async (): Promise<AliasResult> => {
    const country = (req.headers.get("cf-ipcountry") ?? req.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
    if (BLOCKED.has(country)) {
      return { blocked: true, message: "ProxiedMail is not available in your region. Use Ovoo, a self-hostable disposable email service, as an alternative." };
    }
    const b = await readBody(req);
    const realEmail = String(b.realEmail ?? "").trim().toLowerCase();
    const site = String(b.site ?? "").trim().toLowerCase().replace(/[^a-z0-9.-]/g, "").slice(0, 40);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(realEmail)) throw new SourceError("input", "Enter the email address that should receive forwarded mail", 400);
    if (!site) throw new SourceError("input", "Site name is required", 400);

    const headers = { Authorization: `Bearer ${requireEnv("PROXIEDMAIL_API_KEY")}`, "Content-Type": "application/json", Accept: "application/json" };
    const r = await request("ProxiedMail", API, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: { type: "proxy_bindings", attributes: { real_addresses: [realEmail], proxy_address: null, description: `BEWARE: ${site}` } } }),
    });
    if (!r.ok) fail("ProxiedMail", r);
    const alias = String(r.data?.data?.attributes?.proxy_address ?? "");
    if (!alias) throw new SourceError("ProxiedMail", `Unexpected response: ${r.text.slice(0, 200)}`);

    let used: number | null = null;
    const list = await request("ProxiedMail", API, { headers }).catch(() => null);
    if (list?.ok && Array.isArray((list.data as J | null)?.data)) used = (list.data as J).data.length;
    return { blocked: false, alias, used, limit: LIMIT };
  });
}
