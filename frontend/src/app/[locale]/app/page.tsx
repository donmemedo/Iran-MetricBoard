import { Suspense } from "react";
import type { Metadata } from "next";
import { dicts, type Locale } from "@/i18n";
import { DashboardApp } from "@/components/dashboard-app";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const t = dicts[(await params).locale];
  return { title: `${t.nav.cta} · ${t.brand}` };
}

export default function AppPage() {
  return (
    <Suspense>
      <DashboardApp />
    </Suspense>
  );
}
