"use client";

import { useActionState, useRef, useState } from "react";
import { AlertCircle, Check, FileText, Upload } from "lucide-react";
import { ICON } from "@/lib/icons";
import { uploadCircular, type CircularState } from "@/app/actions/circulars";

const MAX_MB = 3;

export function CircularForm() {
  const [state, formAction, pending] = useActionState<CircularState, FormData>(
    uploadCircular,
    {}
  );

  const [dataUrl, setDataUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [localError, setLocalError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * A PDF is sent as-is — re-encoding it would wreck the text, and the text is
   * the point of a circular. A photographed sheet is accepted too, because a
   * committee member with a printed copy and no scanner is the common case,
   * and it is downscaled so it doesn't crawl over mobile data.
   */
  async function handleFile(file: File) {
    setLocalError("");

    if (file.type === "application/pdf") {
      if (file.size > MAX_MB * 1024 * 1024) {
        setLocalError(
          `That PDF is ${(file.size / 1048576).toFixed(1)}MB. Please keep it under ${MAX_MB}MB.`
        );
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setDataUrl(String(reader.result));
        setFileName(file.name);
      };
      reader.onerror = () => setLocalError("That file could not be read.");
      reader.readAsDataURL(file);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setLocalError("Please choose a PDF or a photo of the circular.");
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      setDataUrl(canvas.toDataURL("image/jpeg", 0.88));
      setFileName(file.name);
    } catch {
      setLocalError("That image could not be read. Please try another file.");
    }
  }

  const error = localError || state.error;

  return (
    <form action={formAction} className="px-4 pt-5">
      <input type="hidden" name="file" value={dataUrl} />
      <input type="hidden" name="fileName" value={fileName} />

      <h1 className="text-title">Post a circular</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        Notices, rules, forms, accounts. Circulars stay here permanently, so a
        member can find one months later instead of scrolling WhatsApp for it.
      </p>

      <div className="mt-6">
        <label htmlFor="title" className="label">
          Title *
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={120}
          autoComplete="off"
          placeholder="e.g. Annual membership contribution 2026-27"
          className="field text-lg"
        />
        <p className="mt-1 text-2xs text-ink-faint">
          This is the heading members will see in the feed.
        </p>
      </div>

      <div className="mt-5">
        <label htmlFor="note" className="label">
          What it says
        </label>
        <textarea
          id="note"
          name="note"
          rows={4}
          maxLength={600}
          placeholder="A line or two, so members know what it is about without opening it. Dates and amounts are worth repeating here."
          className="field resize-none"
        />
      </div>

      <div className="card-mist mt-5 p-4">
        <p className="flex items-center gap-1.5 font-display text-sm font-bold">
          <FileText size={ICON.sm} />
          The document *
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
          A PDF, or a clear photo of the printed circular. Up to {MAX_MB}MB.
        </p>

        {dataUrl && (
          <p className="mt-3 flex items-center gap-2 rounded-inner bg-surface px-3 py-2 text-sm">
            <Check size={ICON.sm} className="shrink-0 text-kesar-text" />
            <span className="min-w-0 flex-1 truncate">{fileName || "File ready"}</span>
          </p>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn btn-ghost mt-3"
        >
          <Upload size={ICON.sm} />
          {dataUrl ? "Choose a different file" : "Choose file"}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          aria-label="Choose the circular to upload"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-danger">
          <AlertCircle size={ICON.sm} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-6 pb-8">
        <button
          type="submit"
          disabled={pending || !dataUrl}
          className="btn btn-primary w-full"
        >
          {pending ? "Posting…" : "Post to all members"}
        </button>
        <p className="mt-2.5 text-center text-2xs leading-relaxed text-ink-faint">
          Visible to signed-in samaj members only. Any admin can take it down.
        </p>
      </div>
    </form>
  );
}
