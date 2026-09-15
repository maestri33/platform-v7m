import { Suspense } from "react";

import { LoadingState } from "@v7m/ui";
import { LoginClient } from "./login-client";

/** searchParams: denied=1 quando o guard barrou um não-superuser. */
export default function LoginPage() {
  return (
    <main id="conteudo" className="flex flex-1 items-center justify-center px-5 py-10">
      <Suspense fallback={<LoadingState />}>
        <LoginClient />
      </Suspense>
    </main>
  );
}
