import { auth } from "@/lib/auth";
import { getPostAuthRoute } from "@/lib/auth/post-auth-route";
import { getUserVerificationState } from "@/lib/auth/user-verification-state";
import { appendCallbackUrl } from "@/lib/utils/auth-callback-url";
import { getRequestCallbackUrl } from "@/lib/utils/request-callback-url";
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

  const returnUrl = await getRequestCallbackUrl();

  if (!session.user.emailVerified && role !== "ADMIN") {
    redirect(appendCallbackUrl("/verify-email", returnUrl));
  }

  const { phoneVerified } = await getUserVerificationState(session);

  if (phoneVerified || role === "ADMIN" || role === "COMPLIANCE_OFFICER") {
    redirect(
      getPostAuthRoute({
        role,
        emailVerified: Boolean(session.user.emailVerified),
        phoneVerified: true,
        returnUrl,
      })
    );
  }

  return children;
}
