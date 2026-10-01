import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError, route } from "@/lib/http";

export const dynamic = "force-dynamic";

const types: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  pdf: "application/pdf",
  heic: "image/heic",
};

export const GET = route(async (_req, ctx) => {
  const user = await requireUser("PROVIDER");
  const { name } = await ctx.params;
  if (!/^[\w.-]+$/.test(name)) throw new HttpError("That file could not be found.", 404);
  const url = `/api/verification/${name}`;
  const profile = user.providerProfile;
  const allowed = profile && [profile.idDocumentUrl, profile.nrcBackUrl, profile.facePhotoUrl].includes(url);
  if (!allowed) throw new HttpError("You do not have access to this.", 403);
  const ext = name.split(".").pop() ?? "";
  const bytes = await readFile(path.join(process.cwd(), "storage", "private", name));
  return new NextResponse(bytes, { headers: { "Content-Type": types[ext] || "application/octet-stream", "Cache-Control": "private, no-store" } });
});
