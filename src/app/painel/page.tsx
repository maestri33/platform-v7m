"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BackgroundGradient } from "@/components/ui/background-gradient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DiplomaFlag } from "@/components/ui/diploma-flag";
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
 *   enrollment -> missing enrollment data (wizard TBD)
 *   student    -> external class platform access (TBD)
 *   veteran    -> concluded (TBD)
 * While the API contract is under audit, the raw *me payload is shown for conferral.
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

/** Status da Fase 3 em que o aluno ainda precisa fazer algo no /aluno. */
function needsDocuments(status: string | null | undefined): boolean {
  return (
    status === "awaiting_documents" ||
    status === "documents_under_review" ||
    status === "blood_type_pending"
  );
}

export default function PainelPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<string[] | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [me, setMe] = useState<Record<string, unknown> | null>(null);
  const [student, setStudent] = useState<StudentMe | null>(null);
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
            .catch(() => {});
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

  /** Single lead URL (UrlOut): checkout when unpaid, receipt when paid. */
  async function fetchLeadUrl(): Promise<string | null> {
    setBusy(true);
    setNotice(null);
    try {
      const data = await getLeadCheckoutUrl();
      if (data.url?.startsWith("http")) return data.url;
      setNotice(`Resposta sem URL utilizável: ${JSON.stringify(data)}`);
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
    <main id="conteudo" className="flex flex-1 items-center justify-center px-6 py-10">
      <Card pad="lg" className="flex w-full max-w-lg flex-col gap-6">
        <div className="flex gap-1.5">
          <span className="h-1.5 w-7 rounded-full bg-brand-green" />
          <span className="h-1.5 w-7 rounded-full bg-brand-yellow" />
          <span className="h-1.5 w-7 rounded-full bg-brand-blue" />
        </div>

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
            <h1 className="text-[26px] font-extrabold leading-tight text-brand-ink">
              {title ? <WisprText text={title} /> : null}
            </h1>
            <p className="text-base leading-relaxed text-brand-muted">{info.body}</p>
          </>
        ) : (
          <>
            <h1 className="text-[26px] font-extrabold text-brand-ink">Você está dentro!</h1>
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
            <Link
              href="/matricula"
              className="flex min-h-14 items-center justify-center rounded-xl bg-brand-green-dark px-5 text-lg font-bold tracking-tight text-white transition hover:bg-[#006a27]"
            >
              Continuar matrícula
            </Link>
            <button
              type="button"
              onClick={openReceipt}
              disabled={busy}
              className="text-center text-sm font-semibold text-brand-muted underline underline-offset-4 transition hover:text-brand-blue disabled:opacity-50"
            >
              Ver recibo do pagamento
            </button>
          </>
        ) : null}

        {stage === "student" ? (
          <>
            {/* Fase 3: se ainda não liberou prova, o aluno volta pra /aluno enviar
                documentos / tipo sanguíneo. Quando exam_released, mostra credenciais. */}
            {needsDocuments(student?.status) ? (
              <Link
                href="/aluno"
                className="flex min-h-14 items-center justify-center rounded-xl bg-brand-green-dark px-5 text-lg font-bold tracking-tight text-white transition hover:bg-[#006a27]"
              >
                Continuar envio de documentos
              </Link>
            ) : null}
            {(() => {
              const platform = student?.platform;
              const hasCreds = platform && (platform.url || platform.login || platform.password);
              if (needsDocuments(student?.status) && !hasCreds) return null; // CTA acima já fala
              return hasCreds ? (
                <PlatformCredentials
                  url={platform.url}
                  login={platform.login}
                  password={platform.password}
                  notes={platform.notes}
                />
              ) : (
                <p className="rounded-xl border border-brand-border bg-brand-bg p-3.5 text-[14px] font-semibold leading-relaxed text-brand-muted">
                  Estamos preparando seu acesso à plataforma — você também recebe o login por
                  WhatsApp e e-mail. É só atualizar em instantes.
                </p>
              );
            })()}
          </>
        ) : null}

        {notice ? (
          <div className="rounded-xl border border-brand-border bg-brand-bg p-3.5 text-[14px] font-semibold leading-relaxed text-brand-muted">
            {notice}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => {
            clearSession();
            router.replace("/");
          }}
          className="self-center text-sm font-semibold text-brand-muted underline underline-offset-4 transition hover:text-brand-blue"
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
