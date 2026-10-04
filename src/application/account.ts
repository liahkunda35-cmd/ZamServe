import type { Prisma } from "@prisma/client";
import { prisma } from "@/data/prisma";
import { HttpError } from "@/lib/http";
import { hashPassword, checkPassword } from "./auth";
import { normalizePhone } from "@/lib/phone";
import { slugify } from "@/lib/format";
import { BEAUTY_CATEGORY_SLUG } from "@/lib/service-rules";
import { emailAddress, personName } from "@/lib/validate";
import { getProvider } from "./catalog";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export async function registerCustomer(input: { fullName: string; phone: string; password: string; avatarUrl?: string | null }) {
  const nameProblem = personName(input.fullName);
  if (nameProblem) throw new HttpError(nameProblem, 400);
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (existing) throw new HttpError("An account with this phone number already exists.", 409);
  const user = await prisma.user.create({
    data: {
      role: "CUSTOMER",
      fullName: input.fullName.trim(),
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      avatarUrl: input.avatarUrl || null,
      customerProfile: { create: {} },
    },
  });
  return user;
}

export async function registerProvider(input: {
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  password: string;
  avatarUrl?: string | null;
  businessName: string;
  bio?: string;
  serviceArea: string;
  baseAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
  idDocumentUrl: string;
  nrcBackUrl?: string | null;
  facePhotoUrl: string;
  portfolio?: string[];
  services: { serviceId?: string; categoryId?: string; newServiceName?: string; price: number; description?: string; durationMinutes?: number }[];
}) {
  const nameProblem = personName(input.fullName);
  if (nameProblem) throw new HttpError(nameProblem, 400);
  const emailProblem = emailAddress(input.email);
  if (emailProblem) throw new HttpError(emailProblem, 400);
  if (!input.services.length) throw new HttpError("Add at least one service and price.", 400);
  if (!input.idDocumentUrl) throw new HttpError("Upload your NRC.", 400);
  if (!input.facePhotoUrl) throw new HttpError("Take a profile photo.", 400);
  const photos = (input.portfolio ?? []).filter(Boolean).slice(0, 2);
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (existing) throw new HttpError("An account with this phone number already exists.", 409);
  const emailTaken = await prisma.user.findUnique({ where: { email: input.email } });
  if (emailTaken) throw new HttpError("An account with this email already exists.", 409);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        role: "PROVIDER",
        fullName: input.fullName.trim(),
        email: input.email,
        dateOfBirth: input.dateOfBirth,
        phone: input.phone,
        passwordHash: await hashPassword(input.password),
        avatarUrl: input.avatarUrl || null,
        providerProfile: {
          create: {
            businessName: input.businessName.trim(),
            bio: (input.bio ?? "").trim(),
            serviceArea: input.serviceArea.trim() || "Lusaka",
            baseAddress: input.baseAddress?.trim() || null,
            latitude: input.latitude ?? null,
            longitude: input.longitude ?? null,
            idDocumentUrl: input.idDocumentUrl,
            nrcBackUrl: input.nrcBackUrl || null,
            facePhotoUrl: input.facePhotoUrl,
            acceptingJobs: false,
            verificationStatus: "VERIFIED",
            availability: {
              create: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
                dayOfWeek,
                startTime: "08:00",
                endTime: "18:00",
              })),
            },
          },
        },
      },
      include: { providerProfile: true },
    });

    let offersBeauty = false;
    for (const item of input.services) {
      const serviceId = await resolveService(tx, item);
      const service = await tx.service.findUnique({ where: { id: serviceId }, include: { category: true } });
      if (service?.category.slug === BEAUTY_CATEGORY_SLUG) offersBeauty = true;
      await tx.providerService.create({
        data: {
          providerId: created.providerProfile!.id,
          serviceId,
          price: item.price,
          description: (item.description ?? "").trim(),
          durationMinutes: item.durationMinutes ?? 60,
        },
      });
    }
    if (offersBeauty && photos.length) {
      await tx.portfolioImage.createMany({
        data: photos.map((imageUrl) => ({ providerId: created.providerProfile!.id, imageUrl })),
      });
    }
    return created;
  });
  return user;
}

