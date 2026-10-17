import { z } from "zod";
import { route, readBody, clientIp } from "@/server/http";
import { db } from "@/db";
import { inquiries } from "@/db/schema";
import { enforceRateLimit } from "@/lib/rate-limit";

const Body = z.object({
  name: z.string().trim().min(2).max(120), companyName: z.string().trim().min(2).max(200), email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(), topic: z.enum(["Trade account", "Quote request", "Order support", "Logistics", "Partnership", "Other"]),
  message: z.string().trim().min(10).max(5000), website: z.string().max(0).optional(), // honeypot
});

export const POST = route(async ({ req }) => {
  const b = Body.parse(await readBody(req));
  await enforceRateLimit(`contact:${await clientIp()}`, 5, 3600);
  await db.insert(inquiries).values({ name: b.name, companyName: b.companyName, email: b.email, phone: b.phone || null, topic: b.topic, message: b.message });
  return { ok: true, message: "Thank you — your enquiry has reached the trade desk. We reply by email, usually within one business day." };
});
