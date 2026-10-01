import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { HttpError } from "./http";
import { hashPassword, checkPassword } from "./auth";
import { normalizePhone } from "./phone";
import { slugify } from "./format";
import { getProvider } from "./catalog";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export async function registerCustomer(input: { fullName: string; phone: string; password: string; avatarUrl?: string | null }) {
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

    for (const item of input.services) {
      const serviceId = await resolveService(tx, item);
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
    if (photos.length) {
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
