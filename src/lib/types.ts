export type Me = {
  id: string;
  role: "CUSTOMER" | "PROVIDER";
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  customerId: string | null;
  provider: {
    id: string;
    businessName: string;
    bio: string;
    verificationStatus: string;
    serviceArea: string;
    baseAddress: string | null;
    rating: number;
    reviewCount: number;
    latitude: number | null;
    longitude: number | null;
    idDocumentUrl: string | null;
    acceptingJobs: boolean;
  } | null;
  unreadNotifications: number;
  unreadMessages: number;
};

export type ServiceItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  section: string | null;
  providerCount: number;
  category?: string;
  categorySlug?: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  icon: string;
  services: ServiceItem[];
};

export type Offering = {
  providerServiceId: string;
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  durationMinutes: number;
  category: string;
  categorySlug: string;
};

export type ProviderCard = {
  id: string;
  name: string;
  personName: string;
  avatarUrl: string | null;
  verified: boolean;
  verificationStatus: string;
  rating: number;
  reviewCount: number;
  bio: string;
  serviceArea: string;
  baseAddress?: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  minPrice: number | null;
  services: Offering[];
  favorite: boolean;
  availability?: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[];
  portfolio?: { id: string; imageUrl: string; caption: string }[];
  reviews?: { id: string; rating: number; reason?: string; comment: string; authorName: string; authorAvatar: string | null; createdAt: string }[];
};

export type Booking = {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  notes: string;
  paymentMethod: string | null;
  price: number;
  quotedPrice: number | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  providerLat: number | null;
  providerLng: number | null;
  providerLocationAt: string | null;
  completedAt: string | null;
  createdAt: string;
  service: { id: string; name: string; slug: string; category: string };
  provider: {
    id: string;
    name: string;
    personName: string;
    avatarUrl: string | null;
    verified: boolean;
    rating: number;
    phone: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  customer: { id: string; name: string; avatarUrl: string | null; phone: string | null };
  review: { id: string; rating: number; reason: string; comment: string; createdAt: string } | null;
  history: { status: string; note: string | null; createdAt: string }[];
};

export type Thread = {
  bookingId: string;
  name: string;
  avatarUrl: string | null;
  service: string;
  status: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName?: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  mine: boolean;
};
