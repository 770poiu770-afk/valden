import { route, readBody } from "@/server/http";
import { updateAccountProfile } from "@/server/accounts";
import { assertActor } from "@/lib/auth";

/** Update the signed-in customer's own details (name, phone, country, optional company name and VAT number). */
export const POST = route(async ({ req, actor }) => {
  assertActor(actor);
  return updateAccountProfile(actor, await readBody(req));
});
