"use client";

import { useRef, useState } from "react";
import { Camera, Trash2, AlertCircle } from "lucide-react";
import { ICON } from "@/lib/icons";
import { AvatarLite } from "./Avatar";
import { SaveBar } from "./SaveBar";
import { PhotoCropper } from "./PhotoCropper";
import { COMMITTEE_ROLES } from "@/lib/categories";

export interface CommitteeMemberFormValues {
  name: string;
  role: string;
  phone: string;
  sortOrder: number;
  photoUrl: string | null;
}

export function CommitteeMemberForm({
  action,
  defaultValues,
  cancelHref,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<CommitteeMemberFormValues>;
  cancelHref: string;
  submitLabel: string;
}) {
  const [photo, setPhoto] = useState<string | null>(defaultValues?.photoUrl ?? null);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const shown = removed ? null : photo;
  const isFreshUpload = shown?.startsWith("data:image/") ?? false;

  return (
    <form action={action} className="px-4 pt-5">
      <input type="hidden" name="photo" value={isFreshUpload ? shown ?? "" : ""} />
      <input type="hidden" name="removePhoto" value={removed ? "on" : ""} />

      {/* Committee photos show as circles on Home — these are couple photos,
          so getting both faces inside the circle matters. */}
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

      <div className="space-y-4">
        <div className="card-mist flex items-center gap-4 p-4">
          <AvatarLite
            label={(defaultValues?.name ?? "?").charAt(0)}
            photo={shown}
            size="xl"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
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
            {error && (
              <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-danger">
                <AlertCircle size={ICON.xs} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}
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
        </div>

        <div>
          <label htmlFor="name" className="label">
            Name *
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={100}
            defaultValue={defaultValues?.name}
            placeholder="e.g. Rajesh-Sunita Shah"
            autoComplete="off"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="role" className="label">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue={defaultValues?.role ?? ""}
            className="field"
          >
            <option value="">Not specified</option>
            {COMMITTEE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="phone" className="label">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            maxLength={14}
            defaultValue={defaultValues?.phone}
            placeholder="98765 43210"
            className="field tnum"
          />
        </div>

        <div>
          <label htmlFor="sortOrder" className="label">
            Display order
          </label>
          <input
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={defaultValues?.sortOrder ?? 0}
            className="field"
          />
          <p className="mt-1 text-2xs text-ink-faint">
            0 shows first and biggest — usually the head of the group. Everyone else
            sorts by this number, smallest first.
          </p>
        </div>
      </div>

      <SaveBar cancelHref={cancelHref} label={submitLabel} />
    </form>
  );
}
