"use client";
import { useState } from "react";
import type { Action } from "@/lib/client";
import type { IpResult, MalwareResult, VulnResult } from "@/lib/types";
import { Btn, Card, Chips, ErrorBox, Notes, RiskBadge, inputCls } from "./ui";

function IpCard({ a }: { a: Action<[string], IpResult> }) {
  const [ip, setIp] = useState("");
  const d = a.data;
  return (
    <Card title="IP Reputation and Threat Intelligence" desc="InternetDB, AbuseIPDB and GreyNoise Community, queried in parallel.">
      <div className="flex gap-2">
        <input className={inputCls} placeholder="8.8.8.8" value={ip} onChange={(e) => setIp(e.target.value)} />
        <Btn type="button" loading={a.loading} onClick={() => a.run(ip)}>Scan</Btn>
      </div>
      <ErrorBox e={a.error} />
      {d && (
        <div className="space-y-3 text-sm">
          <RiskBadge risk={d.risk} />
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-zinc-500">Abuse confidence</dt><dd className="text-zinc-100">{d.abuseScore === null ? "unavailable" : `${d.abuseScore}/100 (${d.totalReports} reports)`}</dd></div>
            <div><dt className="text-zinc-500">Scanner classification</dt><dd className="text-zinc-100">{d.classification ?? "unavailable"}{d.noise ? " (internet noise)" : ""}</dd></div>
            <div><dt className="text-zinc-500">CVE count</dt><dd className="text-zinc-100">{d.cves.length}</dd></div>
            <div><dt className="text-zinc-500">Hostnames</dt><dd className="break-all text-zinc-100">{d.hostnames.join(", ") || "none"}</dd></div>
          </dl>
          <div><p className="mb-1 text-xs text-zinc-500">Open ports</p><Chips items={d.ports} /></div>
          {d.cves.length > 0 && <div><p className="mb-1 text-xs text-zinc-500">CVEs</p><Chips items={d.cves.slice(0, 30)} tone="red" /></div>}
          {d.tags.length > 0 && <div><p className="mb-1 text-xs text-zinc-500">Tags</p><Chips items={d.tags} /></div>}
          <Notes items={d.errors} />
        </div>
      )}
    </Card>
  );
}

function MalwareCard({ a }: { a: Action<[string], MalwareResult> }) {
  const [v, setV] = useState("");
  const d = a.data;
  return (
    <Card title="Malware URL / File Hash Scanner" desc="URLs go to VirusTotal. MD5 and SHA-256 hashes go to VirusTotal and MalwareBazaar.">
      <div className="flex gap-2">
        <input className={inputCls} placeholder="URL or file hash" value={v} onChange={(e) => setV(e.target.value)} />
        <Btn type="button" loading={a.loading} onClick={() => a.run(v)}>Scan</Btn>
      </div>
      <ErrorBox e={a.error} />
      {d && (
        <div className="space-y-2 text-sm">
          <p className={d.detections > 0 ? "text-red-300" : "text-emerald-300"}>{d.summary}</p>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-zinc-500">Family labels</dt><dd className="text-zinc-100">{d.families.join(", ") || "none"}</dd></div>
            <div><dt className="text-zinc-500">First seen</dt><dd className="text-zinc-100">{d.firstSeen ? new Date(d.firstSeen).toLocaleDateString() : "unknown"}</dd></div>
          </dl>
          <Notes items={d.errors} />
        </div>
      )}
    </Card>
  );
}

function VulnCard({ a }: { a: Action<[{ domain: string; tech: string; packageName: string; packageVersion: string }], VulnResult> }) {
  const [domain, setDomain] = useState("");
  const [tech, setTech] = useState("");
  const [pkg, setPkg] = useState("");
  const [ver, setVer] = useState("");
  const d = a.data;
  return (
    <Card title="Vulnerability and Exposure Check" desc="Certificate transparency subdomains (crt.sh), NVD CVEs and optional OSV.dev package lookup.">
      <input className={inputCls} placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
      <input className={inputCls} placeholder="Technology keyword for CVE search, e.g. nginx 1.18 (optional)" value={tech} onChange={(e) => setTech(e.target.value)} />
      <div className="flex gap-2">
        <input className={inputCls} placeholder="npm package (optional)" value={pkg} onChange={(e) => setPkg(e.target.value)} />
        <input className={inputCls} placeholder="version" value={ver} onChange={(e) => setVer(e.target.value)} />
      </div>
      <Btn type="button" loading={a.loading} onClick={() => a.run({ domain, tech, packageName: pkg, packageVersion: ver })}>Check</Btn>
      <ErrorBox e={a.error} />
      {d && (
        <div className="space-y-3 text-sm">
          <Notes items={d.errors} />
          <div><p className="mb-1 text-xs text-zinc-500">{d.subdomains.length} subdomains in certificate logs</p><div className="max-h-32 overflow-auto"><Chips items={d.subdomains} /></div></div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">{d.cves.length} matching CVEs{d.maxScore ? ` (highest CVSS ${d.maxScore})` : ""}</p>
            <ul className="max-h-40 space-y-1 overflow-auto text-xs text-zinc-400">
              {d.cves.map((c) => (<li key={c.id}><span className="font-semibold text-red-300">{c.id}</span> {c.score !== null && `[${c.score}] `}{c.summary}</li>))}
            </ul>
          </div>
          {d.osv.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-zinc-500">{d.osv.length} OSV advisories for the package</p>
              <ul className="max-h-32 space-y-1 overflow-auto text-xs text-zinc-400">{d.osv.map((o) => (<li key={o.id}><span className="font-semibold text-red-300">{o.id}</span> {o.summary}</li>))}</ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function CyberTab(p: {
  ip: Action<[string], IpResult>;
  malware: Action<[string], MalwareResult>;
  vuln: Action<[{ domain: string; tech: string; packageName: string; packageVersion: string }], VulnResult>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <IpCard a={p.ip} />
      <MalwareCard a={p.malware} />
      <div className="lg:col-span-2"><VulnCard a={p.vuln} /></div>
    </div>
  );
}
