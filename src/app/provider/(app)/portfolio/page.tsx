"use client";

import { useEffect, useState } from "react";
import { ApiError, api, uploadImage } from "@/lib/client";
import { BackLink, Banner, EmptyState, Screen } from "@/components/ui";

type Photo = { id: string; imageUrl: string; caption: string };

export default function Page() {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [error, setError] = useState("");
  const [caption, setCaption] = useState("");

  async function load() {
    setPhotos(await api<Photo[]>("/api/provider/portfolio"));
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load your work photos."));
  }, []);

  return (
    <Screen>
      <BackLink href="/provider/profile" />
      <h1 className="mt-3 font-display text-[1.8rem]">Work photos</h1>
      <p className="mt-1 text-[15px] font-medium text-[#3a2a22]">Customers see these before they book. You can keep two photos.</p>
      {error && <div className="mt-3"><Banner>{error}</Banner></div>}
      {photos && photos.length === 0 && <div className="mt-4"><EmptyState title="No photos yet" body="Add a few pictures of your best work." /></div>}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {photos?.map((photo) => (
          <div key={photo.id} className="relative">
            <img src={photo.imageUrl} alt={photo.caption} className="h-24 w-full rounded-2xl object-cover" />
            <button className="absolute right-1 top-1 rounded-full bg-card px-2 text-[10px] font-semibold text-danger" onClick={async () => { await api(`/api/provider/portfolio/${photo.id}`, { method: "DELETE" }); load(); }}>Remove</button>
          </div>
        ))}
      </div>
      {photos && photos.length < 2 && <form className="mt-5 space-y-3" onSubmit={(event) => event.preventDefault()}>
        <label className="btn-3d btn-3d-light flex h-12 cursor-pointer items-center justify-center rounded-full text-sm font-semibold text-[#4a3120]">
          Add a work photo
          <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              const imageUrl = await uploadImage(file);
              await api("/api/provider/portfolio", { method: "POST", body: JSON.stringify({ imageUrl, caption }) });
              setCaption("");
              await load();
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Unable to add that photo.");
            }
          }}
        />
        </label>
        <input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Caption, then choose a photo" className="h-12 w-full rounded-2xl border border-line bg-card px-4 text-sm outline-none" />
      </form>}
    </Screen>
  );
}
