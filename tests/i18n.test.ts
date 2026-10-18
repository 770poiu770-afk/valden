import { describe, expect, it } from "vitest";
import { makeT, dirOf } from "@/lib/i18n";
import { trMessage } from "@/lib/messages-he";
import { statusLabel, categoryText, departmentText } from "@/lib/labels";
import { CATEGORIES, DEPARTMENTS } from "@/lib/catalog-meta";

describe("Hebrew / English UI", () => {
  it("picks the right string and direction", () => {
    expect(makeT("he")("Cart", "סל")).toBe("סל");
    expect(makeT("en")("Cart", "סל")).toBe("Cart");
    expect(dirOf("he")).toBe("rtl");
    expect(dirOf("en")).toBe("ltr");
  });
  it("translates buyer-facing server messages and leaves English untouched", () => {
    expect(trMessage("Email or password is incorrect.", "he")).toBe("המייל או הסיסמה שגויים.");
    expect(trMessage("Email or password is incorrect.", "en")).toBe("Email or password is incorrect.");
    expect(trMessage("Sony WH-1000XM6: minimum order quantity is 10 units.", "he")).toBe("Sony WH-1000XM6: כמות ההזמנה המינימלית היא 10 יח׳.");
    expect(trMessage("Payment of ₪1,234.00 received via PayPal and verified.", "he")).toBe("תשלום של ₪1,234.00 התקבל ב-PayPal ואומת.");
    expect(trMessage("Some staff-only message.", "he")).toBe("Some staff-only message.");
  });
  it("has Hebrew names for every status pill, category and department", () => {
    for (const s of ["PENDING_REVIEW", "AWAITING_PAYMENT", "PAID", "REFUNDED", "CANCELLED"]) expect(statusLabel(s, "he")).not.toMatch(/[a-z]/i);
    for (const c of CATEGORIES) expect(categoryText(c, "he").description).toMatch(/[א-ת]/);
    for (const d of DEPARTMENTS) expect(departmentText(d, "he").name).toMatch(/[א-ת]/);
  });
});
