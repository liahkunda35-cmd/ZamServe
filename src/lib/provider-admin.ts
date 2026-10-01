import { prisma } from "./prisma";
import { HttpError } from "./http";
import { resolveService } from "./account";
import { bookingInclude, toBooking } from "./serializers";
import { todayInLusaka } from "./format";

export async function providerServices(providerId: string) {
  const rows = await prisma.providerService.findMany({
    where: { providerId },
    include: { service: { include: { category: true } } },
    orderBy: [{ service: { category: { name: "asc" } } }, { service: { name: "asc" } }],
  });
  return rows.map((row) => ({
    id: row.id,
    serviceId: row.serviceId,
    name: row.service.name,
    slug: row.service.slug,
    category: row.service.category.name,
    categoryId: row.service.categoryId,
    price: row.price,
    description: row.description,
    durationMinutes: row.durationMinutes,
    isActive: row.isActive,
    imageUrl: row.imageUrl,
  }));
}

export async function addProviderService(
  providerId: string,
  item: { serviceId?: string; categoryId?: string; newServiceName?: string; price: number; description?: string; durationMinutes?: number; imageUrl?: string | null },
) {
  if (!Number.isInteger(item.price) || item.price < 1 || item.price > 1_000_000) {
    throw new HttpError("Enter a valid price in kwacha.", 400);
  }
  const duration = item.durationMinutes ?? 60;
  if (duration < 15 || duration > 480) throw new HttpError("Duration should be between 15 and 480 minutes.", 400);
  const imageUrl = cleanServiceImage(item.imageUrl);
  try {
    return await prisma.$transaction(async (tx) => {
      const serviceId = await resolveService(tx, item);
      const existing = await tx.providerService.findUnique({
        where: { providerId_serviceId: { providerId, serviceId } },
      });
      if (existing) throw new HttpError("You already offer this service. Edit it instead.", 409);
      const created = await tx.providerService.create({
        data: {
          providerId,
          serviceId,
          price: item.price,
          description: (item.description ?? "").trim(),
          durationMinutes: duration,
          imageUrl,
        },
      });
      return created;
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError("Unable to save that service. Please try again.", 400);
  }
}

export async function updateProviderService(
  providerId: string,
  id: string,
  input: { price?: number; description?: string; durationMinutes?: number; isActive?: boolean; imageUrl?: string | null },
) {
  const row = await prisma.providerService.findUnique({ where: { id } });
  if (!row || row.providerId !== providerId) throw new HttpError("That service could not be found.", 404);
  if (input.price != null && (!Number.isInteger(input.price) || input.price < 1)) {
    throw new HttpError("Enter a valid price in kwacha.", 400);
  }
  return prisma.providerService.update({
    where: { id },
    data: {
      price: input.price,
      description: input.description === undefined ? undefined : input.description.trim(),
      durationMinutes: input.durationMinutes,
      isActive: input.isActive,
      imageUrl: input.imageUrl === undefined ? undefined : cleanServiceImage(input.imageUrl),
    },
  });
}

export async function removeProviderService(providerId: string, id: string) {
  const row = await prisma.providerService.findUnique({ where: { id } });
  if (!row || row.providerId !== providerId) throw new HttpError("That service could not be found.", 404);
  const bookings = await prisma.booking.count({ where: { providerServiceId: id } });
  if (bookings > 0) {
    await prisma.providerService.update({ where: { id }, data: { isActive: false } });
    return { deactivated: true, message: "This service has bookings, so it was deactivated instead of removed." };
  }
  await prisma.providerService.delete({ where: { id } });
  return { deactivated: false, message: "Service removed." };
}

function startOfWeek(today: string) {
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

export async function earningsFor(providerId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { providerId },
    include: { booking: { include: { service: true, customer: { include: { user: { select: { fullName: true } } } } } } },
    orderBy: { createdAt: "desc" },
  });
  const today = todayInLusaka();
  const week = startOfWeek(today);
  const month = today.slice(0, 7);
  const earned = transactions.filter((item) => item.status === "EARNED");
  const sum = (rows: typeof earned) => rows.reduce((total, item) => total + item.amount, 0);
  const earnedOn = (item: (typeof earned)[number]) => todayInLusaka(item.earnedAt ?? item.updatedAt);
  return {
    total: sum(earned),
    today: sum(earned.filter((item) => earnedOn(item) === today)),
    week: sum(earned.filter((item) => earnedOn(item) >= week)),
    month: sum(earned.filter((item) => earnedOn(item).startsWith(month))),
    completedJobs: earned.length,
    pending: transactions.filter((item) => item.status === "PENDING").reduce((total, item) => total + item.amount, 0),
    cancelledJobs: transactions.filter((item) => item.status === "VOID").length,
    weekJobs: earned.filter((item) => earnedOn(item) >= week).length,
    transactions: transactions.map((item) => ({
      id: item.id,
      amount: item.amount,
      status: item.status,
      earnedAt: item.earnedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      service: item.booking.service.name,
      customer: item.booking.customer.user.fullName,
      date: item.booking.scheduledDate,
    })),
  };
}

export async function dashboardFor(provider: { id: string; userId: string; businessName: string; ratingAvg: number; reviewCount: number; verificationStatus: string }, fullName: string) {
  const [money, pending, active, completed, recent, services, latestReview] = await Promise.all([
    earningsFor(provider.id),
    prisma.booking.count({ where: { providerId: provider.id, status: "PENDING" } }),
    prisma.booking.count({ where: { providerId: provider.id, status: { in: ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"] } } }),
    prisma.booking.count({ where: { providerId: provider.id, status: "COMPLETED" } }),
    prisma.booking.findMany({
      where: { providerId: provider.id, status: { in: ["PENDING", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"] } },
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    providerServices(provider.id),
    prisma.review.findFirst({
      where: { providerId: provider.id },
      include: { author: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return {
    name: fullName,
    businessName: provider.businessName,
    verificationStatus: provider.verificationStatus,
    rating: provider.ratingAvg,
    reviewCount: provider.reviewCount,
    todayEarnings: money.today,
    weekEarnings: money.week,
    weekJobs: money.weekJobs,
    totalEarnings: money.total,
    pendingRequests: pending,
    activeJobs: active,
    completedJobs: completed,
    services,
    latestReview: latestReview
      ? { id: latestReview.id, rating: latestReview.rating, comment: latestReview.comment, authorName: latestReview.author.fullName }
      : null,
    recent: recent.map((booking) => toBooking(booking, "PROVIDER")),
  };
}

function cleanServiceImage(imageUrl?: string | null) {
  if (!imageUrl) return null;
  if (!imageUrl.startsWith("/uploads/")) throw new HttpError("Upload a service photo first.", 400);
  return imageUrl;
}

export async function providerReviews(providerId: string) {
  const [provider, reviews] = await Promise.all([
    prisma.providerProfile.findUnique({ where: { id: providerId } }),
    prisma.review.findMany({
      where: { providerId },
      include: { author: { select: { fullName: true, avatarUrl: true } }, booking: { include: { service: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const buckets = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((review) => review.rating === stars).length,
  }));
  return {
    rating: provider?.ratingAvg ?? 0,
    reviewCount: provider?.reviewCount ?? 0,
    buckets,
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      authorName: review.author.fullName,
      authorAvatar: review.author.avatarUrl,
      service: review.booking.service.name,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}
