import { route, ok, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { earningsFor } from "@/lib/provider-admin";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser("PROVIDER");
  if (!user.providerProfile) throw new HttpError("You do not have access to this.", 403);
  return ok(await earningsFor(user.providerProfile.id));
});
