import { redirect } from "next/navigation";
import { currentActor } from "./http";
import { accountActive, type Actor } from "@/lib/auth";
import type { Permission } from "@/lib/rbac";

export async function requireApprovedBuyer(): Promise<Actor & { companyId: string }> {
  const a = await currentActor();
  if (!a) redirect("/login");
  if (a.isStaff) redirect("/admin");
  if (!a.companyId || !accountActive(a.companyStatus)) redirect("/portal");
  return a as Actor & { companyId: string };
}

export async function requireStaff(p: Permission = "admin.access"): Promise<Actor> {
  const a = await currentActor();
  if (!a) redirect("/login?next=/admin");
  if (!a.isStaff || !a.permissions.has("admin.access")) redirect("/");
  if (!a.permissions.has(p)) redirect("/admin?denied=1");
  return a;
}
