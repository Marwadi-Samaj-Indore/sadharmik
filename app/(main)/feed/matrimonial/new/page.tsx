import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { BackBar } from "@/components/ui";
import { BiodataForm } from "./BiodataForm";

export default async function NewBiodataPage() {
  const session = await getSession();
  if (!session.isSignedIn) redirect("/login");

  return (
    <>
      <BackBar label="Add a matrimonial profile" href="/feed?tab=matrimonial" />
      <BiodataForm />
    </>
  );
}
