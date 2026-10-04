"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Camera, Flame, ImageIcon, Megaphone, Trash2 } from "lucide-react";
import { createPost } from "@/app/actions/data";
import { BUSINESS_CATEGORIES } from "@/lib/categories";
import { ICON } from "@/lib/icons";

/** Long edge after downscaling. A poster stays readable, a camera shot stops
 *  being 4MB of detail nobody sees on a phone. */
const MAX_EDGE = 1600;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full">
      {pending ? "Posting…" : label}
    </button>
  );
}

export function NewPostForm({
  type,
  areas,
  postedThisWeek,
  defaultArea,
}: {
  /** Fixed by the route. The form no longer offers to be the other one. */
  type: "requirement" | "announcement";
  areas: string[];
  postedThisWeek: number;
  defaultArea: string;
}) {
  // A condolence is an announcement that must not look like one — comments
  // start locked and every screen renders it in the restrained variant.
  const [condolence, setCondolence] = useState(false);
  const [image, setImage] = useState("");
  const [imageError, setImageError] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const atLimit = type === "requirement" && postedThisWeek >= 2;

  /**
   * An announcement image is usually a poster or an invitation card, so it is
   * downscaled but never cropped — the committee's own layout is the content,
   * and a square crop would cut the date off the bottom of half of them.
   */
  async function handleImage(file: File) {
    setImageError("");
    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image.");
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      setImage(canvas.toDataURL("image/jpeg", 0.85));
    } catch {
      setImageError("That image could not be read. Please try another one.");
    }
  }

  return (
    <form action={createPost} className="px-4 pt-5">
      <input type="hidden" name="type" value={type} />
      {/* Requirements have never carried one */}
      <input type="hidden" name="photo" value={type === "announcement" ? image : ""} />
      {type === "announcement" && condolence && (
        <input type="hidden" name="category" value="Condolence" />
      )}

      <h1 className="text-title">
        {type === "announcement" ? "New announcement" : "What do you need?"}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        {type === "announcement"
          ? "This goes to all members. You can pin one announcement to the Home screen."
          : "Be specific — the clearer you are, the more likely someone can help. Requirements stay searchable for 30 days, then disappear on their own."}
      </p>

      {type === "announcement" && (
        <div className="mt-4">
          <p className="label">Kind of announcement</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCondolence(false)}
              aria-pressed={!condolence}
              className={`chip ${!condolence ? "chip-active" : ""}`}
            >
              <Megaphone size={ICON.xs} />
              General
            </button>
            <button
              type="button"
              onClick={() => setCondolence(true)}
              aria-pressed={condolence}
              className={`chip ${condolence ? "chip-active" : ""}`}
            >
              <Flame size={ICON.xs} />
              Condolence
            </button>
          </div>
          {condolence && (
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              A condolence notice is shown quietly, without the usual announcement
              styling, and comments start turned off. You can turn them back on
              from the post afterwards.
            </p>
          )}
        </div>
      )}

      {atLimit && (
        <div className="mt-4 flex items-start gap-2 rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          <AlertCircle size={ICON.sm} className="mt-0.5 shrink-0" />
          <span>
            You&apos;ve posted {postedThisWeek} requirements this week, which is the
            limit. It keeps the feed useful for all 400 members.
          </span>
        </div>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="title" className="label">
            {type === "announcement" ? "Title" : "What you need"} *
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={120}
            placeholder={
              type === "announcement"
                ? "Sunday meeting at 10am"
                : "Looking for a reliable CA for a small firm"
            }
            className="field"
          />
        </div>

        <div>
          <label htmlFor="body" className="label">
            Details *
          </label>
          <textarea
            id="body"
            name="body"
            required
            rows={5}
            maxLength={1500}
            placeholder={
              type === "announcement"
                ? "Where, when, and what members need to bring or know."
                : "Give the details — budget, timeline, area, anything that helps someone decide if they can help."
            }
            className="field resize-none"
          />
          <p className="mt-1 text-2xs text-ink-faint">
            Don&apos;t include anything you wouldn&apos;t want all 400 members to read.
          </p>
        </div>

        {type === "requirement" && (
          <div>
            <label htmlFor="category" className="label">
              Category
            </label>
            <select id="category" name="category" defaultValue="" className="field">
              <option value="">Choose a category (optional)</option>
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="mt-1 text-2xs text-ink-faint">
              Picking one means members in that trade can find your post.
            </p>
          </div>
        )}

        {type === "announcement" && (
          <div className="card-mist p-4">
            <p className="flex items-center gap-1.5 font-display text-sm font-bold">
              <ImageIcon size={ICON.sm} />
              Image (optional)
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
              A poster, an invitation card, a photograph. Members see the whole
              thing, uncropped, when they open the announcement.
            </p>

            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                className="mt-3 max-h-72 w-full rounded-inner border border-line object-contain"
              />
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => imageInput.current?.click()}
                className="btn btn-ghost"
              >
                <Camera size={ICON.sm} />
                {image ? "Change image" : "Add image"}
              </button>
              {image && (
                <button
                  type="button"
                  onClick={() => setImage("")}
                  className="btn btn-danger"
                >
                  <Trash2 size={ICON.sm} />
                  Remove
                </button>
              )}
            </div>

            <input
              ref={imageInput}
              type="file"
              accept="image/*"
              aria-label="Choose an image for this announcement"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImage(file);
                event.target.value = "";
              }}
            />

            {imageError && (
              <p
                role="alert"
                className="mt-2 flex items-start gap-1.5 text-xs text-danger"
              >
                <AlertCircle size={ICON.xs} className="mt-0.5 shrink-0" />
                {imageError}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="area" className="label">
            Area
          </label>
          <input
            id="area"
            name="area"
            list="area-options"
            defaultValue={type === "requirement" ? defaultArea : ""}
            placeholder="Vijay Nagar"
            className="field"
          />
          <datalist id="area-options">
            {areas.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="mt-6 pb-6">
        {atLimit ? (
          <button type="button" disabled className="btn btn-primary w-full">
            Weekly limit reached
          </button>
        ) : (
          <Submit
            label={type === "announcement" ? "Post announcement" : "Post requirement"}
          />
        )}
        <p className="mt-2.5 text-center text-2xs leading-relaxed text-ink-faint">
          Posts appear immediately. Any admin can delete a post or comment.
        </p>
      </div>
    </form>
  );
}
