import { parsePaymentMethod } from "@/lib/payment";

import { CheckClient } from "./check-client";

interface CheckPageProps {
  searchParams: Promise<{ ref?: string; pm?: string }>;
}

export default async function CheckPage({ searchParams }: CheckPageProps) {
  const sp = await searchParams;
  return <CheckClient referral={sp.ref ?? ""} method={parsePaymentMethod(sp.pm)} />;
}
