import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/heebo/index.css";
import "./globals.css";
import { getLocale } from "@/server/locale";
import { dirOf, makeT } from "@/lib/i18n";
import { LocaleProvider } from "@/components/client/LocaleProvider";

export async function generateMetadata(): Promise<Metadata> {
  const t = makeT(await getLocale());
  return {
    title: { default: t("Valden — Electronics, from one unit to bulk", "Valden — אלקטרוניקה, מיחידה אחת ועד כמויות גדולות"), template: "%s · Valden" },
    description: t(
      "Smartphones, computers, audio, gaming, smartwatches and chargers — buy a single unit or in bulk with automatic volume pricing.",
      "סמארטפונים, מחשבים, אודיו, גיימינג, שעונים חכמים ומטענים — קנייה של יחידה אחת או בכמויות, עם מחירי כמות אוטומטיים.",
    ),
    icons: { icon: "/favicon.svg" },
  };
}
export const viewport: Viewport = { themeColor: "#13335E", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const l = await getLocale();
  const t = makeT(l);
  return (
    <html lang={l} dir={dirOf(l)}>
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">{t("Skip to content", "דילוג לתוכן")}</a>
        <LocaleProvider locale={l}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
