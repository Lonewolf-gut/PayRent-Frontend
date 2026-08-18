import { redirect } from "next/navigation";

export default function AdminFinancingDocumentsRedirectPage() {
  redirect("/admin/financing?tab=documents");
}
