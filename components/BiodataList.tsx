import Link from "next/link";
import { Download, FileText, Eye } from "lucide-react";
import { ICON } from "@/lib/icons";
import { AvatarLite } from "./Avatar";
import { WhatsAppButton } from "./WhatsAppButton";
import { RemoveBiodataButton } from "./RemoveBiodataButton";

export interface BiodataRow {
  id: string;
  /** Name of the person the biodata is for */
  title: string;
  note: string;
  fileUrl: string;
  downloadUrl: string;
  fileType: "pdf" | "image";
  uploaderName: string;
  uploaderPersonId: string | null;
  uploaderInitials: string;
  uploaderPhoto: string | null;
  sharedAgo: string;
  whatsapp: string | null;
  whatsappMessage: string;
  canRemove: boolean;
}

/**
 * The biodata repository.
 *
 * The subject's name is the headline, since that is what a family scans for.
 * The uploader is shown beneath because they are the point of contact — the
 * person in the biodata often isn't in the samaj at all.
 */
export function BiodataList({ entries }: { entries: BiodataRow[] }) {
  return (
    <ul className="mt-4 space-y-3 px-4">
      {entries.map((b) => (
        <li key={b.id} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-faint">
                {b.fileType === "pdf" ? <FileText size={ICON.micro} /> : <Eye size={ICON.micro} />}
                Matrimonial
              </div>
              <h2 className="mt-1 font-display text-lg font-bold leading-snug">
                {b.title}
              </h2>
            </div>
            {b.canRemove && <RemoveBiodataButton id={b.id} name={b.title} />}
          </div>

          {b.note && (
            <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {b.note}
            </p>
          )}

          {/* Who to contact about it */}
          <div className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
            <AvatarLite
              label={b.uploaderInitials}
              photo={b.uploaderPhoto}
              size="sm"
            />
            <span className="min-w-0 flex-1 truncate">
              Shared by{" "}
              {b.uploaderPersonId ? (
                <Link
                  href={`/person/${b.uploaderPersonId}`}
                  className="font-semibold text-ink-soft"
                >
                  {b.uploaderName}
                </Link>
              ) : (
                <span className="font-semibold text-ink-soft">{b.uploaderName}</span>
              )}{" "}
              · {b.sharedAgo}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <a
              href={b.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost flex-1"
            >
              {b.fileType === "pdf" ? <FileText size={ICON.sm} /> : <Eye size={ICON.sm} />}
              View
            </a>

            <a href={b.downloadUrl} className="btn btn-ghost flex-1">
              <Download size={ICON.sm} />
              Save
            </a>

            {b.whatsapp && (
              <WhatsAppButton
                phone={b.whatsapp}
                message={b.whatsappMessage}
                label={`Message ${b.uploaderName} about ${b.title}`}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
