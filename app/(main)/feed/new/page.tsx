import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { BackBar } from "@/components/ui";
import { NewPostForm } from "./NewPostForm";

/**
 * Two screens sharing one route. An announcement and a requirement are
 * different acts by different people — the committee speaking to 456 members,
 * and one member asking the group for something — and the toggle that used to
 * sit at the top of this form put the wrong one a mis-tap away every time.
 * Which one you get is decided by where you came from, not by a control.
 */
export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const [db, session, { type }] = await Promise.all([
    getDb(),
    getSession(),
    searchParams,
  ]);

  // Only the committee announces. A member who reaches this URL some other way
  // gets the form they can actually post, rather than a refusal.
  const isAnnouncement = type === "announcement" && session.isAdmin;

  const areas = [...new Set(db.households.map((h) => h.area).filter(Boolean))].sort();

  // How many requirements this member has already posted this week
  const week = 7 * 86400000;
  const postedThisWeek = session.person
    ? db.requirements.filter(
        (r) =>
          r.authorPersonId === session.person!.id &&
          Date.now() - new Date(r.createdAt).getTime() < week
      ).length
    : 0;

  return (
    <>
      <BackBar
        label={isAnnouncement ? "New announcement" : "New requirement"}
        href={isAnnouncement ? "/feed?tab=announcements" : "/feed?tab=requirements"}
      />
      <NewPostForm
        type={isAnnouncement ? "announcement" : "requirement"}
        areas={areas}
        postedThisWeek={postedThisWeek}
        defaultArea={
          session.person
            ? db.households.find((h) => h.id === session.person!.householdId)?.area ?? ""
            : ""
        }
      />
    </>
  );
}
