import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { BackBar } from "@/components/ui";
import { CircularForm } from "./CircularForm";
import { requireMember } from "@/lib/guard";

export default async function NewCircularPage() {
  await requireMember();
  const session = await getSession();
  if (!session.isAdmin) redirect("/feed?tab=circulars");

  return (
    <>
      <BackBar label="Post a circular" href="/feed?tab=circulars" />
      <CircularForm />
    </>
  );
}
