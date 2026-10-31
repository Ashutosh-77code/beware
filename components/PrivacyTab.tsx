"use client";
import { useState } from "react";
import { Action, postJson, useAction } from "@/lib/client";
import type { AliasResult, AuditResult, EmailResult, ImageResult, UrlResult, ApiError } from "@/lib/types";
import { Btn, Card, Chips, ErrorBox, RiskBadge, inputCls } from "./ui";

function AliasButton({ site, realEmail }: { site: string; realEmail: string }) {
  const a = useAction(() => postJson<AliasResult>("/api/alias/create", { site, realEmail }));
  const [copied, setCopied] = useState(false);
  const d = a.data;
  return (
    <span className="inline-flex flex-col gap-1">
      {!d && <Btn type="button" loading={a.loading} disabled={!realEmail} onClick={() => a.run()} title={realEmail ? "" : "Scan an email first"}>Protect this site</Btn>}
      {d && d.blocked && <span className="max-w-xs text-xs text-amber-300">{d.message}</span>}
      {d && !d.blocked && (
        <span className="flex items-center gap-2 text-xs">
          <code className="rounded bg-zinc-800 px-2 py-1 text-emerald-300">{d.alias}</code>
          <button
            type="button"
            className="rounded border border-zinc-700 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
            onClick={() => {
              navigator.clipboard.writeText(d.alias);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <span className="text-zinc-400">{d.used === null ? `limit ${d.limit}` : `${d.limit - d.used} of ${d.limit} aliases left`}</span>
        </span>
      )}
      <ErrorBox e={a.error} />
    </span>
  );
}

function EmailCard({ a, email, setEmail }: { a: Action<[string], EmailResult>; email: string; setEmail: (v: string) => void }) {
  return (
    <Card title="Email Breach Scanner" desc="Checks XposedOrNot for known breaches. Cached for 24 hours.">
      <div className="flex gap-2">
        <input className={inputCls} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Btn type="button" loading={a.loading} onClick={() => a.run(email)}>Scan</Btn>
      </div>
      <ErrorBox e={a.error} />
      {a.data && (
        <div className="space-y-2 text-sm">
          <p>
            {a.data.count === 0 ? "No breaches found for this address." : `Found in ${a.data.count} breach${a.data.count === 1 ? "" : "es"}.`}{" "}
            <span className="text-zinc-400">Privacy sub-score: {a.data.subScore}/100</span>
          </p>
          <div className="space-y-2">
            {a.data.breaches.map((b) => (
              <div key={b} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-800 p-2">
                <span className="text-xs text-red-300">{b}</span>
                <AliasButton site={b} realEmail={a.data!.email} />
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

async function sha1Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function pwnedCount(password: string): Promise<number> {
  // k-anonymity: only the first 5 hex chars of the SHA-1 leave the browser; the suffix is matched locally
  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const r = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { "Add-Padding": "true" } });
  if (!r.ok) throw { error: `HTTP ${r.status}`, source: "HIBP Pwned Passwords" } satisfies ApiError;
  for (const line of (await r.text()).split("\n")) {
    const [s, c] = line.trim().split(":");
    if (s === suffix) return Number(c);
  }
  return 0;
}

function PasswordCard() {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const a = useAction((p: string) => pwnedCount(p));
  return (
    <Card title="Password Health Check" desc="Runs entirely in your browser. Only the first 5 characters of the SHA-1 hash are sent.">
      <div className="flex gap-2">
        <input className={inputCls} type={show ? "text" : "password"} autoComplete="off" placeholder="Enter a password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button type="button" className="rounded-md border border-zinc-700 px-3 text-xs text-zinc-300 hover:bg-zinc-800" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
        <Btn type="button" loading={a.loading} disabled={!pw} onClick={() => a.run(pw)}>Check</Btn>
      </div>
      <ErrorBox e={a.error} />
      {a.data !== null && (
        <p className={`text-sm ${a.data > 0 ? "text-red-300" : "text-emerald-300"}`}>
          {a.data > 0 ? `This password appears in ${a.data.toLocaleString()} known breaches. Do not use it.` : "This password was not found in known breaches."}
        </p>
      )}
    </Card>
  );
}

function UrlCard({ a, email }: { a: Action<[string], UrlResult>; email: string }) {
  const [url, setUrl] = useState("");
  return (
    <Card title="Scam URL / Ad Analyzer" desc="PhishDestroy and URLhaus verdicts plus a scam keyword scan of the page.">
      <div className="flex gap-2">
        <input className={inputCls} placeholder="https://suspicious-site.example" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Btn type="button" loading={a.loading} onClick={() => a.run(url)}>Analyze</Btn>
      </div>
      <ErrorBox e={a.error} />
      {a.data && (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <RiskBadge risk={a.data.risk} />
            {a.data.risk !== "LOW" && <AliasButton site={a.data.host} realEmail={email} />}
          </div>
          <p className="text-zinc-300">{a.data.explanation}</p>
          <ul className="space-y-1 text-xs text-zinc-400">
            {a.data.sources.map((s) => (
              <li key={s.name}>
                <span className="font-semibold text-zinc-200">{s.name}:</span> {s.error ? <span className="text-amber-300">{s.error}</span> : s.verdict}
              </li>
            ))}
          </ul>
          {a.data.pageError && <p className="text-xs text-amber-300">Page analysis: {a.data.pageError}</p>}
          <Chips items={a.data.keywords} tone="red" />
        </div>
      )}
    </Card>
  );
}

function ImageCard({ a }: { a: Action<[File], ImageResult> }) {
  return (
    <Card title="Popup Screenshot Analyzer" desc="OCR via Optiic, then the same scam keyword classifier. Images up to 5 MB.">
      <input
        type="file"
        accept="image/*"
        className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-200"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) a.run(f);
        }}
      />
      {a.loading && <p className="text-xs text-zinc-400">Extracting text...</p>}
      <ErrorBox e={a.error} />
      {a.data && (
        <div className="space-y-2 text-sm">
          <RiskBadge risk={a.data.risk} />
          <p className="text-zinc-300">{a.data.explanation}</p>
          <Chips items={a.data.keywords} tone="red" />
          {a.data.textPreview && <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-950 p-2 text-xs text-zinc-400">{a.data.textPreview}</pre>}
        </div>
      )}
    </Card>
  );
}

function AppsCard({ a }: { a: Action<[], AuditResult> }) {
  const d = a.data;
  return (
    <Card title="Connected Apps Auditor" desc="Google Workspace token audit via the Admin SDK Reports API. Requires a Workspace admin account.">
      {(!d || !d.signedIn) && <a href="/api/auth/google" className="inline-block rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500">Sign in with Google</a>}
      <ErrorBox e={a.error} />
      {d?.signedIn && !d.workspace && (
        <p className="text-sm text-zinc-300">
          {d.email} is a consumer Google account, so the audit API is not available. Use the{" "}
          <a className="text-red-400 underline" href={d.fallbackUrl} target="_blank" rel="noreferrer">Google Security Checkup</a> instead.
        </p>
      )}
      {d?.signedIn && d.workspace && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-400">{d.apps.length} apps found for {d.email}</p>
          <div className="max-h-72 overflow-auto rounded-md border border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-zinc-900 text-zinc-400">
                <tr><th className="p-2">App</th><th className="p-2">Type</th><th className="p-2">Scopes</th><th className="p-2">Last access</th></tr>
              </thead>
              <tbody>
                {d.apps.map((x) => (
                  <tr key={x.appName} className="border-t border-zinc-800 align-top">
                    <td className="p-2 text-zinc-100">{x.appName}{x.highRisk && <span className="ml-2 rounded bg-red-600/20 px-1.5 py-0.5 text-red-300">HIGH RISK</span>}</td>
                    <td className="p-2 text-zinc-400">{x.clientType}</td>
                    <td className="p-2 break-all text-zinc-400">{x.scopes.map((s) => s.replace("https://www.googleapis.com/auth/", "")).join(", ")}</td>
                    <td className="p-2 whitespace-nowrap text-zinc-400">{x.lastAccess ? new Date(x.lastAccess).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function PrivacyTab(p: {
  email: Action<[string], EmailResult>;
  url: Action<[string], UrlResult>;
  image: Action<[File], ImageResult>;
  audit: Action<[], AuditResult>;
  emailInput: string;
  setEmailInput: (v: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <EmailCard a={p.email} email={p.emailInput} setEmail={p.setEmailInput} />
      <PasswordCard />
      <UrlCard a={p.url} email={p.email.data?.email ?? p.emailInput} />
      <ImageCard a={p.image} />
      <div className="lg:col-span-2"><AppsCard a={p.audit} /></div>
    </div>
  );
}

