"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, CalendarDays, ChevronRight, CircleHelp, Heart, LogOut, MapPin, Settings, Wallet } from "lucide-react";
import { ApiError, api, uploadImage } from "@/lib/client";
import { formatPhone } from "@/lib/phone";
import type { ProviderCard } from "@/lib/types";
import { ProviderCard as Card } from "./cards";
import { useApp } from "./shell";
import { Avatar, BackLink, Banner, Button, EmptyState, Field, LoadingBlock, Modal, PasswordField, Screen, TextInput, Verified } from "./ui";

function Row({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5">
      <span className="text-brown">{icon}</span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <ChevronRight size={16} className="text-muted" />
    </Link>
  );
}

function LogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="btn-3d btn-3d-danger mx-auto mt-4 flex h-12 w-auto min-w-36 items-center justify-center self-center gap-2 rounded-full px-8 text-sm font-semibold text-white" onClick={() => setOpen(true)}>
        <LogOut size={16} /> Log out
      </button>
      <Modal open={open} title="Log out?" onClose={() => setOpen(false)}>
        <p className="text-sm text-muted">Are you sure you want to log out?</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>No</Button>
          <Button variant="danger" loading={loading} onClick={confirm}>Yes</Button>
        </div>
      </Modal>
    </>
  );
}

export function CustomerProfile() {
  const { me } = useApp();
  return (
    <Screen>
      <div className="flex items-center gap-3">
        <Avatar src={me.avatarUrl} name={me.fullName} size={68} />
        <div>
          <h1 className="font-display text-[1.7rem] leading-none">{me.fullName}</h1>
          <p className="mt-1 text-sm text-muted">{formatPhone(me.phone)}</p>
        </div>
      </div>
      <div className="mt-5 divide-y divide-line overflow-hidden rounded-[24px] border border-line bg-card">
        <Row href="/customer/addresses" icon={<MapPin size={18} />} label="Saved addresses" />
        <Row href="/customer/payments" icon={<Wallet size={18} />} label="Payment methods" />
        <Row href="/customer/bookings" icon={<CalendarDays size={18} />} label="My bookings" />
        <Row href="/customer/favorites" icon={<Heart size={18} />} label="Favourites" />
        <Row href="/customer/notifications" icon={<Bell size={18} />} label="Notifications" />
        <Row href="/customer/help" icon={<CircleHelp size={18} />} label="Help & support" />
        <Row href="/customer/settings" icon={<Settings size={18} />} label="Settings" />
      </div>
      <LogoutButton />
    </Screen>
  );
}

export function ProviderAccount() {
  const { me } = useApp();
  const provider = me.provider;
  return (
    <Screen>
      <div className="flex items-center gap-3">
        <Avatar src={me.avatarUrl} name={provider?.businessName || me.fullName} size={68} />
        <div>
          <h1 className="font-display text-[1.6rem] leading-none">{provider?.businessName}</h1>
          <p className="text-sm text-muted">{me.fullName}</p>
          <p className="mt-1 text-sm text-muted">{formatPhone(me.phone)}</p>
          <div className="mt-1">{provider?.verificationStatus === "VERIFIED" ? <Verified /> : <span className="text-xs font-semibold text-muted">{provider?.verificationStatus === "PENDING" ? "Pending verification" : "Verification rejected"}</span>}</div>
        </div>
      </div>
      <div className="mt-5 divide-y divide-line overflow-hidden rounded-[24px] border border-line bg-card">
        <Row href="/provider/services" icon={<Settings size={18} />} label="Services & prices" />
        <Row href="/provider/portfolio" icon={<Heart size={18} />} label="Work photos" />
        <Row href="/provider/availability" icon={<CalendarDays size={18} />} label="Availability" />
        <Row href="/provider/earnings" icon={<Wallet size={18} />} label="Earnings" />
        <Row href="/provider/reviews" icon={<Heart size={18} />} label="Reviews" />
        <Row href="/provider/notifications" icon={<Bell size={18} />} label="Notifications" />
        <Row href="/provider/help" icon={<CircleHelp size={18} />} label="Help & support" />
        <Row href="/provider/settings" icon={<Settings size={18} />} label="Settings" />
      </div>
      <LogoutButton />
    </Screen>
  );
}

export function AddressesScreen() {
  const [rows, setRows] = useState<{ id: string; label: string; addressLine: string }[] | null>(null);
  const [label, setLabel] = useState("Home");
  const [addressLine, setAddressLine] = useState("");
  const [error, setError] = useState("");
  async function load() {
    setRows(await api("/api/addresses"));
  }
  useEffect(() => { load().catch(() => setError("Unable to load addresses.")); }, []);
  return (
    <Screen>
      <BackLink href="/customer/profile" />
      <h1 className="mt-3 font-display text-[1.8rem]">Saved addresses</h1>
      {error && <div className="mt-3"><Banner>{error}</Banner></div>}
      {!rows && !error && <LoadingBlock label="Loading addresses..." />}
      {rows && rows.length === 0 && <div className="mt-4"><EmptyState title="No saved addresses" body="You can save one here, or while making a booking." /></div>}
      <div className="mt-4 space-y-2">
        {rows?.map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-[20px] border border-line bg-card p-3">
            <div>
              <p className="font-semibold">{row.label}</p>
              <p className="text-xs text-muted">{row.addressLine}</p>
            </div>
            <button className="text-xs font-semibold text-danger" onClick={async () => { await api(`/api/addresses/${row.id}`, { method: "DELETE" }); load(); }}>Remove</button>
          </div>
        ))}
      </div>
      <form className="mt-5 space-y-3" onSubmit={async (event) => {
        event.preventDefault();
        try {
          await api("/api/addresses", { method: "POST", body: JSON.stringify({ label, addressLine }) });
          setAddressLine("");
          await load();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Unable to save that address.");
        }
      }}>
        <Field label="Label"><TextInput value={label} onChange={(event) => setLabel(event.target.value)} /></Field>
        <Field label="Address"><TextInput value={addressLine} onChange={(event) => setAddressLine(event.target.value)} placeholder="Kabulonga, Lusaka" /></Field>
        <Button type="submit">Save address</Button>
      </form>
    </Screen>
  );
}

