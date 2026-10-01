"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api, uploadImage } from "@/lib/client";
import { BackLink, Banner, Button, Field, PasswordField, PhoneField, TextInput } from "./ui";

export function LoginScreen({ role }: { role: "CUSTOMER" | "PROVIDER" }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const home = role === "CUSTOMER" ? "/customer/home" : "/provider/home";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
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
        <Field label="Phone number"><PhoneField value={phone} onChange={setPhone} /></Field>
        <Field label="Password"><PasswordField value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" /></Field>
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
  const [loading, setLoading] = useState(false);

  async function onFile(file?: File) {
    if (!file) return;
    try {
      setAvatarUrl(await uploadImage(file));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to upload that photo.");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
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
        <Field label="Full name"><TextInput value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" /></Field>
        <Field label="Phone number"><PhoneField value={phone} onChange={setPhone} /></Field>
        <Field label="Password"><PasswordField minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></Field>
        <Field label="Confirm password"><PasswordField mustMatch={password} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat password" /></Field>
        <label className="btn-3d btn-3d-light flex h-12 cursor-pointer items-center justify-center rounded-full text-sm font-semibold text-[#4a3120]">
          {avatarUrl ? "Profile photo added ✓" : "Add a profile photo, optional"}
          <input type="file" accept="image/*" className="sr-only" onChange={(event) => onFile(event.target.files?.[0])} />
        </label>
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

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
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
          <Field label="Phone number"><PhoneField value={phone} onChange={setPhone} /></Field>
          <Button type="submit" loading={loading}>Send code</Button>
        </form>
      ) : (
        <form onSubmit={reset} className="mt-6 space-y-4">
          <Field label="Reset code"><TextInput value={code} onChange={(event) => setCode(event.target.value)} placeholder="6-digit code" /></Field>
          <Field label="New password"><PasswordField value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
          <Button type="submit" loading={loading}>Update password</Button>
        </form>
      )}
    </div>
  );
}
