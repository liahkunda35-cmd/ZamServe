import { route, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getBookingForUser } from "@/lib/booking";

export const dynamic = "force-dynamic";

export const GET = route(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return ok(await getBookingForUser(id, user.id));
});
