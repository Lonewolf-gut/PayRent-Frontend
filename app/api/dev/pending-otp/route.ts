import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  fetchBackendPendingCode,
  isDevOtpEnabled,
  readPendingPhoneCodeFromDb,
} from "@/lib/api/verification-code";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isDevOtpEnabled()) {
    return NextResponse.json(
      { success: false, message: "Not found", data: null, errors: null },
      { status: 404 }
    );
  }

  const purpose = req.nextUrl.searchParams.get("purpose") ?? "PHONE_VERIFY";
  const cookie = req.headers.get("cookie");

  let code = await fetchBackendPendingCode(cookie, purpose);

  if (!code) {
    const session = await auth();
    const userId = session?.user?.id;
    if (userId) {
      code = await readPendingPhoneCodeFromDb(userId, purpose);
    }
  }

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
