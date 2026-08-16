import { auth } from "@/lib/auth";
import { getPostAuthRoute } from "@/lib/auth/post-auth-route";
import { getUserVerificationState } from "@/lib/auth/user-verification-state";
import { getRequestCallbackUrl } from "@/lib/utils/request-callback-url";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

export default async function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as UserRole;

  if (session.user.emailVerified || role === "ADMIN") {
    const { phoneVerified } = await getUserVerificationState(session);
    const returnUrl = await getRequestCallbackUrl();

    redirect(
      getPostAuthRoute({
        role,
        emailVerified: true,
        phoneVerified,
        returnUrl,
      })
    );
  }

  return children;
}
