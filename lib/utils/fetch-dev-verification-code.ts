export async function fetchDevVerificationCode(
  purpose: "PHONE_VERIFY" | "EMAIL_VERIFY"
): Promise<string | null> {
  try {
    const res = await fetch(`/api/dev/pending-otp?purpose=${purpose}`, { cache: "no-store" });
    const json = await res.json();
    if (!json.success || !json.data) return null;
    const code = json.data.devCode ?? json.data.code;
    return typeof code === "string" && code.length >= 4 ? code : null;
  } catch {
    return null;
  }
}
