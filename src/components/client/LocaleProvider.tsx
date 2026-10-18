"use client";
import { createContext, useContext, type ReactNode } from "react";
import { makeT, type Locale } from "@/lib/i18n";

const Ctx = createContext<Locale>("en");
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}
export function useLocale() { return useContext(Ctx); }
export function useT() { return makeT(useContext(Ctx)); }
