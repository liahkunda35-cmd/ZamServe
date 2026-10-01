import { route, ok, fail } from "@/lib/http";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireUser();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return ok([]);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=zm&limit=5&q=${encodeURIComponent(q)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "ZamServe/1.0 (local service marketplace)", Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return fail("Unable to search locations. Please try again.", 502);
  const rows = (await response.json()) as { display_name: string; lat: string; lon: string }[];
  return ok(rows.map((row) => ({ label: row.display_name, latitude: Number(row.lat), longitude: Number(row.lon) })));
});
