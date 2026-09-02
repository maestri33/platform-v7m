"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { BackLink, Card, LoadingOverlay, Stepper } from "@v7m/ui";
import { ApiError, type EnrollmentMe, getEnrollmentMe } from "@/lib/api";
import {
  getAccessToken,
  getServerAccessToken,
  getSession,
  saveSession,
  subscribeStorage,
} from "@/lib/session";

import { WHATSAPP_URL } from "../_lead/flow-data";
import { StepAddress, StepEducation, StepRg, StepSelfie } from "./steps";
import { ActiveBlocksBanner } from "@/components/blocks";
import { toast } from "sonner";

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
  // Passo + direção do slide juntos: a direção é decidida NA troca (voltar =
  // esquerda), sem ref-durante-render.
  const [nav, setNav] = useState<{ step: number | null; dir: "left" | "right" }>({
    step: null,
    dir: "right",
  });
  const step = nav.step;
  const dir = nav.dir;
  const goStep = (target: number) =>
    setNav((n) => ({
      step: target,
      dir: n.step !== null && target < n.step ? "left" : "right",
    }));
  const [me, setMe] = useState<EnrollmentMe | null>(null);
  // busy + o rótulo do que está rolando: juntos viram o véu de blur da página
  // (LoadingOverlay) — a pessoa nunca fica olhando pra tela parada sem contexto.
  const [busyState, setBusyState] = useState<{ on: boolean; label: string | null }>({
    on: false,
    label: null,
  });
  const busy = busyState.on;
  const token = useSyncExternalStore(subscribeStorage, getAccessToken, getServerAccessToken);

  const setBusy = (b: boolean, label?: string) =>
    setBusyState({ on: b, label: b ? (label ?? null) : null });

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
        goStep(STATUS_STEP[data.status] ?? 0);
      })
      .catch(() => {
        // 401 already cleared the session (silent-refresh failed) -> restart funnel.
        if (!cancelled) {
          if (!getAccessToken()) router.replace("/");
          else goStep(0);
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
    toast.info("Sua matrícula foi sincronizada com a etapa atual do sistema.");
    goStep(STATUS_STEP[expected] ?? 0);
    scrollRegionTop();
  }

  // Advance by the server's returned status when a mutation provides it (no /me re-fetch);
  // otherwise fall through to the next sequential step.
  function advance(status?: string) {
    setNav((n) => {
      const target =
        status && STATUS_STEP[status] != null
          ? STATUS_STEP[status]
          : n.step === null
            ? 0
            : Math.min(n.step + 1, AWAITING_STEP);
      return { step: target, dir: n.step !== null && target < n.step ? "left" : "right" };
    });
    scrollRegionTop();
  }

  if (!token || step === null) return <LoadingOverlay show />;

  const stepProps = { onDone: advance, onWrongStatus: jumpTo, setBusy, busy };
  const awaiting = step >= AWAITING_STEP;

  return (
    <main id="conteudo" className="flex flex-1 flex-col">
      {/* scrollable content area */}
      <div className="flex flex-1 flex-col px-6 pt-8 pb-2">
        <div className="m-auto flex w-full max-w-md flex-col gap-7">
          <BackLink href="/painel">Painel</BackLink>

          <ActiveBlocksBanner />

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
          </Card>

          {!awaiting && step < 3 ? (
            <p className="text-center text-[12px] leading-relaxed text-white/60">
              Etapas concluídas ficam salvas — se sair, você volta exatamente deste ponto.
            </p>
          ) : null}
        </div>
      </div>

      {/* Blur + loop centralizado enquanto o passo trabalha (upload, IA, polling). */}
      <LoadingOverlay show={busy} message={busyState.label ?? undefined} />
    </main>
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
      <WorkingOnItSvg />
      <h2 className="text-2xl font-extrabold text-brand-ink">
        {completed ? "Matrícula concluída" : "Estamos cuidando da sua matrícula"}
      </h2>
      <p className="text-base leading-relaxed text-brand-muted">
        Recebemos tudo: documento, endereço, estudos e sua assinatura. Agora é com a gente —
        você não precisa fazer mais nada por aqui. Avisamos assim que estiver liberada.
      </p>
      {/* A dúvida que surgir NÃO pode virar um formulário: cai no WhatsApp, onde essa pessoa
          já está (Victor 2026-07-28). */}
      <a
        href={`${WHATSAPP_URL}?text=${encodeURIComponent("Oi! Tenho uma dúvida sobre a minha matrícula.")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-[16px] font-bold text-white transition hover:brightness-95 active:scale-[0.99]"
      >
        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.86 9.86 0 004.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm5.8 14.06c-.24.68-1.42 1.31-1.95 1.36-.5.05-.97.23-3.27-.68-2.75-1.09-4.5-3.9-4.64-4.08-.13-.18-1.11-1.48-1.11-2.82 0-1.34.7-2 .95-2.27.25-.27.54-.34.72-.34.18 0 .36 0 .52.01.17.01.39-.06.61.47.24.55.8 1.9.87 2.04.07.14.12.3.02.48-.09.18-.14.29-.28.45-.14.16-.29.35-.41.47-.14.14-.28.29-.12.56.16.27.72 1.18 1.54 1.91 1.06.94 1.95 1.23 2.22 1.37.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.6.75 1.87.89.27.14.45.2.52.32.07.11.07.64-.17 1.32z" />
        </svg>
        Falar no WhatsApp
      </a>
      <BackLink href="/painel" tone="onLight">Voltar ao painel</BackLink>
    </div>
  );
}

/**
 * "Estamos trabalhando nisso" — engrenagens girando sobre o diploma. Animação em SVG puro
 * (SMIL): sem lib, sem JS, e o `prefers-reduced-motion` para o giro pela CSS abaixo.
 */
function WorkingOnItSvg() {
  return (
    <svg
      viewBox="0 0 120 100"
      className="w-40 text-brand-blue [&_.spin]:origin-center motion-reduce:[&_.spin]:animate-none"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Estamos trabalhando na sua matrícula"
    >
      {/* diploma */}
      <rect x="18" y="26" width="62" height="46" rx="4" className="text-brand-blue" />
      <path d="M28 40h34M28 50h34M28 60h22" strokeWidth={2} opacity={0.55} />
      {/* selo */}
      <circle cx="70" cy="64" r="9" className="text-brand-green-dark" />
      <path d="M66 64l3 3 5-6" className="text-brand-green-dark" strokeWidth={2.6} />
      {/* engrenagem grande */}
      <g className="spin" style={{ transformOrigin: "92px 30px" }}>
        <circle cx="92" cy="30" r="9" />
        <path d="M92 17v-5M92 48v-5M105 30h5M74 30h5M101 21l3-3M80 42l3-3M101 39l3 3M80 18l3 3" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 92 30"
          to="360 92 30"
          dur="6s"
          repeatCount="indefinite"
        />
      </g>
      {/* engrenagem pequena, girando ao contrário */}
      <g style={{ transformOrigin: "26px 18px" }}>
        <circle cx="26" cy="18" r="6" />
        <path d="M26 9v-3M26 30v-3M35 18h3M14 18h3" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="360 26 18"
          to="0 26 18"
          dur="4s"
          repeatCount="indefinite"
        />
      </g>
    </svg>
  );
}
