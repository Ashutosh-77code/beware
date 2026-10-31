"use client";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import type { ApiError, Risk } from "@/lib/types";

export const inputCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none";

export function Card({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
      {desc && <p className="mt-1 text-xs text-zinc-400">{desc}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function Btn({ loading, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button {...p} disabled={p.disabled || loading} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50">
      {loading ? "Working..." : children}
    </button>
  );
}

export function ErrorBox({ e }: { e: ApiError | null }) {
  if (!e) return null;
  return (
    <p className="rounded-md border border-red-900 bg-red-950/50 p-3 text-xs text-red-300">
      <span className="font-semibold">{e.source}:</span> {e.error}
    </p>
  );
}

const riskCls: Record<Risk, string> = {
  HIGH: "bg-red-600/20 text-red-300 border-red-700",
  MEDIUM: "bg-amber-600/20 text-amber-300 border-amber-700",
  LOW: "bg-emerald-600/20 text-emerald-300 border-emerald-700",
};

export function RiskBadge({ risk }: { risk: Risk }) {
  return <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${riskCls[risk]}`}>{risk} RISK</span>;
}

export function Chips({ items, tone = "zinc" }: { items: (string | number)[]; tone?: "zinc" | "red" }) {
  if (!items.length) return <span className="text-xs text-zinc-500">none</span>;
  const cls = tone === "red" ? "border-red-800 bg-red-950/40 text-red-300" : "border-zinc-700 bg-zinc-800 text-zinc-300";
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={String(i)} className={`rounded border px-2 py-0.5 text-xs ${cls}`}>{i}</span>
      ))}
    </div>
  );
}

export function Notes({ items }: { items: { source: string; error: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-1">
      {items.map((n) => (
        <p key={n.source} className="rounded-md border border-amber-900 bg-amber-950/40 p-2 text-xs text-amber-300">
          <span className="font-semibold">{n.source}:</span> {n.error}
        </p>
      ))}
    </div>
  );
}

export function ScoreRing({ value, label, hint, tone }: { value: number | null; label: string; hint: string; tone: "good" | "bad" }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const v = value ?? 0;
  const goodness = tone === "good" ? v : 100 - v;
  const color = goodness >= 75 ? "#10b981" : goodness >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-4">
      <svg width="124" height="124" viewBox="0 0 124 124" role="img" aria-label={`${label} ${value ?? "not scanned"}`}>
        <circle cx="62" cy="62" r={r} fill="none" stroke="#27272a" strokeWidth="10" />
        <circle
          cx="62" cy="62" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * v) / 100} transform="rotate(-90 62 62)"
        />
        <text x="62" y="68" textAnchor="middle" fontSize="28" fontWeight="700" fill="#f4f4f5">{value ?? "--"}</text>
      </svg>
      <div>
        <p className="text-sm font-semibold text-zinc-100">{label}</p>
        <p className="mt-1 max-w-[14rem] text-xs text-zinc-400">{hint}</p>
      </div>
    </div>
  );
}
