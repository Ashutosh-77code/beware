"use client";
import { useEffect, useMemo, useState } from "react";
import { getJson, postForm, postJson, useAction } from "@/lib/client";
import { privacyScore } from "@/lib/score";
import { cyberScore } from "@/lib/cyberScore";
import type { AuditResult, EmailResult, ImageResult, IpResult, MalwareResult, UrlResult, VulnResult } from "@/lib/types";
import PrivacyTab from "./PrivacyTab";
import CyberTab from "./CyberTab";
import { ScoreRing } from "./ui";
import Hero from "./hero";

type VulnInput = { domain: string; tech: string; packageName: string; packageVersion: string };

export default function Dashboard() {
  const [tab, setTab] = useState<"privacy" | "cyber">("privacy");
  const [emailInput, setEmailInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const email = useAction((e: string) => postJson<EmailResult>("/api/scan/email", { email: e }));
  const url = useAction((u: string) => postJson<UrlResult>("/api/scan/url", { url: u }));
  const image = useAction((f: File) => {
    const fd = new FormData();
    fd.append("image", f);
    return postForm<ImageResult>("/api/scan/image", fd);
  });
  const audit = useAction(() => getJson<AuditResult>("/api/audit/apps"));
  const ip = useAction((v: string) => postJson<IpResult>("/api/cyber/ip", { ip: v }));
  const malware = useAction((v: string) => postJson<MalwareResult>("/api/cyber/malware", { input: v }));
  const vuln = useAction((v: VulnInput) => postJson<VulnResult>("/api/cyber/vuln", v));

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setAuthError(q.get("auth_error"));
    audit.run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const privacyScanned = Boolean(email.data || url.data || image.data || audit.data?.workspace);
  const privacy = useMemo(
    () =>
      privacyScore({
        breachCount: email.data?.count ?? 0,
        apps: audit.data?.apps ?? [],
        scamRisks: [url.data?.risk, image.data?.risk],
      }),
    [email.data, audit.data, url.data, image.data],
  );

  const cyberScanned = Boolean(ip.data || malware.data || vuln.data);
  const cyber = useMemo(
    () =>
      cyberScore({
        abuseScore: ip.data?.abuseScore ?? null,
        malwareDetections: malware.data?.detections ?? null,
        cveCount: vuln.data?.cves.length ?? null,
        cveMaxScore: vuln.data?.maxScore ?? null,
      }),
    [ip.data, malware.data, vuln.data],
  );
   return (
    <>
      <Hero onPick={setTab} />
      <main id="dashboard" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-zinc-100">Dashboard</h2>
          <nav className="flex rounded-lg border border-zinc-800 p-1 text-sm">
            {(["privacy", "cyber"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-md px-4 py-1.5 ${tab === t ? "bg-red-600 text-white" : "text-zinc-400 hover:text-zinc-100"}`}>
                {t === "privacy" ? "Privacy" : "Cybersecurity"}
              </button>
            ))}
          </nav>
        </div>

        {authError && <p className="mb-4 rounded-md border border-red-900 bg-red-950/50 p-3 text-xs text-red-300">Google sign-in failed: {authError}</p>}

        <div className="mb-6 grid gap-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 sm:grid-cols-2">
          <ScoreRing value={privacyScanned ? privacy : null} tone="good" label="Overall Privacy Score" hint="100 minus breach, connected-app and scam penalties. Higher is better." />
          <ScoreRing value={cyberScanned ? cyber : null} tone="bad" label="Cyber Risk Score" hint="Weighted IP abuse (40%), malware detections (40%), CVEs (20%). Lower is better." />
        </div>

        {tab === "privacy" ? (
          <PrivacyTab email={email} url={url} image={image} audit={audit} emailInput={emailInput} setEmailInput={setEmailInput} />
        ) : (
          <CyberTab ip={ip} malware={malware} vuln={vuln} />
        )}
      </main>
    </>
  );
}