"use client";

import { useState, type ReactNode } from "react";

/**
 * Marital status, and the wedding anniversary that only a married person has.
 *
 * The date appears the moment "Married" is picked rather than sitting on every
 * profile, because an anniversary box on a child's or a single person's form
 * reads as a question they're failing to answer. Choosing anything else hides
 * it, and a hidden field isn't submitted, so the saved date is cleared too.
 *
 * The blood-group field arrives as `beside` so the two selects keep sharing a
 * row, with the date beneath them at full width.
 */
export function MaritalFields({
  beside,
  maritalStatus,
  anniversary,
}: {
  beside: ReactNode;
  maritalStatus: string;
  anniversary: string | null;
}) {
  const [status, setStatus] = useState(maritalStatus);
  const married = status === "married";

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {beside}
        <div>
          <label htmlFor="maritalStatus" className="label">
            Marital status
          </label>
          <select
            id="maritalStatus"
            name="maritalStatus"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="field"
          >
            <option value="">Not specified</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="widowed">Widowed</option>
          </select>
        </div>
      </div>
      {married && (
        <div>
          <label htmlFor="anniversary" className="label">
            Wedding anniversary
          </label>
          <input
            id="anniversary"
            name="anniversary"
            type="date"
            defaultValue={anniversary ?? ""}
            min="1930-01-01"
            className="field"
          />
        </div>
      )}
    </>
  );
}
