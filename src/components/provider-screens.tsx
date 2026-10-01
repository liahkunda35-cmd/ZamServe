"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bell, Briefcase, CalendarDays, ClipboardList, LayoutDashboard, LogOut, Menu, MessageCircle, MoreVertical, Navigation, Paintbrush, Plus, Scissors, Settings, Sparkles, Star, UserRound, Wallet, Wrench, X } from "lucide-react";
import { ApiError, api, uploadImage } from "@/lib/client";
import { firstName, formatStamp, formatWhen, greeting, kwacha, weekdayName } from "@/lib/format";
import { NEXT_STATUS, STATUS_LABEL, canShareLocation, providerCanCancel } from "@/lib/statuses";
import type { Booking, Category } from "@/lib/types";
import dynamic from "next/dynamic";
import { useApp } from "./shell";
import { ServiceChoices } from "./service-choices";
import { Avatar, BackLink, Banner, Button, EmptyState, Field, LoadingBlock, Modal, Screen, Stars, StatusPill, TextInput, Verified } from "./ui";

const MapView = dynamic(() => import("./map-view").then((mod) => mod.MapView), { ssr: false });

type Offering = {
  id: string;
  serviceId: string;
  name: string;
  category: string;
  categoryId: string;
  price: number;
  description: string;
  durationMinutes: number;
  isActive: boolean;
  imageUrl?: string | null;
};

type Dash = {
  todayEarnings: number;
  weekEarnings: number;
  weekJobs: number;
  totalEarnings: number;
  pendingRequests: number;
  activeJobs: number;
  completedJobs: number;
  rating: number;
  reviewCount: number;
  verificationStatus: string;
  services: Offering[];
  latestReview: { id: string; rating: number; comment: string; authorName: string } | null;
  recent: Booking[];
};

