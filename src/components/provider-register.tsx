"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IdCard, UserRound } from "lucide-react";
import { ApiError, api, uploadImage } from "@/lib/client";
import { kwacha } from "@/lib/format";
import type { Category } from "@/lib/types";
import { ServiceChoices } from "./service-choices";
import { BackLink, Banner, Button, Field, PasswordField, PhoneField, TextInput } from "./ui";

type Draft = { categoryId: string; serviceId: string; newServiceName: string; price: string; description: string; durationMinutes: string };

const empty: Draft = { categoryId: "", serviceId: "", newServiceName: "", price: "", description: "", durationMinutes: "60" };

export function ProviderRegister() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nrcPreviewRef = useRef<string | null>(null);
  const facePreviewRef = useRef<string | null>(null);
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nrcUrl, setNrcUrl] = useState<string | null>(null);
  const [nrcName, setNrcName] = useState("");
  const [nrcPreview, setNrcPreview] = useState<string | null>(null);
  const [facePhotoUrl, setFacePhotoUrl] = useState<string | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [faceReady, setFaceReady] = useState(false);
  const [section, setSection] = useState<"" | "barbershop" | "salon">("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState<Draft>(empty);
  const [services, setServices] = useState<Draft[]>([]);
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<Category[]>("/api/categories").then(setCategories).catch(() => setError("Unable to load service categories."));
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (nrcPreviewRef.current) URL.revokeObjectURL(nrcPreviewRef.current);
      if (facePreviewRef.current) URL.revokeObjectURL(facePreviewRef.current);
    };
  }, []);

  async function uploadNrc(selected?: File) {
    if (!selected) return;
    try {
      const url = await uploadImage(selected, { private: true });
      setNrcUrl(url);
      setNrcName(selected.name);
      setNrcPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        const next = selected.type.startsWith("image/") ? URL.createObjectURL(selected) : null;
        nrcPreviewRef.current = next;
        return next;
      });
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to upload that file.");
    }
  }

  function accountReady() {
    if (fullName.trim().length < 2) return "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
    const localPhone = phone.startsWith("0") ? phone.slice(1) : phone;
    if (!/^\d{9}$/.test(localPhone)) return "Enter a valid Zambian phone number.";
    if (password.length < 6) return "Use at least 6 characters for your password.";
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return "Enter your date of birth.";
    const born = new Date(`${dateOfBirth}T00:00:00`);
    const adult = new Date();
    adult.setFullYear(adult.getFullYear() - 18);
    if (Number.isNaN(born.getTime()) || born > adult) return "You need to be 18 or older.";
    return "";
  }

  async function openCamera() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This device does not have a camera available for a live photo.");
      return;
    }
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setFaceReady(false);
      setCameraOn(true);
    } catch {
      setError("Camera permission is required for this photo. You can enable it in your device settings.");
    }
  }

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOn || !video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => setError("Camera permission is required for this photo. You can enable it in your device settings."));
  }, [cameraOn]);

  useEffect(() => {
    if (!cameraOn) return;
    let stop = false;
    const timer = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || stop) return;
      const seen = await faceVisible(video);
      if (!stop) setFaceReady(seen);
    }, 350);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [cameraOn]);

  function retakeFace() {
    setFacePhotoUrl(null);
    setFaceReady(false);
    setError("");
    openCamera();
  }

  async function captureFace() {
    const video = videoRef.current;
    if (!video || video.videoWidth < 2 || !faceReady) {
      setError("Please position your face inside the frame.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return;
    const preview = URL.createObjectURL(blob);
    if (facePreviewRef.current) URL.revokeObjectURL(facePreviewRef.current);
    facePreviewRef.current = preview;
    setFacePreview(preview);
    try {
      setFacePhotoUrl(await uploadImage(new File([blob], "face.jpg", { type: "image/jpeg" }), { private: true }));
      setError("");
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (video.srcObject instanceof MediaStream) video.srcObject = null;
      setCameraOn(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save that photo.");
    }
  }

  function addService() {
    if (!draft.categoryId || !draft.serviceId || !draft.price) {
      setError("Choose a category, a service, and a price.");
      return;
    }
    if (services.some((item) => item.serviceId === draft.serviceId)) {
      setError("That service is already on your list.");
      return;
    }
    setServices((current) => [...current, draft]);
    setDraft({ ...empty, categoryId: draft.categoryId });
    setError("");
  }

  async function addPortfolio(selected?: File) {
    if (!selected || portfolio.length >= 2) return;
    try {
      setPortfolio((current) => [...current, ""]);
      const url = await uploadImage(selected);
      setPortfolio((current) => current.map((item) => (item === "" ? url : item)).filter(Boolean).slice(0, 2));
      setError("");
    } catch (err) {
      setPortfolio((current) => current.filter(Boolean));
      setError(err instanceof ApiError ? err.message : "Unable to upload that photo.");
    }
  }

  async function submit() {
    const problem = accountReady();
    if (problem || !nrcUrl || !facePhotoUrl || services.length === 0) {
      setError(problem || "Finish verification and add at least one service.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/provider/register", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password,
          confirmPassword,
          dateOfBirth,
          businessName: fullName.trim(),
          serviceArea: "Lusaka",
          idDocumentUrl: nrcUrl,
          facePhotoUrl,
          portfolio,
          services: services.map((item) => ({
            categoryId: item.categoryId,
            serviceId: item.serviceId || undefined,
            newServiceName: item.serviceId ? undefined : item.newServiceName,
            price: Number(item.price),
            description: item.description,
            durationMinutes: Number(item.durationMinutes || 60),
          })),
        }),
      });
      setStep(3);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create the provider account.");
    } finally {
      setLoading(false);
    }
  }

  const category = categories.find((item) => item.id === draft.categoryId);
  const beauty = category?.slug === "beauty-cosmetics";
  const listed = (category?.services ?? []).filter((service) => {
    if (!beauty) return true;
    if (!section) return false;
    return service.section === section || service.section === "both";
  });

  return (
    <div className="h-full overflow-y-auto px-6 py-8">
      <BackLink href="/choose-role" />
      <p className="mt-5 font-display text-3xl leading-none">Create Service Provider Account</p>
      <p className="mt-2 text-sm text-muted">Customers will meet you in person, so this account needs your details and a live photo.</p>
      <div className="mt-4 flex gap-1">{[0, 1, 2].map((index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-brown" : "bg-sand"}`} />)}</div>
      {error && <div className="mt-4"><Banner>{error}</Banner></div>}
      {step === 0 && (
        <div className="mt-5 space-y-4">
          <Field label="Full name"><TextInput value={fullName} onChange={(event) => setFullName(event.target.value)} /></Field>
          <Field label="Email address"><TextInput value={email} onChange={(event) => setEmail(event.target.value)} inputMode="email" /></Field>
          <Field label="Phone number"><PhoneField value={phone} onChange={setPhone} /></Field>
          <Field label="Password"><PasswordField minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
          <Field label="Confirm password"><PasswordField mustMatch={password} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></Field>
          <Field label="Date of birth"><TextInput type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} /></Field>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">NRC</p>
            <label className="mt-1.5 flex min-h-[92px] cursor-pointer items-center gap-3 rounded-[22px] border border-line bg-card px-3.5 py-3 shadow-[0_8px_22px_rgba(111,75,50,0.07)]">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gold-soft text-brown">
                {nrcPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={nrcPreview} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                ) : (
                  <IdCard size={26} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Upload NRC</span>
                <span className="mt-0.5 block truncate text-xs text-muted">{nrcName || "One photo or PDF"}</span>
                {nrcUrl && <span className="mt-1 block text-xs font-semibold text-success">Uploaded ✓</span>}
              </span>
              <input type="file" accept="image/*,.pdf,application/pdf" className="sr-only" onChange={(event) => { uploadNrc(event.target.files?.[0]); event.target.value = ""; }} />
            </label>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Profile Photo</p>
            <button type="button" onClick={openCamera} className="mt-1.5 flex min-h-[92px] w-full items-center gap-3 rounded-[22px] border border-line bg-card px-3.5 py-3 text-left shadow-[0_8px_22px_rgba(111,75,50,0.07)]">
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-gold-soft text-brown">
                {facePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={facePreview} alt="" className="h-14 w-14 object-cover" />
                ) : (
                  <UserRound size={26} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Upload Profile Photo</span>
                <span className="mt-0.5 block text-xs text-muted">Your personal photo. Tap to open the camera.</span>
                {facePhotoUrl && <span className="mt-1 block text-xs font-semibold text-success">Uploaded ✓</span>}
              </span>
            </button>
            <div className={`relative mt-3 ${cameraOn ? "block" : "hidden"}`}>
              <video ref={videoRef} playsInline muted className="h-64 w-full rounded-[22px] bg-black object-cover" />
              <span className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-32 -translate-x-1/2 -translate-y-1/2 rounded-[999px] border-2 border-white/90" />
            </div>
            {cameraOn && !faceReady && <p className="mt-2 text-sm font-semibold text-brown">Please position your face inside the frame.</p>}
            {cameraOn && faceReady && <p className="mt-2 text-sm font-semibold text-success">Face detected. You can take the photo.</p>}
            {cameraOn && <div className="mt-3"><Button disabled={!faceReady} onClick={captureFace}>Take photo</Button></div>}
            {facePhotoUrl && !cameraOn && (
              <button type="button" className="mt-2 text-sm font-semibold text-brown underline" onClick={retakeFace}>Retake</button>
            )}
          </div>
          <Button onClick={() => {
            const problem = accountReady();
            if (problem) setError(problem);
            else if (!nrcUrl || !facePhotoUrl) setError("Upload your NRC and take a profile photo.");
            else {
              streamRef.current?.getTracks().forEach((track) => track.stop());
              streamRef.current = null;
              setCameraOn(false);
              setError("");
              setStep(1);
            }
          }}>Continue</Button>
        </div>
      )}
      {step === 1 && (
        <div className="mt-5 space-y-3">
          <p className="text-[15px] font-medium text-[#3a2a22]">Choose every service you can do. Add as many as you offer. There is no limit. A new service can be added later from your provider account, and it is optional.</p>
          <MenuSelect label="Category" value={draft.categoryId} onChange={(value) => { setSection(""); setDraft({ ...draft, categoryId: value, serviceId: "" }); }}>
            <option value="">Choose a category</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </MenuSelect>
          {beauty && (
            <MenuSelect label="Barbershop or Salon" value={section} onChange={(value) => { setSection(value as "" | "barbershop" | "salon"); setDraft({ ...draft, serviceId: "" }); }}>
              <option value="">Choose where you work</option>
              <option value="barbershop">Barbershop</option>
              <option value="salon">Salon</option>
            </MenuSelect>
          )}
          {category && (!beauty || section) && (
            <MenuSelect label={beauty ? `Services under ${section === "barbershop" ? "Barbershop" : "Salon"}` : "Service"} value={draft.serviceId} onChange={(value) => setDraft({ ...draft, serviceId: value })}>
              <option value="">Choose a service</option>
              {beauty ? listed.map((service) => <option key={service.id} value={service.id}>{service.name}</option>) : <ServiceChoices services={category.services} />}
            </MenuSelect>
          )}
          <Field label="Price (K)"><TextInput value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value.replace(/[^\d]/g, "") })} inputMode="numeric" /></Field>
          <Button variant="soft" type="button" onClick={addService}>Add this service</Button>
          <div className="space-y-2">
            {services.map((item, index) => (
              <button key={`${item.serviceId}-${item.newServiceName}-${index}`} type="button" onClick={() => setServices((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="flex w-full justify-between rounded-2xl border border-line bg-card px-3 py-2 text-left text-sm">
                <span>✓ {item.newServiceName || categoryName(categories, item)}</span>
                <span>{kwacha(Number(item.price))}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
            <Button disabled={services.length === 0} onClick={() => { setError(""); setStep(2); }}>Continue</Button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="mt-5 space-y-4">
          <p className="text-[15px] font-medium text-[#3a2a22]">Add up to 2 photos of your best work. You can replace them later from your account.</p>
          {portfolio.length < 2 && <PickFile label="Add a work photo" onFile={addPortfolio} />}
          <div className="grid grid-cols-2 gap-2">
            {portfolio.map((url) => <img key={url} src={url} alt="" className="h-28 w-full rounded-2xl object-cover" />)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button loading={loading} onClick={submit}>Submit</Button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="mt-5 space-y-3 rounded-[22px] border border-line bg-card p-4 text-sm">
          {["Account information", "NRC uploaded", "Profile photo", "Services added", "Portfolio added"].map((label) => (
            <p key={label} className="font-semibold">{label} ✓</p>
          ))}
          <p className="pt-2 text-muted">Your provider profile is ready. Turn on Accepting jobs when you want requests.</p>
          <Button onClick={() => router.replace("/provider/home")}>Go to home</Button>
        </div>
      )}
      {step === 0 && (
        <>
          <p className="mt-6 text-center text-sm text-muted">
            Already registered? <Link href="/provider/login" className="link-blue font-semibold">Sign in</Link>
          </p>
          <Link href="/customer/register" className="link-blue mt-4 block text-center text-sm font-semibold">Not a service provider? Continue as Customer</Link>
        </>
      )}
    </div>
  );
}

function categoryName(categories: Category[], item: Draft) {
  const category = categories.find((entry) => entry.id === item.categoryId);
  const service = category?.services.find((entry) => entry.id === item.serviceId);
  if (!service) return item.newServiceName || "Service";
  const place = service.section === "barbershop" ? "Barbershop" : service.section === "salon" ? "Salon" : "";
  return place ? `${place} · ${service.name}` : service.name;
}

function PickFile({ label, done, accept = "image/*", onFile }: { label: string; done?: boolean; accept?: string; onFile: (file?: File) => void }) {
  return (
    <label className="flex h-12 cursor-pointer items-center justify-between rounded-2xl border border-line bg-card px-4 text-sm font-semibold">
      <span>{done ? `${label} uploaded ✓` : label}</span>
      <span className="text-xs text-brown" aria-hidden>▼</span>
      <input type="file" accept={accept} className="sr-only" onChange={(event) => { onFile(event.target.files?.[0]); event.target.value = ""; }} />
    </label>
  );
}

function MenuSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <Field label={label}>
      <div className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full appearance-none rounded-2xl border border-line bg-card px-4 pr-10 text-sm outline-none">
          {children}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-brown" aria-hidden>▼</span>
      </div>
    </Field>
  );
}

function skinInFrame(video: HTMLVideoElement) {
  const width = 120;
  const height = Math.max(80, Math.round((width * video.videoHeight) / video.videoWidth));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;
  context.drawImage(video, 0, 0, width, height);
  const data = context.getImageData(0, 0, width, height).data;
  let skin = 0;
  let total = 0;
  const centerX = width / 2;
  const centerY = height * 0.42;
  const radiusX = width * 0.24;
  const radiusY = height * 0.3;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const nx = (x - centerX) / radiusX;
      const ny = (y - centerY) / radiusY;
      if (nx * nx + ny * ny > 1) continue;
      total += 1;
      const index = (y * width + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      if (red > 80 && green > 40 && blue > 25 && red > green && red > blue && red - green > 12) skin += 1;
    }
  }
  return total > 30 && skin / total > 0.34;
}

async function faceVisible(video: HTMLVideoElement) {
  const Detector = (window as unknown as { FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => { detect: (source: HTMLVideoElement) => Promise<unknown[]> } }).FaceDetector;
  if (Detector) {
    try {
      const faces = await new Detector({ fastMode: true, maxDetectedFaces: 2 }).detect(video);
      return faces.length === 1;
    } catch {
      return skinInFrame(video);
    }
  }
  return skinInFrame(video);
}
