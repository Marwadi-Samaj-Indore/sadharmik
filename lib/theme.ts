import "server-only";
import { cookies } from "next/headers";

/**
 * Appearance is a committee decision, not the phone's.
 *
 * The app defaults to Light regardless of the device setting: members expect
 * the cream look they were shown, and plenty of phones sit in dark mode by
 * accident. Dark is offered as a deliberate choice under Me, with "Match my
 * phone" for anyone who wants the old behaviour.
 *
 * The choice is stored in a cookie and applied on the server as an attribute on
 * <html>, so the correct theme is in the very first byte of HTML — no flash of
 * the wrong colours while JavaScript loads.
 */
import type { Theme } from "./types";
export type { Theme };

const COOKIE = "sdm_theme";

export async function getTheme(): Promise<Theme> {
  const value = (await cookies()).get(COOKIE)?.value;
  return value === "dark" || value === "system" ? value : "light";
}

export async function setThemeCookie(theme: Theme) {
  (await cookies()).set(COOKIE, theme, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Colour of the browser/status bar chrome, matched to the chosen theme. */
export const themeColor = (theme: Theme) =>
  theme === "dark" ? "#16110e" : "#fdf8f1";
