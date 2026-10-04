"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Phone } from "lucide-react";
import { ApiError, api } from "@/lib/client";
import { messageText, requiredText } from "@/lib/validate";
import { formatDuration, formatStamp, formatWhen, kwacha } from "@/lib/format";
import { STATUS_LABEL, canMessage, customerCanCancel, isActiveStatus } from "@/lib/statuses";
import type { Booking, ChatMessage, Thread } from "@/lib/types";
import dynamic from "next/dynamic";
import { Avatar, BackLink, Banner, Button, EmptyState, LoadingBlock, Modal, Screen, StarPicker, Stars, StatusPill } from "./ui";

const MapView = dynamic(() => import("./map-view").then((mod) => mod.MapView), { ssr: false });

const tabs = [
  { id: "upcoming", label: "Upcoming", statuses: ["PENDING", "ACCEPTED"] },
  { id: "active", label: "Active", statuses: ["ON_THE_WAY", "ARRIVED", "IN_PROGRESS"] },
  { id: "completed", label: "Completed", statuses: ["COMPLETED"] },
  { id: "cancelled", label: "Cancelled", statuses: ["CANCELLED", "REJECTED"] },
];

export function CustomerBookings() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("upcoming");
  useEffect(() => {
    api<Booking[]>("/api/bookings").then(setBookings).catch(() => setError("Unable to load bookings. Please try again."));
  }, []);
  const visible = bookings?.filter((booking) => tabs.find((item) => item.id === tab)?.statuses.includes(booking.status)) ?? [];
  return (
    <Screen>
      <h1 className="font-display text-[2rem]">My bookings</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${tab === item.id ? "bg-forest text-white" : "bg-card border border-line"}`}>{item.label}</button>
        ))}
      </div>
      {error && <div className="mt-4"><Banner>{error}</Banner></div>}
      {!bookings && !error && <div className="mt-4"><LoadingBlock label="Loading bookings..." /></div>}
      {bookings && visible.length === 0 && <div className="mt-4"><EmptyState title="Nothing here yet" body="Bookings you make will show up in this list." /></div>}
      <div className="mt-4 space-y-3">
        {visible.map((booking) => (
          <Link key={booking.id} href={`/customer/bookings/${booking.id}`} className="press block rounded-[22px] border border-line bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{booking.provider.name}</p>
              <StatusPill status={booking.status} label={STATUS_LABEL[booking.status]} />
            </div>
            <p className="mt-1 text-sm text-muted">{booking.service.name}</p>
            <p className="mt-1 text-xs text-muted">{formatWhen(booking.scheduledDate, booking.scheduledTime)} · {kwacha(booking.price)}</p>
          </Link>
        ))}
      </div>
    </Screen>
  );
}

export function CustomerBookingDetail({ id }: { id: string }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [cancelChoice, setCancelChoice] = useState("Change of plans");
  const [otherReason, setOtherReason] = useState("");
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewReason, setReviewReason] = useState("Poor service");
  const [comment, setComment] = useState("");
  const [route, setRoute] = useState<[number, number][]>([]);
  const [eta, setEta] = useState<number | null>(null);

  async function load() {
    const result = await api<Booking>(`/api/bookings/${id}`);
    setBooking(result);
    return result;
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load this booking. Please try again."));
  }, [id]);

  useEffect(() => {
    if (!booking || !isActiveStatus(booking.status)) return;
    const timer = window.setInterval(() => {
      load().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [booking?.status, id]);

  useEffect(() => {
    if (!booking?.providerLat || !booking.providerLng || !booking.latitude || !booking.longitude) return;
    const search = new URLSearchParams({
      fromLat: String(booking.providerLat),
      fromLng: String(booking.providerLng),
      toLat: String(booking.latitude),
      toLng: String(booking.longitude),
    });
    api<{ coordinates: [number, number][]; durationMin: number }>(`/api/geo/route?${search.toString()}`)
      .then((result) => {
        setRoute(result.coordinates);
        setEta(result.durationMin);
      })
      .catch(() => undefined);
  }, [booking?.providerLat, booking?.providerLng, booking?.latitude, booking?.longitude]);

  async function cancel() {
    const reasonText = cancelChoice === "Other" ? requiredText(otherReason, 200, "Tell us why you are cancelling.", "Reason") : "";
    if (reasonText) {
      setError(reasonText);
      return;
    }
    try {
      const reason = cancelChoice === "Other" ? otherReason.trim() : cancelChoice;
      setBooking(await api<Booking>(`/api/bookings/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }));
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to cancel this booking.");
    }
  }

  async function review() {
    const problem = requiredText(comment, 500, "Share how the service went.", "Review");
    if (problem) {
      setError(problem);
      return;
    }
    try {
      const reason = rating <= 2 ? (reviewReason === "Other" ? comment.trim() : reviewReason) : undefined;
      setBooking(await api<Booking>("/api/reviews", { method: "POST", body: JSON.stringify({ bookingId: id, rating, reason, comment }) }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save your review.");
    }
  }

  const pins = useMemo(() => {
    if (!booking) return [];
    const list = [];
    if (booking.latitude != null && booking.longitude != null) list.push({ lat: booking.latitude, lng: booking.longitude, label: "You", color: "#6f4b32" });
    if (booking.providerLat != null && booking.providerLng != null) list.push({ lat: booking.providerLat, lng: booking.providerLng, label: booking.provider.name, color: "#1e8f4e" });
    return list;
  }, [booking]);

  if (error && !booking) return <Screen><Banner>{error}</Banner></Screen>;
  if (!booking) return <Screen><LoadingBlock label="Loading booking..." /></Screen>;

  return (
    <Screen>
      <BackLink href="/customer/bookings" />
      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="font-display text-[1.8rem] leading-none">{booking.service.name}</h1>
          <p className="mt-1 text-sm text-muted">{booking.provider.name}</p>
        </div>
        <StatusPill status={booking.status} label={STATUS_LABEL[booking.status]} />
      </div>
      {error && <div className="mt-3"><Banner>{error}</Banner></div>}
      {(booking.status === "ACCEPTED" || isActiveStatus(booking.status)) && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">{booking.status === "ON_THE_WAY" ? `${booking.provider.name} is on the way` : booking.status === "ARRIVED" ? "Your provider has arrived." : STATUS_LABEL[booking.status]}{booking.status === "ON_THE_WAY" && eta ? ` · Arriving in approximately ${eta} minutes` : ""}</p>
          {pins.length > 0 ? <MapView pins={pins} route={route} height={240} /> : <Banner tone="info">The provider has not shared a live location yet.</Banner>}
        </div>
      )}
      <div className="mt-4 rounded-[22px] border border-line bg-card p-4 text-sm">
        <p>{formatWhen(booking.scheduledDate, booking.scheduledTime)}</p>
        <p className="mt-1 text-muted">{booking.addressLine}</p>
        <p className="mt-2 font-semibold text-brown">{booking.quotedPrice && booking.status === "PENDING" ? `Quoted price ${kwacha(booking.quotedPrice)}` : kwacha(booking.price)}</p>
        {booking.status === "PENDING" && !booking.quotedPrice && <p className="mt-2 text-muted">Waiting for the provider to confirm a price.</p>}
        {booking.status === "ACCEPTED" && <p className="mt-2 font-semibold">Provider found. {booking.provider.name} accepted {booking.service.name} for {kwacha(booking.price)}. Status: Accepted.</p>}
        <p className="mt-1 text-muted">Duration: {formatDuration(booking.durationMinutes)}</p>
        {booking.paymentMethod && <p className="mt-1 text-muted">Payment: {booking.paymentMethod}</p>}
        {booking.notes && <p className="mt-2 text-muted">Notes: {booking.notes}</p>}
        {booking.cancellationReason && <p className="mt-2 text-danger">{booking.cancellationReason}</p>}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Avatar src={booking.provider.avatarUrl} name={booking.provider.name} />
        <div className="flex-1">
          <p className="font-semibold">{booking.provider.name}</p>
          <Stars value={booking.provider.rating} size={12} />
        </div>
        {booking.provider.phone && <a href={`tel:${booking.provider.phone}`} className="grid h-10 w-10 place-items-center rounded-full bg-gold-soft text-brown"><Phone size={16} /></a>}
      </div>
      {booking.status === "PENDING" && booking.quotedPrice != null && (
        <div className="mt-4">
          <Button onClick={async () => {
            try {
              setBooking(await api<Booking>(`/api/bookings/${id}/confirm`, { method: "POST", body: JSON.stringify({}) }));
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Unable to accept this price.");
            }
          }}>Accept price</Button>
        </div>
      )}
      {canMessage(booking.status) && <div className="mt-4"><Link href={`/customer/messages/${booking.id}`} className="text-sm font-semibold text-brown">Message provider</Link></div>}
      {customerCanCancel(booking.status) && <div className="mt-4"><Button variant="danger" onClick={() => setOpen(true)}>Cancel booking</Button></div>}
      {booking.status === "COMPLETED" && !booking.review && (
        <div className="mt-5 rounded-[22px] border border-line bg-card p-4">
          <p className="font-display text-xl">Rate your experience</p>
          <div className="mt-3"><StarPicker value={rating} onChange={setRating} /></div>
          {rating <= 2 && (
            <select value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} className="mt-3 h-12 w-full rounded-2xl border border-line bg-card px-3 text-sm">
              {["Poor service", "Late arrival", "Poor communication", "Price issue", "Service quality", "Unprofessional behavior", "Other"].map((item) => <option key={item}>{item}</option>)}
            </select>
          )}
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={rating <= 2 ? "Tell us what went wrong" : "Share how the service went"} className="mt-3 h-24 w-full rounded-2xl border border-line p-3 text-sm outline-none" />
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
          <div className="mt-3"><Button onClick={review}>Submit review</Button></div>
        </div>
      )}
      {booking.review && <div className="mt-4"><Stars value={booking.review.rating} /><p className="mt-1 text-sm">{booking.review.comment}</p></div>}
      <Modal open={open} title="Cancel booking" onClose={() => setOpen(false)}>
        <select value={cancelChoice} onChange={(event) => setCancelChoice(event.target.value)} className="h-12 w-full rounded-2xl border border-line bg-card px-3 text-sm">
          {["Change of plans", "Booked by mistake", "Provider is late", "Found someone else", "Other"].map((item) => <option key={item}>{item}</option>)}
        </select>
        {cancelChoice === "Other" && <textarea value={otherReason} onChange={(event) => setOtherReason(event.target.value)} placeholder="Tell us why" className="mt-3 h-24 w-full rounded-2xl border border-line bg-card p-3 text-sm outline-none" />}
        {cancelChoice === "Other" && error && <p className="mt-1 text-xs text-danger">{error}</p>}
        <div className="mt-3"><Button variant="danger" onClick={cancel}>Confirm cancellation</Button></div>
      </Modal>
    </Screen>
  );
}

