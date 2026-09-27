"use client";
import { useEffect, useId, useState } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { fill, type Locale } from "@/i18n";
import { useI18n } from "@/i18n/use";
import { fmt, fmtPct, fmtTime, nf } from "@/lib/format";
import type { Item, Point, Unit, Widget } from "@/lib/api";
import { Card } from "./ui";

export type Size = "sm" | "md" | "lg";
const COLORS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];
const morph = { type: "spring", visualDuration: 0.8, bounce: 0 } as const;
const chartH: Record<Size, string> = { sm: "h-24", md: "h-44", lg: "h-[30vh]" };

/** Spring-rolled number; the unit/scale word ("میلیون تومان", "M Toman" suffix) renders smaller. */
export function AnimatedNumber({ value, unit, className = "", stack = false }: { value: number; unit: Unit; className?: string; stack?: boolean }) {
  const { locale } = useI18n();
  const reduce = useReducedMotion();
  const mv = useSpring(reduce ? value : 0, { stiffness: 70, damping: 18 });
  const parts = useTransform(mv, (v) => fmt(v, unit, locale).split(/\s(.*)/));
  const num = useTransform(parts, (p) => p[0]);
  const suffix = useTransform(parts, (p) => p[1] ?? "");
  useEffect(() => (reduce ? mv.jump(value) : mv.set(value)), [value, reduce, mv]);
  return (
    <span className={`num whitespace-nowrap ${stack ? "flex flex-col items-center leading-tight" : ""} ${className}`}>
      <motion.span>{num}</motion.span>
      <motion.span className={`${stack ? "" : "ms-[0.25em] "}text-[0.42em] font-medium tracking-normal text-muted`}>{suffix}</motion.span>
    </span>
  );
}

/** Smooth Catmull-Rom path through points; fixed command count so `d` morphs cleanly. */
function geom(vals: number[], w = 100, h = 100, pad = 0.12) {
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const p = vals.map((v, i) => [(i / Math.max(vals.length - 1, 1)) * w, h - (((v - min) / span) * (1 - 2 * pad) + pad) * h]);
  let d = `M${p[0][0].toFixed(2)},${p[0][1].toFixed(2)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const [a, b, c, e] = [p[i - 1] ?? p[i], p[i], p[i + 1], p[i + 2] ?? p[i + 1]];
    d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(2)},${(b[1] + (c[1] - a[1]) / 6).toFixed(2)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(2)},${(c[1] - (e[1] - b[1]) / 6).toFixed(2)} ${c[0].toFixed(2)},${c[1].toFixed(2)}`;
  }
  return { d, area: `${d}L${w},${h}L0,${h}Z`, p, min, max };
}

function Area({ vals, color, grid = false }: { vals: number[]; color: string; grid?: boolean }) {
  const id = useId();
  const g = geom(vals);
  return (
    <motion.svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full overflow-visible"
      initial={{ clipPath: "inset(-10% 100% -10% 0%)" }}
      animate={{ clipPath: "inset(-10% 0% -10% 0%)" }}
      transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid && [25, 50, 75].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="var(--line)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />)}
      <motion.path initial={{ opacity: 0 }} animate={{ d: g.area, opacity: 1 }} transition={{ d: morph, opacity: { duration: 1 } }} fill={`url(#${id})`} />
      <motion.path
        animate={{ d: g.d }}
        transition={{ d: morph }}
        fill="none"
        stroke={color}
        strokeWidth="2.25"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </motion.svg>
  );
}

function summary(title: string, vals: number[], unit: Unit, l: Locale, tpl: string) {
  if (!vals.length) return title;
  return fill(tpl, { title, min: fmt(Math.min(...vals), unit, l), max: fmt(Math.max(...vals), unit, l), last: fmt(vals[vals.length - 1], unit, l) });
}

function Tip({ x, children }: { x: number; children: React.ReactNode }) {
  const shift = x < 15 ? "0%" : x > 85 ? "-100%" : "-50%";
  return (
    <div className="glass-thin pointer-events-none absolute -top-2 z-10 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs shadow-lg" style={{ left: `${x}%`, transform: `translate(${shift}, -100%)` }}>
      {children}
    </div>
  );
}

