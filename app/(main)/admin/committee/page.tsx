import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { ICON } from "@/lib/icons";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { BackBar, EmptyState } from "@/components/ui";
import { AvatarLite } from "@/components/Avatar";

export default async function CommitteeAdminPage() {
  const [db, session] = await Promise.all([getDb(), getSession()]);
  if (!session.isAdmin) redirect("/me");

  const members = [...db.committeeMembers].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <BackBar label="Committee section" href="/admin" />

      <div className="px-4 pt-5">
        <h1 className="text-title">Committee section</h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Shown on the Home screen. Display order 0 shows first and biggest —
          usually the head of the group.
        </p>

        <Link href="/admin/committee/new" className="btn btn-secondary mt-4 w-full">
          <Plus size={ICON.sm} />
          Add a committee member
        </Link>

        {members.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Nobody added yet"
              body="Add the group's office bearers — president, patrons, secretaries — and they'll appear on Home."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {members.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/admin/committee/${m.id}/edit`}
                  className="card flex items-center gap-3.5 p-3.5"
                >
                  <AvatarLite label={m.name.charAt(0)} photo={m.photo} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {m.name}
                    </span>
                    <span className="block truncate text-xs text-ink-soft">
                      {m.role || "No role set"} · order {m.sortOrder}
                    </span>
                  </span>
                  <Pencil size={ICON.sm} className="shrink-0 text-ink-faint" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
