import { route, ok, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { deleteAddress } from "@/lib/account";

export const dynamic = "force-dynamic";

export const DELETE = route(async (_req, ctx) => {
  const user = await requireUser("CUSTOMER");
  if (!user.customerProfile) throw new HttpError("You do not have access to this.", 403);
  const { id } = await ctx.params;
  await deleteAddress(user.customerProfile.id, id);
  return ok({ ok: true });
});