export function PaymentsScreen() {
  const [rows, setRows] = useState<{ id: string; provider: string; phone: string; label: string }[] | null>(null);
  const [provider, setProvider] = useState("MTN");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  async function load() { setRows(await api("/api/payments")); }
  useEffect(() => { load().catch(() => setError("Unable to load payment methods.")); }, []);
  return (
    <Screen>
      <BackLink href="/customer/profile" />
      <h1 className="mt-3 font-display text-[1.8rem]">Payment methods</h1>
      <p className="mt-1 text-sm text-muted">Mobile money details are saved for your records. ZamServe does not charge the wallet from this screen.</p>
      {error && <div className="mt-3"><Banner>{error}</Banner></div>}
      {rows?.length === 0 && <div className="mt-4"><EmptyState title="No payment methods" body="Add MTN, Airtel, or Zamtel mobile money." /></div>}
      <div className="mt-4 space-y-2">
        {rows?.map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-[20px] border border-line bg-card p-3">
            <div>
              <p className="font-semibold">{row.provider}</p>
              <p className="text-xs text-muted">{formatPhone(row.phone)}</p>
            </div>
            <button className="text-xs font-semibold text-danger" onClick={async () => { await api(`/api/payments/${row.id}`, { method: "DELETE" }); load(); }}>Remove</button>
          </div>
        ))}
      </div>
      <form className="mt-5 space-y-3" onSubmit={async (event) => {
        event.preventDefault();
        try {
          await api("/api/payments", { method: "POST", body: JSON.stringify({ provider, phone }) });
          setPhone("");
          await load();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Unable to save that number.");
        }
      }}>
        <Field label="Network">
          <select value={provider} onChange={(event) => setProvider(event.target.value)} className="h-12 w-full rounded-2xl border border-line bg-card px-4 text-sm">
            <option>MTN</option>
            <option>Airtel</option>
            <option>Zamtel</option>
          </select>
        </Field>
        <Field label="Phone number"><TextInput value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="097..." /></Field>
        <Button type="submit">Save method</Button>
      </form>
    </Screen>
  );
}

export function FavoritesScreen() {
  const [rows, setRows] = useState<ProviderCard[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<ProviderCard[]>("/api/favorites").then(setRows).catch(() => setError("Unable to load favourites."));
  }, []);
  return (
    <Screen>
      <BackLink href="/customer/profile" />
      <h1 className="mt-3 font-display text-[1.8rem]">Favourites</h1>
      {error && <div className="mt-3"><Banner>{error}</Banner></div>}
      {!rows && !error && <LoadingBlock label="Loading favourites..." />}
      {rows && rows.length === 0 && <div className="mt-4"><EmptyState title="No favourites yet" body="Tap the heart on a provider to save them." /></div>}
      <div className="mt-4 space-y-3">{rows?.map((provider) => <Card key={provider.id} provider={provider} href={`/customer/providers/${provider.id}`} />)}</div>
    </Screen>
  );
}

export function HelpScreen({ back }: { back: string }) {
  return (
    <Screen>
      <BackLink href={back} />
      <h1 className="mt-3 font-display text-[1.8rem]">Help & support</h1>
      <div className="mt-4 space-y-3 text-sm leading-relaxed">
        <p>ZamServe connects customers in Zambia with people who offer beauty, repair, and cleaning services.</p>
        <p>Bookings stay pending until the provider accepts. You can message each other from the booking.</p>
        <p>Email hello@zamserve.co.zm or call +260 97 000 0000.</p>
      </div>
    </Screen>
  );
}

export function SettingsScreen({ back }: { back: string }) {
  const { me, refresh } = useApp();
  const [fullName, setFullName] = useState(me.fullName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/profile", { method: "PATCH", body: JSON.stringify({ fullName }) });
      await refresh();
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update your profile.");
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await api<{ message: string }>("/api/profile/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      setMessage(result.message);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to change your password.");
    }
  }

  async function photo(file?: File) {
    if (!file) return;
    try {
      const avatarUrl = await uploadImage(file);
      await api("/api/profile", { method: "PATCH", body: JSON.stringify({ avatarUrl }) });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update your photo.");
    }
  }

  return (
    <Screen>
      <BackLink href={back} />
      <h1 className="mt-3 font-display text-[1.8rem]">Settings</h1>
      {message && <div className="mt-3"><Banner tone="success">{message}</Banner></div>}
      {error && <div className="mt-3"><Banner>{error}</Banner></div>}
      <form onSubmit={saveProfile} className="mt-4 space-y-3">
        <Field label="Full name"><TextInput value={fullName} onChange={(event) => setFullName(event.target.value)} /></Field>
        <Field label="Profile photo"><input type="file" accept="image/*" onChange={(event) => photo(event.target.files?.[0])} className="text-sm" /></Field>
        <Button type="submit">Save profile</Button>
      </form>
      <form onSubmit={savePassword} className="mt-6 space-y-3">
        <Field label="Current password"><PasswordField value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></Field>
        <Field label="New password"><PasswordField value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></Field>
        <Button type="submit" variant="ghost">Change password</Button>
      </form>
    </Screen>
  );
}
