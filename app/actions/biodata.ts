"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appendChange, deleteBiodata, getDb, newId, saveBiodata } from "@/lib/db";
import { actorName, getSession } from "@/lib/session";
import { removeImage, storeFile } from "@/lib/storage";
import { shortName } from "@/lib/util";

const MAX_BYTES = 6 * 1024 * 1024;

export interface BiodataState {
  error?: string;
}

/**
 * Shares a marriage biodata.
 *
 * The subject is a name typed by the uploader, not a member record — families
 * share biodata for cousins and relatives who often aren't in the samaj. Any
 * member may share as many as they like.
 */
export async function uploadBiodata(
  _prev: BiodataState,
  formData: FormData
): Promise<BiodataState> {
  const session = await getSession();
  if (!session.isSignedIn) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) {
    return { error: "Enter the name of the person this biodata is for." };
  }

  const file = String(formData.get("file") ?? "");
  if (!file.startsWith("data:")) {
    return { error: "Choose a PDF or an image to upload." };
  }

  // A data URL is about a third larger than the file it encodes
  if (file.length * 0.75 > MAX_BYTES) {
    return { error: "That file is too large. Please keep it under 6MB." };
  }

  const id = newId("bd");
  let path: string | null;
  try {
    path = await storeFile(file, { folder: `biodata/${id}`, name: "biodata" });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "That file could not be saved.",
    };
  }
  if (!path) return { error: "That file could not be read." };

  const entry = {
    id,
    title: title.slice(0, 90),
    filePath: path,
    fileType: (file.startsWith("data:application/pdf") ? "pdf" : "image") as
      | "pdf"
      | "image",
    fileName: String(formData.get("fileName") ?? "").slice(0, 120),
    note: String(formData.get("note") ?? "").trim().slice(0, 400),
    uploaderPersonId: session.person?.id ?? null,
    uploaderName: session.person ? shortName(session.person) : "Committee admin",
    uploaderEmail: session.email,
    createdAt: new Date().toISOString(),
  };
  await saveBiodata(entry);

  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: "Shared biodata",
    target: entry.title,
    before: null,
    after: entry,
  });

  revalidatePath("/", "layout");
  redirect("/feed?tab=matrimonial&saved=post");
}

/** Only the member who shared it, or an admin, can take it down. */
export async function removeBiodata(id: string) {
  const session = await getSession();
  if (!session.isSignedIn) redirect("/login");

  const db = await getDb();
  const entry = db.biodata.find((b) => b.id === id);
  if (!entry) return;

  const isOwner =
    session.person && entry.uploaderPersonId === session.person.id;
  if (!session.isAdmin && !isOwner) return;

  // Row first, file second — the reverse order could leave a listed biodata
  // whose document is gone if the delete failed halfway
  await deleteBiodata(id);
  await removeImage(entry.filePath);

  // Logged for visibility, but deliberately NOT undoable: the document went
  // with it, and a restored listing with no file would mislead
  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: "Removed biodata",
    target: entry.title,
    before: entry,
    after: null,
  });

  revalidatePath("/", "layout");
}
