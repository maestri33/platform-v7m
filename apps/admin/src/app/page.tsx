"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LoadingState } from "@/components/ui/spinner";
import { getBootstrapStatus } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

/** Entrada: tem token → dashboard; senão checa se precisa de bootstrap → setup ou login. */
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/dashboard");
      return;
    }

    let active = true;
    getBootstrapStatus()
      .then((status) => {
        if (!active) return;
        if (!status.bootstrapped) {
          router.replace("/setup");
        } else {
          router.replace("/login");
        }
      })
      .catch(() => {
        if (active) router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  return <LoadingState label="Abrindo o painel…" />;
}
