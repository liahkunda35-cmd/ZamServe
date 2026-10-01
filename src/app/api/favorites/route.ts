import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { listFavorites, toggleFavorite } from "@/lib/account";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const user = await requireUser("CUSTOMER");
  if (!user.customerProfile) throw new HttpError("You do not have access to this.", 403);
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  return ok(
    await listFavorites(user.customerProfile.id, {
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
    }),
  );
});

export const POST = route(async (req) => {
  const user = await requireUser("CUSTOMER");
  if (!user.customerProfile) throw new HttpError("You do not have access to this.", 403);
  const body = z.object({ providerId: z.string() }).parse(await readJson(req));
  const favorite = await toggleFavorite(user.customerProfile.id, body.providerId);
  return ok({ favorite });
});
