import "server-only";
import { getSupabase } from "./supabase";

/**
 * Member photos and visiting cards live in Supabase file storage, not in the
 * database.
 *
 * Storing an image in a table means converting it to text, which inflates it by
 * about a third and — far worse — drags every photo along whenever a row is
 * read. The Directory loads all 363 members at once, so embedded photos would
 * put megabytes on the wire just to show a list of names.
 *
 * The bucket is private. Images are served through /api/photo, which checks the
 * session first, so a member's face and the phone number printed on their
 * visiting card stay behind the sign-in like everything else.
 */

const BUCKET = "member-photos";

import { isStoredPath } from "./util";

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([a-zA-Z]+\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) return null;
  return { contentType: match[1], bytes: Buffer.from(match[2], "base64") };
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * Stores an arbitrary uploaded file (biodata is usually a PDF, sometimes a
 * photo of a printed sheet) and returns its bucket path.
 */
export async function storeFile(
  dataUrl: string,
  { folder, name }: { folder: string; name: string }
): Promise<string | null> {
  if (!dataUrl.startsWith("data:")) return null;

  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return null;

  const extension = EXTENSIONS[decoded.contentType];
  if (!extension) throw new Error("Only PDF and image files can be uploaded.");

  const path = `${folder}/${name}-${Date.now()}.${extension}`;
  const { error } = await getSupabase()
    .storage.from(BUCKET)
    .upload(path, decoded.bytes, {
      contentType: decoded.contentType,
      upsert: true,
      cacheControl: "31536000",
    });

  if (error) throw new Error(`Could not save the file: ${error.message}`);
  return path;
}

/**
 * Uploads a browser-compressed image and returns its bucket path. Returns the
 * previous value untouched if this isn't a fresh upload, so saving a profile
 * without changing the photo costs nothing.
 */
export async function storeImage(
  incoming: string,
  { personId, kind }: { personId: string; kind: "photo" | "card" }
): Promise<string | null> {
  if (!incoming) return null;
  if (!incoming.startsWith("data:image/")) return incoming;

  const decoded = decodeDataUrl(incoming);
  if (!decoded) return null;

  const extension = decoded.contentType === "image/png" ? "png" : "jpg";
  // Timestamped so a replaced photo never serves from a stale browser cache
  const path = `people/${personId}/${kind}-${Date.now()}.${extension}`;

  const { error } = await getSupabase()
    .storage.from(BUCKET)
    .upload(path, decoded.bytes, {
      contentType: decoded.contentType,
      upsert: true,
      cacheControl: "31536000",
    });

  if (error) throw new Error(`Could not save the image: ${error.message}`);
  return path;
}

/** Tidies up a replaced file. Never throws — a failed cleanup must not fail a save. */
export async function removeImage(path: string | null | undefined) {
  if (!isStoredPath(path)) return;
  try {
    await getSupabase().storage.from(BUCKET).remove([path]);
  } catch {
    // Orphaned file is harmless; losing the member's edit would not be
  }
}

export async function downloadImage(path: string) {
  return getSupabase().storage.from(BUCKET).download(path);
}
