import { route, ok, fail, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireUser();
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new HttpError("A valid location is required.", 400);
  const endpoint = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "ZamServe/1.0 (local service marketplace)", Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return fail("Unable to read that location. Enter it manually.", 502);
  const data = (await response.json()) as { display_name?: string };
  return ok({ label: data.display_name || "Selected location", latitude: lat, longitude: lng });
});