function NumberW({ w, size }: { w: Widget; size: Size }) {
  const { locale, t } = useI18n();
  const v = w.value ?? 0;
  const r = w.previous ? (v - w.previous) / Math.abs(w.previous) : 0;
  const good = r === 0 ? null : r > 0 === (w.good !== "down");
  const tone = good === null ? "text-muted bg-black/5 dark:bg-white/10" : good ? "text-pos bg-pos/12" : "text-neg bg-neg/12";
  const big = size === "sm" ? "text-2xl sm:text-3xl" : size === "lg" ? "text-6xl 2xl:text-8xl" : "text-4xl sm:text-5xl";
  return (
    <div className="flex h-full flex-col">
      <div className="relative mt-auto">
        <span key={v} className="flash pointer-events-none absolute -inset-x-4 -inset-y-2 rounded-full bg-[radial-gradient(closest-side,var(--spot),transparent)]" aria-hidden />
        <AnimatedNumber value={v} unit={w.unit} className={`relative block font-semibold tight leading-none ${big}`} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`num inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${tone}`}>
          {r !== 0 && <ArrowUpRight className={`size-3.5 ${r < 0 ? "rotate-90" : ""}`} aria-hidden />}
          {fmtPct(r, locale, true)}
        </span>
        {size !== "sm" && <span className="text-faint">{t.app.vsPrev}</span>}
      </div>
      {w.series && (
        <div dir="ltr" className={`relative mt-4 ${size === "sm" ? "h-8" : size === "lg" ? "h-24" : "h-12"}`}>
          <Area vals={w.series.map((p) => p.v)} color={good === false ? "var(--neg)" : "var(--c2)"} />
        </div>
      )}
    </div>
  );
}

function LineW({ w, size }: { w: Widget; size: Size }) {
  const { locale, t } = useI18n();
  const s: Point[] = w.series ?? [];
  const vals = s.map((p) => p.v);
  const [hi, setHi] = useState<number | null>(null);
  if (!s.length) return null;
  const g = geom(vals);
  const n = s.length;
  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHi(Math.round(Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * (n - 1)));
  };
  const x = hi === null ? 0 : (hi / (n - 1)) * 100;
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-baseline gap-2">
        <AnimatedNumber value={vals[n - 1]} unit={w.unit} className={`font-semibold tight ${size === "lg" ? "text-5xl" : "text-3xl"}`} />
      </div>
      <div
        dir="ltr"
        tabIndex={0}
        role="img"
        aria-label={summary(w.title[locale], vals, w.unit, locale, t.app.chart)}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setHi(null)}
        onBlur={() => setHi(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            setHi((h) => Math.min(Math.max((h ?? n - 1) + (e.key === "ArrowRight" ? 1 : -1), 0), n - 1));
          }
        }}
        className={`relative mt-auto touch-pan-y select-none rounded-lg ${chartH[size]}`}
      >
        <Area vals={vals} color="var(--c1)" grid />
        {hi !== null && (
          <>
            <div className="pointer-events-none absolute inset-y-0 w-px bg-fg/25" style={{ left: `${x}%` }} />
            <div className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-[var(--c1)] shadow" style={{ left: `${x}%`, top: `${g.p[hi][1]}%` }} />
            <Tip x={x}>
              <span className="num font-semibold">{fmt(vals[hi], w.unit, locale)}</span>
              <span className="num ms-2 text-faint">{fmtTime(s[hi].t, locale)}</span>
            </Tip>
          </>
        )}
      </div>
      {size !== "sm" && (
        <div dir="ltr" className="num mt-2 flex justify-between text-[11px] text-faint">
          <span>{fmtTime(s[0].t, locale)}</span>
          <span>{fmtTime(s[n - 1].t, locale)}</span>
        </div>
      )}
    </div>
  );
}

