"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api, uploadImage } from "@/lib/client";
import { confirmPassword as passwordsMatch, imageFileProblem, passwordValue, personName, phoneLocal, resetCode } from "@/lib/validate";
import { Gate, useFormGate } from "./form-gate";
import { BackLink, Banner, Button, Field, PasswordField, PhoneField, TextInput } from "./ui";

export function LoginScreen({ role }: { role: "CUSTOMER" | "PROVIDER" }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const home = role === "CUSTOMER" ? "/customer/home" : "/provider/home";
  const gate = useFormGate([
    { id: "phone", message: phoneLocal(phone) },
    { id: "password", message: passwordValue(password) },
  ]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (gate.blockSubmit()) return;
    setLoading(true);
    setError("");
    try {
      await api(role === "CUSTOMER" ? "/api/auth/customer/login" : "/api/auth/provider/login", {
        method: "POST",
        body: JSON.stringify({ phone, password }),
      });
      router.replace(home);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-8">
      <BackLink href="/choose-role" />
      <h1 className="mt-5 font-display text-[2rem] leading-none">{role === "CUSTOMER" ? "Customer Sign In" : "Service Provider Sign In"}</h1>
      <p className="mt-2 text-sm text-muted">{role === "CUSTOMER" ? "Log in to book a service." : "Log in to manage jobs and requests."}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && <Banner>{error}</Banner>}
        <Gate id="phone" gate={gate}><Field label="Phone number" error={gate.error("phone")}><PhoneField value={phone} onChange={setPhone} {...gate.input("phone")} /></Field></Gate>
        <Gate id="password" gate={gate}><Field label="Password" error={gate.error("password")}><PasswordField value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" {...gate.input("password")} /></Field></Gate>
        <div className="text-right">
          <Link href={role === "CUSTOMER" ? "/customer/forgot" : "/provider/forgot"} className="link-blue text-sm font-semibold">Forgot password?</Link>
        </div>
        <Button type="submit" loading={loading}>Log In</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href={role === "CUSTOMER" ? "/customer/register" : "/provider/register"} className="link-blue font-semibold">Sign up</Link>
      </p>
    </div>
  );
}

export function CustomerRegister() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [loading, setLoading] = useState(false);
  const gate = useFormGate([
    { id: "name", message: personName(fullName) },
    { id: "phone", message: phoneLocal(phone) },
    { id: "password", message: passwordValue(password) },
    { id: "confirm", message: passwordsMatch(confirmPassword, password) },
    { id: "photo", message: photoError },
  ]);

  async function onFile(file?: File) {
    if (!file) return;
    const problem = imageFileProblem(file);
    if (problem) {
      setPhotoError(problem);
      setAvatarUrl(null);
      return;
    }
    try {
      setPhotoError("");
      setAvatarUrl(await uploadImage(file));
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : "Unable to upload that photo.");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (gate.blockSubmit()) return;
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/customer/register", {
        method: "POST",
        body: JSON.stringify({ fullName, phone, password, confirmPassword, avatarUrl }),
      });
      router.replace("/customer/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-8">
      <BackLink href="/choose-role" />
      <h1 className="mt-5 font-display text-[2rem] leading-none">Create Customer Account</h1>
      <p className="mt-2 text-sm text-muted">Book beauty, repairs, and cleaning. You can add a location when you book.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && <Banner>{error}</Banner>}
        <Gate id="name" gate={gate}><Field label="Full name" error={gate.error("name")}><TextInput value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" {...gate.input("name")} /></Field></Gate>
        <Gate id="phone" gate={gate}><Field label="Phone number" error={gate.error("phone")}><PhoneField value={phone} onChange={setPhone} {...gate.input("phone")} /></Field></Gate>
        <Gate id="password" gate={gate}><Field label="Password" error={gate.error("password")}><PasswordField value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" {...gate.input("password")} /></Field></Gate>
        <Gate id="confirm" gate={gate}><Field label="Confirm password" error={gate.error("confirm")}><PasswordField value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat password" {...gate.input("confirm")} /></Field></Gate>
        <Gate id="photo" gate={gate}>
          <label className="btn-3d btn-3d-light flex h-12 cursor-pointer items-center justify-center rounded-full text-sm font-semibold text-[#4a3120]">
            {avatarUrl ? "Profile photo added ✓" : "Add a profile photo, optional"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { onFile(event.target.files?.[0]); event.target.value = ""; }} />
          </label>
          {(photoError || gate.error("photo")) && <span className="mt-1 block text-xs text-danger">{photoError || gate.error("photo")}</span>}
        </Gate>
        {avatarUrl && <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />}
        <Button type="submit" loading={loading}>Sign up</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account? <Link href="/customer/login" className="link-blue font-semibold">Sign in</Link>
      </p>
    </div>
  );
}

export function ForgotScreen() {
  const pathname = usePathname();
  const loginHref = pathname.startsWith("/provider") ? "/provider/login" : "/customer/login";
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [devCode, setDevCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const phoneGate = useFormGate([{ id: "phone", message: phoneLocal(phone) }]);
  const resetGate = useFormGate([
    { id: "code", message: resetCode(code) },
    { id: "password", message: passwordValue(password) },
  ]);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    if (phoneGate.blockSubmit()) return;
    setLoading(true);
    setError("");
    try {
      const result = await api<{ message: string; devCode?: string }>("/api/auth/forgot", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setMessage(result.message);
      setDevCode(result.devCode ?? "");
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to start a reset.");
    } finally {
      setLoading(false);
    }
  }

  async function reset(event: React.FormEvent) {
    event.preventDefault();
    if (resetGate.blockSubmit()) return;
    setLoading(true);
    setError("");
    try {
      const result = await api<{ message: string }>("/api/auth/reset", {
        method: "POST",
        body: JSON.stringify({ phone, code, password }),
      });
      setMessage(result.message);
      setStep(1);
      setCode("");
      setPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reset the password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-8">
      <BackLink href={loginHref} />
      <h1 className="mt-5 font-display text-[2rem] leading-none">Reset password</h1>
      <p className="mt-2 text-sm text-muted">We will prepare a code for your Zambian number.</p>
      {error && <div className="mt-4"><Banner>{error}</Banner></div>}
      {message && <div className="mt-4"><Banner tone="success">{message}</Banner></div>}
      {devCode && <div className="mt-3"><Banner tone="info">Local development code: {devCode}</Banner></div>}
      {step === 1 ? (
        <form onSubmit={requestCode} className="mt-6 space-y-4">
          <Gate id="phone" gate={phoneGate}><Field label="Phone number" error={phoneGate.error("phone")}><PhoneField value={phone} onChange={setPhone} {...phoneGate.input("phone")} /></Field></Gate>
          <Button type="submit" loading={loading}>Send code</Button>
        </form>
      ) : (
        <form onSubmit={reset} className="mt-6 space-y-4">
          <Gate id="code" gate={resetGate}><Field label="Reset code" error={resetGate.error("code")}><TextInput value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit code" {...resetGate.input("code")} /></Field></Gate>
          <Gate id="password" gate={resetGate}><Field label="New password" error={resetGate.error("password")}><PasswordField value={password} onChange={(event) => setPassword(event.target.value)} {...resetGate.input("password")} /></Field></Gate>
          <Button type="submit" loading={loading}>Update password</Button>
        </form>
      )}
    </div>
  );
}
