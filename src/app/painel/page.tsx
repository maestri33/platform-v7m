"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BackgroundGradient } from "@/components/ui/background-gradient";
import { BrandDots } from "@/components/ui/brand-dots";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DiplomaFlag } from "@/components/ui/diploma-flag";
import { ErrorBox } from "@/components/ui/error-box";
import { PlatformCredentials } from "@/components/ui/platform-credentials";
import { VeteranDetail } from "@/components/ui/veteran-detail";
import { WisprText } from "@/components/ui/wispr-text";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import {
  getEnrollmentMe,
  getErrorMessage,
  getLeadCheckoutUrl,
  getLeadMe,
  getStudentMe,
  type StudentMe,
  whoami,
} from "@/lib/api";
import { clearSession, getAccessToken } from "@/lib/session";

/**
 * Post-login hub. Routing per pipeline stage (from GET /whoami roles):
 *   lead       -> hasn't paid: GET /lead/checkout-url and redirect (checkout or receipt)
 *   enrollment -> missing enrollment data (matrícula wizard)
 *   student    -> Fase 3+: documentos -> prova -> diploma -> acesso liberado
 *   veteran    -> concluded (read-only view)
 * The student stage is itself a sub-funnel; we route the CTA to the screen that
 * owns the student's current status so they never land on a dead end.
 */
const STAGE_INFO: Record<string, { title: string; body: string }> = {
  lead: {
    title: "Falta só o pagamento",
    body: "Seu cadastro já tá pronto! Agora é só pagar pra liberar sua matrícula.",
  },
  enrollment: {
    title: "Parabéns!",
    body: "Pagamento confirmado! Agora é só concluir sua matrícula pra garantir sua vaga.",
  },
  student: {
    title: "Que bom te ver de novo!",
    body: "Seu acesso às aulas tá liberado na plataforma de estudos.",
  },
  veteran: {
    title: "Você conseguiu!",
    body: "Você concluiu seus estudos com o Supletivo Brasil. Que orgulho!",
  },
};

const STAGE_ORDER = ["veteran", "student", "enrollment", "lead"];

/** Sub-funil do aluno: status que ainda exigem ação no /aluno (documentos). */
const ALUNO_STATUSES = new Set([
  "awaiting_documents",
  "documents_under_review",
  "blood_type_pending",
]);

/** Sub-funil do aluno: status do fluxo de prova/diploma — pertencem ao /provas. */
const PROVAS_STATUSES = new Set([
  "exam_released",
  "exam_scheduled",
  "exam_failed",
  "awaiting_documentation_dispatch",
  "pending",
  "awaiting_diploma_issuance",
  "awaiting_pickup",
]);

type StudentDest = "aluno" | "provas" | null;

/**
 * Mapeia o status do aluno → tela que o atende AGORA. `null` = terminal: o
 * acesso já está liberado (mostramos as credenciais, sem CTA de avanço).
 * Uma só função pra não sobrar gap entre os estados.
 */
function studentDestination(status: string | null | undefined): StudentDest {
  if (ALUNO_STATUSES.has(status ?? "")) return "aluno";
  if (PROVAS_STATUSES.has(status ?? "")) return "provas";
  return null;
}

const STUDENT_DEST_CTA: Record<"aluno" | "provas", { href: string; label: string }> = {
  aluno: { href: "/aluno", label: "Continuar envio de documentos" },
  provas: { href: "/provas", label: "Continuar minha jornada" },
};

