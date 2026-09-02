"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { BackLink, LoadingOverlay, Stepper } from "@v7m/ui";
import {
  ApiError,
  type StudentMe,
  type StudentPendency,
  getStudentMe,
  getStudentPendencies,
} from "@/lib/api";
import { clearExamChoice, formatExamChoice, getExamChoice } from "@/lib/exam";
import {
  getAccessToken,
  getServerAccessToken,
  getSession,
  saveSession,
  subscribeStorage,
} from "@/lib/session";

import { ExamSchedule } from "./_components/exam-schedule";
import { PendencyList } from "./_components/pendency-list";

const STEPS = ["Prova", "Documentação", "Diploma"];

/** Status do funil final → passo do stepper (0..2). veteran (≥3) = tudo concluído. */
const STATUS_STEP: Record<string, number> = {
  exam_released: 0,
  exam_scheduled: 0,
  exam_failed: 0,
  awaiting_documentation_dispatch: 1,
  pending: 1,
  awaiting_diploma_issuance: 2,
  awaiting_pickup: 2,
  veteran: 3,
};

/** Status anteriores ao funil de prova — pertencem ao /aluno; redireciona pra lá. */
const ALUNO_STATUSES = new Set([
  "awaiting_documents",
  "documents_under_review",
  "blood_type_pending",
]);

/** Status que aguardam ação do COORDENADOR — pollamos pra detectar a transição. No fluxo INVERTIDO
 * do diploma (Victor 2026-06-30) `awaiting_pickup` também é só espera: o coordenador registra a
 * retirada e avança para `veteran`, então pollamos aqui pra pegar a virada. */
const POLLING_STATUSES = new Set([
  "exam_scheduled",
  "awaiting_documentation_dispatch",
  "pending",
  "awaiting_diploma_issuance",
  "awaiting_pickup",
]);

const POLL_MS = 8000;

