type DevVerificationCodeBoxProps = {
  code: string;
  channel: "email" | "phone";
  smsConfigured?: boolean;
};

function isDevTestingEnabled() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_SHOW_DEV_OTP === "true"
  );
}

/** Local testing only — remove when SMS/email delivery is fully configured. */
export function DevVerificationCodeBox({
  code,
  channel,
  smsConfigured = true,
}: DevVerificationCodeBoxProps) {
  if (!isDevTestingEnabled() || !code) return null;

  const hint =
    channel === "phone"
      ? smsConfigured
        ? "SMS may not reach your phone in local testing. Use this code to verify."
        : "SMS is not configured on the server, so the code is shown here instead."
      : "Email delivery may not work in local testing. Use this code to verify.";

  return (
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
        Your verification code
      </p>
      <p className="mt-2 font-mono text-3xl font-bold tracking-[0.35em] text-amber-950">
        {code}
      </p>
      <p className="mt-2 text-xs text-amber-900/80">{hint}</p>
    </div>
  );
}
