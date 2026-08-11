import { redirect } from "next/navigation";

export default function FinancingDocumentsRedirectPage() {
  redirect("/dashboard/buyer/applications");
}
