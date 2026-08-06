import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readPendingVerificationCode } from "@/lib/api/verification-code";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const purpose = req.nextUrl.searchParams.get("purpose") ?? "PHONE_VERIFY";
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized", data: null, errors: null },
      { status: 401 }
    );
  }

  const cookie = req.headers.get("cookie");
  const code = await readPendingVerificationCode(userId, purpose, cookie);

  return NextResponse.json({
    success: true,
    message: "OK",
    data: {
      code,
      devCode: code,
      isDevelopment: true,
      purpose,
    },
    errors: null,
  });
}
