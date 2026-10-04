"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, CalendarDays, ChevronRight, CircleHelp, Heart, LogOut, MapPin, Settings, Wallet } from "lucide-react";
import { ApiError, api, uploadImage } from "@/lib/client";
import { formatPhone } from "@/lib/phone";
import type { ProviderCard } from "@/lib/types";
import { imageFileProblem, personName, phoneLocal, requiredText, visaLast4 } from "@/lib/validate";
import { ProviderCard as Card } from "./cards";
import { useApp } from "./shell";
import { Gate, useFormGate } from "./form-gate";
import { Avatar, BackLink, Banner, Button, EmptyState, Field, LoadingBlock, Modal, PhoneField, Screen, TextInput, Verified } from "./ui";

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
  const [workPhotos, setWorkPhotos] = useState(false);
  useEffect(() => {
    api<{ categorySlug?: string }[]>("/api/provider/services")
      .then((rows) => setWorkPhotos(rows.some((row) => row.categorySlug === "beauty-cosmetics")))
      .catch(() => setWorkPhotos(false));
  }, []);
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
        {workPhotos && <Row href="/provider/portfolio" icon={<Heart size={18} />} label="Work photos" />}
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
  const gate = useFormGate([
    { id: "label", message: requiredText(label, 40, "Enter a label for this address.", "Label") },
    { id: "address", message: requiredText(addressLine, 160, "Enter the address.", "Address") },
  ]);
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
        if (gate.blockSubmit()) return;
        try {
          await api("/api/addresses", { method: "POST", body: JSON.stringify({ label, addressLine }) });
          setAddressLine("");
          await load();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Unable to save that address.");
        }
      }}>
        <Gate id="label" gate={gate}><Field label="Label" error={gate.error("label")}><TextInput value={label} onChange={(event) => setLabel(event.target.value)} {...gate.input("label")} /></Field></Gate>
        <Gate id="address" gate={gate}><Field label="Address" error={gate.error("address")}><TextInput value={addressLine} onChange={(event) => setAddressLine(event.target.value)} placeholder="Kabulonga, Lusaka" {...gate.input("address")} /></Field></Gate>
        <Button type="submit">Save address</Button>
      </form>
    </Screen>
  );
}

