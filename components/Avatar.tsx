import type { Person } from "@/lib/types";
import { initials, photoUrl } from "@/lib/util";

const SIZES = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  /** Directory rows — the size at which a photo becomes a face */
  row: "h-14 w-14 text-base",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
  /** Profile hero */
  hero: "h-28 w-28 text-3xl",
} as const;

export type AvatarSize = keyof typeof SIZES;

/**
 * Most of the directory still has no photo, so the initials tile is the
 * app's default face — it has to feel designed, not like a broken image.
 * Serif initials read as a printed monogram rather than a placeholder, which
 * is the difference between a yearbook page and an empty CRM record.
 *
 * `data-avatar` marks the element the FLIP transition measures when a row is
 * tapped (see components/Flip.tsx).
 */
export function AvatarLite({
  label,
  photo,
  size = "md",
  className = "",
}: {
  label: string;
  photo?: string | null;
  size?: AvatarSize;
  className?: string;
}) {
  const src = photoUrl(photo);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        data-avatar=""
        loading="lazy"
        decoding="async"
        className={`${SIZES[size]} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      data-avatar=""
      className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full bg-kesar-pale font-serif font-semibold text-kesar-ink ${className}`}
    >
      {label || "?"}
    </div>
  );
}

export function Avatar({
  person,
  size = "md",
  className = "",
}: {
  person: Person;
  size?: AvatarSize;
  className?: string;
}) {
  return (
    <AvatarLite
      label={initials(person)}
      photo={person.privacy.hidePhoto ? null : person.photo}
      size={size}
      className={`${person.deceased ? "grayscale" : ""} ${className}`}
    />
  );
}
