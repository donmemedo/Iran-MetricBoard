import type { Metadata, Viewport } from "next";
import { Inter, Vazirmatn } from "next/font/google";
import { notFound } from "next/navigation";
import { dicts, isLocale, locales } from "@/i18n";
import "../globals.css";

const vazir = Vazirmatn({ subsets: ["arabic", "latin"], variable: "--font-vazir", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const dynamicParams = false;
export const generateStaticParams = () => locales.map((locale) => ({ locale }));

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = dicts[locale];
  return {
    title: t.meta.title,
    description: t.meta.description,
    applicationName: t.brand,
    alternates: { languages: { fa: "/fa", en: "/en" } },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#05060a" },
  ],
};

// Runs before paint: applies saved theme (light | dark | system) to avoid a flash.
const themeScript = `try{var t=localStorage.getItem("theme")||"system",d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches),e=document.documentElement;e.classList.toggle("dark",d);e.dataset.theme=t}catch(_){}`;

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} dir={locale === "fa" ? "rtl" : "ltr"} className={`${vazir.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="aurora" aria-hidden>
          <i />
          <i />
          <i />
        </div>
        <div className="grain" aria-hidden />
        {children}
      </body>
    </html>
  );
}
