import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Download,
  MessageCircle,
  Undo2,
  Users,
  Cake,
  Briefcase,
  Trash2,
  Star,
} from "lucide-react";
import { getChangeLog, getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { clearDemoContent } from "@/app/actions/data";
import { BackBar, SectionHeading, Badge } from "@/components/ui";
import { ResolveIssueButton, UndoButton } from "@/components/AdminActions";
import { SubmitButton } from "@/components/SubmitButton";
import { completion, fullName, relativeTime, whatsappLink } from "@/lib/util";
import { ICON } from "@/lib/icons";

const KIND_LABEL: Record<string, string> = {
  unreadable: "Damaged by Excel",
  review: "Needs confirming",
  missing: "Missing information",
  "extra-value": "Extra value found",
  "child-unreadable": "Child details unreadable",
  "child-phone": "Child phone unreadable",
  "child-age-order": "Which age belongs to whom",
};

const KIND_ORDER = [
  "unreadable",
  "child-unreadable",
  "child-phone",
  "review",
  "child-age-order",
  "extra-value",
  "missing",
];

export default async function AdminPage() {
  const [db, session, changes] = await Promise.all([
    getDb(),
    getSession(),
    getChangeLog(),
  ]);
  if (!session.isAdmin) redirect("/me");

  const open = db.issues.filter((i) => !i.resolved);
  const resolvedCount = db.issues.length - open.length;
  const householdById = new Map(db.households.map((h) => [h.id, h]));
  const personById = new Map(db.people.map((p) => [p.id, p]));

  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    items: open.filter((i) => i.kind === kind),
  })).filter((g) => g.items.length > 0);

  // Completion dashboard — who to chase, worst first
  const heads = db.people.filter((p) => p.relationship === "self");
  const ranked = heads
    .map((p) => ({
      person: p,
      household: householdById.get(p.householdId),
      score: completion(p),
    }))
    .sort((a, b) => a.score - b.score);

  const listedBusinesses = db.people.filter((p) => p.business.category).length;
  const withPhoto = db.people.filter((p) => p.photo).length;
  const claimed = db.people.filter((p) => p.claimedByEmail).length;
  const avgCompletion = Math.round(
    heads.reduce((a, p) => a + completion(p), 0) / Math.max(heads.length, 1)
  );

  return (
    <>
      <BackBar label="Admin panel" href="/me" />

      {/* Summary */}
      <div className="px-4 pt-5">
        <h1 className="text-title">Committee tools</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Signed in as {session.email}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat
            icon={<Users size={ICON.md} />}
            value={`${claimed}/${db.people.length}`}
            label="Profiles claimed"
          />
          <Stat
            icon={<Briefcase size={ICON.md} />}
            value={`${listedBusinesses}`}
            label="Businesses listed"
          />
          <Stat
            icon={<Cake size={ICON.md} />}
            value={`${withPhoto}`}
            label="Photos uploaded"
          />
          <Stat
            icon={<AlertTriangle size={ICON.md} />}
            value={`${open.length}`}
            label="Need attention"
          />
        </div>
      </div>

      {/* Needs attention. Triage has to feel finite — the running
          "N dealt with" line is what turns 84 items from a wall into a
          countdown. The damaged original text renders verbatim in its own
          treatment so the admin judges the source, not a paraphrase. */}
      <section className="mt-7">
        <SectionHeading>
          {open.length === 0 ? (
            "Needs attention"
          ) : (
            <>
              Needs attention — <span className="tnum">{open.length}</span> left
            </>
          )}
        </SectionHeading>
        {resolvedCount > 0 && open.length > 0 && (
          <p className="-mt-1 px-4 pb-2 text-xs text-ink-faint">
            <span className="tnum">{resolvedCount}</span> already dealt with.
          </p>
        )}
        {grouped.length === 0 ? (
          <p className="card-mist mx-4 px-4 py-5 text-center text-sm text-ink-soft">
            Nothing outstanding. Every imported record has been dealt with.
          </p>
        ) : (
          <div className="mx-4 space-y-4">
            {grouped.map((group) => (
              <div key={group.kind}>
                <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-ink-soft">
                  {KIND_LABEL[group.kind] ?? group.kind}
                  <Badge>{group.items.length}</Badge>
                </p>
                <ul className="space-y-2">
                  {group.items.slice(0, 12).map((issue) => {
                    const household = householdById.get(issue.householdId);
                    const person = issue.personId
                      ? personById.get(issue.personId)
                      : null;
                    const fixHref = person
                      ? `/me/edit/${person.id}?from=admin`
                      : `/me/household/${issue.householdId}?from=admin`;

                    return (
                      <li key={issue.id} className="card p-3.5">
                        <p className="font-display text-sm font-bold">
                          {person ? fullName(person) : household?.familyName}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                          {issue.message}
                        </p>
                        {issue.raw && issue.raw !== issue.message && (
                          <p className="mt-1.5 break-words rounded-inner bg-cream-deep px-2.5 py-1.5 font-mono text-2xs text-ink-soft">
                            {issue.raw}
                          </p>
                        )}
                        <div className="mt-2.5 flex gap-2">
                          <Link href={fixHref} className="btn btn-secondary flex-1">
                            Fix now
                          </Link>
                          <ResolveIssueButton issueId={issue.id} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {group.items.length > 12 && (
                  <p className="mt-2 text-xs text-ink-faint">
                    Showing 12 of {group.items.length}. Resolve these to see the rest.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Completion dashboard */}
      <section className="mt-7">
        <SectionHeading>
          Chase list — average <span className="tnum">{avgCompletion}</span>% complete
        </SectionHeading>
        <p className="px-4 pb-2 text-xs leading-relaxed text-ink-soft">
          Least complete profiles first. Tap WhatsApp to send a reminder with the app
          link.
        </p>
        {/* One divided card, not fifteen separate ones — this list is a work
            queue for an admin, and density is what makes chasing twenty
            profiles in a sitting feel possible. The hairline meter gives the
            score a shape the eye can rank without reading every number. */}
        <ul className="card mx-4 divide-y divide-line-soft">
          {ranked.slice(0, 15).map(({ person, household, score }) => (
            <li key={person.id} className="flex min-h-[3rem] items-center gap-3 px-3.5 py-2">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/person/${person.id}`}
                  className="block truncate text-sm font-semibold"
                >
                  {fullName(person)}
                </Link>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-kesar-mist"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full rounded-full bg-kesar"
                      style={{ width: `${score}%` }}
                    />
                  </span>
                  <span className="truncate text-xs text-ink-soft">
                    <span className="tnum">{score}</span>% · {household?.familyName}
                  </span>
                </div>
              </div>
              {person.whatsapp ? (
                <a
                  href={whatsappLink(
                    person.whatsapp,
                    `Jai Jinendra ${person.firstName}, this is from the samaj committee. Please open the Marwadi Samaj Indore app and complete your profile — especially your photo and business details, so other members can find you. Thank you!`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Send WhatsApp reminder to ${person.firstName}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-kesar-pale text-kesar-ink"
                >
                  <MessageCircle size={ICON.sm} />
                </a>
              ) : (
                <span className="shrink-0 text-2xs text-ink-faint">No number</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Recent changes */}
      <section className="mt-7">
        <SectionHeading>Recent changes</SectionHeading>
        {changes.length === 0 ? (
          <p className="card-mist mx-4 px-4 py-5 text-center text-sm text-ink-soft">
            Nothing has been edited yet.
          </p>
        ) : (
          <ul className="mx-4 space-y-2">
            {changes.slice(0, 15).map((entry) => (
              <li key={entry.id} className="card flex items-center gap-3.5 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {entry.action}: {entry.target}
                  </p>
                  <p className="truncate text-xs text-ink-soft">
                    {entry.byName} · {relativeTime(entry.at)}
                    {entry.undone && " · undone"}
                  </p>
                </div>
                {!entry.undone && entry.before !== null && (
                  <UndoButton changeId={entry.id} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Home screen */}
      <section className="mt-7 px-4">
        <SectionHeading>Home screen</SectionHeading>
        <Link
          href="/admin/committee"
          className="card card-tap flex items-center gap-3.5 p-3.5"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-kesar-pale">
            <Star size={ICON.md} className="text-kesar-ink" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Committee section</span>
            <span className="block text-xs text-ink-soft">
              President, patrons, secretaries — shown with photos on Home
            </span>
          </span>
        </Link>
      </section>

      {/* Data */}
      <section className="mt-7 px-4 pb-4">
        <SectionHeading>Data</SectionHeading>
        <div className="space-y-2">
          <a
            href="/api/export"
            className="card card-tap flex items-center gap-3.5 p-3.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-kesar-pale">
              <Download size={ICON.md} className="text-kesar-ink" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                Export the whole directory
              </span>
              <span className="block text-xs text-ink-soft">
                CSV file that opens in Excel — the group always owns its data
              </span>
            </span>
          </a>

          <form action={clearDemoContent}>
            <SubmitButton className="card card-tap flex w-full items-center gap-3.5 p-3.5 text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-soft">
                <Trash2 size={ICON.md} className="text-danger" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  Remove the sample feed posts
                </span>
                <span className="block text-xs text-ink-soft">
                  Deletes the demo announcement and two example requirements
                </span>
              </span>
            </SubmitButton>
          </form>
        </div>
      </section>
    </>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="card-fill p-3.5">
      <span className="text-kesar-ink">{icon}</span>
      <p className="tnum mt-1.5 font-display text-xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-2xs font-medium text-kesar-ink/75">{label}</p>
    </div>
  );
}
