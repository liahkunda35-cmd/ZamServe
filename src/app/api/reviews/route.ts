import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { createReview } from "@/lib/booking";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  const user = await requireUser("CUSTOMER");
  const body = z
    .object({
      bookingId: z.string(),
      rating: z.number().int(),
      reason: z.string().max(80).optional(),
      comment: z.string().max(600).optional(),
    })
    .parse(await readJson(req));
  if (!user.customerProfile) throw new HttpError("You do not have access to this.", 403);
  return ok(await createReview(user.id, user.customerProfile.id, body), 201);
});
