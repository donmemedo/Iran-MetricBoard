"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion, useSpring } from "motion/react";
import {
  ArrowRight, BellRing, Check, Code2, CreditCard, Database, FileSpreadsheet, Languages, LayoutGrid, Menu, MessageSquare,
  PieChart, Plus, Plug, Server, ShoppingCart, Sparkles, Tv, Users, X, Zap, type LucideIcon,
} from "lucide-react";
import { fill } from "@/i18n";
import { useI18n } from "@/i18n/use";
import { useDashboard, useJson, type Connector, type DashboardMeta, type Plan } from "@/lib/api";
import { fmt, nf } from "@/lib/format";
import { Card, DashIcon, LangSwitch, LiveBadge, Logo, Mark, Segmented, ThemeToggle, iconBtn, spring } from "./ui";
import { AnimatedNumber, SkeletonGrid, WidgetCard } from "./widgets";

const wrap = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const btn = "press inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold";
const Arrow = () => <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />;

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", visualDuration: 0.7, bounce: 0, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Heading({ title, sub }: { title: string; sub?: string }) {
  return (
    <Reveal className="mx-auto mb-12 max-w-3xl text-center">
      <h2 className="display text-balance text-3xl font-bold tight sm:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-pretty text-lg text-muted">{sub}</p>}
    </Reveal>
  );
}