export default function PainelPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<string[] | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [me, setMe] = useState<Record<string, unknown> | null>(null);
  const [student, setStudent] = useState<StudentMe | null>(null);
  /** true assim que o getStudentMe resolve (ou falha) — evita flash do fallback. */
  const [studentLoaded, setStudentLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    whoami()
      .then((who) => {
        if (cancelled) return;
        setRoles(who.roles ?? []);
        setName(typeof who.name === "string" && who.name.trim() ? who.name : null);
        const r = who.roles ?? [];
        if (r.includes("lead")) {
          getLeadMe()
            .then((data) => {
              if (!cancelled) setMe({ ...data });
            })
            .catch(() => {});
        } else if (r.includes("enrollment")) {
          getEnrollmentMe()
            .then((data) => {
              if (!cancelled) setMe({ ...data });
            })
            .catch(() => {});
        } else if (r.includes("student")) {
          getStudentMe()
            .then((s) => {
              if (cancelled) return;
              setStudent(s);
              setMe({ ...s });
            })
            .catch(() => {})
            .finally(() => {
              if (!cancelled) setStudentLoaded(true);
            });
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // Silent refresh already attempted; a failure here means session is gone.
        clearSession();
        setNotice(getErrorMessage(e));
        router.replace("/");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const stage = STAGE_ORDER.find((s) => roles?.includes(s)) ?? null;
  const info = stage ? STAGE_INFO[stage] : null;
  const firstName = name?.split(" ")[0];
  const title =
    stage === "enrollment" && firstName ? `Parabéns, ${firstName}!` : (info?.title ?? null);

  const platform = student?.platform;
  const hasCreds = !!(platform && (platform.url || platform.login || platform.password));
  const dest = studentDestination(student?.status);
  /** Enquanto o /student/me não resolveu, seguramos o conteúdo do stage student. */
  const studentPending = stage === "student" && !studentLoaded;

  /** Corpo do stage student reflete o status real (P2): só fala "liberado" com credenciais. */
  const studentBody = hasCreds
    ? "Seu acesso às aulas tá liberado na plataforma de estudos."
    : dest === "aluno"
      ? "Falta concluir o envio dos seus documentos pra liberar sua prova."
      : dest === "provas"
        ? "Sua matrícula tá em dia. Continue de onde parou na sua jornada até o diploma."
        : "Estamos preparando seu acesso. Em instantes liberamos o próximo passo por aqui.";
  const body = stage === "student" ? studentBody : info?.body;

  /** Single lead URL (UrlOut): checkout when unpaid, receipt when paid. */
  async function fetchLeadUrl(): Promise<string | null> {
    setBusy(true);
    setNotice(null);
    try {
      const data = await getLeadCheckoutUrl();
      if (data.url?.startsWith("http")) return data.url;
      // P11: nunca despeja o payload cru na UI — mensagem amigável + detalhe no console.
      console.error("Resposta sem URL utilizável:", data);
      setNotice("Não conseguimos abrir seu link de pagamento agora. Tente de novo em instantes.");
      return null;
    } catch (e: unknown) {
      setNotice(getErrorMessage(e));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function openReceipt() {
    const url = await fetchLeadUrl();
    if (url) window.open(url, "_blank", "noopener");
  }

  async function goToPayment() {
    const url = await fetchLeadUrl();
    if (url) window.location.href = url;
  }

  return (
    <main id="conteudo" className="flex flex-1 px-6 py-10">
      <Card pad="lg" className="m-auto flex w-full max-w-lg flex-col gap-6">
        <BrandDots size="md" />

        <BackgroundGradient
          containerClassName="mx-auto w-full max-w-xs"
          className="rounded-3xl bg-white/85 px-5 pb-6 pt-4 backdrop-blur-md"
        >
          <p className="mb-1 text-center text-[11px] font-extrabold uppercase tracking-[0.15em] text-brand-blue/80">
            Sua credencial
          </p>
          <div className="pointer-events-none mx-auto w-52 max-w-[78%]">
            <DiplomaFlag name={firstName ?? "Seu nome aqui"} className="df-static" />
          </div>
        </BackgroundGradient>

        {info ? (
          <>
            <h1 className="text-2xl font-extrabold leading-tight text-brand-ink sm:text-[26px]">
              {title ? <WisprText text={title} /> : null}
            </h1>
            {body ? <p className="text-base leading-relaxed text-brand-muted">{body}</p> : null}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-brand-ink sm:text-[26px]">Você está dentro!</h1>
            <p className="text-base leading-relaxed text-brand-muted">
              {roles === null ? "Carregando sua situação…" : "Definindo sua etapa…"}
            </p>
          </>
        )}

        {stage === "veteran" ? <VeteranDetail /> : null}

        {stage === "lead" ? (
          <Button onClick={goToPayment} loading={busy}>
            Ir para o pagamento
          </Button>
        ) : null}

        {stage === "enrollment" ? (
          <>
            <Button as="a" href="/matricula">
              Continuar matrícula
            </Button>
            <button
              type="button"
              onClick={openReceipt}
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center self-center text-sm font-semibold text-brand-muted underline underline-offset-4 transition hover:text-brand-blue disabled:opacity-50"
            >
              Ver recibo do pagamento
            </button>
          </>
        ) : null}

        {stage === "student" ? (
          studentPending ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="size-8 animate-spin rounded-full border-[3px] border-brand-border border-t-brand-blue" />
              <p className="text-[14px] font-semibold text-brand-muted">Carregando sua etapa…</p>
            </div>
          ) : (
            <>
              {/* Sub-funil do aluno: roteia o CTA pra tela que atende o status atual
                  (documentos -> /aluno; prova/diploma -> /provas). Quando o acesso já
                  está liberado, mostra as credenciais (terminal). */}
              {hasCreds ? (
                <PlatformCredentials
                  url={platform?.url}
                  login={platform?.login}
                  password={platform?.password}
                  notes={platform?.notes}
                />
              ) : dest ? (
                <Button as="a" href={STUDENT_DEST_CTA[dest].href}>
                  {STUDENT_DEST_CTA[dest].label}
                </Button>
              ) : (
                <ErrorBox
                  tone="neutral"
                  message="Estamos preparando seu acesso à plataforma — você também recebe o login por WhatsApp e e-mail. É só atualizar em instantes."
                />
              )}
            </>
          )
        ) : null}

        {notice ? <ErrorBox tone="neutral" message={notice} /> : null}

        <button
          type="button"
          onClick={() => {
            clearSession();
            router.replace("/");
          }}
          className="inline-flex min-h-11 items-center justify-center self-center text-sm font-semibold text-brand-muted underline underline-offset-4 transition hover:text-brand-blue"
        >
          Sair
        </button>

        {/* Auditoria do contrato — SÓ em desenvolvimento; nunca chega ao usuário final. */}
        {process.env.NODE_ENV !== "production" ? (
          <>
            <p className="text-xs text-brand-muted">
              Etapa atual: <span className="font-bold">{stage ?? "—"}</span>
            </p>
            {me ? (
              <details className="rounded-xl border border-brand-border bg-brand-bg p-3.5 text-xs text-brand-muted">
                <summary className="cursor-pointer font-bold">
                  Dados do cadastro (auditoria do contrato)
                </summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(me, null, 2)}
                </pre>
              </details>
            ) : null}
          </>
        ) : null}
      </Card>

      <LoadingOverlay show={busy} />
    </main>
  );
}
