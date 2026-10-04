"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { ICON } from "@/lib/icons";

const MESSAGES: Record<string, string> = {
  profile: "Profile saved",
  household: "Household saved",
  post: "Posted",
  member: "Family member added",
  meeting: "Meeting saved",
  switched: "Switched — you are now using the app as this member",
};

/**
 * Confirms that a save actually happened.
 *
 * Before this, editing a profile just bounced you back to the previous screen
 * with no acknowledgement — leaving members unsure whether it worked, and
 * likely to submit again. The toast reads the flag the server action set,
 * announces it politely to screen readers, then strips the parameter so a
 * refresh doesn't replay it.
 */
export function SaveToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const saved = params.get("saved");

  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  // Fires only when the `saved` value itself changes — not on every params
  // object identity change, which router.replace() below would otherwise
  // cause, cancelling the hide timer in the other effect before it ran.
  useEffect(() => {
    if (!saved || !MESSAGES[saved]) return;

    setMessage(MESSAGES[saved]);
    setVisible(true);

    // Clean the URL immediately so a reload or a back-navigation doesn't
    // resurrect a stale confirmation
    const next = new URLSearchParams(params.toString());
    next.delete("saved");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  useEffect(() => {
    if (!visible) return;
    const hide = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(hide);
  }, [visible]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: "calc(6.5rem + env(safe-area-inset-bottom))" }}
    >
      <div
        className={`flex items-center gap-2 rounded-chip bg-kesar-deep px-4 py-2.5 text-base font-semibold text-white shadow-[var(--shadow-float)] transition-all duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] ${
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface/25">
          <Check size={ICON.micro} strokeWidth={3} />
        </span>
        {message || "Saved"}
      </div>
    </div>
  );
}
