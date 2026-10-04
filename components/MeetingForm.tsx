"use client";

import { useRef, useState } from "react";
import { Camera, Trash2, AlertCircle, ImageIcon, Plus, X } from "lucide-react";
import { ICON } from "@/lib/icons";
import { SaveBar } from "./SaveBar";
import { PhotoCropper } from "./PhotoCropper";

export interface MeetingFormValues {
  title: string;
  description: string;
  location: string;
  mapsUrl: string;
  organisers: string;
  meetingDate: string;
  meetingTime: string;
  kwikPicUrl: string;
  driveUrl: string;
  photoUrl: string | null;
}

/** "Suresh & Rekha Jain, Anand Jain" -> ["Suresh & Rekha Jain", "Anand Jain"] */
const splitOrganisers = (value?: string) => {
  const names = (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return names.length > 0 ? names : [""];
};

export function MeetingForm({
  action,
  defaultValues,
  cancelHref,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<MeetingFormValues>;
  cancelHref: string;
  submitLabel: string;
}) {
  const [photo, setPhoto] = useState<string | null>(defaultValues?.photoUrl ?? null);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<File | null>(null);
  const [organisers, setOrganisers] = useState(() =>
    splitOrganisers(defaultValues?.organisers)
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const shown = removed ? null : photo;
  const isFreshUpload = shown?.startsWith("data:image/") ?? false;

  return (
    <form action={action} className="px-4 pt-5">
      <input type="hidden" name="photo" value={isFreshUpload ? shown ?? "" : ""} />
      <input type="hidden" name="removePhoto" value={removed ? "on" : ""} />

      {/* The cover renders 16:9 and is cropped to fill, so let the committee
          choose which part of the photo survives that crop. */}
      {pending && (
        <PhotoCropper
          file={pending}
          aspect={16 / 9}
          round={false}
          outputSize={1400}
          onCancel={() => setPending(null)}
          onDone={(dataUrl) => {
            setPhoto(dataUrl);
            setRemoved(false);
            setPending(null);
            setError("");
          }}
        />
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="label">
            Title *
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={120}
            defaultValue={defaultValues?.title}
            placeholder="e.g. Monsoon picnic at Ralamandal"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="location" className="label">
            Location
          </label>
          <input
            id="location"
            name="location"
            maxLength={160}
            defaultValue={defaultValues?.location}
            placeholder="e.g. Geeta Bhawan community hall"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="mapsUrl" className="label">
            Google Maps link
          </label>
          <input
            id="mapsUrl"
            name="mapsUrl"
            type="url"
            defaultValue={defaultValues?.mapsUrl}
            placeholder="https://maps.app.goo.gl/…"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="organiser-0" className="label">
            Organisers
          </label>
          <div className="space-y-2">
            {organisers.map((value, i) => (
              <div key={i} className="flex gap-2">
                <input
                  id={`organiser-${i}`}
                  type="text"
                  value={value}
                  onChange={(event) => {
                    const next = [...organisers];
                    next[i] = event.target.value;
                    setOrganisers(next);
                  }}
                  maxLength={160}
                  placeholder="e.g. Suresh & Rekha Jain"
                  className="field flex-1"
                />
                {organisers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setOrganisers(organisers.filter((_, idx) => idx !== i))}
                    aria-label="Remove this organiser"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-chip border border-line text-ink-faint active:bg-kesar-mist"
                  >
                    <X size={ICON.sm} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOrganisers([...organisers, ""])}
            className="mt-2 inline-flex items-center gap-1.5 py-1 text-sm font-semibold text-kesar-text"
          >
            <Plus size={ICON.xs} />
            Add another organiser
          </button>
          <input
            type="hidden"
            name="organisers"
            value={organisers.map((o) => o.trim()).filter(Boolean).join(", ")}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <label htmlFor="meetingDate" className="label">
              Date *
            </label>
            <input
              id="meetingDate"
              name="meetingDate"
              type="date"
              required
              defaultValue={defaultValues?.meetingDate}
              className="field"
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="meetingTime" className="label">
              Time
            </label>
            <input
              id="meetingTime"
              name="meetingTime"
              type="time"
              defaultValue={defaultValues?.meetingTime}
              className="field"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="label">
            Details
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={1000}
            defaultValue={defaultValues?.description}
            placeholder="What to expect, what to bring, who to contact…"
            className="field resize-none"
          />
        </div>

        <div className="card-mist p-4">
          <p className="flex items-center gap-1.5 font-display text-sm font-bold">
            <ImageIcon size={ICON.sm} />
            Cover photo (optional)
          </p>

          {shown && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shown}
              alt=""
              className="mt-3 aspect-video w-full rounded-inner border border-line object-cover"
            />
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn btn-ghost"
            >
              <Camera size={ICON.sm} />
              {shown ? "Change photo" : "Add photo"}
            </button>
            {shown && (
              <button
                type="button"
                onClick={() => {
                  setRemoved(true);
                  setPhoto(null);
                }}
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
            aria-label="Choose a cover photo"
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

        <div>
          <label htmlFor="kwikPicUrl" className="label">
            Kwik Pic link
          </label>
          <input
            id="kwikPicUrl"
            name="kwikPicUrl"
            type="url"
            defaultValue={defaultValues?.kwikPicUrl}
            placeholder="https://kwikpic.in/…"
            className="field"
          />
          <p className="mt-1 text-2xs text-ink-faint">
            Usually added after the meeting, once photos are ready to share.
          </p>
        </div>

        <div>
          <label htmlFor="driveUrl" className="label">
            Google Drive link
          </label>
          <input
            id="driveUrl"
            name="driveUrl"
            type="url"
            defaultValue={defaultValues?.driveUrl}
            placeholder="https://drive.google.com/…"
            className="field"
          />
          <p className="mt-1 text-2xs text-ink-faint">
            A folder of photos or papers. Set it to &ldquo;anyone with the
            link&rdquo; in Drive, or members will only see a request screen.
          </p>
        </div>
      </div>

      <SaveBar cancelHref={cancelHref} label={submitLabel} />
    </form>
  );
}
