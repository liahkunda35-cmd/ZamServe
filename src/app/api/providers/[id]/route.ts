import { route, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getProvider } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const GET = route(async (req, ctx) => {
  const user = await requireUser("CUSTOMER");
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  return ok(
    await getProvider(id, {
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
    }, user.customerProfile?.id),
  );
});
