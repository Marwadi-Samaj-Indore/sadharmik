"use client";

import { useFormStatus } from "react-dom";

/**
 * A submit button that disables itself and says so while its form is
 * in flight. Plain `<button type="submit">` looks identical whether a tap
 * has registered or not — on the mobile data most members are on, that gap
 * is long enough to invite a second tap, which for a delete action means a
 * double-submit racing the first. Disabling on `pending` closes that window
 * outright; the label swap is what makes the disabled state readable rather
 * than just looking broken.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  ...rest
}: {
  children: React.ReactNode;
  /** Omit for an icon-only button — there's no room for a label, so it just
   * disables and dims instead of swapping text. */
  pendingLabel?: string;
  className: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "disabled" | "className">) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={pendingLabel ? className : `${className} disabled:opacity-40`}
      {...rest}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
