"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, UserRound } from "lucide-react";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ApplicantPhotoCard({ loanId, initialPhoto }: { loanId: number; initialPhoto?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState(initialPhoto ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function choosePhoto(file?: File) {
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) {
      setMessage("Use a JPG, PNG, or WebP image up to 2 MB.");
      return;
    }

    setBusy(true);
    setMessage("");
    const photoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const response = await fetch(`/api/loans/${loanId}/photo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoDataUrl })
    });
    setBusy(false);
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setMessage(result?.error ?? "Unable to save applicant picture.");
      return;
    }
    setPhoto(photoDataUrl);
  }

  async function removePhoto() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/loans/${loanId}/photo`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      setMessage("Unable to remove applicant picture.");
      return;
    }
    setPhoto("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="panel w-40 p-2">
      <div>
        <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-md border border-slate-300 bg-slate-50">
          {photo ? <img src={photo} alt="Applicant" className="h-full w-full object-cover" /> : <UserRound size={48} className="text-slate-300" />}
        </div>
        <div className="mt-2 flex gap-1.5">
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void choosePhoto(event.target.files?.[0])}
          />
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            {photo ? "Change" : "Upload"}
          </button>
          {photo ? (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
              disabled={busy}
              onClick={() => void removePhoto()}
              aria-label="Remove applicant picture"
            >
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
      </div>
      {message ? <p className="mt-2 text-xs text-red-600">{message}</p> : null}
      <p className="mt-2 text-[11px] text-slate-500">JPG, PNG, or WebP. Maximum 2 MB.</p>
    </div>
  );
}
