import type { Locale } from "@/i18n";
import type { Unit } from "./api";

const cache = new Map<string, Intl.NumberFormat>();
export function nf(l: Locale, o: Intl.NumberFormatOptions = {}) {
  const k = l + JSON.stringify(o);
  let f = cache.get(k);
  if (!f) cache.set(k, (f = new Intl.NumberFormat(l === "fa" ? "fa-IR" : "en-US", o)));
  return f;
}

const compact = (v: number, l: Locale, at: number) =>
  nf(l, Math.abs(v) >= at ? { notation: "compact", maximumFractionDigits: 1 } : { maximumFractionDigits: 0 }).format(v);

/** Format a KPI value for its unit. Percent values are 0–100. */
export function fmt(v: number, unit: Unit, l: Locale): string {
  switch (unit) {
    case "toman":
      return `${compact(v, l, 1e6)} ${l === "fa" ? "تومان" : "Toman"}`;
    case "percent":
      return nf(l, { style: "percent", maximumFractionDigits: 1 }).format(v / 100);
    case "minutes":
      return `${nf(l, { maximumFractionDigits: 1 }).format(v)} ${l === "fa" ? "دقیقه" : "min"}`;
    case "score":
      return nf(l, { maximumFractionDigits: 1 }).format(v);
    default:
      return compact(v, l, 1e5);
  }
}

export const fmtPct = (ratio: number, l: Locale, signed = false) =>
  nf(l, { style: "percent", maximumFractionDigits: 1, signDisplay: signed ? "exceptZero" : "auto" }).format(ratio);

const dtf = new Map<Locale, Intl.DateTimeFormat>();
export function fmtTime(iso: string, l: Locale) {
  let f = dtf.get(l);
  if (!f) dtf.set(l, (f = new Intl.DateTimeFormat(l === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })));
  return f.format(new Date(iso));
}
