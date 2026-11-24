import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { BackBar } from "@/components/ui";
import { BiodataForm } from "./BiodataForm";
import { requireMember } from "@/lib/guard";

export default async function NewBiodataPage() {
  await requireMember();
  const session = await getSession();
  if (!session.isSignedIn) redirect("/login");

  return (
    <>
      <BackBar label="Add a matrimonial profile" href="/feed?tab=matrimonial" />
      <BiodataForm />
    </>
  );
}
