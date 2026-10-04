import { route, ok, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { removePortfolio } from "@/lib/account";

export const dynamic = "force-dynamic";

export const DELETE = route(async (_req, ctx) => {
  const user = await requireUser("PROVIDER");
  if (!user.providerProfile) throw new HttpError("You do not have access to this.", 403);
  const { id } = await ctx.params;
  await removePortfolio(user.providerProfile.id, id);
  return ok({ ok: true });
});
