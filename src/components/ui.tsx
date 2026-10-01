"use client";

import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Star } from "lucide-react";
import { useRef, useState, type ButtonHTMLAttributes, type FocusEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/client";

export function BrandLogo({ compact = false, className }: { tone?: "dark" | "light"; compact?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/logo-grey.png?v=2"
      alt="ZamServe"
      className={cn("logo-pop object-contain object-left", compact ? "h-16 w-[5.5rem]" : "h-20 w-[6.8rem]", className)}
    />
  );
}

export function Button({
  children,
  loading,
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: "primary" | "ghost" | "danger" | "success" | "soft" }) {
  const styles = {
    primary: "btn-3d btn-3d-cta text-white",
    ghost: "btn-3d btn-3d-light text-ink",
    danger: "btn-3d btn-3d-danger text-white",
    success: "btn-3d btn-3d-success text-white",
    soft: "btn-3d btn-3d-soft text-brown-dark",
  }[variant];
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold disabled:opacity-60",
        styles,
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-12 w-full rounded-2xl border border-line bg-card px-4 text-sm outline-none placeholder:text-muted/70 focus:border-brown focus:ring-2 focus:ring-gold/30",
        props.className,
      )}
    />
  );
}

export function PhoneField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex h-12 items-center overflow-hidden rounded-2xl border border-line bg-card focus-within:border-brown focus-within:ring-2 focus-within:ring-gold/30">
      <span className="pl-4 pr-2 text-sm font-semibold text-brown">+260</span>
      <input
        value={value}
        onChange={(event) => {
          const digits = event.target.value.replace(/[^\d]/g, "");
          onChange(digits.slice(0, digits.startsWith("0") ? 10 : 9));
        }}
        inputMode="numeric"
        placeholder="97 000 0000 or 05 000 0000"
        className="h-full w-full bg-transparent pr-4 text-sm outline-none"
      />
    </div>
  );
}

export function PasswordField({
  minLength,
  mustMatch,
  onBlur,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { minLength?: number; mustMatch?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState("");

  function problemFor(value: string) {
    if (minLength && value.length < minLength) return `Use at least ${minLength} characters.`;
    if (mustMatch !== undefined && value !== mustMatch) return "Passwords do not match.";
    return "";
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const next = event.relatedTarget as Node | null;
    const toggle = next instanceof HTMLElement && next.dataset.passwordToggle === "true";
    const problem = problemFor(event.target.value);
    const movingForward = Boolean(next && inputRef.current && inputRef.current.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (problem && movingForward && !toggle) {
      setNotice(problem);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else if (!problem) {
      setNotice("");
    }
    onBlur?.(event);
  }

  return (
    <div className="relative">
      <input
        {...props}
        ref={inputRef}
        minLength={minLength}
        type={show ? "text" : "password"}
        onBlur={handleBlur}
        onChange={(event) => {
          if (notice && !problemFor(event.target.value)) setNotice("");
          props.onChange?.(event);
        }}
        className="h-12 w-full rounded-2xl border border-line bg-card px-4 pr-12 text-sm outline-none focus:border-brown focus:ring-2 focus:ring-gold/30"
      />
      <button type="button" data-password-toggle="true" onClick={() => setShow((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-label="Show password">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
      {notice && <span className="absolute left-2 top-[calc(100%+6px)] z-20 rounded-xl bg-[#3a2a22] px-3 py-1.5 text-xs font-medium text-white shadow-lg">{notice}</span>}
    </div>
  );
}

export function Banner({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "bg-danger-soft text-danger",
    success: "bg-success-soft text-success",
    info: "bg-gold-soft text-brown-dark",
  }[tone];
  return <div className={cn("rounded-2xl px-4 py-3 text-sm", styles)}>{children}</div>;
}

export function Avatar({ src, name, size = 44 }: { src?: string | null; name: string; size?: number }) {
  if (src) {
    return <img src={src} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="grid place-items-center rounded-full bg-gold-soft font-semibold text-brown"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {(name.trim()[0] || "?").toUpperCase()}
    </span>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-gold">
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} size={size} fill={index < Math.round(value) ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

export function StarPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const star = index + 1;
        return (
          <button key={star} type="button" onClick={() => onChange(star)} className="press text-gold" aria-label={`${star} stars`}>
            <Star size={28} fill={star <= value ? "currentColor" : "none"} />
          </button>
        );
      })}
    </div>
  );
}

export function Verified({ show = true }: { show?: boolean }) {
  if (!show) return null;
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">✓ Verified</span>;
}

export function BackLink({ href, label = "Back" }: { href?: string; label?: string }) {
  const router = useRouter();
  function go() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(href || "/");
  }
  return (
    <button type="button" onClick={go} className="btn-3d btn-3d-cta inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-white">
      {label}
    </button>
  );
}

export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-5 pb-6 pt-5", className)}>{children}</div>;
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-display text-[1.35rem] leading-none text-ink">{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-dashed border-line bg-card px-5 py-8 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-[28ch] text-sm text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label}>
      <div className="h-24 animate-pulse rounded-[24px] bg-sand/80" />
      <div className="h-24 animate-pulse rounded-[24px] bg-sand/70" />
      <div className="h-24 animate-pulse rounded-[24px] bg-sand/60" />
      <p className="text-center text-xs text-muted">{label}</p>
    </div>
  );
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  const tone =
    status === "COMPLETED"
      ? "bg-success-soft text-success"
      : status === "CANCELLED" || status === "REJECTED"
        ? "bg-danger-soft text-danger"
        : status === "PENDING"
          ? "bg-gold-soft text-brown-dark"
          : "bg-cream-deep text-brown";
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", tone)}>{label}</span>;
}

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-3 sm:items-center">
      <div className="pop w-full max-w-[400px] rounded-[28px] bg-cream p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-2xl">{title}</h3>
          <button onClick={onClose} className="text-sm font-semibold text-muted">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
