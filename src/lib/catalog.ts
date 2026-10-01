import { prisma } from "./prisma";
import { providerDetailInclude, providerListInclude, toProviderCard, toProviderDetail } from "./serializers";
import { addDays, timeInLusaka, todayInLusaka, weekdayIndex } from "./format";
import { HttpError } from "./http";
import { BUSY_STATUSES } from "./statuses";

function categoryMatches(category: { name: string; slug: string; description: string }, needle: string) {
  const name = category.name.toLowerCase();
  if (name.includes(needle) || category.description.toLowerCase().includes(needle) || category.slug.includes(needle)) return true;
  if (category.slug === "beauty-cosmetics" && /beauty|cosmetic|salon|barber/.test(needle)) return true;
  if (category.slug === "repairs" && /repair|handy|craft/.test(needle)) return true;
  if (category.slug === "cleaning" && /clean/.test(needle)) return true;
  return false;
}

function slotsBetween(start: string, end: string) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  let cursor = startHour * 60 + startMinute;
  const limit = endHour * 60 + endMinute;
  const slots: string[] = [];
  while (cursor + 30 <= limit) {
    const hour = Math.floor(cursor / 60);
    const minute = cursor % 60;
    slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    cursor += 60;
  }
  return slots;
}

export async function listCategories() {
  const categories = await prisma.category.findMany({
    include: { services: { orderBy: { name: "asc" }, include: { offerings: { where: { isActive: true } } } } },
    orderBy: { name: "asc" },
  });
  const order = ["beauty-cosmetics", "repairs", "cleaning"];
  return categories.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug)).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    icon: category.icon,
    services: category.services.map((service) => ({
      id: service.id,
      name: service.name,
      slug: service.slug,
      description: service.description,
      section: service.section,
      providerCount: service.offerings.length,
    })),
  }));
}

export async function getCategory(slug: string) {
  const categories = await listCategories();
  const category = categories.find((item) => item.slug === slug);
  if (!category) throw new HttpError("That category could not be found.", 404);
  return category;
}

async function favoriteSet(customerId?: string) {
  if (!customerId) return new Set<string>();
  const rows = await prisma.favorite.findMany({ where: { customerId }, select: { providerId: true } });
  return new Set(rows.map((row) => row.providerId));
}

export async function listProviders(query: {
  q?: string;
  service?: string;
  category?: string;
  lat?: number;
  lng?: number;
  customerId?: string;
}) {
  const providers = await prisma.providerProfile.findMany({
    where: {
      verificationStatus: "VERIFIED",
      acceptingJobs: true,
      bookings: { none: { status: { in: BUSY_STATUSES } } },
      services: {
        some: {
          isActive: true,
          ...(query.service || query.category
            ? {
                service: {
                  ...(query.service ? { slug: query.service } : {}),
                  ...(query.category ? { category: { slug: query.category } } : {}),
                },
              }
            : {}),
        },
      },
    },
    include: providerListInclude,
    orderBy: [{ ratingAvg: "desc" }, { reviewCount: "desc" }],
  });
  const favorites = await favoriteSet(query.customerId);
  let cards = providers.map((provider) =>
    toProviderCard(provider, { lat: query.lat, lng: query.lng }, favorites.has(provider.id)),
  );
  if (query.service) {
    cards = cards.map((card) => ({
      ...card,
      services: card.services.filter((service) => service.slug === query.service),
    }));
  }
  if (query.q) {
    const needle = query.q.toLowerCase();
    cards = cards.filter(
      (card) =>
        card.name.toLowerCase().includes(needle) ||
        card.personName.toLowerCase().includes(needle) ||
        card.serviceArea.toLowerCase().includes(needle) ||
        card.bio.toLowerCase().includes(needle) ||
        card.services.some(
          (service) => service.name.toLowerCase().includes(needle) || service.category.toLowerCase().includes(needle),
        ),
    );
  }
  return cards;
}

export async function getProvider(id: string, coords?: { lat?: number; lng?: number }, customerId?: string) {
  const provider = await prisma.providerProfile.findUnique({ where: { id }, include: providerDetailInclude });
  if (!provider) throw new HttpError("That provider could not be found.", 404);
  const favorites = await favoriteSet(customerId);
  return toProviderDetail(provider, coords, favorites.has(provider.id));
}

export async function searchAll(q: string, coords?: { lat?: number; lng?: number }, customerId?: string) {
  const needle = q.trim().toLowerCase();
  const [categories, providers] = await Promise.all([
    listCategories(),
    listProviders({ lat: coords?.lat, lng: coords?.lng, customerId }),
  ]);
  if (!needle) {
    return {
      categories,
      services: categories.flatMap((category) =>
        category.services.map((service) => ({ ...service, category: category.name, categorySlug: category.slug })),
      ),
      providers: providers.slice(0, 12),
    };
  }
  const matchedCategories = categories.filter((category) => categoryMatches(category, needle));
  const services = categories.flatMap((category) =>
    category.services
      .filter(
        (service) =>
          categoryMatches(category, needle) ||
          service.name.toLowerCase().includes(needle) ||
          service.description.toLowerCase().includes(needle),
      )
      .map((service) => ({ ...service, category: category.name, categorySlug: category.slug })),
  );
  const matchedProviders = providers.filter(
    (provider) =>
      provider.name.toLowerCase().includes(needle) ||
      provider.personName.toLowerCase().includes(needle) ||
      provider.services.some((service) => service.name.toLowerCase().includes(needle) || service.category.toLowerCase().includes(needle)),
  );
  return { categories: matchedCategories, services, providers: matchedProviders };
}

export async function customerHome(coords?: { lat?: number; lng?: number }, customerId?: string) {
  const [categories, providers] = await Promise.all([
    listCategories(),
    listProviders({ lat: coords?.lat, lng: coords?.lng, customerId }),
  ]);
  const popular = categories
    .flatMap((category) => category.services.map((service) => ({ ...service, category: category.name, categorySlug: category.slug })))
    .sort((a, b) => b.providerCount - a.providerCount)
    .slice(0, 6);
  return {
    categories,
    popularServices: popular,
    recommended: providers.slice(0, 8),
    featured: categories[0] ?? null,
  };
}

export async function providerSlots(providerId: string, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError("Choose a valid date.", 400);
  if (date < todayInLusaka()) throw new HttpError("Choose a date that is today or later.", 400);
  const day = weekdayIndex(date);
  const windows = await prisma.providerAvailability.findMany({
    where: { providerId, dayOfWeek: day, isActive: true },
  });
  const taken = await prisma.booking.findMany({
    where: {
      providerId,
      scheduledDate: date,
      status: { in: ["PENDING", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"] },
    },
    select: { scheduledTime: true },
  });
  const takenSet = new Set(taken.map((booking) => booking.scheduledTime));
  const now = date === todayInLusaka() ? timeInLusaka() : null;
  const open = windows.flatMap((window) => slotsBetween(window.startTime, window.endTime));
  const unique = [...new Set(open)].sort();
  return {
    date,
    closed: windows.length === 0,
    slots: unique.map((time) => ({
      time,
      available: !takenSet.has(time) && (!now || time > now),
    })),
  };
}

export function upcomingDates(count = 14) {
  const today = todayInLusaka();
  return Array.from({ length: count }, (_, index) => addDays(today, index));
}
