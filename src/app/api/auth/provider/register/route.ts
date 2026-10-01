import { z } from "zod";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { normalizePhone } from "@/lib/phone";
import { registerProvider } from "@/lib/account";
import { setSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const service = z.object({
  serviceId: z.string().optional(),
  categoryId: z.string().optional(),
  newServiceName: z.string().optional(),
  price: z.number().int().positive("Enter a price in kwacha."),
  description: z.string().max(400).optional(),
  durationMinutes: z.number().int().min(15).max(480).optional(),
});

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80),
  phone: z.string().min(1, "Enter your phone number."),
  password: z.string().min(6, "Use at least 6 characters."),
  confirmPassword: z.string(),
  email: z.string().trim().email("Enter a valid email address."),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth."),
  avatarUrl: z.string().optional().nullable(),
  businessName: z.string().trim().min(2).max(80),
  bio: z.string().max(500).optional(),
  serviceArea: z.string().trim().min(2).max(80),
  baseAddress: z.string().max(160).optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  idDocumentUrl: z.string().min(1, "Upload your NRC."),
  nrcBackUrl: z.string().optional().nullable(),
  facePhotoUrl: z.string().min(1, "Take a profile photo."),
  portfolio: z.array(z.string().min(1)).max(2).optional(),
  services: z.array(service).min(1, "Add at least one service and price."),
});

export const POST = route(async (req) => {
  const body = schema.parse(await readJson(req));
  if (body.password !== body.confirmPassword) throw new HttpError("Passwords do not match.", 400);
  const born = new Date(`${body.dateOfBirth}T00:00:00`);
  const adult = new Date();
  adult.setFullYear(adult.getFullYear() - 18);
  if (Number.isNaN(born.getTime()) || born > adult) throw new HttpError("You need to be 18 or older.", 400);
  const phone = normalizePhone(body.phone);
  if (!phone) throw new HttpError("Enter a valid Zambian phone number.", 400);
  const user = await registerProvider({ ...body, phone });
  await setSession(user.id, "PROVIDER");
  return ok({ ok: true }, 201);
});
