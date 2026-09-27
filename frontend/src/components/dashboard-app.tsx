"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Home, RotateCw, Tv, WifiOff } from "lucide-react";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/use";
import { useDashboard, useJson, type DashboardMeta } from "@/lib/api";
import { nf } from "@/lib/format";
import { Card, DashIcon, LangSwitch, LiveBadge, Logo, Segmented, ThemeToggle, iconBtn } from "./ui";
import { SkeletonGrid, WidgetCard } from "./widgets";

const grid = "grid grid-flow-row-dense grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-5";

function Ago({ at }: { at: number }) {
  const { locale, t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!at) return null;
  const s = Math.max(0, Math.floor((now - at) / 1000));
  return <span className="num text-xs text-faint">{s < 2 ? t.app.now : fill(t.app.ago, { n: nf(locale).format(s) })}</span>;
}

export function DashboardApp() {
  const { locale, t } = useI18n();
  const list = useJson<DashboardMeta[]>("/api/dashboards");
  const params = useSearchParams();
  const [id, setId] = useState(() => params.get("d") || "sales");
  const { data, status, at, retry } = useDashboard(id);
  const [tv, setTv] = useState(false);

  // keep ?d= in the URL; fall back to the first dashboard if the id is unknown
  useEffect(() => {
    if (list && !list.some((d) => d.id === id)) return setId(list[0]?.id ?? "sales");
    const u = new URL(location.href);
    if (u.searchParams.get("d") !== id) {
      u.searchParams.set("d", id);
      history.replaceState(history.state, "", u);
    }
  }, [id, list]);

  const exitTv = useCallback(() => {
    setTv(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);
  const enterTv = () => {
    setTv(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  };
  useEffect(() => {
    if (!tv) return;
    const ids = list?.map((d) => d.id) ?? [];
    const rotate = setInterval(() => setId((cur) => ids[(ids.indexOf(cur) + 1) % ids.length] ?? cur), 20000);
    const onFs = () => !document.fullscreenElement && setTv(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && exitTv();
    document.addEventListener("fullscreenchange", onFs);
    addEventListener("keydown", onKey);
    return () => {
      clearInterval(rotate);
      document.removeEventListener("fullscreenchange", onFs);
      removeEventListener("keydown", onKey);
    };
  }, [tv, list, exitTv]);

  const title = data?.title[locale] ?? list?.find((d) => d.id === id)?.title[locale] ?? "";

  return (
    <MotionConfig reducedMotion="user">
      {tv ? (
        <div className="fixed inset-x-0 top-0 z-50 h-1 bg-line">
          <div key={id} className="tv-progress h-full bg-linear-to-r from-[var(--c1)] via-[var(--c2)] to-[var(--c3)]" />
        </div>
      ) : (
        <header className="sticky top-0 z-40 px-3 pt-[max(12px,env(safe-area-inset-top))] sm:px-4">
          <div className="glass mx-auto flex max-w-[1800px] flex-wrap items-center gap-2 rounded-[26px] p-2 ps-3">
            <Logo />
            <div className="order-last w-full min-w-0 md:order-none md:w-auto md:flex-1">
              {list ? (
                <Segmented
                  id="dash-pill"
                  label={t.app.switcher}
                  value={id}
                  onChange={setId}
                  className="mx-auto w-fit"
                  options={list.map((d) => ({ id: d.id, label: <><DashIcon name={d.icon} className="size-4" />{d.title[locale].replace(/^پیش‌خوان\s+/, "")}</> }))}
                />
              ) : (
                <div className="skeleton mx-auto h-12 w-full max-w-xl rounded-full" />
              )}
            </div>
            <div className="ms-auto flex items-center gap-1 md:ms-0">
              <div className="hidden flex-col items-end px-2 leading-tight sm:flex">
                <LiveBadge status={status} />
                <Ago at={at} />
              </div>
              <span className="sm:hidden">
                <LiveBadge status={status} />
              </span>
              <button type="button" onClick={enterTv} className={iconBtn} aria-label={t.app.tv} title={t.app.tv}>
                <Tv className="size-[19px]" aria-hidden />
              </button>
              <ThemeToggle />
              <LangSwitch />
              <Link href={`/${locale}`} className={`${iconBtn} max-sm:hidden`} aria-label={t.nav.home} title={t.nav.home}>
                <Home className="size-[19px]" aria-hidden />
              </Link>
            </div>
          </div>
        </header>
      )}

      <main
        className={`mx-auto max-w-[1800px] px-4 pb-[max(32px,env(safe-area-inset-bottom))] ${tv ? "cursor-pointer pt-8 sm:px-10" : "pt-6 sm:px-6"}`}
        onClick={tv ? exitTv : undefined}
      >
        <div className="mb-5 flex items-end justify-between gap-4">
          <h1 className={`display font-bold tight ${tv ? "text-5xl 2xl:text-7xl" : "text-3xl sm:text-4xl"}`}>{title || " "}</h1>
          {tv && <LiveBadge status={status} />}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.3 }}>
            {data ? (
              <div className={grid}>
                {data.widgets.map((w, i) => (
                  <WidgetCard key={w.id} w={w} index={i} size={tv ? "lg" : "md"} />
                ))}
              </div>
            ) : status === "offline" ? (
              <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 p-10 text-center">
                <span className="grid size-14 place-items-center rounded-2xl bg-neg/10 text-neg">
                  <WifiOff className="size-6" aria-hidden />
                </span>
                <h2 className="text-lg font-semibold">{t.app.offlineTitle}</h2>
                <p className="text-sm text-muted">{t.app.offlineBody}</p>
                <button type="button" onClick={retry} className="press btn-primary mt-2 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold">
                  <RotateCw className="size-4" aria-hidden />
                  {t.app.retry}
                </button>
              </Card>
            ) : (
              <SkeletonGrid className={grid} />
            )}
          </motion.div>
        </AnimatePresence>

        {tv && <p className="mt-6 text-center text-sm text-faint">{t.app.exitTv}</p>}
      </main>
    </MotionConfig>
  );
}