export default function ProvasPage() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeStorage, getAccessToken, getServerAccessToken);
  const [me, setMe] = useState<StudentMe | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pendencies, setPendencies] = useState<StudentPendency[]>([]);

  // Auth gate (igual /aluno).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getAccessToken()) router.replace("/");
  }, [router]);

  // Carga inicial: roteia por status. Estados de documentos voltam pro /aluno.
  useEffect(() => {
    if (typeof window === "undefined" || !getAccessToken()) return;
    let cancelled = false;
    getStudentMe()
      .then((data) => {
        if (cancelled) return;
        if (ALUNO_STATUSES.has(data.status ?? "")) {
          router.replace("/aluno");
          return;
        }
        setMe(data);
        setLoaded(true);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // 401 já limpou a sessão no silent-refresh; o guard cuida.
        if (!(e instanceof ApiError) || e.status !== 401) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Pendências (kind documento/taxa): carrega/atualiza só quando o aluno está em PENDING.
  // Sem limpeza síncrona — o valor só é lido no ramo "pending"; fora dele é inerte.
  useEffect(() => {
    if (!loaded || me?.status !== "pending") return;
    let cancelled = false;
    getStudentPendencies()
      .then((list) => {
        if (!cancelled) setPendencies(list);
      })
      .catch(() => {
        // fallback: o /student/me já carrega as pendências embutidas.
        if (!cancelled) setPendencies(me?.pendencies ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [loaded, me?.status, me?.pendencies]);

  // Polling: roda enquanto aguarda ação do coordenador (prova corrigida, documentação,
  // emissão do diploma). Para nos estados que exigem ação do aluno e em veteran.
  useEffect(() => {
    if (!loaded || !me || !POLLING_STATUSES.has(me.status ?? "")) return;
    let cancelled = false;
    let inflight = false;
    const id = setInterval(async () => {
      if (inflight || cancelled) return;
      inflight = true;
      try {
        const next = await getStudentMe();
        if (cancelled) return;
        if (ALUNO_STATUSES.has(next.status ?? "")) {
          router.replace("/aluno");
          return;
        }
        setMe(next);
      } catch {
        // silent: 401 já trata sessão
      } finally {
        inflight = false;
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [loaded, me, router]);

  // veteran: a troca de role invalidou o JWT. Re-loga (mesmo padrão do AwaitingRelease
  // da matrícula): re-salva phone/externalId e manda pro /login com auto-OTP.
  useEffect(() => {
    if (!loaded || me?.status !== "veteran") return;
    const sess = getSession();
    if (sess?.phone) {
      saveSession({
        phone: sess.phone,
        externalId: sess.externalId ?? null,
        ref: sess.ref ?? null,
      });
    }
    router.replace("/login?relogin=1");
  }, [loaded, me?.status, router]);

  if (!token || !loaded || !me) return <LoadingOverlay show />;

  const status = me.status ?? "";
  const step = STATUS_STEP[status] ?? 0;
  const terminal = step >= 3;

  return (
    <main id="conteudo" className="flex flex-1 px-6 pt-6 pb-16">
      <div className="mx-auto my-auto flex w-full max-w-md flex-col gap-6">
        <BackLink href="/painel">Painel</BackLink>

        <header className="flex flex-col gap-4">
          <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-[26px]">
            {headline(status)}
          </h1>
          <Stepper
            current={terminal ? STEPS.length : step}
            labels={STEPS}
            ariaLabel="Etapas da prova ao diploma"
          />
        </header>

        <ProvasBody me={me} pendencies={pendencies} onUpdate={setMe} onRefetch={refetch} />
      </div>
    </main>
  );

  async function refetch() {
    try {
      const next = await getStudentMe();
      if (ALUNO_STATUSES.has(next.status ?? "")) {
        router.replace("/aluno");
        return;
      }
      setMe(next);
    } catch {
      // 401 já trata sessão
    }
  }
}

function headline(status: string): string {
  switch (status) {
    case "exam_released":
      return "Agende sua prova";
    case "exam_failed":
      return "Reagende sua prova";
    case "exam_scheduled":
      return "Prova agendada";
    case "awaiting_documentation_dispatch":
      return "Quase lá";
    case "pending":
      return "Você tem uma pendência";
    case "awaiting_diploma_issuance":
      return "Preparando seu diploma";
    case "awaiting_pickup":
      return "Seu diploma está pronto";
    case "veteran":
      return "Você conseguiu!";
    default:
      return "Sua jornada";
  }
}

/** Estados que aguardam o coordenador — mensagem + microcopy padrão (sem ação do aluno). */
const WAITING_COPY: Record<string, { title: string; body: string }> = {
  exam_scheduled: {
    title: "Prova agendada",
    body: "Recebemos seu agendamento. O polo confirma o horário e corrige sua prova. Você não precisa fazer mais nada por aqui — avisaremos o resultado.",
  },
  awaiting_documentation_dispatch: {
    title: "Conferindo sua documentação",
    body: "Você foi aprovado na prova! Agora o polo prepara e envia sua documentação. Acompanhe por aqui — assim que houver novidade, esta tela atualiza sozinha.",
  },
  awaiting_diploma_issuance: {
    title: "Emitindo seu diploma",
    body: "Tudo certo com sua documentação! Seu diploma está sendo emitido pelo polo. Em breve liberamos a retirada aqui mesmo.",
  },
  awaiting_pickup: {
    title: "Seu diploma está pronto",
    body: "Seu diploma já foi emitido! Combine a retirada com o seu polo. Assim que o polo registrar a entrega, você entra como veterano — esta tela atualiza sozinha.",
  },
};

interface ProvasBodyProps {
  me: StudentMe;
  pendencies: StudentPendency[];
  onUpdate: (next: StudentMe) => void;
  onRefetch: () => void;
}

function ProvasBody({ me, pendencies, onUpdate, onRefetch }: ProvasBodyProps) {
  const status = me.status ?? "";

  if (status === "exam_released" || status === "exam_failed") {
    // Reagendamento: a escolha anterior não vale mais — limpa pra não ecoar dado velho.
    if (status === "exam_failed") clearExamChoice();
    return (
      <ExamSchedule
        retry={status === "exam_failed"}
        onScheduled={onUpdate}
        onWrongStatus={onRefetch}
      />
    );
  }

  if (status === "exam_scheduled") {
    return <ExamScheduledCard />;
  }

  if (status === "pending") {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-[14px] leading-relaxed text-white/70">
          O polo registrou uma pendência no seu processo. Regularize pelo canal indicado pelo seu
          polo — assim que resolvida, sua documentação volta a andar e esta tela atualiza sozinha.
        </p>
        {pendencies.length ? (
          <PendencyList pendencies={pendencies} />
        ) : (
          <WaitingCard
            title="Pendência registrada"
            body="Entre em contato com seu polo para regularizar. Assim que resolvido, seguimos automaticamente."
          />
        )}
      </div>
    );
  }

  if (status === "veteran") {
    return (
      <WaitingCard
        title="Parabéns, formando!"
        body="Você concluiu sua jornada com o Supletivo Brasil. Estamos te levando de volta para entrar como veterano — faça login novamente para acessar."
      />
    );
  }

  const copy = WAITING_COPY[status];
  if (copy) {
    return <WaitingCard title={copy.title} body={copy.body} />;
  }

  // Fallback defensivo: status desconhecido (ou de transição) — mostra espera neutra.
  return (
    <WaitingCard
      title="Acompanhando seu processo"
      body="Estamos verificando a situação da sua prova. Esta tela atualiza sozinha — não precisa recarregar."
    />
  );
}

/**
 * Tela de prova agendada (G1): ecoa a matéria + data/hora que o aluno escolheu
 * em vez de um card de espera genérico. A escolha vem do storage local salvo no
 * agendamento (o /me não devolve esses dados); sem ela, cai no texto padrão.
 */
function ExamScheduledCard() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const choice = getExamChoice();
    if (choice) setLabel(formatExamChoice(choice));
  }, []);

  if (!label) {
    return <WaitingCard title={WAITING_COPY.exam_scheduled.title} body={WAITING_COPY.exam_scheduled.body} />;
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-[28px] border border-white/15 bg-white/10 p-7 text-center backdrop-blur-md">
      <span className="flex size-14 items-center justify-center rounded-full bg-white/15 text-white">
        <svg
          className="size-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </span>
      <h2 className="text-xl font-extrabold text-white">Prova agendada</h2>
      <p className="rounded-xl bg-white/15 px-4 py-2 text-[15px] font-extrabold text-white">
        Sua prova: {label}
      </p>
      <p className="text-[14px] leading-relaxed text-white/75">
        O polo confirma o horário e corrige sua prova. Você não precisa fazer mais nada por aqui —
        avisaremos o resultado.
      </p>
    </div>
  );
}

function WaitingCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[28px] border border-white/15 bg-white/10 p-7 text-center backdrop-blur-md">
      <span className="flex size-14 items-center justify-center rounded-full bg-white/15 text-white">
        <svg
          className="size-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </span>
      <h2 className="text-xl font-extrabold text-white">{title}</h2>
      <p className="text-[14px] leading-relaxed text-white/75">{body}</p>
    </div>
  );
}
