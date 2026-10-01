import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid h-full place-items-center px-8 text-center">
      <div>
        <p className="font-display text-3xl text-ink">Page not found</p>
        <p className="mt-2 text-sm text-muted">That screen is not part of ZamServe.</p>
        <Link href="/" className="btn-3d btn-3d-cta mt-5 inline-flex h-12 items-center rounded-full px-6 text-sm font-semibold text-white">
          Back to start
        </Link>
      </div>
    </div>
  );
}
