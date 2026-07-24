"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { ErrorBox } from "@/components/ui/error-box";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Stepper } from "@/components/ui/stepper";
import { WizardFooter, type FooterButton } from "@/components/ui/wizard-footer";
import { ApiError, type EnrollmentMe, getEnrollmentMe } from "@/lib/api";
import {
  getAccessToken,
  getServerAccessToken,
  getSession,
  saveSession,
  subscribeStorage,
} from "@/lib/session";

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
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [me, setMe] = useState<EnrollmentMe | null>(null);
  const [busy, setBusy] = useState(false);
  const [footerButtons, setFooterButtons] = useState<FooterButton[]>([]);
  const token = useSyncExternalStore(subscribeStorage, getAccessToken, getServerAccessToken);

  const setFooter = (buttons: FooterButton[]) => setFooterButtons(buttons);

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
    const target = STATUS_STEP[expected] ?? 0;
    setDirection(step !== null && target < step ? "left" : "right");
    setStep(target);
    scrollRegionTop();
  }

  // Advance by the server's returned status when a mutation provides it (no /me re-fetch);
  // otherwise fall through to the next sequential step.
  function advance(status?: string) {
    if (status && STATUS_STEP[status] != null) {
      const target = STATUS_STEP[status];
      setDirection(step !== null && target < step ? "left" : "right");
      setStep(target);
      scrollRegionTop();
      return;
    }
    setDirection("right");
    setStep((s) => {
      return s === null ? 0 : Math.min(s + 1, AWAITING_STEP);
    });
    scrollRegionTop();
  }

  if (!token || step === null) return <LoadingOverlay show />;

  const stepProps = { onDone: advance, onWrongStatus: jumpTo, setBusy, busy, setFooter };
  const awaiting = step >= AWAITING_STEP;

  return (
    // CopilotKit: o "cérebro" que classifica a foto e escolhe o componente (generative UI) e conduz
    // o diálogo do titular do comprovante. `runtimeUrl` = o porteiro server-side (→ OmniRoute).
    <CopilotKit runtimeUrl="/api/copilotkit">
    <main id="conteudo" className="flex flex-1 flex-col">
      {/* scrollable content area */}
      <div className="flex flex-1 flex-col px-6 pt-8 pb-2">
        <div className="m-auto flex w-full max-w-md flex-col gap-7">
          <BackLink href="/painel">Painel</BackLink>

          <header className="flex flex-col gap-4">
            <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-[26px]">
              {awaiting ? "Matrícula enviada" : "Complete sua matrícula"}
            </h1>

            {/* Stepper: barras de progresso, sem numeração (primitivo compartilhado). */}
            <Stepper
              current={step}
              labels={STEPS.map((s) => s.label)}
              ariaLabel="Etapas da matrícula"
            />
          </header>

          <Card as="section" className="overflow-hidden">
            <div
              key={awaiting ? "done" : step}
              className={direction === "left" ? "step-in-left" : "step-in-right"}
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
          </Card>

          {!awaiting && step < 3 ? (
            <p className="text-center text-[12px] leading-relaxed text-white/60">
              Etapas concluídas ficam salvas — se sair, você volta exatamente deste ponto.
            </p>
          ) : null}
        </div>
      </div>

      {/* Fixed wizard footer — sticky within the .app-scroll container */}
      <WizardFooter buttons={footerButtons} />
    </main>
    </CopilotKit>
  );
}

const AWAIT_POLL_MS = 8000;

/** Terminal screen: enrollment complete, waiting for the polo to release access. */
export function AwaitingRelease({
  completed,
  poll = true,
}: {
  completed: boolean;
  poll?: boolean;
}) {
  const router = useRouter();

  // Conclusão pelo coordenador invalida o JWT (token_version sobe). Pollamos /me:
  // ao vir `completed` ou um 401, re-salvamos phone/externalId e vamos pro /login
  // com auto-OTP — o aluno re-loga sozinho e cai no painel já como student.
  useEffect(() => {
    if (!poll) return;
    function relogin(sess: ReturnType<typeof getSession>) {
      if (sess?.phone) {
        saveSession({
          phone: sess.phone,
          externalId: sess.externalId ?? null,
          ref: sess.ref ?? null,
        });
      }
      router.replace("/login?relogin=1");
    }

    if (completed) {
      relogin(getSession());
      return;
    }

    let cancelled = false;
    let inflight = false;
    const id = setInterval(async () => {
      if (inflight || cancelled) return;
      inflight = true;
      const sess = getSession(); // captura ANTES de um 401 limpar a sessão
      try {
        const me = await getEnrollmentMe();
        if (!cancelled && me.status === "completed") relogin(sess);
      } catch (e: unknown) {
        if (!cancelled && e instanceof ApiError && e.status === 401) relogin(sess);
      } finally {
        inflight = false;
      }
    }, AWAIT_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [completed, router, poll]);

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
      <ErrorBox
        tone="neutral"
        message="Quando for liberado, você entra como aluno. Faça login novamente para acessar suas aulas."
      />
      <BackLink href="/painel" tone="onLight">Voltar ao painel</BackLink>
    </div>
  );
}
