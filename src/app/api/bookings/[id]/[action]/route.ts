import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { acceptBooking, advanceBooking, cancelBooking, confirmQuote, rejectBooking, updateProviderLocation } from "@/lib/booking";

export const dynamic = "force-dynamic";

export const POST = route(async (req, ctx) => {
  const user = await requireUser();
  const { id, action } = await ctx.params;
  if (action === "accept") {
    if (user.role !== "PROVIDER") throw new HttpError("You do not have access to this.", 403);
    const body = z.object({ price: z.number().int().positive().optional() }).parse(await readJson(req));
    return ok(await acceptBooking(id, user.id, body.price));
  }
  if (action === "confirm") {
    if (user.role !== "CUSTOMER") throw new HttpError("You do not have access to this.", 403);
    return ok(await confirmQuote(id, user.id));
  }
  if (action === "reject") {
    if (user.role !== "PROVIDER") throw new HttpError("You do not have access to this.", 403);
    const body = z.object({ reason: z.string().max(300).optional() }).parse(await readJson(req));
    return ok(await rejectBooking(id, user.id, body.reason));
  }
  if (action === "cancel") {
    const body = z.object({ reason: z.string().max(300).optional() }).parse(await readJson(req));
    return ok(await cancelBooking(id, user.id, user.role as "CUSTOMER" | "PROVIDER", body.reason));
  }
  if (action === "status") {
    if (user.role !== "PROVIDER") throw new HttpError("You do not have access to this.", 403);
    const body = z.object({ status: z.string() }).parse(await readJson(req));
    return ok(await advanceBooking(id, user.id, body.status));
  }
  if (action === "location") {
    if (user.role !== "PROVIDER") throw new HttpError("You do not have access to this.", 403);
    const body = z.object({ latitude: z.number(), longitude: z.number() }).parse(await readJson(req));
    return ok(await updateProviderLocation(id, user.id, body.latitude, body.longitude));
  }
  throw new HttpError("That action is not available.", 404);
});
