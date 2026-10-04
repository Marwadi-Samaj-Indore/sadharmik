import Link from "next/link";
import { Download, Eye, FileText } from "lucide-react";
import { ICON } from "@/lib/icons";
import { RemoveCircularButton } from "./RemoveCircularButton";

export interface CircularRow {
  id: string;
  title: string;
  note: string;
  fileUrl: string;
  downloadUrl: string;
  fileType: "pdf" | "image";
  authorName: string;
  authorPersonId: string | null;
  postedAgo: string;
  canRemove: boolean;
}

/**
 * The circular shelf.
 *
 * Read as a stack of paper rather than a stack of posts: the date is the first
 * thing on each one, because circulars are found by when they went out at
 * least as often as by what they were called.
 */
export function CircularList({ entries }: { entries: CircularRow[] }) {
  return (
    <ul className="mt-4 space-y-3 px-4">
      {entries.map((c) => (
        <li key={c.id} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-faint">
                {c.fileType === "pdf" ? (
                  <FileText size={ICON.micro} />
                ) : (
                  <Eye size={ICON.micro} />
                )}
                {c.postedAgo}
              </div>
              <h2 className="mt-1 font-display text-lg font-bold leading-snug">
                {c.title}
              </h2>
            </div>
            {c.canRemove && <RemoveCircularButton id={c.id} title={c.title} />}
          </div>

          {c.note && (
            <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {c.note}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <a
              href={c.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary flex-1"
            >
              {c.fileType === "pdf" ? (
                <FileText size={ICON.sm} />
              ) : (
                <Eye size={ICON.sm} />
              )}
              Read
            </a>
            <a href={c.downloadUrl} className="btn btn-ghost flex-1">
              <Download size={ICON.sm} />
              Save
            </a>
          </div>

          <p className="mt-3 text-2xs text-ink-faint">
            Posted by{" "}
            {c.authorPersonId ? (
              <Link
                href={`/person/${c.authorPersonId}`}
                className="font-semibold text-ink-soft"
              >
                {c.authorName}
              </Link>
            ) : (
              <span className="font-semibold text-ink-soft">{c.authorName}</span>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
