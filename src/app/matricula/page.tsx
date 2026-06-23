"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { type EnrollmentMe, getEnrollmentMe } from "@/lib/api";
import { getAccessToken, getServerAccessToken, subscribeStorage } from "@/lib/session";

import { StepAddress, StepEducation, StepRg, StepSelfie } from "./steps";

const STEPS = [
  { key: "rg", label: "Documento" },
  { key: "address", label: "Endereço" },
  { key: "education", label: "Estudos" },
  { key: "selfie", label: "Selfie" },
] as const;

const AWAITING_STEP = STEPS.length; // 4 — terminal "aguardando liberação" screen

/**
 * enrollment/me.status -> wizard step. v2 order is document-FIRST: the RG photo's
 * AI extraction fills the profile, then each section auto-advances by trigger.
 * Re-posting a finished section returns a routable `expected_status`, so we always
 * resume — and recover — at the section the server expects.
 */
const STATUS_STEP: Record<string, number> = {
  rg: 0,
  documents: 0,
  address: 1,
  education: 2,
  selfie: 3,
  awaiting_release: AWAITING_STEP,
  completed: AWAITING_STEP,
};

export default function MatriculaPage() {
  const router = useRouter();
  const [step, setStep] = useState<number | null>(null);
  const [me, setMe] = useState<EnrollmentMe | null>(null);
  const [busy, setBusy] = useState(false);
  const token = useSyncExternalStore(subscribeStorage, getAccessToken, getServerAccessToken);

  // Direção do slide entre passos: avançar entra da direita, voltar (jumpTo) da esquerda.
  const prevStepRef = useRef<number | null>(null);
  const dir =
    step !== null && prevStepRef.current !== null && step < prevStepRef.current ? "left" : "right";
  useEffect(() => {
    prevStepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (typeof window !== "undefined" && !getAccessToken()) router.replace("/");
  }, [router]);

  // Fine-grained resume: server state decides the step AND prefills the forms.
  useEffect(() => {
    if (typeof window === "undefined" || !getAccessToken()) return;
    let cancelled = false;
    getEnrollmentMe()
      .then((data) => {
        if (cancelled) return;
        setMe(data);
        setStep(STATUS_STEP[data.status] ?? 0);
      })
      .catch(() => {
        // 401 already cleared the session (silent-refresh failed) -> restart funnel.
        if (!cancelled) {
          if (!getAccessToken()) router.replace("/");
          else setStep(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // O body fica travado no shell app-like — quem rola é a faixa .app-scroll.
  function scrollRegionTop() {
    document.querySelector(".app-scroll")?.scrollTo({ top: 0 });
  }

  function jumpTo(expected: string) {
    setStep(STATUS_STEP[expected] ?? 0);
    scrollRegionTop();
  }

  // Advance by the server's returned status when a mutation provides it (no /me re-fetch);
  // otherwise fall through to the next sequential step.
  function advance(status?: string) {
    setStep((s) => {
      if (status && STATUS_STEP[status] != null) return STATUS_STEP[status];
      return s === null ? 0 : Math.min(s + 1, AWAITING_STEP);
    });
    scrollRegionTop();
  }

  if (!token || step === null) return <LoadingOverlay show />;

  const stepProps = { onDone: advance, onWrongStatus: jumpTo, setBusy, busy };
  const awaiting = step >= AWAITING_STEP;

  return (
    <main id="conteudo" className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <div className="flex w-full max-w-lg flex-col gap-7">
        <Link href="/painel" className="text-sm font-bold text-white/85">
          ← Painel
        </Link>

        <header className="flex flex-col gap-4">
          <h1 className="text-[26px] font-extrabold leading-tight text-white">
            {awaiting ? "Matrícula enviada" : "Complete sua matrícula"}
          </h1>

          {/* Stepper: barras de progresso, sem numeração */}
          <ol className="flex gap-2" aria-label="Etapas da matrícula">
            {STEPS.map((s, i) => (
              <li key={s.key} className="flex flex-1 flex-col gap-1.5">
                <span
                  aria-current={i === step ? "step" : undefined}
                  className={`h-1.5 rounded-full transition ${
                    i < step
                      ? "bg-brand-green"
                      : i === step
                        ? "bg-brand-blue-bright"
                        : "bg-white/25"
                  }`}
                />
                <span
                  className={`text-center text-[11px] font-bold ${
                    i < step
                      ? "text-brand-green-light"
                      : i === step
                        ? "text-brand-blue-bright"
                        : "text-white/55"
                  }`}
                >
                  {i < step ? "✓ " : ""}
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
        </header>

        <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/75 p-6 shadow-[0_8px_30px_rgba(11,27,59,0.10)] backdrop-blur-xl">
          <div
            key={awaiting ? "done" : step}
            className={dir === "left" ? "step-in-left" : "step-in-right"}
          >
            {awaiting ? (
              <AwaitingRelease completed={me?.status === "completed"} />
            ) : (
              <>
                {step === 0 && <StepRg {...stepProps} brief={me?.rg} />}
                {step === 1 && <StepAddress {...stepProps} />}
                {step === 2 && <StepEducation {...stepProps} initial={me?.education} />}
                {step === 3 && <StepSelfie {...stepProps} />}
              </>
            )}
          </div>
        </section>

        {!awaiting && step < 3 ? (
          <p className="text-center text-[12px] leading-relaxed text-white/60">
            Etapas concluídas ficam salvas — se sair, você volta exatamente deste ponto.
          </p>
        ) : null}
      </div>
    </main>
  );
}

/** Terminal screen: enrollment complete, waiting for the polo to release access. */
export function AwaitingRelease({ completed }: { completed: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-brand-green-bg text-brand-green-dark">
        <svg
          className="size-8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <h2 className="text-2xl font-extrabold text-brand-ink">
        {completed ? "Matrícula concluída" : "Aguardando liberação do polo"}
      </h2>
      <p className="text-base leading-relaxed text-brand-muted">
        Recebemos seus dados, documento e selfie. Agora o polo confere e libera seu acesso —
        você não precisa fazer mais nada por aqui.
      </p>
      <p className="rounded-xl border border-brand-border bg-brand-bg p-3.5 text-[14px] font-semibold leading-relaxed text-brand-muted">
        Quando for liberado, você entra como <span className="text-brand-green">aluno</span>.
        Faça login novamente para acessar suas aulas.
      </p>
      <Link
        href="/painel"
        className="text-sm font-bold text-brand-blue underline underline-offset-4"
      >
        Voltar ao painel
      </Link>
    </div>
  );
}
