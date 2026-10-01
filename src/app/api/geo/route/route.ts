import { route, ok, fail, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireUser();
  const url = new URL(req.url);
  const fromLat = Number(url.searchParams.get("fromLat"));
  const fromLng = Number(url.searchParams.get("fromLng"));
  const toLat = Number(url.searchParams.get("toLat"));
  const toLng = Number(url.searchParams.get("toLng"));
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) throw new HttpError("A valid route is required.", 400);
  const base = process.env.OSRM_URL || "https://router.project-osrm.org";
  const endpoint = `${base}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) return fail("Unable to load the route.", 502);
  const data = (await response.json()) as {
    routes?: { duration: number; distance: number; geometry?: { coordinates?: [number, number][] } }[];
  };
  const routeInfo = data.routes?.[0];
  if (!routeInfo) return fail("No route was found.", 404);
  return ok({
    durationMin: Math.max(1, Math.round(routeInfo.duration / 60)),
    distanceKm: Math.round((routeInfo.distance / 1000) * 10) / 10,
    coordinates: (routeInfo.geometry?.coordinates ?? []).map(([lng, lat]) => [lat, lng]),
  });
});
