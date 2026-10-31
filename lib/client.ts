import { useState } from "react";
import type { ApiError } from "./types";

export type Action<A extends unknown[], R> = {
  data: R | null;
  error: ApiError | null;
  loading: boolean;
  run: (...a: A) => Promise<R | undefined>;
};

export function toApiError(e: unknown): ApiError {
  if (e && typeof e === "object" && "error" in e && "source" in e) return e as ApiError;
  return { error: e instanceof Error ? e.message : "Unexpected error", source: "client" };
}

async function parse<T>(r: Response): Promise<T> {
  const j = await r.json().catch(() => ({ error: `HTTP ${r.status}`, source: "server" }));
  if (!r.ok) throw j;
  return j as T;
}

export function postJson<T>(url: string, body: unknown): Promise<T> {
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => parse<T>(r));
}

export function postForm<T>(url: string, body: FormData): Promise<T> {
  return fetch(url, { method: "POST", body }).then((r) => parse<T>(r));
}

export function getJson<T>(url: string): Promise<T> {
  return fetch(url).then((r) => parse<T>(r));
}

export function useAction<A extends unknown[], R>(fn: (...a: A) => Promise<R>): Action<A, R> {
  const [data, setData] = useState<R | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  async function run(...a: A) {
    setLoading(true);
    setError(null);
    try {
      const r = await fn(...a);
      setData(r);
      return r;
    } catch (e) {
      setError(toApiError(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }
  return { data, error, loading, run };
}
