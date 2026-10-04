"use server";

import { revalidatePath } from "next/cache";
import { setThemeCookie, type Theme } from "@/lib/theme";

export async function setTheme(theme: Theme) {
  const valid: Theme[] = ["light", "dark", "system"];
  if (!valid.includes(theme)) return;

  await setThemeCookie(theme);
  // So a later server render emits the right data-theme attribute
  revalidatePath("/", "layout");
}