function BarW({ w, size }: { w: Widget; size: Size }) {
  const { locale, t } = useI18n();
  const bars: Item[] = w.bars ?? [];
  const max = Math.max(...bars.map((b) => b.v), 1);
  const [hi, setHi] = useState<number | null>(null);
  return (
    <div
      dir="ltr"
      role="img"
      aria-label={summary(w.title[locale], bars.map((b) => b.v), w.unit, locale, t.app.chart)}
      className={`relative mt-auto flex items-end gap-2 sm:gap-3 ${chartH[size]}`}
      onPointerLeave={() => setHi(null)}
    >
      {bars.map((b, i) => (
        <div key={b.label.en} className="relative flex h-full min-w-0 flex-1 flex-col justify-end" onPointerEnter={() => setHi(i)} onPointerDown={() => setHi(i)}>
          {hi === i && (
            <Tip x={50}>
              <span className="font-medium">{b.label[locale]}</span>
              <span className="num ms-2 font-semibold">{fmt(b.v, w.unit, locale)}</span>
            </Tip>
          )}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(b.v / max) * 100}%`, opacity: hi === null || hi === i ? 1 : 0.45 }}
            transition={{ ...morph, delay: i * 0.04 }}
            className="min-h-1 w-full rounded-t-[10px] rounded-b-[4px] bg-linear-to-t from-[var(--c2)] to-[var(--c1)]"
          />
          {size !== "sm" && (
            <span className="mt-2 truncate text-center text-[11px] text-faint" dir="auto">
              {b.label[locale]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function GaugeW({ w, size }: { w: Widget; size: Size }) {
  const { locale, t } = useI18n();
  const id = useId();
  const v = w.value ?? 0;
  const goal = w.goal || 1;
  const p = Math.min(v / goal, 1);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className={`relative ${size === "lg" ? "size-64" : size === "sm" ? "size-28" : "size-40"}`} role="img" aria-label={`${w.title[locale]}: ${fmt(v, w.unit, locale)} / ${fmt(goal, w.unit, locale)}`}>
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--c3)" />
              <stop offset="1" stopColor="var(--c2)" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--line)" strokeWidth="11" />
          <motion.circle cx="60" cy="60" r="50" fill="none" stroke={`url(#${id})`} strokeWidth="11" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: p }} transition={morph} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <AnimatedNumber stack value={v} unit={w.unit} className={`font-semibold tight ${size === "lg" ? "text-5xl" : size === "sm" ? "text-lg" : "text-3xl"}`} />
        </div>
      </div>
      <div className="num text-center text-xs text-muted">
        <span className="font-semibold text-fg">{fmtPct(v / goal, locale)}</span> <span className="text-faint">· {t.app.goal} {fmt(goal, w.unit, locale)}</span>
      </div>
    </div>
  );
}

function LeaderW({ w, size }: { w: Widget; size: Size }) {
  const { locale } = useI18n();
  const items = [...(w.items ?? [])].sort((a, b) => b.v - a.v);
  const max = Math.max(...items.map((i) => i.v), 1);
  return (
    <ol className={`mt-auto flex flex-col ${size === "lg" ? "gap-3 text-xl" : "gap-1.5 text-sm"}`}>
      {items.map((it, i) => (
        <motion.li layout transition={morph} key={it.label.en} className="relative isolate flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2">
          <motion.span
            className="absolute inset-y-0 start-0 -z-10 rounded-xl bg-linear-to-r from-[var(--c1)]/18 to-[var(--c2)]/10 rtl:bg-linear-to-l"
            initial={{ width: 0 }}
            animate={{ width: `${(it.v / max) * 100}%` }}
            transition={morph}
          />
          <span className={`num grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-fg text-bg" : "text-faint"}`}>{nf(locale).format(i + 1)}</span>
          <span className="min-w-0 flex-1 truncate font-medium">{it.label[locale]}</span>
          <span className="num font-semibold">{fmt(it.v, w.unit, locale)}</span>
        </motion.li>
      ))}
    </ol>
  );
}

function DonutW({ w, size }: { w: Widget; size: Size }) {
  const { locale } = useI18n();
  const items = w.items ?? [];
  const total = items.reduce((s, i) => s + i.v, 0) || 1;
  let acc = 0;
  const gap = items.length > 1 ? 0.012 : 0;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className={`relative shrink-0 ${size === "lg" ? "size-60" : size === "sm" ? "size-24" : "size-36"}`} role="img" aria-label={`${w.title[locale]}: ${items.map((i) => `${i.label[locale]} ${fmtPct(i.v / total, locale)}`).join("، ")}`}>
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
          {items.map((it, i) => {
            const frac = it.v / total;
            const start = acc;
            acc += frac;
            return (
              <motion.circle
                key={it.label.en}
                cx="60"
                cy="60"
                r="48"
                fill="none"
                pathLength={1}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth="14"
                initial={{ strokeDasharray: "0 1", strokeDashoffset: 0 }}
                animate={{ strokeDasharray: `${Math.max(frac - gap, 0.001)} 1`, strokeDashoffset: -start }}
                transition={morph}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <AnimatedNumber value={total} unit={w.unit} className={`font-semibold tight ${size === "sm" ? "text-xs" : "text-sm"}`} />
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2 text-sm">
        {items.map((it, i) => (
          <li key={it.label.en} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate text-muted">{it.label[locale]}</span>
            <span className="num font-semibold">{fmtPct(it.v / total, locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const VIEWS = { number: NumberW, line: LineW, bar: BarW, gauge: GaugeW, leaderboard: LeaderW, donut: DonutW };

export function WidgetCard({ w, size = "md", index = 0, spanClass = "sm:col-span-2" }: { w: Widget; size?: Size; index?: number; spanClass?: string }) {
  const { locale } = useI18n();
  const View = VIEWS[w.type];
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ ...morph, visualDuration: 0.6, delay: index * 0.05 }}
      className={w.span === 2 ? spanClass : ""}
    >
      <Card className={`flex h-full flex-col ${size === "sm" ? "min-h-32 rounded-[22px] p-4" : size === "lg" ? "min-h-72 p-8" : "min-h-56 p-5 sm:p-6"}`}>
        <h3 className={`mb-3 font-medium text-muted ${size === "lg" ? "text-xl" : size === "sm" ? "text-xs" : "text-sm"}`}>{w.title[locale]}</h3>
        <View w={w} size={size} />
      </Card>
    </motion.div>
  );
}

export function SkeletonGrid({ count = 8, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={className} aria-busy>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`glass squircle min-h-56 rounded-[28px] p-6 ${i % 5 === 4 ? "sm:col-span-2" : ""}`}>
          <div className="skeleton h-3 w-1/3 rounded-full" />
          <div className="skeleton mt-10 h-10 w-2/3 rounded-xl" />
          <div className="skeleton mt-6 h-16 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
