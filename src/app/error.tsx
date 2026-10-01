"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid h-full place-items-center px-8 text-center">
      <div>
        <p className="font-display text-3xl text-ink">Something went wrong</p>
        <p className="mt-2 text-sm text-muted">Please try again.</p>
        <button onClick={reset} className="btn-3d btn-3d-cta mt-5 h-12 rounded-full px-6 text-sm font-semibold text-white">
          Try again
        </button>
      </div>
    </div>
  );
}
