"use client";

import { useActionState, useRef, useState } from "react";
import { AlertCircle, FileText, Upload, Check } from "lucide-react";
import { ICON } from "@/lib/icons";
import { uploadBiodata, type BiodataState } from "@/app/actions/biodata";

const MAX_MB = 6;

export function BiodataForm() {
  const [state, formAction, pending] = useActionState<BiodataState, FormData>(
    uploadBiodata,
    {}
  );

  const [dataUrl, setDataUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [localError, setLocalError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * A PDF is sent as-is — re-encoding it would wreck the text. A photographed
   * sheet is downscaled in the browser so a 4MB camera shot doesn't crawl over
   * mobile data, but kept large enough to stay readable.
   */
  async function handleFile(file: File) {
    setLocalError("");

    if (file.size > MAX_MB * 1024 * 1024) {
      setLocalError(
        `That file is ${(file.size / 1048576).toFixed(1)}MB. Please keep it under ${MAX_MB}MB.`
      );
      return;
    }

    if (file.type === "application/pdf") {
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
      setLocalError("Please choose a PDF or an image.");
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

      <h1 className="text-title">Add a matrimonial profile</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        For anyone — your own family, a cousin, a relative outside the samaj.
        Members will contact <strong>you</strong> about it.
      </p>

      <div className="mt-6">
        <label htmlFor="title" className="label">
          Name of the person *
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={90}
          autoComplete="off"
          placeholder="e.g. Riya Jain"
          className="field text-lg"
        />
        <p className="mt-1 text-2xs text-ink-faint">
          This is the heading members will see in the feed.
        </p>
      </div>

      <div className="card-mist mt-5 p-4">
        <p className="flex items-center gap-1.5 font-display text-sm font-bold">
          <FileText size={ICON.sm} />
          The document *
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
          A PDF, or a clear photo of a printed biodata. Up to {MAX_MB}MB.
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
          aria-label="Choose a biodata file"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
      </div>

      <div className="mt-5">
        <label htmlFor="note" className="label">
          A short note (optional)
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={400}
          placeholder="Age, education, city, what the family is looking for — anything that helps."
          className="field resize-none"
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
          {pending ? "Uploading…" : "Share with members"}
        </button>
        <p className="mt-2.5 text-center text-2xs leading-relaxed text-ink-faint">
          Visible to signed-in samaj members only. You can remove it at any time.
        </p>
      </div>
    </form>
  );
}
