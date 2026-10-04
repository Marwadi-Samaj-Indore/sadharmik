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
  const headers: Record<string, string> = {
    "Content-Type": data.type || "application/octet-stream",
    "Cache-Control": "private, max-age=31536000, immutable",
  };

  if (requested !== null) {
    // Strip anything that could break out of the header value
    const safeName = (requested || key.split("/").pop() || "file")
      .replace(/[^A-Za-z0-9 ._-]/g, "")
      .slice(0, 80);
    headers["Content-Disposition"] = `attachment; filename="${safeName}"`;
  }

  return new Response(await data.arrayBuffer(), { headers });
}
