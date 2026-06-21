import { PAYMENT_LABEL, parsePaymentMethod, priceLine } from "@/lib/payment";
import { getPricing } from "@/lib/pricing-server";

import { RegisterClient } from "./register-client";

interface RegisterPageProps {
  searchParams: Promise<{ phone?: string; pm?: string; ref?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const sp = await searchParams;
  const method = parsePaymentMethod(sp.pm);
  const pricing = method ? await getPricing() : null;

  return (
    <RegisterClient
      referral={sp.ref ?? ""}
      method={method}
      methodLabel={method ? PAYMENT_LABEL[method] : null}
      priceText={method && pricing ? priceLine(method, pricing) : null}
    />
  );
}
