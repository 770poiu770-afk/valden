"use client";
import { useEffect, useState } from "react";
import { formatMoney, percentOfBps } from "@/lib/money";
import { useT } from "./LocaleProvider";

type Method = { code: string; shippingCents: string | null };

/**
 * Order summary totals that follow the selected shipping method. Display only: the server
 * recomputes every amount from the database when the order is placed.
 */
export function CheckoutTotals({ subtotalCents, taxBps, currency, methods, reviewAlways, disabled }: {
  subtotalCents: string | null; taxBps: number; currency: string; methods: Method[]; reviewAlways: boolean; disabled?: boolean;
}) {
  const t = useT();
  const [code, setCode] = useState(methods[0]?.code ?? "");
  useEffect(() => {
    const onChange = (e: Event) => {
      const el = e.target as HTMLInputElement;
      if (el?.name === "shippingMethod" && el.checked) setCode(el.value);
    };
    document.addEventListener("change", onChange);
    const checked = document.querySelector<HTMLInputElement>('input[name="shippingMethod"]:checked');
    if (checked) setCode(checked.value);
    return () => document.removeEventListener("change", onChange);
  }, []);

  const m = methods.find((x) => x.code === code) ?? methods[0];
  const quoted = !m || m.shippingCents === null;
  const sub = subtotalCents === null ? null : BigInt(subtotalCents);
  const ship = quoted ? 0n : BigInt(m.shippingCents!);
  const tax = sub === null ? null : percentOfBps(sub + ship, taxBps);
  const total = sub === null || tax === null ? null : sub + ship + tax;
  const payNow = !quoted && !reviewAlways;
  const money = (v: bigint | null) => (v === null ? "—" : formatMoney(v, currency));

  return (
    <>
      <div className="flex justify-between"><span className="text-steel-500">{t("Shipping", "משלוח")}</span>
        <span className={quoted ? "" : "num"}>{quoted ? t("Quoted after review", "יתומחר לאחר הבדיקה") : ship === 0n ? t("Free", "חינם") : money(ship)}</span></div>
      <div className="flex justify-between"><span className="text-steel-500">{t("VAT", "מע״מ")} ({(taxBps / 100).toFixed(taxBps % 100 ? 2 : 0)}%)</span><span className="num">{money(tax)}</span></div>
      <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-deep-900" aria-live="polite">
        <span>{quoted ? t("Total before shipping", "סה״כ לפני משלוח") : t("Total", "סה״כ")}</span><span className="num">{money(total)}</span></div>
      <p className="text-xs text-steel-500">{payNow
        ? t("You can pay right after placing the order. Totals are recalculated by our server from current prices.", "אפשר לשלם מיד אחרי ביצוע ההזמנה. הסכומים מחושבים מחדש בשרת לפי המחירים העדכניים.")
        : t("We confirm freight and availability first; you will be asked to pay once the order is confirmed.", "קודם נאשר משלוח וזמינות; תתבקשו לשלם לאחר אישור ההזמנה.")}</p>
      <button type="submit" disabled={disabled} className="btn-primary mt-3 w-full" data-checkout-submit>{payNow ? t("Place order and pay", "ביצוע הזמנה ותשלום") : t("Place order for review", "שליחת ההזמנה לבדיקה")}</button>
    </>
  );
}
