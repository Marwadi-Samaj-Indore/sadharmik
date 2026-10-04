"use client";

import { useState } from "react";
import { whatsappLink } from "@/lib/util";

/**
 * WhatsApp's own glyph, drawn flat in a single colour so it inherits the app's
 * palette instead of importing the brand green. Used wherever a member can
 * reach another member directly.
 */
export function WhatsAppGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.86 9.86 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.18 8.18 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.21-8.24 8.21Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.09-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.54c.13.17 1.74 2.65 4.2 3.71.59.26 1.05.41 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.29Z" />
    </svg>
  );
}

/**
 * Round icon button — used where space is tight, like a list row.
 *
 * Wishing someone is the reason Home exists, so the tap answers with a
 * ripple: the press scales down, the release springs back, and one soft
 * ring radiates out (see .wish-ring in globals.css). Remounting the ring
 * span by key replays the animation if the member taps again; WhatsApp
 * opens in a new tab so this page — and the ripple — stay visible.
 */
export function WhatsAppButton({
  phone,
  message,
  label,
}: {
  phone: string;
  message?: string;
  label: string;
}) {
  const [ripple, setRipple] = useState(0);

  return (
    <span className="relative shrink-0">
      {ripple > 0 && (
        <span
          key={ripple}
          aria-hidden="true"
          className="wish-ring pointer-events-none absolute inset-0 rounded-full border-2 border-kesar"
        />
      )}
      <a
        href={whatsappLink(phone, message)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        onClick={() => setRipple((n) => n + 1)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-kesar-deep text-white shadow-[var(--shadow-raised)] transition-transform duration-200 ease-[var(--ease-spring)] active:scale-90"
      >
        <WhatsAppGlyph />
      </a>
    </span>
  );
}
