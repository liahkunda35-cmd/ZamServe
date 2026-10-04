import { prisma } from "@/data/prisma";
import { HttpError } from "@/lib/http";
import { notify } from "./notify";
import { bookingInclude, toBooking } from "@/lib/serializers";
import { todayInLusaka } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { BUSY_STATUSES, NEXT_STATUS, canShareLocation, customerCanCancel, providerCanCancel } from "@/lib/statuses";
import type { Session } from "@/lib/token";

const OPEN_STATUSES = ["PENDING", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"];

async function loadBooking(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) throw new HttpError("That booking could not be found.", 404);
  return booking;
}

function assertParticipant(
  booking: { customer: { userId: string }; provider: { userId: string } },
  userId: string,
) {
  const viewer = booking.customer.userId === userId ? "CUSTOMER" : booking.provider.userId === userId ? "PROVIDER" : null;
  if (!viewer) throw new HttpError("You do not have access to this booking.", 403);
  return viewer;
}

export async function listBookings(user: { id: string; role: string; customerProfile: { id: string } | null; providerProfile: { id: string } | null }) {
  const where = user.role === "CUSTOMER"
    ? { customerId: user.customerProfile?.id }
    : await providerBookingWhere(user.providerProfile?.id);
  const bookings = await prisma.booking.findMany({
    where,
    include: bookingInclude,
    orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "desc" }],
  });
  return bookings.map((booking) => toBooking(booking, user.role as Session["role"]));
}

async function providerBookingWhere(providerId?: string) {
  if (!providerId) return { id: "__none__" };
  const offered = await prisma.providerService.findMany({
    where: { providerId, isActive: true },
    select: { serviceId: true },
  });
  const serviceIds = offered.map((item) => item.serviceId);
  return {
    providerId,
    OR: [
      { status: { not: "PENDING" as const } },
      serviceIds.length
        ? { status: "PENDING" as const, serviceId: { in: serviceIds } }
        : { status: "PENDING" as const, id: "__none__" },
    ],
  };
}

export async function getBookingForUser(id: string, userId: string) {
  const booking = await loadBooking(id);
  const viewer = assertParticipant(booking, userId);
  return toBooking(booking, viewer);
}

export async function createBooking(
  user: { id: string; fullName?: string; customerProfile: { id: string } | null },
  input: {
    providerId: string;
    serviceId: string;
    date: string;
    time: string;
    addressLine: string;
    latitude?: number | null;
    longitude?: number | null;
    notes?: string;
    paymentMethod?: string;
    saveAddress?: boolean;
    addressLabel?: string;
  },
) {
  if (!user.customerProfile) throw new HttpError("You do not have access to this.", 403);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) {
    throw new HttpError("Choose a valid date and time.", 400);
  }
  if (input.date < todayInLusaka()) throw new HttpError("Choose a date that is today or later.", 400);
  const address = input.addressLine.trim();
  if (address.length < 3) throw new HttpError("Add the location for this booking.", 400);

  const offering = await prisma.providerService.findFirst({
    where: { providerId: input.providerId, serviceId: input.serviceId, isActive: true },
    include: { service: true, provider: { include: { user: true } } },
  });
  if (!offering) throw new HttpError("This provider does not offer that service.", 400);
  if (offering.provider.verificationStatus !== "VERIFIED" || !offering.provider.acceptingJobs) {
    throw new HttpError("This provider is not available for new requests.", 409);
  }
  const paymentMethod = (input.paymentMethod ?? "").trim();
  if (!/^(Airtel Money|MoMo|Visa)( · .+)?$/.test(paymentMethod)) {
    throw new HttpError("Choose Airtel Money, MoMo, or Visa.", 400);
  }
  if (paymentMethod.startsWith("Airtel Money") || paymentMethod.startsWith("MoMo")) {
    const phone = paymentMethod.split("·")[1]?.trim() ?? "";
    if (!normalizePhone(phone)) throw new HttpError("Enter a valid Zambian mobile money number.", 400);
  }
  if (paymentMethod.startsWith("Visa") && !/•••• \d{4}$/.test(paymentMethod)) {
    throw new HttpError("Enter a Visa card. Only the last 4 digits are saved.", 400);
  }
  const busy = await prisma.booking.findFirst({
    where: { providerId: input.providerId, status: { in: BUSY_STATUSES } },
  });
  if (busy) throw new HttpError("This provider is finishing another job and cannot take a new request yet.", 409);

  const booking = await prisma.$transaction(async (tx) => {
    const clash = await tx.booking.findFirst({
      where: {
        providerId: input.providerId,
        scheduledDate: input.date,
        scheduledTime: input.time,
        status: { in: OPEN_STATUSES },
      },
    });
    if (clash) throw new HttpError("That time is no longer available. Please choose another.", 409);

    const created = await tx.booking.create({
      data: {
        customerId: user.customerProfile!.id,
        providerId: offering.providerId,
        serviceId: offering.serviceId,
        providerServiceId: offering.id,
        status: "PENDING",
        scheduledDate: input.date,
        scheduledTime: input.time,
        addressLine: address,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        notes: (input.notes ?? "").trim(),
        paymentMethod,
        price: offering.price,
        statusHistory: { create: { status: "PENDING", note: "Booking requested" } },
        transaction: { create: { providerId: offering.providerId, amount: offering.price, status: "PENDING" } },
      },
    });

    if (input.saveAddress) {
      await tx.address.create({
        data: {
          customerId: user.customerProfile!.id,
          label: (input.addressLabel || "Saved place").trim(),
          addressLine: address,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
        },
      });
    }

    await notify(tx, {
      userId: user.id,
      type: "BOOKING_SUBMITTED",
      title: "Booking request submitted",
      body: `${offering.service.name} with ${offering.provider.businessName} is waiting for acceptance.`,
      href: `/customer/bookings/${created.id}`,
    });
    await notify(tx, {
      userId: offering.provider.userId,
      type: "NEW_BOOKING",
      title: "New booking request",
      body: `${user.fullName || "A customer"} requested ${offering.service.name} on ${input.date} at ${input.time}.`,
      href: `/provider/bookings/${created.id}`,
    });
    return created;
  });

  return getBookingForUser(booking.id, user.id);
}

