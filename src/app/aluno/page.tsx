"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { BackLink } from "@/components/ui/back-link";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Stepper } from "@/components/ui/stepper";
import {
  ApiError,
  type DocumentType,
  type StudentDocument,
  type StudentMe,
  getStudentMe,
} from "@/lib/api";
import { getAccessToken, getServerAccessToken, subscribeStorage } from "@/lib/session";

import { BloodTypeField } from "./_components/blood-type-field";
import { DocumentCard } from "./_components/document-card";
import { DocumentUploadSheet } from "./_components/document-upload-sheet";

const STEPS = ["Documentos", "Em análise", "Tipo sanguíneo"];

/** Server status -> wizard step. `exam_released` é terminal: redirect pra /provas. */
const STATUS_STEP: Record<string, number> = {
  awaiting_documents: 0,
  documents_under_review: 1,
  blood_type_pending: 2,
  exam_released: 3,
};

/** Polling do estado global (lista de docs): 8s default, 5s quando aguardando exam_released. */
const LIST_POLL_MS = 8000;
const RELEASED_POLL_MS = 5000;

const DOC_ORDER: DocumentType[] = [
  "certificate",
  "transcript",
  "address_proof",
  "id_card",
  "birth_certificate",
  "military",
];

export default function AlunoPage() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeStorage, getAccessToken, getServerAccessToken);
  const [me, setMe] = useState<StudentMe | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [openDoc, setOpenDoc] = useState<DocumentType | null>(null);
  const [busy, setBusy] = useState(false);

  // Auth gate
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getAccessToken()) router.replace("/");
  }, [router]);

  // Carga inicial + redirect imediato se exam_released
  useEffect(() => {
    if (typeof window === "undefined" || !getAccessToken()) return;
    let cancelled = false;
    getStudentMe()
      .then((data) => {
        if (cancelled) return;
        setMe(data);
        setLoaded(true);
        if (data.status === "exam_released") {
          router.replace("/provas");
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // 401 já limpou a sessão no silent-refresh; o guard do layout cuida.
        if (!(e instanceof ApiError) || e.status !== 401) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Polling global: roda enquanto o aluno está entre "enviou tudo" e
  // "tudo aprovado" (incluindo blood_type_pending). Para assim que exam_released
  // ou assim que o aluno começa a interagir (sinalizado pelo sheet aberto).
  // Intervalo encurta pra 5s quando está aguardando exam_released (saiu do
  // /blood-type, quer ver o status virar rápido).
  useEffect(() => {
    if (!loaded || !me) return;
    if (me.status === "exam_released" || openDoc) return;
    let cancelled = false;
    let inflight = false;
    const intervalMs = me.status === "blood_type_pending" ? RELEASED_POLL_MS : LIST_POLL_MS;
    const id = setInterval(async () => {
      if (inflight || cancelled) return;
      inflight = true;
      try {
        const next = await getStudentMe();
        if (cancelled) return;
        setMe(next);
        if (next.status === "exam_released") {
          router.replace("/provas");
        }
      } catch {
        // silent: 401 já trata sessão
      } finally {
        inflight = false;
      }
    }, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [loaded, me, openDoc, router]);

  if (!token || !loaded || !me) return <LoadingOverlay show />;

  const step = STATUS_STEP[me.status ?? ""] ?? 0;
  const documents = sortDocuments(me.documents);
  const allRequiredApproved = documents
    .filter((d) => d.applies && d.required)
    .every((d) => d.validation_status === "approved");
  const bloodTypeDone = !!me.blood_type;
  const terminal = step >= 3;
  const stepLabel = me.status === "awaiting_documents"
    ? "Envie seus documentos"
    : me.status === "documents_under_review"
      ? "Documentos em análise"
      : me.status === "blood_type_pending"
        ? "Falta pouco"
        : "Quase lá";

  return (
    <main id="conteudo" className="flex flex-1 px-6 py-8">
      <div className="m-auto flex w-full max-w-lg flex-col gap-7">
        <BackLink href="/painel">Painel</BackLink>

        <header className="flex flex-col gap-4">
          <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-[26px]">
            {stepLabel}
          </h1>
          <Stepper
            current={terminal ? STEPS.length : step}
            labels={STEPS}
            ariaLabel="Etapas da entrega de documentos"
          />
          <p className="text-[13px] leading-relaxed text-white/70">
            {microcopy(me.status ?? null, allRequiredApproved, bloodTypeDone)}
          </p>
        </header>

        <div className="flex flex-col gap-3">
          {documents.map((d, i) => (
            <div
              key={d.type}
              className="card-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <DocumentCard doc={d} busy={busy} onUpload={setOpenDoc} />
            </div>
          ))}

          <div className="my-2 h-px bg-white/15" />

          <div className="card-in" style={{ animationDelay: `${documents.length * 50}ms` }}>
            <BloodTypeField
              current={me.blood_type ?? null}
              enabled={allRequiredApproved}
              onSubmitted={(next) => setMe(next)}
            />
          </div>
        </div>

        {!terminal ? (
          <p className="text-center text-[12px] leading-relaxed text-white/60">
            Quando tudo for validado, sua prova é liberada automaticamente.
          </p>
        ) : null}
      </div>

      <DocumentUploadSheet
        open={openDoc !== null}
        docType={openDoc}
        onClose={() => setOpenDoc(null)}
        onSettled={(next) => {
          setMe(next);
          setBusy(false);
        }}
      />

      <LoadingOverlay show={busy} />
    </main>
  );
}

function sortDocuments(docs: StudentDocument[] | undefined): StudentDocument[] {
  if (!docs) return [];
  const map = new Map(docs.map((d) => [d.type, d]));
  return DOC_ORDER.map((t) => map.get(t)).filter((d): d is StudentDocument => !!d);
}

function microcopy(
  status: string | null,
  allApproved: boolean,
  bloodDone: boolean,
): string {
  if (status === "documents_under_review") {
    return "Aguarde enquanto nossa verificação confere seus documentos. Você não precisa recarregar a página.";
  }
  if (status === "blood_type_pending" && allApproved && !bloodDone) {
    return "Documentos validados! Informe seu tipo sanguíneo pra liberar a prova.";
  }
  if (status === "blood_type_pending" && bloodDone) {
    return "Registramos seu tipo sanguíneo. Estamos liberando sua prova — pode levar alguns segundos.";
  }
  if (allApproved) {
    return "Documentos validados! Agora confirme seu tipo sanguíneo.";
  }
  return "Tire uma foto nítida de cada documento. A leitura é automática e leva alguns segundos.";
}
