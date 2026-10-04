import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { BackBar } from "@/components/ui";
import { CircularForm } from "./CircularForm";

export default async function NewCircularPage() {
  const session = await getSession();
  if (!session.isAdmin) redirect("/feed?tab=circulars");

  return (
    <>
      <BackBar label="Post a circular" href="/feed?tab=circulars" />
      <CircularForm />
    </>
  );
}