async function ownedBooking(id: string, userId: string, role: Session["role"]) {
  const booking = await loadBooking(id);
  const viewer = assertParticipant(booking, userId);
  if (viewer !== role) throw new HttpError("You do not have access to this booking.", 403);
  return booking;
}

export async function acceptBooking(id: string, userId: string, price?: number) {
  const booking = await ownedBooking(id, userId, "PROVIDER");
  if (booking.status !== "PENDING") throw new HttpError("This request can no longer be priced.", 400);
  const amount = price && price > 0 ? Math.round(price) : booking.price;
  if (amount < 1) throw new HttpError("Enter a price in kwacha.", 400);
  const busy = await prisma.booking.findFirst({
    where: { providerId: booking.providerId, id: { not: id }, status: { in: BUSY_STATUSES } },
  });
  if (busy) throw new HttpError("Finish the job you already accepted before taking another.", 409);
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id },
      data: {
        price: amount,
        quotedPrice: amount,
        status: "ACCEPTED",
        statusHistory: { create: { status: "ACCEPTED", note: `Provider accepted at K${amount}` } },
        transaction: { update: { amount } },
      },
    });
    await notify(tx, {
      userId: booking.customer.userId,
      type: "BOOKING_ACCEPTED",
      title: "Your request has been accepted",
      body: `${booking.provider.businessName} accepted ${booking.service.name} for K${amount}.`,
      href: `/customer/bookings/${id}`,
    });
    await notify(tx, {
      userId: booking.provider.userId,
      type: "BOOKING_ACCEPTED",
      title: "Request accepted",
      body: `${booking.customer.user.fullName} is booked for ${booking.service.name}.`,
      href: `/provider/bookings/${id}`,
    });
  });
  return getBookingForUser(id, userId);
}

export async function confirmQuote(id: string, userId: string) {
  const booking = await ownedBooking(id, userId, "CUSTOMER");
  if (booking.status !== "PENDING" || !booking.quotedPrice) throw new HttpError("There is no price to accept yet.", 400);
  const busy = await prisma.booking.findFirst({
    where: { providerId: booking.providerId, status: { in: BUSY_STATUSES } },
  });
  if (busy) throw new HttpError("This provider is already on another job.", 409);
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id },
      data: {
        price: booking.quotedPrice!,
        status: "ACCEPTED",
        statusHistory: { create: { status: "ACCEPTED", note: "Customer accepted the price" } },
        transaction: { update: { amount: booking.quotedPrice! } },
      },
    });
    await notify(tx, {
      userId: booking.customer.userId,
      type: "BOOKING_ACCEPTED",
      title: "Your service has been accepted",
      body: `${booking.provider.businessName} is confirmed for ${booking.service.name}. They will start the trip when they leave.`,
      href: `/customer/bookings/${id}`,
    });
    await notify(tx, {
      userId: booking.provider.userId,
      type: "BOOKING_ACCEPTED",
      title: "Customer accepted your price",
      body: `${booking.customer.user.fullName} accepted K${booking.quotedPrice} for ${booking.service.name}.`,
      href: `/provider/bookings/${id}`,
    });
  });
  return getBookingForUser(id, userId);
}

export async function rejectBooking(id: string, userId: string, reason?: string) {
  const booking = await ownedBooking(id, userId, "PROVIDER");
  if (booking.status !== "PENDING") throw new HttpError("This request can no longer be declined.", 400);
  const note = reason?.trim() || "Provider declined the request";
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id },
      data: {
        status: "REJECTED",
        cancelledBy: "PROVIDER",
        cancellationReason: note,
        cancelledAt: new Date(),
        statusHistory: { create: { status: "REJECTED", note } },
        transaction: { update: { status: "VOID" } },
      },
    });
    await notify(tx, {
      userId: booking.customer.userId,
      type: "BOOKING_REJECTED",
      title: "Provider declined your booking",
      body: note,
      href: `/customer/bookings/${id}`,
    });
  });
  return getBookingForUser(id, userId);
}