function Nav() {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const links = (["features", "how", "templates", "pricing", "faq"] as const).map((k) => ({ href: `#${k}`, label: t.nav[k] }));
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open]);
  return (
    <header className="sticky top-0 z-50 px-3 pt-[max(12px,env(safe-area-inset-top))]">
      <nav className="glass mx-auto flex h-16 max-w-6xl items-center gap-2 rounded-full px-2 ps-4" aria-label={t.brand}>
        <Logo />
        <ul className="mx-auto hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="press rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-fg">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ms-auto flex items-center gap-1 lg:ms-0">
          <ThemeToggle />
          <LangSwitch />
          <Link href={`/${locale}/app`} className={`${btn} btn-primary min-h-11 whitespace-nowrap px-5 text-sm max-sm:hidden`}>
            {t.nav.cta}
          </Link>
          <button type="button" className={`${iconBtn} lg:hidden`} aria-expanded={open} aria-controls="m-menu" aria-label={open ? t.nav.close : t.nav.menu} onClick={() => setOpen(!open)}>
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            id="m-menu"
            initial={{ opacity: 0, scale: 0.96, y: -8, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.96, y: -8, filter: "blur(10px)" }}
            transition={spring}
            style={{ transformOrigin: "top" }}
            className="glass mx-auto mt-2 max-w-6xl rounded-[28px] p-3 lg:hidden"
          >
            <ul className="grid gap-1">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} onClick={() => setOpen(false)} className="press flex min-h-12 items-center rounded-2xl px-4 text-base font-medium hover:bg-black/5 dark:hover:bg-white/10">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <Link href={`/${locale}/app`} className={`${btn} btn-primary mt-2 w-full`}>
              {t.nav.cta}
              <Arrow />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function HeroDevice() {
  const { t } = useI18n();
  const { data, status } = useDashboard("sales");
  const reduce = useReducedMotion();
  const rx = useSpring(8, { stiffness: 120, damping: 20 });
  const ry = useSpring(0, { stiffness: 120, damping: 20 });
  const [tilt, setTilt] = useState(false);
  useEffect(() => setTilt(!reduce && matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)").matches), [reduce]);

  const ws = data?.widgets ?? [];
  const nums = ws.filter((w) => w.type === "number").slice(0, 4);
  const line = ws.find((w) => w.type === "line");
  const extra = ws.find((w) => w.type === "bar" || w.type === "leaderboard" || w.type === "donut");
  const pick = [...nums, line, extra].filter((w) => !!w).map((w) => ({ ...w, span: w.type === "number" ? 1 : 2 }) as typeof w);

  return (
    <div
      className="relative mx-auto mt-16 max-w-5xl [perspective:1400px] sm:mt-20"
      onPointerMove={(e) => {
        if (!tilt) return;
        const r = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 12);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 10);
      }}
      onPointerLeave={() => {
        rx.set(8);
        ry.set(0);
      }}
    >
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,var(--a1),transparent)] blur-2xl" aria-hidden />
      <div className="float">
        <motion.div style={tilt ? { rotateX: rx, rotateY: ry } : undefined} className="glass squircle rounded-[34px] p-2 sm:p-3" role="figure" aria-label={t.hero.preview}>
          <div className="flex items-center gap-2 px-3 pb-2 pt-1" dir="ltr">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
            <span className="mx-auto truncate text-xs font-medium text-faint">{data?.title.en ?? "Sales"} · metricboard</span>
            <LiveBadge status={status} />
          </div>
          {pick.length ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              {pick.map((w, i) => (
                <WidgetCard key={w.id} w={w} size="sm" index={i} spanClass="col-span-2" />
              ))}
            </div>
          ) : (
            <SkeletonGrid count={4} className="grid grid-cols-2 gap-3" />
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Hero() {
  const { locale, t } = useI18n();
  const item = (i: number) => ({
    initial: { opacity: 0, y: 20, filter: "blur(10px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { type: "spring" as const, visualDuration: 0.8, bounce: 0, delay: 0.08 * i },
  });
  return (
    <section className={`${wrap} pt-14 text-center sm:pt-24`}>
      <motion.p {...item(0)} className="glass-thin mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-muted">
        <Sparkles className="size-4 text-accent" aria-hidden />
        {t.hero.badge}
      </motion.p>
      <motion.h1 {...item(1)} className="display mx-auto mt-6 max-w-5xl text-balance text-[clamp(2.6rem,9vw,6.75rem)] font-extrabold tight">
        {t.hero.title1} <span className="grad-text">{t.hero.title2}</span>
      </motion.h1>
      <motion.p {...item(2)} className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted sm:text-xl">
        {t.hero.sub}
      </motion.p>
      <motion.div {...item(3)} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a href="#pricing" className={`${btn} btn-primary w-full sm:w-auto`}>
          {t.hero.trial}
          <Arrow />
        </a>
        <Link href={`/${locale}/app`} className={`${btn} glass-thin w-full hover:bg-black/5 sm:w-auto dark:hover:bg-white/10`}>
          <span className="live-dot text-pos" aria-hidden />
          {t.hero.demo}
        </Link>
      </motion.div>
      <motion.p {...item(4)} className="mt-4 text-sm text-faint">
        {t.hero.note}
      </motion.p>
      <HeroDevice />
    </section>
  );
}

const catIcon: Record<string, LucideIcon> = { file: FileSpreadsheet, database: Database, commerce: ShoppingCart, payment: CreditCard, crm: Users, communication: MessageSquare, api: Code2 };

function Connectors() {
  const { locale, t } = useI18n();
  const list = useJson<Connector[]>("/api/connectors");
  const chips = (dup: boolean) =>
    (list ?? []).map((c) => {
      const I = catIcon[c.category] ?? Plug;
      return (
        <li key={`${c.id}${dup}`} aria-hidden={dup || undefined} className={`glass-thin flex h-12 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-medium ${dup ? "dup" : ""}`}>
          <I className="size-4 text-accent" aria-hidden />
          <span dir="auto">{c.name[locale]}</span>
        </li>
      );
    });
  return (
    <section className="mt-28" aria-labelledby="conn-h">
      <p id="conn-h" className={`${wrap} mb-6 text-center text-sm font-medium text-muted`}>
        {t.connectors.title}
      </p>
      <div className="marquee-wrap overflow-hidden py-2" dir="ltr">
        {list ? (
          <ul className="marquee">
            {chips(false)}
            {chips(true)}
          </ul>
        ) : (
          <div className="skeleton mx-auto h-12 max-w-3xl rounded-full" />
        )}
      </div>
    </section>
  );
}

const featIcons: LucideIcon[] = [LayoutGrid, PieChart, Zap, Tv, BellRing, Languages, Server];
const featSpan = ["sm:col-span-2 lg:row-span-2", "", "", "sm:col-span-2", "", "", "sm:col-span-2 lg:col-span-2"];

function Features() {
  const { locale, t } = useI18n();
  return (
    <section id="features" className={`${wrap} mt-32 scroll-mt-28`}>
      <Heading title={t.features.title} sub={t.features.sub} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {t.features.items.map((f, i) => {
          const I = featIcons[i];
          return (
            <Reveal key={f.t} delay={i * 0.04} className={featSpan[i]}>
              <Card className="flex h-full flex-col p-6 sm:p-7">
                <span className="grid size-12 place-items-center rounded-2xl bg-linear-to-br from-[var(--c1)] to-[var(--c2)] text-white shadow-lg">
                  <I className="size-6" aria-hidden />
                </span>
                <h3 className={`mt-5 font-semibold tight-sm ${i === 0 ? "text-2xl sm:text-3xl" : "text-lg"}`}>{f.t}</h3>
                <p className="mt-2 text-pretty text-muted">{f.d}</p>
                {i === 0 && (
                  <div dir="ltr" className="mt-auto flex h-40 items-end gap-2 pt-8" aria-hidden>
                    {[38, 62, 45, 80, 58, 92, 70, 100].map((h, j) => (
                      <motion.span
                        key={j}
                        initial={{ height: "8%" }}
                        whileInView={{ height: `${h}%` }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", visualDuration: 0.9, bounce: 0.2, delay: j * 0.05 }}
                        className="flex-1 rounded-t-lg rounded-b-sm bg-linear-to-t from-[var(--c2)] to-[var(--c1)] opacity-80"
                      />
                    ))}
                  </div>
                )}
                {i === 3 && (
                  <p className="num mt-auto pt-6 text-5xl font-bold tight grad-text" aria-hidden>
                    {nf(locale).format(24)}/{nf(locale).format(7)}
                  </p>
                )}
              </Card>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function How() {
  const { locale, t } = useI18n();
  return (
    <section id="how" className={`${wrap} mt-32 scroll-mt-28`}>
      <Heading title={t.how.title} />
      <ol className="grid gap-4 md:grid-cols-3">
        {t.how.steps.map((s, i) => (
          <Reveal key={s.t} delay={i * 0.08}>
            <li className="h-full">
              <Card className="h-full p-7">
                <span className="num grad-text text-6xl font-extrabold leading-none tight">{nf(locale).format(i + 1)}</span>
                <h3 className="mt-6 text-xl font-semibold tight-sm">{s.t}</h3>
                <p className="mt-2 text-muted">{s.d}</p>
              </Card>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

function Templates() {
  const { locale, t } = useI18n();
  const list = useJson<DashboardMeta[]>("/api/dashboards");
  return (
    <section id="templates" className={`${wrap} mt-32 scroll-mt-28`}>
      <Heading title={t.templates.title} sub={t.templates.sub} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(list ?? Array.from({ length: 6 }, () => null)).map((d, i) =>
          d ? (
            <Reveal key={d.id} delay={i * 0.04}>
              <Link href={`/${locale}/app?d=${d.id}`} className="group block rounded-[28px]">
                <Card className="flex items-center gap-4 p-5">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-black/5 text-accent dark:bg-white/10">
                    <DashIcon name={d.icon} className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold tight-sm">{d.title[locale]}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                      <span className="live-dot text-pos" aria-hidden />
                      {t.templates.open}
                    </span>
                  </span>
                  <span className="text-faint transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                    <Arrow />
                  </span>
                </Card>
              </Link>
            </Reveal>
          ) : (
            <div key={i} className="skeleton h-24 rounded-[28px]" />
          ),
        )}
      </div>
    </section>
  );
}

function Pricing() {
  const { locale, t } = useI18n();
  const plans = useJson<Plan[]>("/api/plans");
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const annual = cycle === "annual";
  return (
    <section id="pricing" className={`${wrap} mt-32 scroll-mt-28`}>
      <Heading title={t.pricing.title} sub={t.pricing.sub} />
      <div className="mb-10 flex justify-center">
        <Segmented
          id="price-pill"
          label={t.pricing.billing}
          value={cycle}
          onChange={setCycle}
          options={[
            { id: "monthly", label: t.pricing.monthly },
            { id: "annual", label: <>{t.pricing.annual}<span className="rounded-full bg-pos/15 px-2 py-0.5 text-[11px] font-bold text-pos">{t.pricing.free2}</span></> },
          ]}
        />
      </div>
      <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(plans ?? Array.from({ length: 4 }, () => null)).map((p, i) =>
          p ? (
            <Reveal key={p.id} delay={i * 0.05}>
              <Card className={`flex h-full flex-col p-6 ${p.highlighted ? "ring-glow" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{p.name[locale]}</h3>
                  {p.highlighted && <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-fg">{t.pricing.popular}</span>}
                </div>
                <div className="mt-5 min-h-24">
                  {p.price_toman === null ? (
                    <>
                      <p className="text-3xl font-bold tight">{t.pricing.contact}</p>
                      <p className="mt-1 text-sm text-faint">{t.pricing.contactNote}</p>
                    </>
                  ) : (
                    <>
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <AnimatedNumber value={annual ? (p.price_toman * 10) / 12 : p.price_toman} unit="toman" className="text-3xl font-bold tight" />
                        <span className="text-sm text-faint">{t.pricing.perMonth}</span>
                      </p>
                      <AnimatePresence initial={false}>
                        {annual && (
                          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={spring} className="num overflow-hidden text-sm font-medium text-pos">
                            {t.pricing.billedAnnual} · {fill(t.pricing.save, { x: fmt(p.price_toman * 2, "toman", locale) })}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
                <ul className="mt-4 flex-1 space-y-2.5 text-sm">
                  {p.features[locale].map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-pos" aria-hidden />
                      <span className="text-muted">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/${locale}/app`} className={`${btn} mt-6 w-full ${p.highlighted ? "btn-primary" : "glass-thin hover:bg-black/5 dark:hover:bg-white/10"}`}>
                  {p.price_toman === null ? t.pricing.talk : t.pricing.start}
                </Link>
              </Card>
            </Reveal>
          ) : (
            <div key={i} className="skeleton h-96 rounded-[28px]" />
          ),
        )}
      </div>
    </section>
  );
}

function Faq() {
  const { t } = useI18n();
  return (
    <section id="faq" className={`${wrap} mt-32 max-w-3xl scroll-mt-28`}>
      <Heading title={t.faq.title} />
      <div className="space-y-3">
        {t.faq.items.map((f) => (
          <details key={f.q} className="faq glass squircle rounded-3xl">
            <summary className="flex min-h-16 items-center justify-between gap-4 rounded-3xl px-6 py-4 text-start font-semibold">
              {f.q}
              <Plus className="chev size-5 shrink-0 text-faint" aria-hidden />
            </summary>
            <p className="px-6 pb-5 text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Final() {
  const { locale, t } = useI18n();
  return (
    <section className={`${wrap} mt-32`}>
      <Reveal>
        <div className="glass squircle relative overflow-hidden rounded-[40px] px-6 py-16 text-center sm:py-24">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_0%,var(--a1),transparent),radial-gradient(50%_70%_at_100%_100%,var(--a2),transparent)]" aria-hidden />
          <h2 className="display mx-auto max-w-3xl text-balance text-3xl font-bold tight sm:text-5xl">{t.final.title}</h2>
          <p className="mt-4 text-lg text-muted">{t.final.sub}</p>
          <Link href={`/${locale}/app`} className={`${btn} btn-primary mt-8`}>
            {t.final.cta}
            <Arrow />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export function Landing() {
  const { t } = useI18n();
  return (
    <MotionConfig reducedMotion="user">
      <Nav />
      <main>
        <Hero />
        <Connectors />
        <Features />
        <How />
        <Templates />
        <Pricing />
        <Faq />
        <Final />
      </main>
      <footer className={`${wrap} mt-24 flex flex-col items-center gap-3 pb-[max(32px,env(safe-area-inset-bottom))] text-center text-sm text-faint sm:flex-row sm:justify-between sm:text-start`}>
        <span className="flex items-center gap-2 font-semibold text-fg">
          <Mark className="size-6" />
          {t.brand}
        </span>
        <span>{t.footer.cities}</span>
        <span>{t.footer.rights}</span>
      </footer>
    </MotionConfig>
  );
}
