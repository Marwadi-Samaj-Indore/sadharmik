"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X, ZoomIn } from "lucide-react";
import { ICON } from "@/lib/icons";

/**
 * Circular / rectangular crop step, shown after a member picks a photo.
 *
 * Before this, a portrait was squashed into the round avatar wherever the
 * camera happened to frame it — a group shot became an unrecognisable smear.
 * Here the member drags to position and pinches or slides to zoom, and only
 * the visible part is uploaded.
 *
 * Deliberately hand-rolled rather than pulled from a package: the whole app
 * ships four dependencies, and this needs pointer-drag, pinch and a canvas
 * export, nothing more.
 */
export function PhotoCropper({
  file,
  aspect = 1,
  round = true,
  outputSize = 640,
  onCancel,
  onDone,
}: {
  file: File;
  /** width / height of the crop window. 1 for avatars, 16/9 for covers. */
  aspect?: number;
  round?: boolean;
  /** Longest edge of the exported image. */
  outputSize?: number;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
}) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  // Live gesture state is kept in a ref, not state — a pointermove fires far
  // faster than React can usefully re-render, and the numbers only need to be
  // correct at the moment of the next move event.
  const gesture = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    pinchStart: 0,
    zoomStart: 1,
  });

  useEffect(() => {
    let cancelled = false;
    let created: ImageBitmap | null = null;

    createImageBitmap(file)
      .then((bmp) => {
        if (cancelled) {
          bmp.close();
          return;
        }
        created = bmp;
        setBitmap(bmp);
      })
      .catch(() => {
        if (!cancelled) setError("That image could not be opened. Please try another.");
      });

    return () => {
      cancelled = true;
      created?.close();
    };
  }, [file]);

  /**
   * Smallest zoom that still covers the crop window, so there is never a
   * transparent gap inside the circle however the member drags.
   */
  const baseScale = useCallback(
    (frameW: number, frameH: number) => {
      if (!bitmap) return 1;
      return Math.max(frameW / bitmap.width, frameH / bitmap.height);
    },
    [bitmap]
  );

  /** Keeps the image covering the window after any drag or zoom. */
  const clamp = useCallback(
    (next: { x: number; y: number }, z: number) => {
      const frame = frameRef.current;
      if (!frame || !bitmap) return next;
      const { width: fw, height: fh } = frame.getBoundingClientRect();
      const scale = baseScale(fw, fh) * z;
      const limitX = Math.max(0, (bitmap.width * scale - fw) / 2);
      const limitY = Math.max(0, (bitmap.height * scale - fh) / 2);
      return {
        x: Math.min(limitX, Math.max(-limitX, next.x)),
        y: Math.min(limitY, Math.max(-limitY, next.y)),
      };
    },
    [bitmap, baseScale]
  );

  useEffect(() => {
    setOffset((o) => clamp(o, zoom));
  }, [zoom, clamp]);

  const activePointers = useRef(new Map<number, { x: number; y: number }>());

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      gesture.current.dragging = true;
      gesture.current.startX = e.clientX;
      gesture.current.startY = e.clientY;
      gesture.current.originX = offset.x;
      gesture.current.originY = offset.y;
    } else if (activePointers.current.size === 2) {
      const [a, b] = [...activePointers.current.values()];
      gesture.current.pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
      gesture.current.zoomStart = zoom;
      gesture.current.dragging = false;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size >= 2) {
      const [a, b] = [...activePointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current.pinchStart > 0) {
        const next = (dist / gesture.current.pinchStart) * gesture.current.zoomStart;
        setZoom(Math.min(4, Math.max(1, next)));
      }
      return;
    }

    if (!gesture.current.dragging) return;
    setOffset(
      clamp(
        {
          x: gesture.current.originX + (e.clientX - gesture.current.startX),
          y: gesture.current.originY + (e.clientY - gesture.current.startY),
        },
        zoom
      )
    );
  }

  function onPointerUp(e: React.PointerEvent) {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) gesture.current.pinchStart = 0;
    if (activePointers.current.size === 0) gesture.current.dragging = false;
  }

  function handleDone() {
    const frame = frameRef.current;
    if (!frame || !bitmap) return;
    setBusy(true);
    try {
      const { width: fw, height: fh } = frame.getBoundingClientRect();
      const scale = baseScale(fw, fh) * zoom;

      // Map the on-screen crop window back onto the source image.
      const sw = fw / scale;
      const sh = fh / scale;
      const sx = (bitmap.width - sw) / 2 - offset.x / scale;
      const sy = (bitmap.height - sh) / 2 - offset.y / scale;

      const outW = aspect >= 1 ? outputSize : Math.round(outputSize * aspect);
      const outH = aspect >= 1 ? Math.round(outputSize / aspect) : outputSize;

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      // A JPEG has no alpha, so an unpainted background would come out black
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);

      onDone(canvas.toDataURL("image/jpeg", 0.86));
    } catch {
      setError("That image could not be prepared. Please try another.");
      setBusy(false);
    }
  }

  // The picker sits inside a <form>; every control here must say type="button"
  // or it would submit the profile instead.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Position your photo"
      className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between px-2 py-2">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="flex h-11 w-11 items-center justify-center rounded-chip text-white/90 active:bg-white/10"
        >
          <X size={ICON.xl} />
        </button>
        <p className="text-sm font-semibold text-white">Position your photo</p>
        <button
          type="button"
          onClick={handleDone}
          disabled={!bitmap || busy}
          aria-label="Use this photo"
          className="flex h-11 w-11 items-center justify-center rounded-chip text-white disabled:opacity-40 active:bg-white/10"
        >
          <Check size={ICON.xl} />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-5">
        {error ? (
          <p className="text-center text-sm text-white/80">{error}</p>
        ) : (
          <div
            ref={frameRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ aspectRatio: String(aspect), touchAction: "none" }}
            className={`relative w-full max-w-sm overflow-hidden bg-black/40 ${
              round ? "rounded-full" : "rounded-inner"
            }`}
          >
            {bitmap && (
              <ImageLayer
                bitmap={bitmap}
                frameRef={frameRef}
                zoom={zoom}
                offset={offset}
                baseScale={baseScale}
              />
            )}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 border-2 border-white/70 ${
                round ? "rounded-full" : "rounded-inner"
              }`}
            />
          </div>
        )}
      </div>

      <div className="px-6 pb-8 pt-4">
        <label className="flex items-center gap-3 text-white">
          <ZoomIn size={ICON.md} className="shrink-0" />
          <span className="sr-only">Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-2 w-full accent-[var(--color-kesar)]"
          />
        </label>
        <p className="mt-3 text-center text-xs text-white/70">
          Drag to move · pinch or slide to zoom
        </p>
      </div>
    </div>
  );
}

/**
 * The bitmap is painted to a canvas rather than rendered as an <img> because
 * createImageBitmap already decoded it — re-encoding it to a blob URL just to
 * show it would double the work on an older phone.
 */
function ImageLayer({
  bitmap,
  frameRef,
  zoom,
  offset,
  baseScale,
}: {
  bitmap: ImageBitmap;
  frameRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  offset: { x: number; y: number };
  baseScale: (w: number, h: number) => number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;

    const { width: fw, height: fh } = frame.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(fw * dpr);
    canvas.height = Math.round(fh * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, fw, fh);

    const scale = baseScale(fw, fh) * zoom;
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, (fw - w) / 2 + offset.x, (fh - h) / 2 + offset.y, w, h);
  }, [bitmap, zoom, offset, baseScale, frameRef]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
