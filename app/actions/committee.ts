"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  appendChange,
  clone,
  deleteCommitteeMember as deleteCommitteeMemberRow,
  getDb,
  newId,
  saveCommitteeMember,
} from "@/lib/db";
import { actorName, getSession } from "@/lib/session";
import { removeImage, storeFile } from "@/lib/storage";
import type { CommitteeMember } from "@/lib/types";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export async function createCommitteeMember(formData: FormData) {
  const session = await getSession();
  if (!session.isAdmin) redirect("/admin");

  const name = text(formData, "name");
  if (!name) redirect("/admin/committee/new");

  const id = newId("cmt");
  const photoInput = text(formData, "photo");
  const photo = photoInput.startsWith("data:image/")
    ? await storeFile(photoInput, { folder: `committee/${id}`, name: "photo" })
    : null;

  const member: CommitteeMember = {
    id,
    name: name.slice(0, 100),
    role: text(formData, "role").slice(0, 60),
    phone: text(formData, "phone").replace(/\D/g, "").slice(-10) || null,
    photo,
    sortOrder: Number(formData.get("sortOrder")) || 0,
  };

  await saveCommitteeMember(member);
  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: "Added committee member",
    target: member.name,
    before: null,
    after: member,
  });
  revalidatePath("/", "layout");
  redirect("/admin/committee");
}

export async function updateCommitteeMember(memberId: string, formData: FormData) {
  const session = await getSession();
  if (!session.isAdmin) redirect("/admin");

  const db = await getDb();
  const existing = db.committeeMembers.find((m) => m.id === memberId);
  if (!existing) redirect("/admin/committee");

  const name = text(formData, "name");
  if (!name) redirect(`/admin/committee/${memberId}/edit`);

  const member = clone(existing);
  member.name = name.slice(0, 100);
  member.role = text(formData, "role").slice(0, 60);
  member.phone = text(formData, "phone").replace(/\D/g, "").slice(-10) || null;
  member.sortOrder = Number(formData.get("sortOrder")) || 0;

  // The replaced photo is deleted only after the save lands — a failed save
  // must leave an orphaned file, not a member pointing at a deleted one
  const photoInput = text(formData, "photo");
  let obsolete: string | null = null;
  if (text(formData, "removePhoto") === "on") {
    obsolete = existing.photo;
    member.photo = null;
  } else if (photoInput.startsWith("data:image/")) {
    member.photo = await storeFile(photoInput, {
      folder: `committee/${memberId}`,
      name: "photo",
    });
    obsolete = existing.photo;
  }

  await saveCommitteeMember(member);
  await removeImage(obsolete);
  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: "Updated committee member",
    target: member.name,
    before: existing,
    after: member,
  });
  revalidatePath("/", "layout");
  redirect("/admin/committee");
}

export async function removeCommitteeMember(memberId: string) {
  const session = await getSession();
  if (!session.isAdmin) return;

  const db = await getDb();
  const member = db.committeeMembers.find((m) => m.id === memberId);
  if (!member) return;

  // Row first, file second — see removeMeeting
  await deleteCommitteeMemberRow(memberId);
  await removeImage(member.photo);
  await appendChange({
    byEmail: session.email,
    byName: actorName(session),
    action: "Deleted committee member",
    target: member.name,
    before: member,
    after: null,
  });
  revalidatePath("/", "layout");
  redirect("/admin/committee");
}
