import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, ok, readJson, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { saveAvailability } from "@/lib/account";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser("PROVIDER");
  if (!user.providerProfile) throw new HttpError("You do not have access to this.", 403);
  const rows = await prisma.providerAvailability.findMany({
    where: { providerId: user.providerProfile.id },
    orderBy: { dayOfWeek: "asc" },
  });
  return ok(rows);
});

export const POST = route(async (req) => {
  const user = await requireUser("PROVIDER");
  if (!user.providerProfile) throw new HttpError("You do not have access to this.", 403);
  if (user.providerProfile.verificationStatus !== "VERIFIED") {
    throw new HttpError("Your account is under review. You cannot receive requests yet.", 403);
  }
  const body = z.object({ acceptingJobs: z.boolean() }).parse(await readJson(req));
  await prisma.providerProfile.update({
    where: { id: user.providerProfile.id },
    data: { acceptingJobs: body.acceptingJobs },
  });
  return ok({ acceptingJobs: body.acceptingJobs });
});

export const PUT = route(async (req) => {
  const user = await requireUser("PROVIDER");
  if (!user.providerProfile) throw new HttpError("You do not have access to this.", 403);
  const body = z
    .object({
      days: z.array(
        z.object({
          dayOfWeek: z.number().int(),
          startTime: z.string(),
          endTime: z.string(),
          isActive: z.boolean(),
        }),
      ),
    })
    .parse(await readJson(req));
  return ok(await saveAvailability(user.providerProfile.id, body.days));
});
