"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Props = { bucket: "product-images" | "verification-docs"; userId: string; accept: string; maxBytes: number;
  label: string; onDone: (path: string) => Promise<string>; };

// Client-side checks are convenience only. The bucket enforces size/type, RLS enforces the {userId}/ folder,
// and the server action re-checks magic bytes after upload.
export default function FileUploader({ bucket, userId, accept, maxBytes, label, onDone }: Props) {
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > maxBytes) { setMsg(`File too large (max ${Math.round(maxBytes / 1_000_000)} MB).`); return; }
    const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" } as Record<string, string>)[file.type];
    if (!ext) { setMsg("Unsupported file type."); return; }
    setBusy(true); setMsg("Uploading…");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseBrowser().storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
    if (error) { setMsg("Upload failed."); setBusy(false); return; }
    setMsg(await onDone(path)); setBusy(false);
  }
  return (<div><label htmlFor={`f-${bucket}`}>{label}</label>
    <input id={`f-${bucket}`} type="file" accept={accept} onChange={pick} disabled={busy} />
    <p role="status" className="muted">{msg}</p></div>);
}
