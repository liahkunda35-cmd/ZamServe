import type { Prisma } from "@prisma/client";
import { haversineKm } from "./format";
import { customerCanSeeProviderPhone } from "./statuses";

const providerInclude = {
  user: { select: { fullName: true, avatarUrl: true, phone: true } },
  services: {
    where: { isActive: true },
    include: { service: { include: { category: true } } },
    orderBy: { price: "asc" as const },
  },
} satisfies Prisma.ProviderProfileInclude;

export const providerListInclude = providerInclude;

export const providerDetailInclude = {
  ...providerInclude,
  services: {
    where: { isActive: true },
    include: { service: { include: { category: true } } },
    orderBy: { price: "asc" as const },
  },
  availability: { orderBy: { dayOfWeek: "asc" as const } },
  portfolio: { orderBy: { createdAt: "desc" as const } },
  reviews: {
    include: { author: { select: { fullName: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" as const },
    take: 20,
  },
} satisfies Prisma.ProviderProfileInclude;

export const bookingInclude = {
  service: { include: { category: true } },
  providerService: true,
  provider: { include: { user: { select: { fullName: true, avatarUrl: true, phone: true } } } },
  customer: { include: { user: { select: { fullName: true, avatarUrl: true, phone: true } } } },
  review: true,
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  transaction: true,
} satisfies Prisma.BookingInclude;

type ProviderRow = Prisma.ProviderProfileGetPayload<{ include: typeof providerDetailInclude }>;

export function toProviderCard(
  provider: Prisma.ProviderProfileGetPayload<{ include: typeof providerListInclude }>,
  coords?: { lat?: number; lng?: number },
  favorite?: boolean,
) {
  const services = provider.services.map((item) => ({
    providerServiceId: item.id,
    id: item.serviceId,
    name: item.service.name,
    slug: item.service.slug,
    price: item.price,
    description: item.description,
    durationMinutes: item.durationMinutes,
    category: item.service.category.name,
    categorySlug: item.service.category.slug,
  }));
  const distance =
    coords?.lat != null && coords?.lng != null && provider.latitude != null && provider.longitude != null
      ? Math.round(haversineKm(coords.lat, coords.lng, provider.latitude, provider.longitude) * 10) / 10
      : null;
  return {
    id: provider.id,
    name: provider.businessName || provider.user.fullName,
    personName: provider.user.fullName,
    avatarUrl: provider.user.avatarUrl,
    verified: provider.verificationStatus === "VERIFIED",
    verificationStatus: provider.verificationStatus,
    rating: provider.ratingAvg,
    reviewCount: provider.reviewCount,
    bio: provider.bio,
    serviceArea: provider.serviceArea,
    baseAddress: provider.baseAddress,
    latitude: provider.latitude,
    longitude: provider.longitude,
    distanceKm: distance,
    minPrice: services.length ? Math.min(...services.map((service) => service.price)) : null,
    services,
    favorite: Boolean(favorite),
  };
}

export function toProviderDetail(provider: ProviderRow, coords?: { lat?: number; lng?: number }, favorite?: boolean) {
  return {
    ...toProviderCard(provider, coords, favorite),
    availability: provider.availability.map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: slot.isActive,
    })),
    portfolio: provider.portfolio.map((photo) => ({
      id: photo.id,
      imageUrl: photo.imageUrl,
      caption: photo.caption,
    })),
    reviews: provider.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      reason: review.reason,
      comment: review.comment,
      authorName: review.author.fullName,
      authorAvatar: review.author.avatarUrl,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}

export function toBooking(
  booking: Prisma.BookingGetPayload<{ include: typeof bookingInclude }>,
  viewer: "CUSTOMER" | "PROVIDER",
) {
  return {
    id: booking.id,
    status: booking.status,
    scheduledDate: booking.scheduledDate,
    scheduledTime: booking.scheduledTime,
    addressLine: booking.addressLine,
    latitude: booking.latitude,
    longitude: booking.longitude,
    notes: booking.notes,
    paymentMethod: booking.paymentMethod,
    price: booking.price,
    quotedPrice: booking.quotedPrice,
    cancelledBy: booking.cancelledBy,
    cancellationReason: booking.cancellationReason,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    providerLat: booking.providerLat,
    providerLng: booking.providerLng,
    providerLocationAt: booking.providerLocationAt?.toISOString() ?? null,
    completedAt: booking.completedAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
    durationMinutes: booking.providerService?.durationMinutes ?? 60,
    service: {
      id: booking.service.id,
      name: booking.service.name,
      slug: booking.service.slug,
      category: booking.service.category.name,
      categorySlug: booking.service.category.slug,
    },
    provider: {
      id: booking.provider.id,
      name: booking.provider.businessName || booking.provider.user.fullName,
      personName: booking.provider.user.fullName,
      avatarUrl: booking.provider.user.avatarUrl,
      verified: booking.provider.verificationStatus === "VERIFIED",
      rating: booking.provider.ratingAvg,
      phone: viewer === "CUSTOMER" && customerCanSeeProviderPhone(booking.status) ? booking.provider.user.phone : null,
      latitude: booking.provider.latitude,
      longitude: booking.provider.longitude,
    },
    customer: {
      id: booking.customer.id,
      name: booking.customer.user.fullName,
      avatarUrl: booking.customer.user.avatarUrl,
      phone: viewer === "PROVIDER" ? booking.customer.user.phone : null,
    },
    review: booking.review
      ? {
          id: booking.review.id,
          rating: booking.review.rating,
          reason: booking.review.reason,
          comment: booking.review.comment,
          createdAt: booking.review.createdAt.toISOString(),
        }
      : null,
    history: booking.statusHistory.map((entry) => ({
      status: entry.status,
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export function toMe(user: {
  id: string;
  role: string;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  customerProfile: { id: string } | null;
  providerProfile: {
    id: string;
    businessName: string;
    bio: string;
    verificationStatus: string;
    serviceArea: string;
    baseAddress: string | null;
    ratingAvg: number;
    reviewCount: number;
    latitude: number | null;
    longitude: number | null;
    idDocumentUrl: string | null;
    acceptingJobs: boolean;
  } | null;
}, counts: { unreadNotifications: number; unreadMessages: number }) {
  return {
    id: user.id,
    role: user.role,
    fullName: user.fullName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    customerId: user.customerProfile?.id ?? null,
    provider: user.providerProfile
      ? {
          id: user.providerProfile.id,
          businessName: user.providerProfile.businessName,
          bio: user.providerProfile.bio,
          verificationStatus: user.providerProfile.verificationStatus,
          serviceArea: user.providerProfile.serviceArea,
          baseAddress: user.providerProfile.baseAddress,
          rating: user.providerProfile.ratingAvg,
          reviewCount: user.providerProfile.reviewCount,
          latitude: user.providerProfile.latitude,
          longitude: user.providerProfile.longitude,
          idDocumentUrl: user.providerProfile.idDocumentUrl,
          acceptingJobs: user.providerProfile.acceptingJobs,
        }
      : null,
    ...counts,
  };
}
