export type J = Record<string, any>;

export class SourceError extends Error {
  constructor(public source: string, message: string, public status = 502) {
    super(message);
  }
}

export async function request(source: string, url: string, init: RequestInit = {}, timeoutMs = 15000) {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  } catch (e) {
    throw new SourceError(source, `Request failed: ${(e as Error).message}`);
  }
  const text = await res.text();
  let data: J | null = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data, text };
}

export function fail(source: string, r: { status: number; text: string }): never {
  throw new SourceError(source, `HTTP ${r.status}: ${r.text.replace(/\s+/g, " ").slice(0, 200)}`);
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new SourceError("config", `${name} is not set on the server`, 500);
  return v;
}

export function reason(r: PromiseRejectedResult): string {
  return r.reason instanceof Error ? r.reason.message : String(r.reason);
}
