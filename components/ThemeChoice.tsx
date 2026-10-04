"use client";

import { useState, useTransition } from "react";
import { Sun, Moon, Smartphone } from "lucide-react";
import { ICON } from "@/lib/icons";
import { setTheme } from "@/app/actions/theme";
// From lib/types, not lib/theme — lib/theme is server-only
import type { Theme } from "@/lib/types";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "My phone", icon: Smartphone },
];

/**
 * Appearance picker.
 *
 * The switch is applied to the document immediately on tap rather than waiting
 * for the server round trip — changing a colour scheme should feel instant.
 * The cookie is written in the background so the choice survives a reload.
 */
export function ThemeChoice({ current }: { current: Theme }) {
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Theme>(current);

  function choose(theme: Theme) {
    // Paint first, persist second — switching colour scheme should feel instant
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    document.documentElement.dataset.theme = resolved;
    setSelected(theme);

    startTransition(() => {
      void setTheme(theme);
    });
  }

  return (
    <div className="card mx-4 p-3.5">
      <p className="mb-2.5 text-sm font-semibold">Appearance</p>
      <div
        role="radiogroup"
        aria-label="Appearance"
        className="grid grid-cols-3 gap-2"
      >
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = selected === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(value)}
              className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-inner border transition-all duration-200 active:scale-[0.97] ${
                active
                  ? "border-kesar-deep bg-kesar-pale text-kesar-ink"
                  : "border-line bg-surface text-ink-soft"
              }`}
            >
              <Icon size={ICON.md} strokeWidth={active ? 2.3 : 1.9} />
              <span className="text-xs font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 text-2xs leading-relaxed text-ink-faint">
        The app opens in Light unless you change it here.
      </p>
    </div>
  );
}
