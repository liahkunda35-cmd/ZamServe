import { prisma } from "@/data/prisma";
import { HttpError } from "@/lib/http";
import { notify } from "./notify";
import { canMessage } from "@/lib/statuses";
import { bookingInclude } from "@/lib/serializers";

async function participantBooking(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: bookingInclude });
  if (!booking) throw new HttpError("That conversation could not be found.", 404);
  const isCustomer = booking.customer.userId === userId;
  const isProvider = booking.provider.userId === userId;
  if (!isCustomer && !isProvider) throw new HttpError("You do not have access to this conversation.", 403);
  return { booking, role: isCustomer ? "CUSTOMER" as const : "PROVIDER" as const };
}

export async function listThreads(user: { id: string; role: string; customerProfile: { id: string } | null; providerProfile: { id: string } | null }) {
  const where = user.role === "CUSTOMER" ? { customerId: user.customerProfile?.id ?? "" } : { providerId: user.providerProfile?.id ?? "" };
  const bookings = await prisma.booking.findMany({
    where,
    include: {
      ...bookingInclude,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (bookings.length === 0) return [];
  const unread = await prisma.message.groupBy({
    by: ["bookingId"],
    where: {
      bookingId: { in: bookings.map((booking) => booking.id) },
      senderId: { not: user.id },
      readAt: null,
    },
    _count: { _all: true },
  });
  const unreadMap = new Map(unread.map((row) => [row.bookingId, row._count._all]));
  return bookings.map((booking) => {
    const other = user.role === "CUSTOMER"
      ? { name: booking.provider.businessName || booking.provider.user.fullName, avatarUrl: booking.provider.user.avatarUrl }
      : { name: booking.customer.user.fullName, avatarUrl: booking.customer.user.avatarUrl };
    const last = booking.messages[0];
    return {
      bookingId: booking.id,
      name: other.name,
      avatarUrl: other.avatarUrl,
      service: booking.service.name,
      status: booking.status,
      lastMessage: last?.body ?? "No messages yet",
      lastAt: last?.createdAt.toISOString() ?? booking.createdAt.toISOString(),
      unread: unreadMap.get(booking.id) ?? 0,
    };
  });
}

export async function listMessages(bookingId: string, userId: string) {
  const { booking } = await participantBooking(bookingId, userId);
  await prisma.message.updateMany({
    where: { bookingId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
  const messages = await prisma.message.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
  });
  return {
    booking: {
      id: booking.id,
      status: booking.status,
      service: booking.service.name,
      customerName: booking.customer.user.fullName,
      providerName: booking.provider.businessName || booking.provider.user.fullName,
    },
    messages: messages.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      senderName: message.sender.fullName,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString() ?? null,
      mine: message.senderId === userId,
    })),
  };
}

export async function sendMessage(bookingId: string, userId: string, body: string) {
  const text = body.trim();
  if (!text) throw new HttpError("Write a message first.", 400);
  if (text.length > 1000) throw new HttpError("That message is too long.", 400);
  const { booking, role } = await participantBooking(bookingId, userId);
  if (!canMessage(booking.status)) throw new HttpError("You can message once the booking is confirmed.", 400);
  const recipient = role === "CUSTOMER" ? booking.provider.userId : booking.customer.userId;
  const href = role === "CUSTOMER" ? `/provider/messages/${bookingId}` : `/customer/messages/${bookingId}`;
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: { bookingId, senderId: userId, body: text },
    });
    await tx.booking.update({ where: { id: bookingId }, data: { notes: booking.notes } });
    await notify(tx, {
      userId: recipient,
      type: "NEW_MESSAGE",
      title: "New message",
      body: text.slice(0, 140),
      href,
    });
    return created;
  });
  return {
    id: message.id,
    senderId: userId,
    body: text,
    createdAt: message.createdAt.toISOString(),
    readAt: null,
    mine: true,
  };
}

export async function listNotifications(userId: string) {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function markNotifications(userId: string, id?: string) {
  await prisma.notification.updateMany({
    where: { userId, ...(id ? { id } : {}), readAt: null },
    data: { readAt: new Date() },
  });
}
