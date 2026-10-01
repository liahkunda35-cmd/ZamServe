import { route, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { providerSlots } from "@/lib/catalog";
import { HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async (req, ctx) => {
  await requireUser("CUSTOMER");
  const { id } = await ctx.params;
  const date = new URL(req.url).searchParams.get("date");
  if (!date) throw new HttpError("Choose a date.", 400);
  return ok(await providerSlots(id, date));
});
