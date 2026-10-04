"use client";

import { useRef, useState, useTransition } from "react";
import { Minus, Plus, Users } from "lucide-react";
import { ICON } from "@/lib/icons";
import { setRsvpCount, clearRsvp } from "@/app/actions/meetings";

/**
 * The attendance poll, built to be the most satisfying tap in the app.
 *
 * Everything responds instantly: "We're coming" flips the card on the spot,
 * the stepper moves the count with a spring pop, and the headline total
 * follows along — the server call happens behind the gesture, debounced so
 * five quick taps of + become one write. If the write fails, the next
 * revalidation simply shows the server's truth; nothing here blocks a
 * member's thumb on a network round-trip.
 */
const COMMIT_DELAY_MS = 600;
const MAX_COUNT = 20;

export function RsvpCard({
  meetingId,
  myCount,
  othersTotal,
  otherFamilies,
  responders,
  canRespond,
}: {
  meetingId: string;
  /** This member's saved headcount, or null if they haven't responded */
  myCount: number | null;
  /** Attendees from everyone else's responses */
  othersTotal: number;
  otherFamilies: number;
  responders: { name: string; count: number }[];
  canRespond: boolean;
}) {
  const [count, setCount] = useState<number | null>(myCount);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = (next: number | null) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        if (next === null) await clearRsvp(meetingId);
        else await setRsvpCount(meetingId, next);
      });
    }, COMMIT_DELAY_MS);
  };

  const change = (next: number | null) => {
    setCount(next);
    commit(next);
  };

  const total = othersTotal + (count ?? 0);
  const families = otherFamilies + (count ? 1 : 0);

  return (
    <div className="card-mist mt-5 p-4">
      <p className="flex items-center gap-1.5 font-display text-sm font-bold">
        <Users size={ICON.sm} />
        Who&apos;s coming
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
        {total > 0 ? (
          <>
            <span className="tnum font-semibold">{total}</span>{" "}
            {total === 1 ? "member" : "members"} from{" "}
            <span className="tnum">{families}</span>{" "}
            {families === 1 ? "family" : "families"} so far.
          </>
        ) : (
          "Be the first to say you're coming."
        )}
      </p>

      {responders.length > 0 && (
        <ul className="mt-2.5 space-y-1 text-xs text-ink-soft">
          {responders.map((r) => (
            <li key={r.name}>
              {r.name} · <span className="tnum">{r.count}</span>{" "}
              {r.count === 1 ? "person" : "people"}
            </li>
          ))}
        </ul>
      )}

      {canRespond ? (
        count === null ? (
          <button
            type="button"
            onClick={() => change(1)}
            className="btn btn-primary mt-3.5 w-full"
          >
            We&apos;re coming
          </button>
        ) : (
          <>
            <div className="mt-3.5 flex items-center gap-3">
              <div className="flex flex-1 items-center justify-between rounded-chip bg-surface px-2 py-1.5 shadow-[var(--shadow-rest)]">
                <button
                  type="button"
                  onClick={() => change(Math.max(1, count - 1))}
                  disabled={count <= 1}
                  aria-label="One fewer person"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-kesar-ink transition-transform active:scale-90 disabled:opacity-30"
                >
                  <Minus size={ICON.md} />
                </button>
                {/* Keyed on the value so each change replays the pop */}
                <span
                  key={count}
                  className="count-pop tnum min-w-[3.5rem] text-center font-display text-xl font-bold"
                  aria-live="polite"
                >
                  {count}
                </span>
                <button
                  type="button"
                  onClick={() => change(Math.min(MAX_COUNT, count + 1))}
                  disabled={count >= MAX_COUNT}
                  aria-label="One more person"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-kesar-ink transition-transform active:scale-90 disabled:opacity-30"
                >
                  <Plus size={ICON.md} />
                </button>
              </div>
              <p className="w-24 text-xs leading-snug text-ink-soft">
                of you are coming
              </p>
            </div>
            <button
              type="button"
              onClick={() => change(null)}
              className="mt-2.5 text-xs font-semibold text-danger"
            >
              Not coming after all? Withdraw
            </button>
          </>
        )
      ) : (
        <p className="mt-3 text-xs text-ink-faint">
          Sign in with your own profile to let the committee know you&apos;re
          coming.
        </p>
      )}
    </div>
  );
}
