"use client";
import { useEffect, useRef } from "react";

type Tab = "privacy" | "cyber";

const WORDS = ["Privacy", "Security", "Safety"];
const HOLD = 2600;
const N = 196;
const M = 41;
const RI = 435;
const RO = 652;
const TAU = Math.PI * 2;

const BODY: [number, string][] = [[0, "#b01e50"], [0.12, "#9c1236"], [0.4, "#860c18"], [0.7, "#9c1a0a"], [0.9, "#c63c0e"], [1, "#e85a18"]];
const EDGE: [number, string][] = [
  [0, "rgba(255,130,185,.85)"], [0.08, "rgba(255,84,138,.95)"], [0.28, "rgba(255,56,80,.95)"],
  [0.55, "rgba(255,58,44,.95)"], [0.8, "rgba(255,92,36,.95)"], [0.94, "rgba(255,122,44,.95)"], [1, "rgba(255,150,70,.95)"],
];
const AMBIENT: [number, string][] = [[0, "rgba(170,14,50,.35)"], [0.5, "rgba(120,8,14,.45)"], [1, "rgba(170,40,6,.4)"]];

const cen = new Float32Array(N * M * 2);
const Lp = new Float32Array(N * M * 2);
const Rp = new Float32Array(N * M * 2);
const ANG = new Float32Array(N);

