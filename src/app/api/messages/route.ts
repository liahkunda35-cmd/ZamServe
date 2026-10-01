import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { listMessages, listThreads, sendMessage } from "@/lib/inbox";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const user = await requireUser();
  const bookingId = new URL(req.url).searchParams.get("bookingId");
  if (!bookingId) return ok(await listThreads(user));
  return ok(await listMessages(bookingId, user.id));
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = z.object({ bookingId: z.string(), body: z.string() }).parse(await readJson(req));
  if (!body.bookingId) throw new HttpError("Choose a conversation.", 400);
  return ok(await sendMessage(body.bookingId, user.id, body.body), 201);
});
