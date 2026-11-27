"use client";

import { useEffect } from "react";
import { markNotificationsSeen } from "@/app/actions/notifications";

/**
 * Marks the bell read once the screen is actually open. Done from the browser
 * rather than while rendering the page, so a link prefetch, which renders
 * without anyone looking, can never clear a member's unread count.
 */
export function MarkSeen() {
  useEffect(() => {
    markNotificationsSeen().catch(() => {});
  }, []);
  return null;
}