async function resolveService(
  tx: Prisma.TransactionClient,
  item: { serviceId?: string; categoryId?: string; newServiceName?: string },
) {
  if (item.serviceId) {
    const service = await tx.service.findUnique({ where: { id: item.serviceId } });
    if (!service) throw new HttpError("Choose a valid service.", 400);
    return service.id;
  }
  const name = item.newServiceName?.trim();
  if (!item.categoryId || !name) throw new HttpError("Choose a category and service.", 400);
  const category = await tx.category.findUnique({ where: { id: item.categoryId }, include: { services: true } });
  if (!category) throw new HttpError("Choose a valid category.", 400);
  const existing = category.services.find((service) => service.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  let slug = slugify(name) || "service";
  const clash = await tx.service.findUnique({ where: { slug } });
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const created = await tx.service.create({
    data: { categoryId: category.id, name, slug, description: "" },
  });
  return created.id;
}

export async function loginWithRole(phone: string, password: string, role: "CUSTOMER" | "PROVIDER") {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new HttpError("Invalid phone number or password", 401);
  const user = await prisma.user.findUnique({ where: { phone: normalized } });
  if (!user) throw new HttpError("Invalid phone number or password", 401);
  const matches = await checkPassword(password, user.passwordHash);
  if (!matches) throw new HttpError("Invalid phone number or password", 401);
  if (await accountIsDeactivated(user.id)) throw new HttpError("This account has been deactivated.", 403);
  if (user.role !== role) {
    throw new HttpError(
      user.role === "PROVIDER"
        ? "This number is registered as a service provider. Use provider login."
        : "This number is registered as a customer. Use customer login.",
      403,
    );
  }
  return user;
}

export async function updateProfile(
  userId: string,
  input: { fullName?: string; avatarUrl?: string | null; businessName?: string; bio?: string; serviceArea?: string; baseAddress?: string; latitude?: number | null; longitude?: number | null },
) {
  if (input.fullName) {
    const nameProblem = personName(input.fullName);
    if (nameProblem) throw new HttpError(nameProblem, 400);
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { providerProfile: true } });
  if (!user) throw new HttpError("Please log in to continue.", 401);
  await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: input.fullName?.trim() || undefined,
      avatarUrl: input.avatarUrl === undefined ? undefined : input.avatarUrl,
    },
  });
  if (user.providerProfile) {
    await prisma.providerProfile.update({
      where: { id: user.providerProfile.id },
      data: {
        businessName: input.businessName?.trim() || undefined,
        bio: input.bio === undefined ? undefined : input.bio.trim(),
        serviceArea: input.serviceArea?.trim() || undefined,
        baseAddress: input.baseAddress === undefined ? undefined : input.baseAddress.trim(),
        latitude: input.latitude === undefined ? undefined : input.latitude,
        longitude: input.longitude === undefined ? undefined : input.longitude,
      },
    });
  }
}

export async function accountIsDeactivated(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ deactivatedAt: string | null }>>`SELECT deactivatedAt FROM User WHERE id = ${userId}`;
  return Boolean(rows[0]?.deactivatedAt);
}

export async function deactivateAccount(userId: string) {
  await prisma.$executeRaw`UPDATE User SET deactivatedAt = CURRENT_TIMESTAMP WHERE id = ${userId}`;
  await prisma.providerProfile.updateMany({ where: { userId }, data: { acceptingJobs: false } });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError("Please log in to continue.", 401);
  const matches = await checkPassword(currentPassword, user.passwordHash);
  if (!matches) throw new HttpError("Your current password is incorrect.", 400);
  if (newPassword.length < 6) throw new HttpError("Use at least 6 characters for your new password.", 400);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
}

export async function listAddresses(customerId: string) {
  return prisma.address.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } });
}

export async function createAddress(customerId: string, input: { label: string; addressLine: string; latitude?: number | null; longitude?: number | null }) {
  return prisma.address.create({
    data: {
      customerId,
      label: input.label.trim(),
      addressLine: input.addressLine.trim(),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    },
  });
}

export async function deleteAddress(customerId: string, id: string) {
  const address = await prisma.address.findUnique({ where: { id } });
  if (!address || address.customerId !== customerId) throw new HttpError("That address could not be found.", 404);
  await prisma.address.delete({ where: { id } });
}

export async function listPayments(customerId: string) {
  return prisma.paymentMethod.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } });
}

export async function createPayment(customerId: string, input: { provider: string; phone: string; label?: string }) {
  if (input.provider === "Visa") {
    const last4 = input.phone.replace(/\D/g, "").slice(-4);
    if (last4.length !== 4) throw new HttpError("Enter the last 4 digits of the Visa card.", 400);
    return prisma.paymentMethod.create({
      data: { customerId, type: "CARD", provider: "Visa", phone: last4, label: input.label?.trim() || "Visa" },
    });
  }
  const phone = normalizePhone(input.phone);
  if (!phone) throw new HttpError("Enter a valid Zambian phone number.", 400);
  return prisma.paymentMethod.create({
    data: {
      customerId,
      type: "MOBILE_MONEY",
      provider: input.provider,
      phone,
      label: input.label?.trim() || input.provider,
    },
  });
}