export function ProviderHome() {
  const router = useRouter();
  const { me, refresh } = useApp();
  const hello = `${greeting()}, ${firstName(me.fullName)}`;
  const [typed, setTyped] = useState("");
  const [data, setData] = useState<Dash | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Offering | null>(null);
  const [serviceMenu, setServiceMenu] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [reason, setReason] = useState("Not available");
  const [busyId, setBusyId] = useState("");

  async function load() {
    const next = await api<Dash>("/api/provider/dashboard");
    setData(next);
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load your dashboard. Please try again."));
    api<Category[]>("/api/categories").then(setCategories).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (typed.length >= hello.length) return;
    const timer = window.setTimeout(() => setTyped(hello.slice(0, typed.length + 1)), 42);
    return () => window.clearTimeout(timer);
  }, [typed, hello]);

  async function toggleJobs() {
    const next = !me.provider?.acceptingJobs;
    try {
      if (next && navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(async (position) => {
            try {
              await api("/api/profile", { method: "PATCH", body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }) });
            } catch {
              setError("Unable to save your location.");
            }
            resolve();
          }, () => {
            setError("Location permission is required for this feature. You can enable it in your device settings.");
            resolve();
          }, { enableHighAccuracy: true, timeout: 8000 });
        });
      }
      await api("/api/provider/availability", { method: "POST", body: JSON.stringify({ acceptingJobs: next }) });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update availability.");
    }
  }

  function openAdd() {
    setEditing(null);
    setEditorOpen(true);
    setMenu(false);
  }

  async function runBooking(id: string, path: string, body?: object) {
    setBusyId(id);
    setError("");
    try {
      await api(path, { method: "POST", body: JSON.stringify(body ?? {}) });
      setDeclineId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update this request.");
    } finally {
      setBusyId("");
    }
  }

  async function confirmLogout() {
    setLoggingOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.replace("/");
    } finally {
      setLoggingOut(false);
    }
  }

  const online = Boolean(me.provider?.acceptingJobs);
  const requests = data?.recent.filter((booking) => booking.status === "PENDING") ?? [];
  const active = data?.recent.find((booking) => booking.status !== "PENDING");
  const activeNext = active ? NEXT_STATUS[active.status] : undefined;

  return (
    <Screen>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[1.85rem] leading-tight">{typed}{typed.length < hello.length ? <span className="ml-0.5 inline-block w-px animate-pulse bg-brown">|</span> : null}</h1>
          {me.provider?.verificationStatus === "VERIFIED" ? <Verified /> : <p className="text-xs font-semibold text-muted">Your account is under review.</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/provider/notifications" aria-label="Notifications" className="relative grid h-11 w-11 place-items-center rounded-full border border-line bg-card">
            <Bell size={18} />
            {me.unreadNotifications > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-gold" />}
          </Link>
          <Link href="/provider/profile" aria-label="Profile"><Avatar src={me.avatarUrl} name={me.fullName} size={42} /></Link>
          <button type="button" aria-label="Open menu" onClick={() => setMenu(true)} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-card text-brown">
            <Menu size={20} />
          </button>
        </div>
      </div>

      <button type="button" onClick={toggleJobs} className="mt-5 flex w-full items-center gap-3 rounded-[22px] bg-card px-4 py-3.5 text-left shadow-[0_8px_22px_rgba(111,75,50,0.06)]">
        <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${online ? "bg-success" : "bg-muted"}`} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{online ? "You're online" : "You're offline"}</span>
          <span className="block text-xs text-muted">{online ? "You're currently accepting new service requests." : "You are currently offline and will not receive new service requests."}</span>
        </span>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold text-white ${online ? "bg-success" : "bg-muted"}`}>{online ? "ON" : "OFF"}</span>
      </button>

      {error && <div className="mt-4"><Banner>{error}</Banner></div>}
      {!data && !error && <div className="mt-5"><LoadingBlock label="Loading dashboard..." /></div>}
      {data && (
        <>
          <h2 className="mb-2 mt-6 font-display text-xl">Today's overview</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Overview href="/provider/bookings?tab=requests" label="Requests" value={String(data.pendingRequests)} />
            <Overview href="/provider/bookings?tab=active" label="Active" value={String(data.activeJobs)} />
            <Overview href="/provider/earnings" label="Earnings" value={kwacha(data.todayEarnings)} />
            <Overview href="/provider/reviews" label="Rating" value={`${data.rating.toFixed(1)} ★`} />
          </div>

          <div className="mb-2 mt-7 flex items-end justify-between">
            <h2 className="font-display text-xl">My services</h2>
            <button type="button" onClick={openAdd} className="text-sm font-semibold text-brown">+ Add service</button>
          </div>
          {data.services.length === 0 && <p className="text-sm text-muted">Add every service you offer. One account can hold all of them.</p>}
          <div className="space-y-3">
            {data.services.map((service) => {
              const mark = serviceMark(service.name, service.category);
              return (
                <div key={service.id} className="flex items-center gap-3 border-b border-line/80 py-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl" style={{ background: mark.bg, color: mark.color }}>
                    {service.imageUrl ? <img src={service.imageUrl} alt="" className="h-full w-full object-cover" /> : <mark.icon size={20} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{service.name}</p>
                    <p className="text-xs text-muted">From {kwacha(service.price)} · {service.category}</p>
                    <p className="text-[11px] text-muted">{service.isActive ? "Listed" : "Paused"}</p>
                  </div>
                  <button type="button" className="text-xs font-semibold text-brown" onClick={() => { setEditing(service); setEditorOpen(true); setServiceMenu(null); }}>Edit</button>
                  <div className="relative">
                    <button type="button" aria-label={`More options for ${service.name}`} className="grid h-8 w-8 place-items-center text-muted" onClick={() => setServiceMenu((current) => current === service.id ? null : service.id)}>
                      <MoreVertical size={16} />
                    </button>
                    {serviceMenu === service.id && (
                      <div className="absolute right-0 top-8 z-10 w-36 rounded-2xl border border-line bg-card p-1 shadow-lg">
                        <button type="button" className="block w-full rounded-xl px-3 py-2 text-left text-sm" onClick={async () => {
                          setServiceMenu(null);
                          try {
                            await api(`/api/provider/services/${service.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !service.isActive }) });
                            await load();
                          } catch (err) {
                            setError(err instanceof ApiError ? err.message : "Unable to update that service.");
                          }
                        }}>{service.isActive ? "Pause" : "Activate"}</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={openAdd} className="mt-3 text-sm font-semibold text-brown">+ Add another service</button>

          <div className="mb-2 mt-7 flex items-end justify-between">
            <h2 className="font-display text-xl">New requests</h2>
            <Link href="/provider/bookings?tab=requests" className="text-sm font-semibold text-brown">See all</Link>
          </div>
          {requests.length === 0 && <p className="text-sm text-muted">New requests appear here when a customer books one of your services.</p>}
          <div className="space-y-4">
            {requests.map((booking) => {
              const away = distanceKm(me.provider?.latitude, me.provider?.longitude, booking.latitude, booking.longitude);
              return (
                <article key={booking.id} className="border-b border-line/80 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{booking.service.name} request</p>
                      <p className="mt-1 text-sm text-muted">Customer: {booking.customer.name}</p>
                      <p className="text-sm text-muted">Location: {booking.addressLine}</p>
                      {booking.notes && <p className="text-sm text-muted">Note: {booking.notes}</p>}
                      <p className="mt-1 text-sm font-semibold text-brown">{booking.quotedPrice ? `Quoted ${kwacha(booking.quotedPrice)}` : kwacha(booking.price)}</p>
                      {away != null && <p className="text-xs text-muted">{away} km away</p>}
                    </div>
                    <StatusPill status={booking.status} label={booking.quotedPrice ? "Price sent" : STATUS_LABEL[booking.status]} />
                  </div>
                  {booking.quotedPrice && <p className="mt-2 text-xs text-muted">Waiting for the customer to confirm this price.</p>}
                  {declineId === booking.id && (
                    <label className="mt-3 block text-xs font-semibold text-muted">
                      Decline reason
                      <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-line bg-card px-3 text-sm text-ink">
                        {["Too far away", "Not available", "Service unavailable", "Price disagreement", "Other"].map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </label>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="ghost" disabled={busyId === booking.id} onClick={() => declineId === booking.id ? runBooking(booking.id, `/api/bookings/${booking.id}/reject`, { reason }) : setDeclineId(booking.id)}>Decline</Button>
                    <Button variant="success" disabled={busyId === booking.id} onClick={() => runBooking(booking.id, `/api/bookings/${booking.id}/accept`, { price: booking.quotedPrice || booking.price })}>{booking.quotedPrice ? "Update price" : "Accept"}</Button>
                  </div>
                </article>
              );
            })}
          </div>

          {active && (
            <section className="mt-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Active job</p>
              <h2 className="mt-1 font-display text-2xl leading-none">{active.customer.name}</h2>
              <p className="mt-1 text-sm">{active.service.name}</p>
              <p className="mt-1 text-sm text-muted">{active.addressLine}</p>
              {distanceKm(me.provider?.latitude, me.provider?.longitude, active.latitude, active.longitude) != null && (
                <p className="mt-1 text-sm text-muted">{distanceKm(me.provider?.latitude, me.provider?.longitude, active.latitude, active.longitude)} km away</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href={`/provider/bookings/${active.id}`} className="btn-3d btn-3d-light flex h-12 items-center justify-center rounded-full text-sm font-semibold">View location</Link>
                {activeNext && <Button disabled={busyId === active.id} onClick={() => runBooking(active.id, `/api/bookings/${active.id}/status`, { status: activeNext.status })}>{activeNext.label}</Button>}
              </div>
            </section>
          )}

          <div className="mb-1 mt-8 flex items-end justify-between">
            <h2 className="font-display text-xl">Earnings</h2>
            <Link href="/provider/earnings" className="text-sm font-semibold text-brown">View earnings</Link>
          </div>
          <p className="text-xs text-muted">This week</p>
          <p className="font-display text-3xl">{kwacha(data.weekEarnings)}</p>
          <p className="text-sm text-muted">{data.weekJobs} completed {data.weekJobs === 1 ? "job" : "jobs"}</p>

          <div className="mb-2 mt-8 flex items-end justify-between">
            <h2 className="font-display text-xl">Recent reviews</h2>
            <Link href="/provider/reviews" className="text-sm font-semibold text-brown">See all</Link>
          </div>
          <p className="text-sm font-semibold">{data.rating.toFixed(1)} overall · {data.reviewCount} {data.reviewCount === 1 ? "review" : "reviews"}</p>
          <Stars value={data.rating} />
          {data.latestReview ? (
            <p className="mt-2 text-sm text-muted">“{data.latestReview.comment || "Rated this job."}” <span className="text-ink">— {data.latestReview.authorName}</span></p>
          ) : (
            <p className="mt-2 text-sm text-muted">Customers can review you after a completed job.</p>
          )}
        </>
      )}

      <ServiceEditor
        open={editorOpen}
        editing={editing}
        categories={categories}
        onClose={() => setEditorOpen(false)}
        onSaved={async () => {
          setEditorOpen(false);
          await load();
        }}
      />
      <Modal open={logoutOpen} title="Log out?" onClose={() => setLogoutOpen(false)}>
        <p className="text-sm text-muted">Are you sure you want to log out?</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setLogoutOpen(false)}>No</Button>
          <Button variant="danger" loading={loggingOut} onClick={confirmLogout}>Yes</Button>
        </div>
      </Modal>
      {menu && <ProviderMenu onClose={() => setMenu(false)} onAdd={openAdd} onLogout={() => { setMenu(false); setLogoutOpen(true); }} unread={me.unreadMessages} />}
    </Screen>
  );
}

function Overview({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link href={href} className="block">
      <p className="font-display text-[1.65rem] leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </Link>
  );
}

function ProviderMenu({ onClose, onAdd, onLogout, unread }: { onClose: () => void; onAdd: () => void; onLogout: () => void; unread: number }) {
  const items = [
    { href: "/provider/home", label: "Dashboard", icon: LayoutDashboard },
    { href: "/provider/bookings?tab=requests", label: "Requests", icon: ClipboardList },
    { href: "/provider/services", label: "My Services", icon: Wrench },
    { href: "/provider/bookings", label: "Bookings", icon: CalendarDays },
    { href: "/provider/earnings", label: "Earnings", icon: Wallet },
    { href: "/provider/messages", label: "Messages", icon: MessageCircle },
    { href: "/provider/reviews", label: "Reviews & Ratings", icon: Star },
    { href: "/provider/profile", label: "Profile", icon: UserRound },
    { href: "/provider/settings", label: "Settings", icon: Settings },
  ];
  return (
    <div className="fixed inset-y-0 left-1/2 z-[60] w-full max-w-[430px] -translate-x-1/2">
      <button type="button" aria-label="Close menu" className="absolute inset-0 bg-[#3a2a1c]/35" onClick={onClose} />
      <nav className="menu-in absolute inset-y-0 right-0 flex w-[82%] flex-col bg-card px-4 pb-6 pt-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="font-display text-2xl">Menu</p>
          <button type="button" aria-label="Close menu" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-brown"><X size={18} /></button>
        </div>
        <div className="mt-3 flex-1 space-y-0.5 overflow-y-auto">
          {items.slice(0, 3).map((item) => (
            <Link key={item.label} href={item.href} onClick={onClose} className="flex min-h-11 items-center gap-3 rounded-2xl px-2 text-sm font-semibold">
              <item.icon size={18} className="text-brown" />
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}
          <button type="button" onClick={onAdd} className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-2 text-left text-sm font-semibold">
            <Plus size={18} className="text-brown" /> Add a Service
          </button>
          {items.slice(3).map((item) => (
            <Link key={item.label} href={item.href} onClick={onClose} className="flex min-h-11 items-center gap-3 rounded-2xl px-2 text-sm font-semibold">
              <item.icon size={18} className="text-brown" />
              <span className="flex-1">{item.label}</span>
              {item.label === "Messages" && unread > 0 && <span className="rounded-full bg-brown px-2 py-0.5 text-[10px] text-white">{unread}</span>}
            </Link>
          ))}
          <button type="button" onClick={onLogout} className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-2 text-left text-sm font-semibold text-danger">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>
    </div>
  );
}

function serviceMark(name: string, category: string) {
  const text = `${name} ${category}`.toLowerCase();
  if (text.includes("nail")) return { icon: Sparkles, bg: "#f8e4ea", color: "#9a4a62" };
  if (text.includes("hair") || text.includes("braid") || text.includes("barber") || text.includes("cut")) return { icon: Scissors, bg: "#f4e6c4", color: "#6f4b32" };
  if (text.includes("clean")) return { icon: Sparkles, bg: "#e5f6ec", color: "#1e8f4e" };
  if (text.includes("repair") || text.includes("plumb") || text.includes("electric") || text.includes("handy")) return { icon: Wrench, bg: "#e7eef6", color: "#3d5f8a" };
  if (text.includes("makeup") || text.includes("beauty") || text.includes("salon") || text.includes("paint")) return { icon: Paintbrush, bg: "#f8e7d8", color: "#a15c38" };
  return { icon: Briefcase, bg: "#f4e6c4", color: "#6f4b32" };
}

function ServiceEditor({ open, editing, categories, onClose, onSaved }: {
  open: boolean;
  editing: Offering | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [newName, setNewName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [section, setSection] = useState<"" | "barbershop" | "salon">("");
  const [addingNew, setAddingNew] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setAddingNew(false);
    setSection("");
    setNewName("");
    if (editing) {
      setCategoryId(editing.categoryId);
      setServiceId(editing.serviceId);
      setPrice(String(editing.price));
      setDescription(editing.description);
      setDuration(String(editing.durationMinutes));
      setImageUrl(editing.imageUrl ?? null);
    } else {
      setCategoryId("");
      setServiceId("");
      setPrice("");
      setDescription("");
      setDuration("60");
      setImageUrl(null);
    }
  }, [open, editing]);

  const chosenCategory = categories.find((category) => category.id === categoryId);
  const beauty = chosenCategory?.slug === "beauty-cosmetics";
  const services = (chosenCategory?.services ?? []).filter((service) => {
    if (!beauty) return true;
    if (!section) return false;
    return service.section === section || service.section === "both";
  });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!editing && addingNew && newName.trim().length < 2) {
      setError("Enter the new service name.");
      return;
    }
    if (!editing && !addingNew && !serviceId) {
      setError("Choose a listed service, or add a different name.");
      return;
    }
    if (!price) {
      setError("Enter a price in kwacha.");
      return;
    }
    try {
      if (editing) {
        await api(`/api/provider/services/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ price: Number(price), description, durationMinutes: Number(duration), isActive: editing.isActive, imageUrl }),
        });
      } else {
        await api("/api/provider/services", {
          method: "POST",
          body: JSON.stringify({
            categoryId,
            serviceId: addingNew ? undefined : serviceId || undefined,
            newServiceName: addingNew ? newName : undefined,
            price: Number(price),
            description,
            durationMinutes: Number(duration),
            imageUrl,
          }),
        });
      }
      onSaved(editing ? "Service updated." : "Service added.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save that service.");
    }
  }

  return (
    <Modal open={open} title={editing ? "Edit service" : "Add new service"} onClose={onClose}>
      <form onSubmit={save} className="max-h-[68vh] space-y-3 overflow-y-auto pr-1">
        {error && <Banner>{error}</Banner>}
        {!editing && (
          <>
            <p className="text-sm text-muted">Choose a category and a service. You can add as many as you offer on this same account.</p>
            <Field label="Service category">
              <div className="relative">
                <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setServiceId(""); setSection(""); setAddingNew(false); }} className="h-12 w-full appearance-none rounded-2xl border border-line bg-card px-4 pr-10 text-sm outline-none">
                  <option value="">Choose a category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-brown">▼</span>
              </div>
            </Field>
            {beauty && (
              <Field label="Barbershop or Salon">
                <div className="relative">
                  <select value={section} onChange={(event) => { setSection(event.target.value as "" | "barbershop" | "salon"); setServiceId(""); }} className="h-12 w-full appearance-none rounded-2xl border border-line bg-card px-4 pr-10 text-sm outline-none">
                    <option value="">Choose where you work</option>
                    <option value="barbershop">Barbershop</option>
                    <option value="salon">Salon</option>
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-brown">▼</span>
                </div>
              </Field>
            )}
            {(!beauty || section) && !addingNew && (
              <Field label="Specific service">
                <div className="relative">
                  <select value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="h-12 w-full appearance-none rounded-2xl border border-line bg-card px-4 pr-10 text-sm outline-none">
                    <option value="">Choose a service</option>
                    {beauty ? services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>) : <ServiceChoices services={services} />}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-brown">▼</span>
                </div>
              </Field>
            )}
            <button type="button" className="text-left text-sm font-semibold text-brown" onClick={() => { setAddingNew((value) => !value); setServiceId(""); }}>{addingNew ? "Choose a listed service instead" : "Add a different service name"}</button>
            {addingNew && <Field label="New service name"><TextInput value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Only if it is not listed" /></Field>}
          </>
        )}
        <Field label="Price (K)"><TextInput value={price} onChange={(event) => setPrice(event.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="150" /></Field>
        <Field label="Description"><TextInput value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe your service..." /></Field>
        <Field label="Duration in minutes"><TextInput value={duration} onChange={(event) => setDuration(event.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" /></Field>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted">Service photo</p>
          <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-card px-3 py-2">
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-gold-soft text-brown">
              {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <Plus size={18} />}
            </span>
            <span className="text-sm font-semibold">{uploading ? "Uploading..." : imageUrl ? "Photo added" : "+ Upload photo"}</span>
            <input type="file" accept="image/*" className="sr-only" onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setUploading(true);
              setError("");
              try {
                setImageUrl(await uploadImage(file));
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "Unable to upload that photo.");
              } finally {
                setUploading(false);
              }
            }} />
          </label>
        </div>
        <Button type="submit" disabled={uploading}>{editing ? "Save changes" : "Add service"}</Button>
        {editing && <Button type="button" variant="danger" onClick={async () => {
          try {
            const result = await api<{ message: string }>(`/api/provider/services/${editing.id}`, { method: "DELETE" });
            onSaved(result.message);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Unable to remove that service.");
          }
        }}>Remove service</Button>}
      </form>
    </Modal>
  );
}

export function ProviderServices() {
  const [rows, setRows] = useState<Offering[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Offering | null>(null);

  async function load() {
    setRows(await api<Offering[]>("/api/provider/services"));
  }
  useEffect(() => {
    Promise.all([load(), api<Category[]>("/api/categories").then(setCategories)]).catch(() => setError("Unable to load your services."));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Offering[]>();
    rows?.forEach((row) => {
      map.set(row.category, [...(map.get(row.category) ?? []), row]);
    });
    return [...map.entries()];
  }, [rows]);

  return (
    <Screen>
      <BackLink href="/provider/profile" />
      <div className="mt-4 flex items-center justify-between">
        <h1 className="font-display text-[1.8rem]">My services & prices</h1>
        <button className="btn-3d btn-3d-cta rounded-full px-3 py-2 text-xs font-semibold text-white" onClick={() => { setEditing(null); setOpen(true); }}>+ Add service</button>
      </div>
      {message && <div className="mt-3"><Banner tone="success">{message}</Banner></div>}
      {error && <div className="mt-3"><Banner>{error}</Banner></div>}
      {!rows && !error && <LoadingBlock label="Loading services..." />}
      {rows && rows.length === 0 && <div className="mt-4"><EmptyState title="No services yet" body="Add a service so customers can book you." /></div>}
      <div className="mt-4 space-y-4">
        {grouped.map(([category, items]) => (
          <section key={category}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{category}</p>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-[20px] border border-line bg-card px-3 py-3">
                  {item.imageUrl && <img src={item.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-muted">{item.durationMinutes} min · {item.isActive ? "Active" : "Paused"}</p>
                  </div>
                  <p className="font-semibold text-brown">{kwacha(item.price)}</p>
                  <button className="text-xs font-semibold text-brown" onClick={() => { setEditing(item); setOpen(true); }}>Edit</button>
                  <button className="text-xs font-semibold text-muted" onClick={async () => {
                    setRows(await api<Offering[]>(`/api/provider/services/${item.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !item.isActive }) }));
                  }}>{item.isActive ? "Pause" : "Activate"}</button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <ServiceEditor open={open} editing={editing} categories={categories} onClose={() => setOpen(false)} onSaved={async (note) => {
        setMessage(note);
        setOpen(false);
        await load();
      }} />
    </Screen>
  );
}

export function ProviderBookings() {
  const params = useSearchParams();
  const requested = params.get("tab");
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [tab, setTab] = useState(requested === "active" || requested === "history" ? requested : "requests");
  const [error, setError] = useState("");
  useEffect(() => {
    if (requested === "requests" || requested === "active" || requested === "history") setTab(requested);
  }, [requested]);
  useEffect(() => { api<Booking[]>("/api/bookings").then(setRows).catch(() => setError("Unable to load bookings.")); }, []);
  const groups: Record<string, string[]> = {
    requests: ["PENDING"],
    active: ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"],
    history: ["COMPLETED", "CANCELLED", "REJECTED"],
  };
  const visible = rows?.filter((row) => groups[tab].includes(row.status)) ?? [];
  return (
    <Screen>
      <h1 className="font-display text-[2rem]">Bookings</h1>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {([
          ["requests", "Requests"],
          ["active", "Active"],
          ["history", "History"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`min-h-11 rounded-full px-2 text-sm font-semibold ${tab === id ? "bg-brown text-white" : "border border-line bg-card text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <div className="mt-3"><Banner>{error}</Banner></div>}
      {!rows && !error && <LoadingBlock label="Loading bookings..." />}
      {rows && visible.length === 0 && (
        <div className="mt-4">
          <EmptyState
            title="Nothing in this list"
            body={
              tab === "active"
                ? "Jobs you are working on show up here."
                : tab === "history"
                  ? "Finished, declined, and cancelled jobs show up here."
                  : "New requests show up here when customers book your services."
            }
          />
        </div>
      )}
      <div className="mt-4 space-y-2">
        {visible.map((booking) => (
          <Link key={booking.id} href={`/provider/bookings/${booking.id}`} className="press block rounded-[20px] border border-line bg-card p-3">
            <div className="flex justify-between gap-2"><p className="font-semibold">{booking.service.name}</p><StatusPill status={booking.status} label={STATUS_LABEL[booking.status]} /></div>
            <p className="text-xs text-muted">{booking.customer.name} · {formatWhen(booking.scheduledDate, booking.scheduledTime)} · {kwacha(booking.price)}</p>
          </Link>
        ))}
      </div>
    </Screen>
  );
}

export function ProviderJob({ id }: { id: string }) {
  const { me } = useApp();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("Too far away");
  const [quote, setQuote] = useState("");
  const [sharing, setSharing] = useState(false);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [eta, setEta] = useState<number | null>(null);

  async function load() {
    setBooking(await api<Booking>(`/api/bookings/${id}`));
  }
  useEffect(() => { load().catch(() => setError("Unable to load this request.")); }, [id]);

  useEffect(() => {
    if (!sharing || !booking || !canShareLocation(booking.status)) return;
    const watch = navigator.geolocation.watchPosition(async (position) => {
      try {
        setBooking(await api(`/api/bookings/${id}/location`, {
          method: "POST",
          body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        }));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Unable to share your location.");
      }
    }, () => setError("Location permission is required for this feature. You can enable it in your device settings."), { enableHighAccuracy: true, maximumAge: 4000 });
    return () => navigator.geolocation.clearWatch(watch);
  }, [sharing, booking?.status, id]);

  useEffect(() => {
    if (!booking?.latitude || !booking.longitude || !booking.providerLat || !booking.providerLng) return;
    const search = new URLSearchParams({
      fromLat: String(booking.providerLat),
      fromLng: String(booking.providerLng),
      toLat: String(booking.latitude),
      toLng: String(booking.longitude),
    });
    api<{ coordinates: [number, number][]; durationMin: number }>(`/api/geo/route?${search}`).then((result) => {
      setRoute(result.coordinates);
      setEta(result.durationMin);
    }).catch(() => undefined);
  }, [booking?.providerLat, booking?.providerLng, booking?.latitude, booking?.longitude]);

  async function act(path: string, body?: object) {
    try {
      setBooking(await api(path, { method: "POST", body: JSON.stringify(body ?? {}) }));
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update this booking.");
    }
  }

  if (!booking && error) return <Screen><Banner>{error}</Banner></Screen>;
  if (!booking) return <Screen><LoadingBlock label="Loading request..." /></Screen>;
  const next = NEXT_STATUS[booking.status];
  const pins = [
    ...(booking.latitude != null && booking.longitude != null ? [{ lat: booking.latitude, lng: booking.longitude, label: "Customer", color: "#6f4b32" }] : []),
    ...(booking.providerLat != null && booking.providerLng != null ? [{ lat: booking.providerLat, lng: booking.providerLng, label: "You", color: "#1e8f4e" }] : []),
  ];
  const maps = booking.latitude != null && booking.longitude != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${booking.latitude},${booking.longitude}`
    : null;

  return (
    <Screen>
      <BackLink href="/provider/bookings" />
      <div className="mt-3 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{booking.status === "PENDING" ? "Booking request" : "Active job"}</p>
          <h1 className="font-display text-[1.8rem] leading-none">{booking.service.name}</h1>
        </div>
        <StatusPill status={booking.status} label={STATUS_LABEL[booking.status]} />
      </div>
      {error && <div className="mt-3"><Banner>{error}</Banner></div>}
      <div className="mt-4 flex items-center gap-3 rounded-[22px] border border-line bg-card p-3">
        <Avatar src={booking.customer.avatarUrl} name={booking.customer.name} />
        <div>
          <p className="font-semibold">{booking.customer.name}</p>
          {booking.customer.phone && <a className="text-sm text-brown" href={`tel:${booking.customer.phone}`}>{booking.customer.phone}</a>}
        </div>
      </div>
      <div className="mt-3 rounded-[22px] border border-line bg-card p-4 text-sm">
        <p>{formatWhen(booking.scheduledDate, booking.scheduledTime)}</p>
        <p className="mt-1">{booking.addressLine}</p>
        <p className="mt-2 font-semibold text-brown">{booking.quotedPrice ? `Quoted ${kwacha(booking.quotedPrice)}` : kwacha(booking.price)}</p>
        {booking.notes && <p className="mt-2 text-muted">Notes: {booking.notes}</p>}
        {distanceKm(me.provider?.latitude, me.provider?.longitude, booking.latitude, booking.longitude) != null && (
          <p className="mt-2 text-muted">{distanceKm(me.provider?.latitude, me.provider?.longitude, booking.latitude, booking.longitude)} km away</p>
        )}
      </div>
      {booking.status !== "PENDING" && booking.status !== "REJECTED" && booking.status !== "CANCELLED" && (
        <div className="mt-4 space-y-3">
          {pins.length > 0 && <MapView pins={pins} route={route} height={230} />}
          {eta && <p className="text-sm text-muted">Estimated travel time about {eta} min. This comes from the routing service, not a simulated drive.</p>}
          {maps && <a href={maps} target="_blank" className="btn-3d btn-3d-cta flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white"><Navigation size={16} /> Navigate to customer</a>}
          {canShareLocation(booking.status) && (
            <Button variant={sharing ? "success" : "ghost"} onClick={() => setSharing((value) => !value)}>{sharing ? "Sharing live location" : "Share my live location"}</Button>
          )}
          {next && <Button onClick={() => act(`/api/bookings/${id}/status`, { status: next.status })}>{next.label}</Button>}
        </div>
      )}
      <div className="mt-3"><Link href={`/provider/messages/${id}`} className="text-sm font-semibold text-brown">Message customer</Link></div>
      {booking.status === "PENDING" && (
        <div className="mt-4 space-y-3">
          <Field label="Your price (K)">
            <TextInput value={quote} onChange={(event) => setQuote(event.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder={String(booking.price)} />
          </Field>
          <Button variant="success" onClick={() => act(`/api/bookings/${id}/accept`, { price: Number(quote || booking.price) })}>{booking.quotedPrice ? "Update price" : "Send price"}</Button>
          <Field label="Decline reason">
            <select value={reason} onChange={(event) => setReason(event.target.value)} className="h-12 w-full rounded-2xl border border-line bg-card px-3 text-sm">
              {["Too far away", "Not available", "Service unavailable", "Price disagreement", "Other"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Button variant="danger" onClick={() => act(`/api/bookings/${id}/reject`, { reason })}>Decline request</Button>
        </div>
      )}
      {providerCanCancel(booking.status) && (
        <div className="mt-3">
          <Button variant="ghost" onClick={() => act(`/api/bookings/${id}/cancel`, { reason: reason || "Provider cancelled" })}>Cancel job</Button>
        </div>
      )}
      {booking.providerLocationAt && <p className="mt-2 text-[11px] text-muted">Last location update {formatStamp(booking.providerLocationAt)}</p>}
    </Screen>
  );
}

function distanceKm(fromLat?: number | null, fromLng?: number | null, toLat?: number | null, toLng?: number | null) {
  if (fromLat == null || fromLng == null || toLat == null || toLng == null) return null;
  const radius = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((fromLat * Math.PI) / 180) * Math.cos((toLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

export function EarningsScreen() {
  const [data, setData] = useState<{
    total: number; today: number; week: number; month: number; completedJobs: number; pending: number; cancelledJobs: number;
    transactions: { id: string; amount: number; status: string; service: string; customer: string; date: string }[];
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<NonNullable<typeof data>>("/api/earnings").then(setData).catch(() => setError("Unable to load earnings.")); }, []);
  return (
    <Screen>
      <h1 className="font-display text-[2rem]">Earnings</h1>
      {error && <div className="mt-3"><Banner>{error}</Banner></div>}
      {!data && !error && <LoadingBlock label="Loading earnings..." />}
      {data && (
        <>
          <p className="mt-2 font-display text-4xl">{kwacha(data.total)}</p>
          <p className="text-xs text-muted">Total from completed bookings</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {[["Today", data.today], ["This week", data.week], ["This month", data.month], ["Pending", data.pending]].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-line bg-card p-3">
                <p className="text-xs text-muted">{label}</p>
                <p className="font-semibold">{kwacha(Number(value))}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">{data.completedJobs} completed · {data.cancelledJobs} cancelled or declined</p>
          <h2 className="mb-2 mt-5 font-display text-xl">Transactions</h2>
          {data.transactions.length === 0 && <EmptyState title="No transactions yet" body="Completed jobs will add earnings here." />}
          <div className="space-y-2">
            {data.transactions.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-[18px] border border-line bg-card px-3 py-3 text-sm">
                <div>
                  <p className="font-semibold">{item.service}</p>
                  <p className="text-xs text-muted">{item.customer} · {item.date} · {item.status.toLowerCase()}</p>
                </div>
                <p className="font-semibold">{kwacha(item.amount)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}

export function ReviewsScreen() {
  const [data, setData] = useState<{ rating: number; reviewCount: number; buckets: { stars: number; count: number }[]; reviews: { id: string; rating: number; comment: string; authorName: string; service: string; createdAt: string }[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<NonNullable<typeof data>>("/api/provider/reviews").then(setData).catch(() => setError("Unable to load reviews.")); }, []);
  return (
    <Screen>
      <BackLink href="/provider/profile" />
      <h1 className="mt-3 font-display text-[1.8rem]">Reviews</h1>
      {error && <div className="mt-3"><Banner>{error}</Banner></div>}
      {!data && !error && <LoadingBlock label="Loading reviews..." />}
      {data && (
        <>
          <p className="mt-2 font-display text-4xl">{data.rating.toFixed(1)}</p>
          <p className="text-xs text-muted">{data.reviewCount} reviews</p>
          <div className="mt-4 space-y-2">
            {data.reviews.length === 0 && <EmptyState title="No reviews yet" body="Customers can review you after a completed job." />}
            {data.reviews.map((review) => (
              <div key={review.id} className="rounded-[20px] border border-line bg-card p-3">
                <p className="font-semibold">{review.authorName} · {review.rating}★</p>
                <p className="text-xs text-muted">{review.service}</p>
                {review.comment && <p className="mt-1 text-sm">{review.comment}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}

export function AvailabilityScreen() {
  const [days, setDays] = useState<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[]>("/api/provider/availability").then((rows) => {
      setDays(Array.from({ length: 7 }, (_, dayOfWeek) => rows.find((row) => row.dayOfWeek === dayOfWeek) ?? { dayOfWeek, startTime: "08:00", endTime: "18:00", isActive: dayOfWeek !== 0 }));
    }).catch(() => setError("Unable to load availability."));
  }, []);
  return (
    <Screen>
      <BackLink href="/provider/profile" />
      <h1 className="mt-3 font-display text-[1.8rem]">Availability</h1>
      {message && <div className="mt-3"><Banner tone="success">{message}</Banner></div>}
      {error && <div className="mt-3"><Banner>{error}</Banner></div>}
      <div className="mt-4 space-y-2">
        {days.map((day) => (
          <div key={day.dayOfWeek} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-2xl border border-line bg-card px-3 py-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={day.isActive} onChange={(event) => setDays((current) => current.map((item) => item.dayOfWeek === day.dayOfWeek ? { ...item, isActive: event.target.checked } : item))} />
              {weekdayName(day.dayOfWeek)}
            </label>
            <input type="time" value={day.startTime} onChange={(event) => setDays((current) => current.map((item) => item.dayOfWeek === day.dayOfWeek ? { ...item, startTime: event.target.value } : item))} className="rounded-xl border border-line px-2 py-1 text-xs" />
            <input type="time" value={day.endTime} onChange={(event) => setDays((current) => current.map((item) => item.dayOfWeek === day.dayOfWeek ? { ...item, endTime: event.target.value } : item))} className="rounded-xl border border-line px-2 py-1 text-xs" />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Button onClick={async () => {
          try {
            await api("/api/provider/availability", { method: "PUT", body: JSON.stringify({ days }) });
            setMessage("Availability saved.");
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Unable to save availability.");
          }
        }}>Save availability</Button>
      </div>
    </Screen>
  );
}