export function PaymentsScreen() {
  const [rows, setRows] = useState<{ id: string; provider: string; phone: string; label: string }[] | null>(null);
  const [provider, setProvider] = useState("Airtel Money");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const gate = useFormGate([{ id: "detail", message: provider === "Visa" ? visaLast4(phone) : phoneLocal(phone) }]);
  async function load() { setRows(await api("/api/payments")); }
  useEffect(() => { load().catch(() => setError("Unable to load payment methods.")); }, []);
  return (
    <Screen>
      <BackLink href="/customer/profile" />
      <h1 className="mt-3 font-display text-[1.8rem]">Payment methods</h1>
      <p className="mt-1 text-sm text-muted">Save Airtel Money, MoMo, or Visa to pay a provider from a booking.</p>
      {error && <div className="mt-3"><Banner>{error}</Banner></div>}
      {rows?.length === 0 && <div className="mt-4"><EmptyState title="No payment methods" body="Add Airtel Money, MoMo, or Visa." /></div>}
      <div className="mt-4 space-y-2">
        {rows?.map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-[20px] border border-line bg-card p-3">
            <div>
              <p className="font-semibold">{row.provider}</p>
              <p className="text-xs text-muted">{row.provider === "Visa" ? `•••• ${row.phone}` : formatPhone(row.phone)}</p>
            </div>
            <button className="text-xs font-semibold text-danger" onClick={async () => { await api(`/api/payments/${row.id}`, { method: "DELETE" }); load(); }}>Remove</button>
          </div>
        ))}
      </div>
      <form className="mt-5 space-y-3" onSubmit={async (event) => {
        event.preventDefault();
        if (gate.blockSubmit()) return;
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
            <option>Airtel Money</option>
            <option>MoMo</option>
            <option>Visa</option>
          </select>
        </Field>
        <Gate id="detail" gate={gate}>
          <Field label={provider === "Visa" ? "Last 4 digits" : "Phone number"} error={gate.error("detail")}>
            {provider === "Visa" ? (
              <TextInput value={phone} inputMode="numeric" onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 4))} {...gate.input("detail")} />
            ) : (
              <PhoneField value={phone} onChange={setPhone} {...gate.input("detail")} />
            )}
          </Field>
        </Gate>
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
  const router = useRouter();
  const { me, refresh } = useApp();
  const [fullName, setFullName] = useState(me.fullName);
  const [photoError, setPhotoError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const gate = useFormGate([
    { id: "name", message: personName(fullName) },
    { id: "photo", message: photoError },
  ]);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("zam-theme") === "dark" ? "dark" : "light";
    setTheme(saved);
  }, []);

  function chooseTheme(next: "light" | "dark") {
    setTheme(next);
    if (next === "dark") document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    window.localStorage.setItem("zam-theme", next);
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (gate.blockSubmit()) return;
    setError("");
    try {
      await api("/api/profile", { method: "PATCH", body: JSON.stringify({ fullName }) });
      await refresh();
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update your profile.");
    }
  }

  async function confirmDeactivate() {
    setDeactivating(true);
    setError("");
    try {
      await api("/api/profile/deactivate", { method: "POST" });
      router.replace("/");
    } catch (err) {
      setDeactivating(false);
      setDeactivateOpen(false);
      setError(err instanceof ApiError ? err.message : "Unable to deactivate this account.");
    }
  }

  async function photo(file?: File) {
    if (!file) return;
    const problem = imageFileProblem(file);
    if (problem) {
      setPhotoError(problem);
      return;
    }
    try {
      setPhotoError("");
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
        <Gate id="name" gate={gate}><Field label="Full name" error={gate.error("name")}><TextInput value={fullName} onChange={(event) => setFullName(event.target.value)} {...gate.input("name")} /></Field></Gate>
        <Gate id="photo" gate={gate}>
          <Field label="Profile photo" error={photoError || gate.error("photo")}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { photo(event.target.files?.[0]); event.target.value = ""; }} className="text-sm" /></Field>
        </Gate>
        <Button type="submit">Save profile</Button>
      </form>
      <section className="mt-6 rounded-[22px] border border-line bg-card p-4">
        <p className="text-sm font-semibold">Appearance</p>
        <p className="mt-1 text-xs text-muted">Switch the app between light and dark.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => chooseTheme("light")} className={`min-h-11 rounded-2xl border text-sm font-semibold ${theme === "light" ? "border-forest bg-sage text-forest" : "border-line bg-cream"}`}>Light</button>
          <button type="button" onClick={() => chooseTheme("dark")} className={`min-h-11 rounded-2xl border text-sm font-semibold ${theme === "dark" ? "border-forest bg-sage text-forest" : "border-line bg-cream"}`}>Dark</button>
        </div>
      </section>
      <section className="mt-4 rounded-[22px] border border-line bg-card p-4">
        <p className="text-sm font-semibold">Deactivate account</p>
        <p className="mt-1 text-xs text-muted">This signs you out. You will not be able to sign in again.</p>
        <Button type="button" variant="danger" className="mt-3" onClick={() => setDeactivateOpen(true)}>Deactivate account</Button>
      </section>
      <Modal open={deactivateOpen} title="Deactivate account?" onClose={() => setDeactivateOpen(false)}>
        <p className="text-sm text-muted">Are you sure you want to deactivate your account?</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setDeactivateOpen(false)}>No</Button>
          <Button variant="danger" loading={deactivating} onClick={confirmDeactivate}>Yes</Button>
        </div>
      </Modal>
    </Screen>
  );
}
