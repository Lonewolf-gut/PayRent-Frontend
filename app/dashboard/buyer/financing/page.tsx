import { redirect } from "next/navigation";

export default function FinancingRedirectPage() {
  redirect("/dashboard/buyer/applications");
}