export function MessageList({ base }: { base: string }) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Thread[]>("/api/messages").then(setThreads).catch(() => setError("Unable to load messages. Please try again."));
  }, []);
  return (
    <Screen>
      <h1 className="font-display text-[2rem]">Messages</h1>
      <p className="mt-1 text-sm text-muted">Conversations stay with each booking.</p>
      {error && <div className="mt-4"><Banner>{error}</Banner></div>}
      {!threads && !error && <LoadingBlock label="Loading messages..." />}
      {threads && threads.length === 0 && <div className="mt-4"><EmptyState title="No messages yet" body="A conversation opens after you have a booking." /></div>}
      <div className="mt-4 space-y-2">
        {threads?.map((thread) => (
          <Link key={thread.bookingId} href={`${base}/${thread.bookingId}`} className="press flex items-center gap-3 rounded-[20px] border border-line bg-card p-3">
            <Avatar src={thread.avatarUrl} name={thread.name} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{thread.name}</span>
                {thread.unread > 0 && <span className="rounded-full bg-forest px-1.5 text-[10px] text-white">{thread.unread}</span>}
              </span>
              <span className="block truncate text-xs text-muted">{thread.service} · {thread.lastMessage}</span>
            </span>
          </Link>
        ))}
      </div>
    </Screen>
  );
}