export async function cancelBooking(id: string, userId: string, role: Session["role"], reason?: string) {
  const booking = await ownedBooking(id, userId, role);
  const allowed = role === "CUSTOMER" ? customerCanCancel(booking.status) : providerCanCancel(booking.status);
  if (!allowed) throw new HttpError("This booking can no longer be cancelled.", 400);
  const note = reason?.trim() ?? "";
  if (role === "CUSTOMER" && note.length < 3) throw new HttpError("Choose a reason for cancelling.", 400);
  const stored = note || "Cancelled by provider";
  const otherUser = role === "CUSTOMER" ? booking.provider.userId : booking.customer.userId;
  const otherHref = role === "CUSTOMER" ? `/provider/bookings/${id}` : `/customer/bookings/${id}`;
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledBy: role,
        cancellationReason: stored,
        cancelledAt: new Date(),
        statusHistory: { create: { status: "CANCELLED", note: stored } },
        transaction: { update: { status: "VOID" } },
      },
    });
    await notify(tx, {
      userId: otherUser,
      type: "BOOKING_CANCELLED",
      title: role === "CUSTOMER" ? "Customer cancelled" : "Provider cancelled the booking",
      body: stored,
      href: otherHref,
    });
  });
  return getBookingForUser(id, userId);
}

export async function advanceBooking(id: string, userId: string, status: string) {
  const booking = await ownedBooking(id, userId, "PROVIDER");
  const next = NEXT_STATUS[booking.status];
  if (!next || next.status !== status) throw new HttpError("That status update is not available.", 400);
  const completed = status === "COMPLETED";
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id },
      data: {
        status,
        completedAt: completed ? new Date() : undefined,
        statusHistory: { create: { status, note: next.label } },
        ...(completed ? { transaction: { update: { status: "EARNED", earnedAt: new Date(), amount: booking.price } } } : {}),
      },
    });
    const titles: Record<string, string> = {
      ON_THE_WAY: "Provider is on the way",
      ARRIVED: "Provider has arrived",
      IN_PROGRESS: "Service has started",
      COMPLETED: "Booking completed",
    };
    await notify(tx, {
      userId: booking.customer.userId,
      type: "STATUS_UPDATE",
      title: titles[status] ?? "Booking updated",
      body: completed ? `How was ${booking.service.name}? Leave a review.` : `${booking.provider.businessName} updated your booking.`,
      href: `/customer/bookings/${id}`,
    });
    if (completed) {
      await notify(tx, {
        userId: booking.provider.userId,
        type: "BOOKING_COMPLETED",
        title: "Booking completed",
        body: `${booking.service.name} is complete. Earnings have been added.`,
        href: `/provider/earnings`,
      });
    }
  });
  return getBookingForUser(id, userId);
}

export async function updateProviderLocation(id: string, userId: string, latitude: number, longitude: number) {
  const booking = await ownedBooking(id, userId, "PROVIDER");
  if (!canShareLocation(booking.status)) throw new HttpError("Location can be shared once the booking is accepted.", 400);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new HttpError("A valid location is required.", 400);
  await prisma.booking.update({
    where: { id },
    data: { providerLat: latitude, providerLng: longitude, providerLocationAt: new Date() },
  });
  return getBookingForUser(id, userId);
}

export async function createReview(userId: string, customerId: string | null, input: { bookingId: string; rating: number; comment?: string; reason?: string }) {
  if (!customerId) throw new HttpError("You do not have access to this.", 403);
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new HttpError("Choose a star rating from 1 to 5.", 400);
  }
  const booking = await loadBooking(input.bookingId);
  if (booking.customerId !== customerId) throw new HttpError("You can only review your own bookings.", 403);
  if (booking.status !== "COMPLETED") throw new HttpError("You can review a booking after it is completed.", 400);
  if (booking.review) throw new HttpError("You have already reviewed this booking.", 400);
  const reason = (input.reason ?? "").trim();
  const comment = (input.comment ?? "").trim();
  if (input.rating <= 2 && !reason && !comment) {
    throw new HttpError("A 1 or 2 star rating needs a reason.", 400);
  }
  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        bookingId: booking.id,
        authorId: userId,
        providerId: booking.providerId,
        rating: input.rating,
        reason,
        comment,
      },
    });
    const aggregate = await tx.review.aggregate({
      where: { providerId: booking.providerId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await tx.providerProfile.update({
      where: { id: booking.providerId },
      data: {
        ratingAvg: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
        reviewCount: aggregate._count.rating,
      },
    });
    await notify(tx, {
      userId: booking.provider.userId,
      type: "NEW_REVIEW",
      title: "New review",
      body: `${booking.customer.user.fullName} left ${input.rating} star${input.rating === 1 ? "" : "s"}.`,
      href: "/provider/reviews",
    });
  });
  return getBookingForUser(booking.id, userId);
}
