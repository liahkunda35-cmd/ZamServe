import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { route, ok, fail } from "@/lib/http";

export const dynamic = "force-dynamic";

const types: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

export const POST = route(async (req) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Choose a file to upload.", 400);
  const isPrivate = form.get("private") === "1";
  const fromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  const named = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic", "heif", "pdf"].includes(fromName) ? (fromName === "jpeg" ? "jpg" : fromName) : "";
  const photos: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const ext = isPrivate ? types[file.type] || named : photos[file.type];
  if (!ext) return fail(isPrivate ? "Use a photo or a PDF for your NRC." : "Use a JPG, PNG, or WebP image.", 400);
  if (file.size > (isPrivate ? 8_000_000 : 2_500_000)) return fail("That file is too large.", 400);
  const bytes = Buffer.from(await file.arrayBuffer());
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const dir = isPrivate ? path.join(process.cwd(), "storage", "private") : path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return ok({ url: isPrivate ? `/api/verification/${name}` : `/uploads/${name}` });
});
