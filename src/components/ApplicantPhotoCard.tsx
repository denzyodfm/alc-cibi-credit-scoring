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
    <div className="panel w-full p-3 sm:w-52">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">Applicant Picture</div>
      <div className="flex gap-3 sm:block">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-300 bg-slate-50 sm:h-36 sm:w-full">
          {photo ? <img src={photo} alt="Applicant" className="h-full w-full object-cover" /> : <UserRound size={48} className="text-slate-300" />}
        </div>
        <div className="flex flex-1 flex-col justify-center gap-2 sm:mt-2 sm:flex-row">
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void choosePhoto(event.target.files?.[0])}
          />
          <button type="button" className="btn-secondary flex-1" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="animate-spin" /> : <Camera />}
            {photo ? "Change" : "Upload"}
          </button>
          {photo ? (
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => void removePhoto()} aria-label="Remove applicant picture">
              <Trash2 />
            </button>
          ) : null}
        </div>
      </div>
      {message ? <p className="mt-2 text-xs text-red-600">{message}</p> : null}
      <p className="mt-2 text-[11px] text-slate-500">JPG, PNG, or WebP. Maximum 2 MB.</p>
    </div>
  );
}
