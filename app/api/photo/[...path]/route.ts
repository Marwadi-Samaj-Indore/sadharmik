import { getSessionLite } from "@/lib/session";
import { downloadImage } from "@/lib/storage";

/**
 * Serves member photos and visiting cards from the private bucket.
 *
 * Everything in this directory sits behind the sign-in, and photographs are no
 * exception — a visiting card has a phone number printed on it. So this checks
 * the session before streaming anything. The lite check — cookie signature
 * only, no database read — matters here: every avatar on a scrolled directory
 * page is a separate request to this route, and the full `getSession` would
 * load the entire directory again for each one.
 *
 * Filenames carry a timestamp, so a given URL always points at the same image
 * and can be cached hard by the member's phone. `private` keeps it out of any
 * shared cache along the way.
 */
const SERVABLE = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await getSessionLite();
  if (!session.isSignedIn) {
    return new Response("Sign in to view this image.", { status: 401 });
  }

  const { path } = await params;
  const key = path.join("/");

  // Refuse anything trying to climb out of the bucket
  if (key.includes("..") || key.startsWith("/")) {
    return new Response("Not found", { status: 404 });
  }

  const { data, error } = await downloadImage(key);
  if (error || !data) {
    return new Response("Not found", { status: 404 });
  }

  // ?download=Some+Name forces a save-to-device rather than opening in a tab,
  // which is what members expect from a biodata document
  const requested = new URL(request.url).searchParams.get("download");
  // Served only as one of the types we store, never as whatever the storage
  // object claims: anything else goes out as a download-only byte stream.
  // nosniff stops the browser second-guessing that, and the sandbox CSP means
  // even a hostile file opened directly can run no script on this origin.
  const type = SERVABLE.has(data.type) ? data.type : "application/octet-stream";
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    // Images are sandboxed outright. PDFs can't be (Chrome refuses to show a
    // sandboxed PDF) and its viewer isolates the document's own scripts.
    "Content-Security-Policy":
      type === "application/pdf"
        ? "frame-ancestors 'none'"
        : "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; sandbox",
  };
  if (type === "application/octet-stream") headers["Content-Disposition"] = "attachment";

  if (requested !== null) {
    // Strip anything that could break out of the header value
    const safeName = (requested || key.split("/").pop() || "file")
      .replace(/[^A-Za-z0-9 ._-]/g, "")
      .slice(0, 80);
    headers["Content-Disposition"] = `attachment; filename="${safeName}"`;
  }

  return new Response(await data.arrayBuffer(), { headers });
}
