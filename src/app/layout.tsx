import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Valden — Wholesale electronics for business buyers", template: "%s · Valden" },
  description: "B2B wholesale distribution of smartphones, workstations, graphics cards, displays and enterprise equipment. Verified business accounts only.",
  icons: { icon: "/favicon.svg" },
};
export const viewport: Viewport = { themeColor: "#13335E", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
