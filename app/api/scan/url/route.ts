import { NextRequest } from "next/server";
import * as cheerio from "cheerio";
import { guarded, readBody } from "@/lib/guard";
import { SourceError, request, fail, reason, J } from "@/lib/http";
import { assertPublicUrl, fetchPage } from "@/lib/ssrf";
import { flagKeywords, keywordRisk } from "@/lib/keywords";
import type { Risk, UrlResult, UrlSource } from "@/lib/types";

export const dynamic = "force-dynamic";

async function phishDestroy(url: string): Promise<UrlSource> {
  const r = await request("PhishDestroy", `https://api.phishdestroy.io/v1/check?url=${encodeURIComponent(url)}`);
  if (!r.ok) fail("PhishDestroy", r);
  const d: J = r.data ?? {};
  const label = String(d.verdict ?? d.status ?? d.classification ?? d.result ?? d.risk ?? "").trim();
  const malicious =
    d.malicious === true || d.is_malicious === true || d.phishing === true || d.blocked === true ||
    /malicious|phish|scam|block|danger|unsafe/i.test(label);
  return { name: "PhishDestroy", verdict: label || (malicious ? "malicious" : "no threat reported"), malicious };
}

async function urlhaus(url: string): Promise<UrlSource> {
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (process.env.ABUSECH_AUTH_KEY) headers["Auth-Key"] = process.env.ABUSECH_AUTH_KEY;
  const r = await request("URLhaus", "https://urlhaus-api.abuse.ch/v1/url/", {
    method: "POST",
    headers,
    body: new URLSearchParams({ url }).toString(),
  });
  if (!r.ok) fail("URLhaus", r);
  const status = String(r.data?.query_status ?? "");
  if (status === "ok") {
    const threat = r.data?.threat ? `${r.data.threat}, ${r.data.url_status}` : String(r.data?.url_status ?? "listed");
    return { name: "URLhaus", verdict: `listed: ${threat}`, malicious: true };
  }
  if (status === "no_results") return { name: "URLhaus", verdict: "not listed", malicious: false };
  throw new SourceError("URLhaus", `Unexpected query_status: ${status || "empty response"}`);
}

function visibleText(html: string): string {
  const $ = cheerio.load(html);
  $("script,style,noscript").remove();
  return `${$("title").text()} ${$("body").text()}`.replace(/\s+/g, " ").trim();
}

export function POST(req: NextRequest) {
  return guarded(req, "scan-url", { perSec: 2, perDay: 200 }, async (): Promise<UrlResult> => {
    const b = await readBody(req);
    let raw = String(b.url ?? "").trim();
    if (raw && !/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    const target = await assertPublicUrl(raw);
    const url = target.toString();

    const [pd, uh, page] = await Promise.allSettled([phishDestroy(url), urlhaus(url), fetchPage(url)]);
    const sources: UrlSource[] = [
      pd.status === "fulfilled" ? pd.value : { name: "PhishDestroy", verdict: "error", malicious: null, error: reason(pd) },
      uh.status === "fulfilled" ? uh.value : { name: "URLhaus", verdict: "error", malicious: null, error: reason(uh) },
    ];
    if (sources.every((s) => s.error)) {
      throw new SourceError("PhishDestroy+URLhaus", sources.map((s) => `${s.name}: ${s.error}`).join(" | "));
    }

    let keywords: string[] = [];
    let pageError: string | undefined;
    if (page.status === "fulfilled") keywords = flagKeywords(visibleText(page.value));
    else pageError = reason(page);

    const flagged = sources.some((s) => s.malicious === true);
    const risk: Risk = flagged ? "HIGH" : keywordRisk(keywords);
    const explanation = flagged
      ? `Flagged as malicious by ${sources.filter((s) => s.malicious).map((s) => s.name).join(" and ")}.`
      : keywords.length
        ? `No blocklist hit, but the page contains scam-style language: ${keywords.join(", ")}.`
        : "No blocklist hit and no scam-style language found on the page.";

    return { url, host: target.hostname, risk, sources, keywords, pageError, explanation };
  });
}
