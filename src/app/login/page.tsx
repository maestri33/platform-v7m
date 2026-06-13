import { LoginClient } from "./login-client";

interface LoginPageProps {
  searchParams: Promise<{ phone?: string; wait?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = await searchParams;
  const wait = Number(sp.wait ?? 0);
  return <LoginClient phone={sp.phone ?? ""} initialWait={Number.isFinite(wait) ? wait : 0} />;
}
