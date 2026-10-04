"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, LocateFixed } from "lucide-react";
import { ApiError, api } from "@/lib/client";
import { addDays, dayLabel, formatDuration, kwacha, todayInLusaka } from "@/lib/format";
import type { ProviderCard } from "@/lib/types";
import { cardExpiry as expiryProblem, cardName as cardNameProblem, cardNumber as cardNumberProblem, optionalText, phoneLocal } from "@/lib/validate";
import dynamic from "next/dynamic";
import { useApp } from "./shell";
import { Gate, useFormGate } from "./form-gate";
import { Avatar, BackLink, Banner, Button, Field, Screen, TextInput, Verified } from "./ui";

const MapView = dynamic(() => import("./map-view").then((mod) => mod.MapView), { ssr: false });

type Slot = { time: string; available: boolean };
type Place = { label: string; latitude: number | null; longitude: number | null };

export function BookingFlow() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useApp();
  const providerId = params.get("provider") ?? "";
  const initialService = params.get("service") ?? "";
  const [provider, setProvider] = useState<ProviderCard | null>(null);
  const [serviceId, setServiceId] = useState(initialService);
  const [date, setDate] = useState(todayInLusaka());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [closed, setClosed] = useState(false);
  const [time, setTime] = useState("");
  const [place, setPlace] = useState<Place>({ label: "", latitude: null, longitude: null });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [saved, setSaved] = useState<Place[]>([]);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Airtel Money" | "MoMo" | "Visa">("Airtel Money");
  const [payPhone, setPayPhone] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [methods, setMethods] = useState<{ id: string; provider: "Airtel Money" | "MoMo" | "Visa"; phone: string }[]>([]);
  const [savedPayId, setSavedPayId] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [stepError, setStepError] = useState("");
  const [loading, setLoading] = useState(false);
  const locationGate = useFormGate([{ id: "place", message: place.label.trim().length < 3 ? "Add the location for this booking." : "" }]);
  const payGate = useFormGate(savedPayId ? [
    { id: "notes", message: optionalText(notes, 500, "Notes") },
  ] : paymentMethod === "Visa" ? [
    { id: "cardName", message: cardNameProblem(cardName) },
    { id: "cardNumber", message: cardNumberProblem(cardNumber) },
    { id: "cardExpiry", message: expiryProblem(cardExpiry) },
    { id: "notes", message: optionalText(notes, 500, "Notes") },
  ] : [
    { id: "payPhone", message: phoneLocal(payPhone) },
    { id: "notes", message: optionalText(notes, 500, "Notes") },
  ]);
  const [done, setDone] = useState<string | null>(null);

  const dates = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(todayInLusaka(), index)), []);
  const service = provider?.services.find((item) => item.id === serviceId) ?? null;

  useEffect(() => {
    if (!providerId) return;
    api<ProviderCard>(`/api/providers/${providerId}`)
      .then((result) => {
        setProvider(result);
        setServiceId((current) => current || result.services[0]?.id || "");
        setStep(initialService ? 1 : 0);
      })
      .catch(() => setError("Unable to load this provider. Please try again."));
    api<{ id: string; label: string; addressLine: string; latitude: number | null; longitude: number | null }[]>("/api/addresses")
      .then((rows) => setSaved(rows.map((row) => ({ label: `${row.label}: ${row.addressLine}`, latitude: row.latitude, longitude: row.longitude }))))
      .catch(() => undefined);
    api<{ id: string; provider: "Airtel Money" | "MoMo" | "Visa"; phone: string }[]>("/api/payments")
      .then(setMethods)
      .catch(() => undefined);
  }, [providerId, initialService]);

  useEffect(() => {
    if (!providerId || !date) return;
    api<{ closed: boolean; slots: Slot[] }>(`/api/providers/${providerId}/slots?date=${date}`)
      .then((result) => {
        setClosed(result.closed);
        setSlots(result.slots);
        setTime((current) => (result.slots.some((slot) => slot.time === current && slot.available) ? current : ""));
      })
      .catch(() => setSlots([]));
  }, [providerId, date]);

  async function useGps() {
    setError("");
    if (!navigator.geolocation) {
      setError("Location is not available in this browser. Enter it manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const found = await api<Place>(`/api/geo/reverse?lat=${position.coords.latitude}&lng=${position.coords.longitude}`);
        setPlace(found);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Unable to read your current location.");
      }
    }, () => setError("Allow location access, or enter the address manually."));
  }

  async function searchPlaces(value: string) {
    setQuery(value);
    setPlace((current) => ({ ...current, label: value, latitude: null, longitude: null }));
    if (value.trim().length < 3) {
      setResults([]);
      return;
    }
    const rows = await api<Place[]>(`/api/geo/search?q=${encodeURIComponent(value)}`).catch(() => []);
    setResults(rows);
  }

  function paymentLabel() {
    const chosen = methods.find((method) => method.id === savedPayId);
    if (chosen?.provider === "Visa") return `Visa · •••• ${chosen.phone.replace(/\D/g, "").slice(-4)}`;
    if (chosen) return `${chosen.provider} · ${chosen.phone}`;
    if (paymentMethod === "Visa") {
      const digits = cardNumber.replace(/\D/g, "");
      if (cardName.trim().length < 2 || digits.length < 13 || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) return "";
      return `Visa · •••• ${digits.slice(-4)}`;
    }
    const digits = payPhone.replace(/\D/g, "");
    if (digits.length < 9) return "";
    return `${paymentMethod} · ${digits}`;
  }

  async function confirm() {
    if (!provider || !service) return;
    if (payGate.blockSubmit()) return;
    const payment = paymentLabel();
    if (!payment) return;
    setLoading(true);
    setError("");
    try {
      const booking = await api<{ id: string }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          providerId: provider.id,
          serviceId: service.id,
          date,
          time,
          addressLine: place.label,
          latitude: place.latitude,
          longitude: place.longitude,
          notes,
          paymentMethod: payment,
          saveAddress,
          addressLabel: "Booking address",
        }),
      });
      await refresh();
      setDone(booking.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create the booking.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div className="pop">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success text-white"><Check size={36} /></span>
          <h1 className="mt-4 font-display text-3xl">Booking requested</h1>
          <p className="mt-2 text-sm text-muted">Pending provider acceptance. You will be notified when they respond.</p>
          <div className="mt-6"><Button onClick={() => router.replace(`/customer/bookings/${done}`)}>View booking</Button></div>
        </div>
      </div>
    );
  }

  const steps = ["Service", "Schedule", "Location", "Review"];

  return (
    <Screen>
      <BackLink />
      <div className="mt-3 flex gap-2">
        {steps.map((label, index) => (
          <span key={label} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-forest" : "bg-sand"}`} />
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-forest">{steps[step]}</p>
      {error && <div className="mt-3"><Banner>{error}</Banner></div>}
      {!provider && <p className="mt-6 text-sm text-muted">Loading booking...</p>}
      {provider && step === 0 && (
        <div className="mt-3 space-y-2">
          <h1 className="font-display text-[1.8rem]">Select a service</h1>
          {provider.services.map((item) => (
            <button key={item.id} onClick={() => setServiceId(item.id)} className={`flex w-full justify-between rounded-[20px] border px-4 py-3 text-left ${serviceId === item.id ? "border-forest bg-sage" : "border-line bg-card"}`}>
              <span>
                <span className="block font-semibold">{item.name}</span>
                <span className="text-xs text-muted">{formatDuration(item.durationMinutes)}</span>
              </span>
              <span className="font-semibold text-brown">{kwacha(item.price)}</span>
            </button>
          ))}
          {stepError && <p className="text-xs text-danger">{stepError}</p>}
          <div className="pt-3"><Button onClick={() => { if (!serviceId) { setStepError("Choose a service."); return; } setStepError(""); setStep(1); }}>Next</Button></div>
        </div>
      )}
      {provider && step === 1 && (
        <div className="mt-3">
          <h1 className="font-display text-[1.8rem]">When do you need it?</h1>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {dates.map((value) => (
              <button key={value} onClick={() => setDate(value)} className={`press shrink-0 rounded-2xl px-3 py-2 text-left text-xs ${date === value ? "bg-forest text-white" : "bg-card border border-line"}`}>
                <span className="block font-semibold">{dayLabel(value)}</span>
              </button>
            ))}
          </div>
          {closed ? (
            <p className="mt-4 text-sm text-muted">The provider is not available on this day.</p>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button key={slot.time} disabled={!slot.available} onClick={() => setTime(slot.time)} className={`h-10 rounded-xl text-sm font-semibold ${time === slot.time ? "bg-forest text-white" : "bg-card border border-line"} disabled:opacity-40`}>
                  {slot.time}
                </button>
              ))}
            </div>
          )}
          {slots.length === 0 && !closed && <p className="mt-4 text-sm text-muted">No open times remain for this day.</p>}
          {stepError && <p className="mt-3 text-xs text-danger">{stepError}</p>}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="ghost" data-gate-back="true" onClick={() => { setStepError(""); setStep(0); }}>Back</Button>
            <Button onClick={() => { if (!time) { setStepError("Choose a time."); return; } setStepError(""); setStep(2); }}>Next</Button>
          </div>
        </div>
      )}
      {provider && step === 2 && (
        <div className="mt-3 space-y-3">
          <h1 className="font-display text-[1.8rem]">Where should they come?</h1>
          <p className="text-sm text-muted">This location is saved with the booking. It is not added to your profile unless you choose to save it.</p>
          <Button variant="soft" type="button" onClick={useGps}><LocateFixed size={16} /> Use current location</Button>
          <Gate id="place" gate={locationGate}>
            <input value={query || place.label} onChange={(event) => searchPlaces(event.target.value)} placeholder="Search a place in Zambia" className="h-12 w-full rounded-2xl border border-line bg-card px-4 text-sm outline-none" {...locationGate.input("place")} />
            {locationGate.error("place") && <span className="mt-1 block text-xs text-danger">{locationGate.error("place")}</span>}
          </Gate>
          <div className="space-y-2">
            {results.map((result) => (
              <button key={result.label} onClick={() => { setPlace(result); setQuery(result.label); setResults([]); }} className="block w-full rounded-2xl bg-card px-3 py-2 text-left text-sm border border-line">
                {result.label}
              </button>
            ))}
          </div>
          {saved.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {saved.map((item) => (
                <button key={item.label} onClick={() => { setPlace(item); setQuery(item.label); }} className="shrink-0 rounded-full bg-gold-soft px-3 py-1.5 text-xs font-semibold">{item.label.split(":")[0]}</button>
              ))}
            </div>
          )}
          {place.latitude != null && place.longitude != null && (
            <MapView height={180} pins={[{ lat: place.latitude, lng: place.longitude, label: "You", color: "#6f4b32" }]} onPick={async (lat, lng) => {
              const found = await api<Place>(`/api/geo/reverse?lat=${lat}&lng=${lng}`).catch(() => ({ label: place.label, latitude: lat, longitude: lng }));
              setPlace(found);
              setQuery(found.label);
            }} />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} />
            Save this address to my profile
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" data-gate-back="true" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => { if (locationGate.blockSubmit()) return; setStep(3); }}>Next</Button>
          </div>
        </div>
      )}
      {provider && service && step === 3 && (
        <div className="mt-3 space-y-3">
          <h1 className="font-display text-[1.8rem]">Review booking</h1>
          <div className="rounded-[24px] border border-line bg-card p-4">
            <div className="flex items-center gap-3">
              <Avatar src={provider.avatarUrl} name={provider.name} />
              <div>
                <p className="font-semibold">{provider.name}</p>
                <Verified show={provider.verified} />
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Service" value={service.name} />
              <Row label="When" value={`${dayLabel(date)} · ${time}`} />
              <Row label="Location" value={place.label} />
              <Row label="Price" value={kwacha(service.price)} />
              <Row label="Total" value={kwacha(service.price)} />
              <Row label="Payment" value={paymentLabel() || paymentMethod} />
            </dl>
          </div>
          <p className="text-xs font-semibold text-muted">Pay the provider</p>
          <div className="grid grid-cols-3 gap-2">
            {(["Airtel Money", "MoMo", "Visa"] as const).map((method) => (
              <button key={method} type="button" onClick={() => { setSavedPayId(""); setPaymentMethod(method); }} className={`min-h-12 rounded-2xl border px-2 text-xs font-semibold ${!savedPayId && paymentMethod === method ? "border-forest bg-sage text-forest" : "border-line bg-card"}`}>{method}</button>
            ))}
          </div>
          {methods.length > 0 && (
            <div className="space-y-2">
              {methods.map((method) => (
                <button key={method.id} type="button" onClick={() => { setSavedPayId(method.id); setPaymentMethod(method.provider); }} className={`flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 text-sm ${savedPayId === method.id ? "border-forest bg-sage" : "border-line bg-card"}`}>
                  <span className="font-semibold">{method.provider}</span>
                  <span className="text-xs text-muted">{method.provider === "Visa" ? `•••• ${method.phone}` : method.phone}</span>
                </button>
              ))}
            </div>
          )}
          {!savedPayId && paymentMethod === "Visa" ? (
            <div className="space-y-2">
              <Gate id="cardName" gate={payGate}><Field label="Name on card" error={payGate.error("cardName")}><TextInput value={cardName} onChange={(event) => setCardName(event.target.value)} placeholder="Name on card" {...payGate.input("cardName")} /></Field></Gate>
              <Gate id="cardNumber" gate={payGate}><Field label="Visa card number" error={payGate.error("cardNumber")}><TextInput value={cardNumber} inputMode="numeric" onChange={(event) => setCardNumber(event.target.value.replace(/[^\d]/g, "").slice(0, 16))} placeholder="Visa card number" {...payGate.input("cardNumber")} /></Field></Gate>
              <Gate id="cardExpiry" gate={payGate}><Field label="Expiry" error={payGate.error("cardExpiry")}><TextInput value={cardExpiry} inputMode="numeric" onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
                setCardExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
              }} placeholder="MM/YY" {...payGate.input("cardExpiry")} /></Field></Gate>
            </div>
          ) : !savedPayId ? (
            <Gate id="payPhone" gate={payGate}><Field label="Mobile money number" error={payGate.error("payPhone")}><TextInput value={payPhone} inputMode="numeric" onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "");
              setPayPhone(digits.slice(0, digits.startsWith("0") ? 10 : 9));
            }} {...payGate.input("payPhone")} /></Field></Gate>
          ) : null}
          <Gate id="notes" gate={payGate}>
            <Field label="Notes" error={payGate.error("notes")}>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Additional notes" className="h-24 w-full rounded-2xl border border-line bg-card p-3 text-sm outline-none" {...payGate.input("notes")} />
            </Field>
          </Gate>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button loading={loading} onClick={confirm}>Confirm booking</Button>
          </div>
        </div>
      )}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="max-w-[65%] text-right font-medium">{value}</dd>
    </div>
  );
}
