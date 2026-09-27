"use client";
import { useCallback, useEffect, useState } from "react";

export type L = { fa: string; en: string };
export type Unit = "toman" | "percent" | "count" | "minutes" | "score" | null;
export type Point = { t: string; v: number };
export type Item = { label: L; v: number };
export type Widget = {
  id: string;
  type: "number" | "line" | "bar" | "gauge" | "leaderboard" | "donut";
  title: L;
  span: 1 | 2;
  unit: Unit;
  value?: number;
  previous?: number;
  goal?: number;
  good?: "up" | "down";
  series?: Point[];
  bars?: Item[];
  items?: Item[];
};
export type Dashboard = { id: string; title: L; updated_at: string; widgets: Widget[] };
export type DashboardMeta = { id: string; title: L; icon: string };
export type Plan = { id: string; name: L; price_toman: number | null; features: { fa: string[]; en: string[] }; highlighted: boolean };
export type Connector = { id: string; name: L; category: string };
export type Status = "connecting" | "live" | "offline";

export function useJson<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(path)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => alive && setData(j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [path]);
  return data;
}

/** Live dashboard: SSE stream (native auto-reconnect) with a one-shot fetch as fast first paint. */
export function useDashboard(id: string) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [at, setAt] = useState(0);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let gotStream = false;
    const take = (d: Dashboard) => {
      setData(d);
      setAt(Date.now());
    };
    setStatus("connecting");
    fetch(`/api/dashboards/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Dashboard) => !gotStream && take(d))
      .catch(() => {});
    const es = new EventSource(`/api/dashboards/${id}/stream`);
    es.addEventListener("update", (e) => {
      gotStream = true;
      take(JSON.parse((e as MessageEvent).data));
      setStatus("live");
    });
    es.onerror = () => setStatus(es.readyState === EventSource.CLOSED ? "offline" : "connecting");
    return () => es.close();
  }, [id, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { data: data?.id === id ? data : null, status, at, retry };
}