export function ChatThread({ bookingId, back }: { bookingId: string; back: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [title, setTitle] = useState("Messages");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");

  async function load() {
    const result = await api<{ booking: { providerName: string; customerName: string; service: string }; messages: ChatMessage[] }>(`/api/messages?bookingId=${bookingId}`);
    setMessages(result.messages);
    setTitle(result.booking.service);
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load this conversation."));
    const timer = window.setInterval(() => load().catch(() => undefined), 4000);
    return () => window.clearInterval(timer);
  }, [bookingId]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const problem = messageText(body);
    if (problem) {
      setFieldError(problem);
      return;
    }
    setFieldError("");
    const text = body;
    setBody("");
    try {
      const message = await api<ChatMessage>("/api/messages", { method: "POST", body: JSON.stringify({ bookingId, body: text }) });
      setMessages((current) => [...current, message]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to send that message.");
      setBody(text);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-5 py-3">
        <BackLink href={back} />
        <p className="mt-1 font-display text-xl">{title}</p>
      </div>
      <div className="scroll-area flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {error && <Banner>{error}</Banner>}
        {messages.map((message) => (
          <div key={message.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${message.mine ? "ml-auto bg-forest text-white" : "bg-card border border-line"}`}>
            <p>{message.body}</p>
            <p className={`mt-1 text-[10px] ${message.mine ? "text-white/70" : "text-muted"}`}>{formatStamp(message.createdAt)}{message.mine && message.readAt ? " · Read" : ""}</p>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="border-t border-line p-3">
        <div className="flex gap-2">
          <input value={body} onChange={(event) => { setFieldError(""); setBody(event.target.value); }} placeholder="Write a message" className="h-11 flex-1 rounded-full border border-line bg-card px-4 text-sm outline-none" />
          <button className="btn-3d btn-3d-cta h-11 rounded-full px-4 text-sm font-semibold text-white">Send</button>
        </div>
        {fieldError && <p className="mt-1 text-xs text-danger">{fieldError}</p>}
      </form>
    </div>
  );
}

export function NotificationsScreen({ hrefBase }: { hrefBase: string }) {
  const [items, setItems] = useState<{ id: string; title: string; body: string; href: string | null; readAt: string | null; createdAt: string }[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<typeof items>("/api/notifications").then((rows) => setItems(rows)).catch(() => setError("Unable to load notifications. Please try again."));
  }, []);

  async function open(id: string, href: string | null) {
    await api("/api/notifications/read", { method: "POST", body: JSON.stringify({ id }) });
    if (href) window.location.href = href.startsWith(hrefBase) ? href : href;
  }

  return (
    <Screen>
      <BackLink href={`${hrefBase}/home`} />
      <div className="mt-4 flex items-center justify-between">
        <h1 className="font-display text-[2rem]">Notifications</h1>
        <button className="text-xs font-semibold text-brown" onClick={async () => {
          await api("/api/notifications/read", { method: "POST", body: JSON.stringify({}) });
          setItems((current) => current?.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })) ?? null);
        }}>Mark all read</button>
      </div>
      {error && <div className="mt-4"><Banner>{error}</Banner></div>}
      {!items && !error && <LoadingBlock label="Loading notifications..." />}
      {items && items.length === 0 && <div className="mt-4"><EmptyState title="No notifications" body="Booking updates and messages will appear here." /></div>}
      <div className="mt-4 space-y-2">
        {items?.map((item) => (
          <button key={item.id} onClick={() => open(item.id, item.href)} className={`block w-full rounded-[20px] border px-4 py-3 text-left ${item.readAt ? "border-line bg-card" : "border-gold bg-gold-soft/40"}`}>
            <p className="font-semibold">{item.title}</p>
            <p className="mt-1 text-sm text-muted">{item.body}</p>
            <p className="mt-1 text-[11px] text-muted">{formatStamp(item.createdAt)}</p>
          </button>
        ))}
      </div>
    </Screen>
  );
}