function grad(x: CanvasRenderingContext2D, r0: number, r1: number, stops: [number, string][]) {
  const g = x.createRadialGradient(0, 0, r0, 0, 0, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function smooth(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function typed(t: number): { text: string; caret: boolean } {
  const segs = WORDS.map((w, i) => {
    const nx = WORDS[(i + 1) % WORDS.length];
    return { w, nx, d: HOLD + w.length * 70 + 250 + nx.length * 100 + 150 };
  });
  let x = t % segs.reduce((a, s) => a + s.d, 0);
  for (const s of segs) {
    if (x >= s.d) {
      x -= s.d;
      continue;
    }
    if (x < HOLD) return { text: s.w, caret: Math.floor(x / 550) % 2 === 0 };
    x -= HOLD;
    const del = s.w.length * 70;
    if (x < del) return { text: s.w.slice(0, s.w.length - Math.floor(x / 70)), caret: true };
    x -= del;
    if (x < 250) return { text: "", caret: true };
    x -= 250;
    if (x < s.nx.length * 100) return { text: s.nx.slice(0, Math.floor(x / 100) + 1), caret: true };
    return { text: s.nx, caret: true };
  }
  return { text: WORDS[0], caret: true };
}

const U = (n: number) => `calc(var(--u) * ${n})`;
const FS = "min(calc(var(--u) * 176), 22vw)";

export default function Hero({ onPick }: { onPick: (t: Tab) => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const wordEl = useRef<HTMLSpanElement>(null);
  const caretEl = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const f = frame.current!;
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const off = document.createElement("canvas");
    const octx = off.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    let W = 0, H = 0, u = 1, dpr = 1, shift = 0, raf = 0;

    function draw(t: number) {
      const ri = RI * u, ro = RO * u;
      const cx = W / 2 + 34 * u + ptr.x * 14 * u;
      const cy = -212 * u + shift + ptr.y * 10 * u;
      const vs = 1.03 + 0.035 * ptr.x;
      const k = 0.42 * (1 + 0.12 * Math.sin(0.55 * t));
      const spin = 0.06 * t;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.setTransform(dpr, 0, 0, dpr * vs, cx * dpr, cy * dpr);

      ctx.fillStyle = grad(ctx, ri, ro, AMBIENT);
      ctx.beginPath();
      ctx.arc(0, 0, ro, 0, TAU);
      ctx.moveTo(ri, 0);
      ctx.arc(0, 0, ri, 0, TAU, true);
      ctx.fill();

      for (let i = 0; i < N; i++) {
        const ui = (TAU * i) / N + spin;
        ANG[i] = (((ui + Math.PI / 2) % TAU) + TAU) % TAU;
        for (let j = 0; j < M; j++) {
          const q = j / (M - 1);
          const r = ri + (ro - ri) * q;
          const th = ui + k * Math.pow(1 - q, 4.2) + 0.05 * k * q * q + 0.02 * Math.sin(Math.PI * q) * Math.sin(3 * ui + 0.4 * t);
          const o = (i * M + j) * 2;
          cen[o] = r * Math.cos(th);
          cen[o + 1] = r * Math.sin(th);
        }
        for (let j = 0; j < M; j++) {
          const q = j / (M - 1);
          const a = (i * M + Math.max(j - 1, 0)) * 2;
          const b = (i * M + Math.min(j + 1, M - 1)) * 2;
          let tx = cen[b] - cen[a];
          let ty = cen[b + 1] - cen[a + 1];
          const l = Math.hypot(tx, ty) || 1;
          tx /= l;
          ty /= l;
          const w = (0.15 + 3.3 * smooth(q / 0.28) * (1 - 0.25 * q)) * u;
          const o = (i * M + j) * 2;
          Lp[o] = cen[o] - ty * w;
          Lp[o + 1] = cen[o + 1] + tx * w;
          Rp[o] = cen[o] + ty * w;
          Rp[o + 1] = cen[o + 1] - tx * w;
        }
      }

      const order = Array.from({ length: N }, (_, i) => i).sort((p, q) => ANG[p] - ANG[q]);
      const body = grad(ctx, ri, ro, BODY);
      const edgeG = grad(ctx, ri, ro, EDGE);
      const edges: Path2D[] = [];
      ctx.lineJoin = "round";
      ctx.lineWidth = 1.45 * u;

      for (const i of order) {
        const base = i * M * 2;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(Lp[base], Lp[base + 1]);
        for (let j = 1; j < M; j++) ctx.lineTo(Lp[base + j * 2], Lp[base + j * 2 + 1]);
        for (let j = M - 1; j >= 0; j--) ctx.lineTo(Rp[base + j * 2], Rp[base + j * 2 + 1]);
        ctx.closePath();
        ctx.fill();

        const e = new Path2D();
        e.moveTo(Lp[base], Lp[base + 1]);
        for (let j = 1; j < M; j++) e.lineTo(Lp[base + j * 2], Lp[base + j * 2 + 1]);
        edges.push(e);
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = edgeG;
        ctx.stroke(e);
      }

      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(0, 0, ro - 16 * u, 0, 0, ro + 70 * u);
      halo.addColorStop(0, "rgba(255,110,30,0)");
      halo.addColorStop(0.186, "rgba(255,110,30,.42)");
      halo.addColorStop(1, "rgba(255,110,30,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, ro + 70 * u, 0, TAU);
      ctx.fill();

      const inner = ctx.createRadialGradient(0, 0, ri - 40 * u, 0, 0, ri + 30 * u);
      inner.addColorStop(0, "rgba(255,90,140,0)");
      inner.addColorStop(0.57, "rgba(255,90,140,.09)");
      inner.addColorStop(1, "rgba(255,90,140,0)");
      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.arc(0, 0, ri + 30 * u, 0, TAU);
      ctx.fill();

      ctx.lineWidth = 1.6 * u;
      ctx.strokeStyle = "rgba(255,130,50,.7)";
      ctx.beginPath();
      ctx.arc(0, 0, ro, 0, TAU);
      ctx.stroke();

      const sc = dpr * 0.32;
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.clearRect(0, 0, off.width, off.height);
      octx.setTransform(sc, 0, 0, sc * vs, cx * sc, cy * sc);
      octx.globalCompositeOperation = "lighter";
      octx.globalAlpha = 0.7;
      octx.lineJoin = "round";
      octx.lineWidth = 5.3 * u;
      octx.strokeStyle = grad(octx, ri, ro, EDGE);
      for (const e of edges) octx.stroke(e);
      octx.globalAlpha = 1;
      octx.lineWidth = 9 * u;
      octx.strokeStyle = "rgba(255,110,30,.8)";
      octx.beginPath();
      octx.arc(0, 0, ro, 0, TAU);
      octx.stroke();
      octx.lineWidth = 5 * u;
      octx.strokeStyle = "rgba(255,80,140,.8)";
      octx.beginPath();
      octx.arc(0, 0, ri, 0, TAU);
      octx.stroke();

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      ctx.filter = `blur(${8 * u * dpr}px)`;
      ctx.drawImage(off, 0, 0, c.width, c.height);
      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-over";
    }

    function paintText(t: number) {
      const s = typed(t);
      if (wordEl.current && wordEl.current.textContent !== s.text) wordEl.current.textContent = s.text;
      if (caretEl.current) caretEl.current.style.opacity = s.caret ? "1" : "0";
    }

    function resize() {
      const r = f.getBoundingClientRect();
      W = r.width;
      H = r.height;
      const phone = window.innerWidth < 768;
      u = phone ? W / 600 : Math.min(W / 1052, H / 754);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      shift = phone ? Math.max(0, (H - 724 * u) / 2) : 0;
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      off.width = Math.max(1, Math.round(W * dpr * 0.32));
      off.height = Math.max(1, Math.round(H * dpr * 0.32));
      f.style.setProperty("--u", `${u}px`);
      f.style.setProperty("--shift", `${shift}px`);
      if (reduce) {
        draw(0);
        paintText(0);
      }
    }

    function tick() {
      const now = performance.now();
      ptr.x += (ptr.tx - ptr.x) * 0.05;
      ptr.y += (ptr.ty - ptr.y) * 0.05;
      draw(now / 1000);
      paintText(now);
      raf = requestAnimationFrame(tick);
    }

    function onMove(e: PointerEvent) {
      const r = f.getBoundingClientRect();
      ptr.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      ptr.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(f);
    window.addEventListener("resize", resize);
    if (!reduce) {
      window.addEventListener("pointermove", onMove);
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    
    <section className="relative h-[100svh] min-h-[560px] bg-black">
      <div ref={frame} className="hero-frame absolute inset-[10px] overflow-hidden border border-white/[.09] bg-black md:inset-x-[5vw] md:inset-y-[7.2vh]" style={{ borderRadius: U(14) }}>
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" />

        <nav className="absolute flex items-center justify-between" style={{ top: U(24), left: U(26), right: U(24) }}>
          <a href="#top" className="flex items-center text-white" style={{ gap: U(8), fontSize: U(17.5), fontWeight: 500 }}>
            <svg viewBox="0 0 20 20" style={{ width: U(20), height: U(20) }} fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
              <path d="M10 1.5 L16 6.5 L10 11.5 L4 6.5 Z" />
              <path d="M3 11 L10 17.5 L17 11" />
            </svg>
            BEWARE
          </a>
          <div className="flex items-center" style={{ gap: U(4) }}>
            <div className="v-pill hidden items-center md:flex">
              <a href="#dashboard" onClick={() => onPick("privacy")}>Privacy</a>
              <a href="#dashboard" onClick={() => onPick("cyber")}>Cyber</a>
              <a href="#dashboard" onClick={() => onPick("privacy")}>Scores</a>
            </div>
            <a href="/api/auth/google" className="v-connect">Connect</a>
          </div>
        </nav>

        <div className="absolute inset-x-0 flex flex-col items-center text-center" style={{ top: "calc(var(--u) * 423 + var(--shift))" }}>
          <div className="flex items-center justify-center" style={{ height: FS, fontSize: FS, lineHeight: 1 }}>
            <span ref={wordEl} className="v-word" style={{ fontWeight: 600, letterSpacing: "-0.03em" }}>Privacy</span>
            <span ref={caretEl} style={{ width: U(1.6), height: U(124), marginLeft: U(7), background: "#ffb48c" }} />
          </div>
          <p className="v-sub">
            BEWARE audits your email, passwords, links and servers<br />
            and shows you what to fix first.
          </p>
          <a href="#dashboard" className="v-cta">Start auditing</a>
        </div>
      </div>
    </section>
  );
}