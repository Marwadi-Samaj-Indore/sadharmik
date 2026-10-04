"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appendChange, deleteCircular, getDb, newId, saveCircular } from "@/lib/db";
import { actorName, getSession } from "@/lib/session";
import { removeImage, storeFile } from "@/lib/storage";
import { shortName } from "@/lib/util";

/**
 * Well under Vercel's 4.5MB ceiling on anything a function may receive, since
 * the file travels inside the server action's own body as a data URL and that
 * encoding costs a third again. A typed circular is a few hundred KB; a
 * scanned one that breaks this needs re-scanning, not a bigger limit.
 */
const MAX_BYTES = 3 * 1024 * 1024;

export interface CircularState {
  error?: string;
}

/** Only the committee posts circulars — that is what the word means. */
export async function uploadCircular(
  _prev: CircularState,
  formData: FormData
): Promise<CircularState> {
  const session = await getSession();
  if (!session.isSignedIn) redirect("/login");
  if (!session.isAdmin) redirect("/feed?tab=circulars");

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) {
    return { error: "Give the circular a title members will recognise." };
  }

  const file = String(formData.get("file") ?? "");
  if (!file.startsWith("data:")) {
    return { error: "Choose the PDF to attach." };
  }

  // A data URL is about a third larger than the file it encodes
  if (file.length * 0.75 > MAX_BYTES) {
    return { error: "That file is too large. Please keep it under 3MB." };
  }

  const id = newId("cr");
  let path: string | null;
  try {
    path = await storeFile(file, { folder: `circulars/${id}`, name: "circular" });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "That file could not be saved.",
    };
  }
  if (!path) return { error: "That file could not be read." };

  const entry = {
    id,
    title: title.slice(0, 120),
    note: String(formData.get("note") ?? "").trim().slice(0, 600),
    filePath: path,
    fileType: (file.startsWith("data:application/pdf") ? "pdf" : "image") as
      | "pdf"
      | "image",
    fileName: String(formData.get("fileName") ?? "").slice(0, 120),
    authorPersonId: session.person?.id ?? null,
    authorName: session.person ? shortName(session.person) : "Samaj Karyakarini",
    authorEmail: session.email,
    createdAt: new Date().toISOString(),
  };
  await saveCircular(entry);

  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: "Posted circular",
    target: entry.title,
    before: null,
    after: entry,
  });

  revalidatePath("/", "layout");
  redirect("/feed?tab=circulars&saved=post");
}

export async function removeCircular(id: string) {
  const session = await getSession();
  if (!session.isAdmin) return;

  const db = await getDb();
  const entry = db.circulars.find((c) => c.id === id);
  if (!entry) return;

  // Row first, file second — the reverse order could leave a listed circular
  // whose document is gone if the delete failed halfway
  await deleteCircular(id);
  await removeImage(entry.filePath);

  // Logged for visibility, but deliberately NOT undoable: the document went
  // with it, and a restored listing with no file would mislead
  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: "Removed circular",
    target: entry.title,
    before: entry,
    after: null,
  });

  revalidatePath("/", "layout");
}