export async function deletePayment(customerId: string, id: string) {
  const method = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!method || method.customerId !== customerId) throw new HttpError("That payment method could not be found.", 404);
  await prisma.paymentMethod.delete({ where: { id } });
}

export async function toggleFavorite(customerId: string, providerId: string) {
  const provider = await prisma.providerProfile.findUnique({ where: { id: providerId } });
  if (!provider) throw new HttpError("That provider could not be found.", 404);
  const existing = await prisma.favorite.findUnique({ where: { customerId_providerId: { customerId, providerId } } });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.favorite.create({ data: { customerId, providerId } });
  return true;
}

export async function listFavorites(customerId: string, coords?: { lat?: number; lng?: number }) {
  const rows = await prisma.favorite.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } });
  const providers = [];
  for (const row of rows) {
    providers.push(await getProvider(row.providerId, coords, customerId));
  }
  return providers;
}

export async function loadAccount(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { customerProfile: true, providerProfile: true },
  });
}

export async function listAvailability(providerId: string) {
  return prisma.providerAvailability.findMany({
    where: { providerId },
    orderBy: { dayOfWeek: "asc" },
  });
}

export async function setAcceptingJobs(providerId: string, acceptingJobs: boolean) {
  await prisma.providerProfile.update({ where: { id: providerId }, data: { acceptingJobs } });
  return { acceptingJobs };
}

export async function listPortfolio(providerId: string) {
  return prisma.portfolioImage.findMany({ where: { providerId }, orderBy: { createdAt: "desc" } });
}

export async function addPortfolio(providerId: string, imageUrl: string, caption: string) {
  const offers = await prisma.providerService.findMany({
    where: { providerId },
    include: { service: { include: { category: true } } },
  });
  if (!offers.some((row) => row.service.category.slug === BEAUTY_CATEGORY_SLUG)) {
    throw new HttpError("Work photos are only for Beauty & Cosmetics.", 400);
  }
  const count = await prisma.portfolioImage.count({ where: { providerId } });
  if (count >= 2) throw new HttpError("You can keep 2 portfolio photos. Replace one to change it.", 400);
  return prisma.portfolioImage.create({ data: { providerId, imageUrl, caption } });
}

export async function removePortfolio(providerId: string, id: string) {
  const photo = await prisma.portfolioImage.findUnique({ where: { id } });
  if (!photo || photo.providerId !== providerId) throw new HttpError("That photo could not be found.", 404);
  await prisma.portfolioImage.delete({ where: { id } });
}

export async function requestPasswordReset(phone: string) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return null;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.passwordReset.create({
    data: { phone, codeHash: await hashPassword(code), expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
  });
  return code;
}

export async function resetPasswordWithCode(phone: string, code: string, password: string) {
  const resets = await prisma.passwordReset.findMany({
    where: { phone, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  let match: (typeof resets)[number] | null = null;
  for (const reset of resets) {
    if (await checkPassword(code.trim(), reset.codeHash)) {
      match = reset;
      break;
    }
  }
  if (!match) throw new HttpError("That reset code is invalid or has expired.", 400);
  await prisma.$transaction([
    prisma.user.update({ where: { phone }, data: { passwordHash: await hashPassword(password) } }),
    prisma.passwordReset.update({ where: { id: match.id }, data: { used: true } }),
  ]);
}

export async function saveAvailability(
  providerId: string,
  days: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[],
) {
  const clean = days
    .filter((day) => WEEKDAYS.includes(day.dayOfWeek))
    .map((day) => ({ ...day, startTime: day.startTime.slice(0, 5), endTime: day.endTime.slice(0, 5) }));
  if (clean.some((day) => !/^\d{2}:\d{2}$/.test(day.startTime) || !/^\d{2}:\d{2}$/.test(day.endTime) || day.startTime >= day.endTime)) {
    throw new HttpError("Check the opening and closing times.", 400);
  }
  await prisma.$transaction(async (tx) => {
    await tx.providerAvailability.deleteMany({ where: { providerId } });
    if (clean.length) {
      await tx.providerAvailability.createMany({
        data: clean.map((day) => ({ ...day, providerId })),
      });
    }
  });
  return prisma.providerAvailability.findMany({ where: { providerId }, orderBy: { dayOfWeek: "asc" } });
}

export { resolveService };
