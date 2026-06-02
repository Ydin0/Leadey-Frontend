"use client";

import React from "react";
import { CH_IDS, CH_MAP, type ChannelId, type Bucketed } from "@/lib/team/team-data";

export function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = React.useRef<HTMLDivElement>(null);
  const [w, setW] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((ents) => { for (const e of ents) setW(e.contentRect.width); });
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function niceMax(v: number): number {
  if (v <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

export function attColor(pct: number): string {
  if (pct >= 1) return "var(--signal-green-text)";
  if (pct >= 0.7) return "var(--accent)";
  return "var(--signal-red-text)";
}

export function Sparkline({ data, color = "#97A4D6", width = 120, height = 34 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  const max = Math.max(1, ...data);
  const min = Math.min(...data);
  const n = data.length;
  const pad = 2;
  const x = (i: number) => pad + (i / (n - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / (max - min || 1)) * (height - pad * 2);
  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${height} L${x(0).toFixed(1)},${height} Z`;
  const gid = "sp" + React.useId().replace(/[:]/g, "");
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(n - 1)} cy={y(data[n - 1])} r="2.4" fill={color} />
    </svg>
  );
}

export function TrendChart({ chart, mode = "area", height = 240, channels }: {
  chart: Bucketed; mode?: "area" | "bars"; height?: number; channels?: ChannelId[];
}) {
  const CH = channels || CH_IDS;
  const [ref, w] = useWidth();
  const [hover, setHover] = React.useState<number | null>(null);
  const labels = chart.labels;
  const n = labels.length;

  const padL = 34, padR = 8, padT = 12, padB = 24;
  const W = Math.max(w, 320);
  const innerW = W - padL - padR;
  const innerH = height - padT - padB;
  const stackMax = niceMax(Math.max(1, ...chart.totals));
  const xCenter = (i: number) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const xBand = (i: number) => padL + ((i + 0.5) / n) * innerW;
  const yOf = (v: number) => padT + innerH - (v / stackMax) * innerH;

  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(stackMax * f));
  const order = CH;

  function stackAt(i: number) {
    let acc = 0; const segs: { ch: ChannelId; base: number; val: number }[] = [];
    order.forEach((ch) => { const v = chart.series[ch][i]; segs.push({ ch, base: acc, val: v }); acc += v; });
    return segs;
  }

  const areaPaths = (() => {
    if (mode !== "area") return [] as { ch: ChannelId; d: string; topLine: string }[];
    let running = new Array(n).fill(0);
    const layers: { ch: ChannelId; d: string; topLine: string }[] = [];
    order.forEach((ch) => {
      const top = chart.series[ch].map((v, i) => running[i] + v);
      const bottom = running.slice();
      const upper = top.map((v, i) => `${i ? "L" : "M"}${xCenter(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");
      const lower = bottom.map((v, i) => `L${xCenter(n - 1 - i).toFixed(1)},${yOf(bottom[n - 1 - i]).toFixed(1)}`).join(" ");
      layers.push({ ch, d: `${upper} ${lower} Z`, topLine: top.map((v, i) => `${i ? "L" : "M"}${xCenter(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ") });
      running = top;
    });
    return layers;
  })();

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let i = mode === "bars"
      ? Math.floor(((px - padL) / innerW) * n)
      : Math.round(((px - padL) / innerW) * (n - 1));
    i = Math.max(0, Math.min(n - 1, i));
    setHover(i);
  }

  const hoverX = hover == null ? 0 : (mode === "bars" ? xBand(hover) : xCenter(hover));

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <svg width={W} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ display: "block" }}>
        {gridVals.map((gv, gi) => {
          const yy = yOf(gv);
          return (
            <g key={gi}>
              <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--border-subtle)" strokeWidth="1" />
              <text x={padL - 7} y={yy + 3} textAnchor="end" fontSize="9" fill="var(--fg-faint)">{gv >= 1000 ? (gv / 1000).toFixed(gv % 1000 ? 1 : 0) + "k" : gv}</text>
            </g>
          );
        })}

        {mode === "area" && areaPaths.map((L) => {
          const c = CH_MAP[L.ch].color;
          const gid = "ar" + L.ch;
          return (
            <g key={L.ch}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity="0.5" />
                  <stop offset="100%" stopColor={c} stopOpacity="0.12" />
                </linearGradient>
              </defs>
              <path d={L.d} fill={`url(#${gid})`} />
              <path d={L.topLine} fill="none" stroke={c} strokeWidth="1.4" strokeOpacity="0.9" />
            </g>
          );
        })}

        {mode === "bars" && labels.map((_, i) => {
          const segs = stackAt(i);
          const bw = Math.min(26, (innerW / n) * 0.6);
          const cx = xBand(i);
          return (
            <g key={i} opacity={hover == null || hover === i ? 1 : 0.45} style={{ transition: "opacity .12s" }}>
              {segs.map((s) => {
                const c = CH_MAP[s.ch].color;
                const y0 = yOf(s.base), y1 = yOf(s.base + s.val);
                if (s.val <= 0) return null;
                return <rect key={s.ch} x={cx - bw / 2} y={y1} width={bw} height={Math.max(0, y0 - y1)} fill={c} fillOpacity="0.85" rx="1.5" />;
              })}
            </g>
          );
        })}

        {hover != null && (
          <g>
            <line x1={hoverX} y1={padT} x2={hoverX} y2={padT + innerH} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 3" />
            {mode === "area" && (() => { let acc = 0; return order.map((ch) => { acc += chart.series[ch][hover]; return <circle key={ch} cx={xCenter(hover)} cy={yOf(acc)} r="2.6" fill={CH_MAP[ch].color} stroke="var(--page)" strokeWidth="1" />; }); })()}
          </g>
        )}

        {labels.map((lb, i) => {
          const every = Math.ceil(n / 7);
          if (i % every !== 0 && i !== n - 1) return null;
          return <text key={i} x={mode === "bars" ? xBand(i) : xCenter(i)} y={height - 7} textAnchor="middle" fontSize="9" fill="var(--fg-faint)">{lb}</text>;
        })}
      </svg>

      {hover != null && (
        <div style={{ position: "absolute", top: 4, left: Math.min(Math.max(hoverX - 70, 0), W - 150), width: 150, pointerEvents: "none",
          background: "var(--surface)", border: "1px solid var(--border-default)", borderRadius: 10, padding: "9px 11px", boxShadow: "var(--shadow-pop)", zIndex: 5 }}>
          <div style={{ fontSize: 10, color: "var(--fg-muted)", marginBottom: 6, fontWeight: 500 }}>{labels[hover]}</div>
          {order.map((ch) => (
            <div key={ch} className="between" style={{ fontSize: 11, marginBottom: 3 }}>
              <span className="row" style={{ gap: 6, color: "var(--fg2)" }}><span style={{ width: 7, height: 7, borderRadius: 2, background: CH_MAP[ch].color }}></span>{CH_MAP[ch].label}</span>
              <span style={{ fontWeight: 600 }}>{chart.series[ch][hover]}</span>
            </div>
          ))}
          <div className="between" style={{ fontSize: 11, marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--border-subtle)" }}>
            <span style={{ color: "var(--fg-muted)" }}>Total</span><span style={{ fontWeight: 700 }}>{chart.totals[hover]}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function Donut({ parts, size = 152, thickness = 18, centerLabel, centerSub }: {
  parts: { label: string; value: number; color: string }[];
  size?: number; thickness?: number; centerLabel?: React.ReactNode; centerSub?: string;
}) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--section)" strokeWidth={thickness} />
        {parts.map((p, i) => {
          const frac = p.value / total;
          const len = frac * c;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
          );
          offset += len;
          return el;
        })}
      </g>
      {centerLabel != null && (
        <text x="50%" y="48%" textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--fg1)">{centerLabel}</text>
      )}
      {centerSub && <text x="50%" y="62%" textAnchor="middle" fontSize="10" fill="var(--fg-muted)">{centerSub}</text>}
    </svg>
  );
}

export function Ring({ pct, size = 76, thickness = 8, color = "#97A4D6", label }: {
  pct: number; size?: number; thickness?: number; color?: string; label?: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--section)" strokeWidth={thickness} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thickness}
          strokeDasharray={`${p * c} ${c}`} strokeLinecap="round" style={{ transition: "stroke-dasharray .5s ease" }} />
      </g>
      <text x="50%" y={label ? "46%" : "54%"} textAnchor="middle" fontSize="16" fontWeight="600" fill="var(--fg1)">{Math.round(pct * 100)}%</text>
      {label && <text x="50%" y="62%" textAnchor="middle" fontSize="8.5" fill="var(--fg-muted)">{label}</text>}
    </svg>
  );
}

export function Meter({ pct, color }: { pct: number; color?: string }) {
  const p = Math.max(0, Math.min(1.0, pct));
  return <div className="meter"><span style={{ width: `${p * 100}%`, background: color || attColor(pct) }}></span></div>;
}
