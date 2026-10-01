import { route, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { listProviders } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const user = await requireUser("CUSTOMER");
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  return ok(
    await listProviders({
      q: url.searchParams.get("q") ?? undefined,
      service: url.searchParams.get("service") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      customerId: user.customerProfile?.id,
    }),
  );
});
