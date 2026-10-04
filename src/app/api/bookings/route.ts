import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { createBooking, listBookings } from "@/lib/booking";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  return ok(await listBookings(user));
});

export const POST = route(async (req) => {
  const user = await requireUser("CUSTOMER");
  const body = z
    .object({
      providerId: z.string(),
      serviceId: z.string(),
      date: z.string(),
      time: z.string(),
      addressLine: z.string().min(3, "Add the location for this booking."),
      latitude: z.number().optional().nullable(),
      longitude: z.number().optional().nullable(),
      notes: z.string().max(500).optional(),
      paymentMethod: z.string().min(2, "Choose a payment method.").max(80),
      saveAddress: z.boolean().optional(),
      addressLabel: z.string().max(40).optional(),
    })
    .parse(await readJson(req));
  if (!user.customerProfile) throw new HttpError("You do not have access to this.", 403);
  return ok(await createBooking(user, body), 201);
});
