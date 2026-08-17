import { Suspense } from "react";
import { DemoCheckoutPage } from "@/components/payment/demo-checkout-page";

export default function PaymentDemoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          Loading checkout…
        </div>
      }
    >
      <DemoCheckoutPage />
    </Suspense>
  );
}
