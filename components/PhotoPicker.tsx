"use client";

import { useRef, useState } from "react";
import { Camera, Trash2, AlertCircle, IdCard } from "lucide-react";
import { ICON } from "@/lib/icons";
import { AvatarLite } from "./Avatar";
import { PhotoCropper } from "./PhotoCropper";

/**
 * Downscales and compresses the chosen image in the browser before it is ever
 * submitted — a 4MB phone photo becomes tens of kilobytes. Nothing is uploaded
 * at full size.
 *
 * `capture` is deliberately not forced: leaving it off lets the phone offer
 * both "Take Photo" and "Choose from Library", which is what members expect.
 */
async function compress(file: File, maxEdge: number, quality: number) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

/** Round portrait photo for a member. */
export function PhotoPicker({
  initialPhoto,
  label,
  required,
}: {
  /** Either a bucket path (rendered via /api/photo) or a fresh data URL */
  initialPhoto: string | null;
  label: string;
  required: boolean;
}) {
  const [photo, setPhoto] = useState(initialPhoto);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="card-mist p-4">
      {/* The avatar is a circle, so the member decides what lands inside it
          rather than the camera's framing deciding for them. */}
      {pending && (
        <PhotoCropper
          file={pending}
          aspect={1}
          round
          outputSize={480}
          onCancel={() => setPending(null)}
          onDone={(dataUrl) => {
            setPhoto(dataUrl);
            setRemoved(false);
            setPending(null);
            setError("");
          }}
        />
      )}
      <input type="hidden" name="photo" value={removed ? "" : photo ?? ""} />
      <input type="hidden" name="removePhoto" value={removed ? "on" : ""} />

      <div className="flex items-center gap-4">
        <AvatarLite label={label} photo={removed ? null : photo} size="xl" />

        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold">
            Photo {required && <span className="text-danger">*</span>}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
            {required
              ? "Required for the head of the household."
              : "Optional for spouse and children."}
          </p>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn btn-ghost"
            >
              <Camera size={ICON.sm} />
              {photo && !removed ? "Change" : "Add photo"}
            </button>

            {photo && !removed && (
              <button
                type="button"
                onClick={() => setRemoved(true)}
                className="btn btn-danger"
              >
                <Trash2 size={ICON.sm} />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Choose a photo"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) setPending(file);
          event.target.value = "";
        }}
      />

      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle size={ICON.xs} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Visiting card. Kept at a higher resolution than the portrait because the
 * whole point is that a member can read the phone number printed on it.
 */
export function VisitingCardPicker({
  initialCard,
  initialCardUrl,
}: {
  /** The stored value — a bucket path, submitted back unchanged if not replaced */
  initialCard: string | null;
  /** A loadable URL for the existing card */
  initialCardUrl: string | null;
}) {
  const [card, setCard] = useState(initialCard);
  const [preview, setPreview] = useState(initialCardUrl);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const shown = removed ? null : preview;

  async function handleFile(file: File) {
    setError("");
    setBusy(true);
    try {
      const dataUrl = await compress(file, 1400, 0.86);
      setCard(dataUrl);
      setPreview(dataUrl);
      setRemoved(false);
    } catch {
      setError("That image could not be read. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-mist p-4">
      <input
        type="hidden"
        name="businessVisitingCard"
        value={removed ? "" : card ?? ""}
      />

      <p className="flex items-center gap-1.5 font-display text-sm font-bold">
        <IdCard size={ICON.sm} />
        Visiting card
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
        Take a photo of your card, or choose one from your phone. Members can tap it
        to read your details.
      </p>

      {shown && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shown}
          alt="Your visiting card"
          className="mt-3 w-full rounded-inner border border-line object-contain"
        />
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="btn btn-ghost"
        >
          <Camera size={ICON.sm} />
          {busy ? "Processing…" : shown ? "Change card" : "Add visiting card"}
        </button>

        {shown && (
          <button
            type="button"
            onClick={() => setRemoved(true)}
            className="btn btn-danger"
          >
            <Trash2 size={ICON.sm} />
            Remove
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Choose a visiting card image"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />

      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle size={ICON.xs} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
