import dns from "node:dns/promises";
import net from "node:net";
import { SourceError } from "./http";

function isPrivate(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const l = ip.toLowerCase();
  return l === "::1" || l === "::" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80") || l.startsWith("::ffff:");
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new SourceError("input", "Enter a valid http(s) URL", 400);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new SourceError("input", "Only http(s) URLs are supported", 400);
  let addrs: { address: string }[];
  try {
    addrs = await dns.lookup(u.hostname, { all: true });
  } catch {
    throw new SourceError("input", "Host could not be resolved", 400);
  }
  if (addrs.some((a) => isPrivate(a.address))) throw new SourceError("input", "URL resolves to a non-public address", 400);
  return u;
}

export async function fetchPage(raw: string): Promise<string> {
  let current = raw;
  for (let hop = 0; hop < 4; hop++) {
    const u = await assertPublicUrl(current);
    let res: Response;
    try {
      res = await fetch(u, {
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "BEWARE-Scanner/1.0", Accept: "text/html,text/plain" },
      });
    } catch (e) {
      throw new SourceError("page-fetch", `Page fetch failed: ${(e as Error).message}`);
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new SourceError("page-fetch", `Redirect ${res.status} without location`);
      current = new URL(loc, u).toString();
      continue;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) throw new SourceError("page-fetch", `Unsupported content type: ${ct || "unknown"}`);
    return (await res.text()).slice(0, 500000);
  }
  throw new SourceError("page-fetch", "Too many redirects");
}
