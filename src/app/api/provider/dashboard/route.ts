import { route, ok, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { dashboardFor } from "@/lib/provider-admin";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser("PROVIDER");
  if (!user.providerProfile) throw new HttpError("You do not have access to this.", 403);
  return ok(await dashboardFor(user.providerProfile, user.fullName));
});
