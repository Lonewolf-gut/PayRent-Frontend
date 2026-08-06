import { auth } from "@/lib/auth";
import { getPostAuthRoute } from "@/lib/auth/post-auth-route";
import { getUserVerificationState } from "@/lib/auth/user-verification-state";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

export default async function VerifyPhoneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as UserRole;
  const { phoneVerified } = await getUserVerificationState(session);

  if (phoneVerified || role === "ADMIN" || role === "COMPLIANCE_OFFICER") {
    redirect(
      getPostAuthRoute({
        role,
        emailVerified: true,
        phoneVerified: true,
      })
    );
  }

  return children;
}
