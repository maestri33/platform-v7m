"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import {
  BackLink,
  LoadingOverlay,
  Stepper,
  BloodTypeCard,
  FeedbackModal,
  DocumentResolutionDrawer,
  DocumentInspectorModal,
  type BloodTypeValue,
  type DocumentItem,
} from "@v7m/ui";
import { ActiveBlocksBanner } from "@/components/blocks";

import {
  ApiError,
  type DocumentType,
  type StudentDocument,
  type StudentMe,
  getStudentMe,
  postStudentBloodType,
  postStudentDocument,
  uploadEnrollmentAddressProof,
} from "@/lib/api";
import { getAccessToken, getServerAccessToken, subscribeStorage } from "@/lib/session";

const STEPS = ["Documentos", "Em análise", "Tipo sanguíneo"];

/** Server status -> wizard step. `exam_released` é terminal: redirect pra /provas. */
const STATUS_STEP: Record<string, number> = {
  awaiting_documents: 0,
  documents_under_review: 1,
  blood_type_pending: 2,
  exam_released: 3,
};

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

const DOC_TITLES: Record<DocumentType, string> = {
  certificate: "Certificado de conclusão",
  transcript: "Histórico escolar",
  address_proof: "Comprovante de endereço",
  id_card: "RG ou CNH",
  birth_certificate: "Certidão de nascimento/casamento",
  military: "Certificado de reservista",
};

const DOC_DESCRIPTIONS: Record<DocumentType, string> = {
  certificate: "Foto do certificado de conclusão (frente inteira, sem cortar).",
  transcript: "Histórico escolar completo, com carimbo da escola visível.",
  address_proof: "Conta de luz, água ou internet dos últimos 3 meses.",
  id_card: "Foto do RG oficial ou CIN, aberta na página da foto.",
  birth_certificate: "Certidão de nascimento ou casamento legível.",
  military: "Certificado de reservista (frente).",
};

const DOC_MAP_TO_ITEM_ID: Record<DocumentType, DocumentItem["id"]> = {
  certificate: "voter_card",
  transcript: "school_history",
  address_proof: "address",
  id_card: "identity",
  birth_certificate: "civil_certificate",
  military: "military_certificate",
};

const ITEM_ID_TO_DOC_TYPE: Record<string, DocumentType> = {
  voter_card: "certificate",
  school_history: "transcript",
  address: "address_proof",
  identity: "id_card",
  civil_certificate: "birth_certificate",
  military_certificate: "military",
};

export default function AlunoPage() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeStorage, getAccessToken, getServerAccessToken);
  const [me, setMe] = useState<StudentMe | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeDrawerItem, setActiveDrawerItem] = useState<DocumentItem | null>(null);
  const [activeInspectorItem, setActiveInspectorItem] = useState<DocumentItem | null>(null);
  const [showCnhRejectModal, setShowCnhRejectModal] = useState(false);
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
        if (!(e instanceof ApiError) || e.status !== 401) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Polling global
  useEffect(() => {
    if (!loaded || !me) return;
    if (me.status === "exam_released" || activeDrawerItem !== null) return;
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
        // 401 gerenciado pela sessão
      } finally {
        inflight = false;
      }
    }, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [loaded, me, activeDrawerItem, router]);

  if (!token || !loaded || !me) return <LoadingOverlay show />;

  const step = STATUS_STEP[me.status ?? ""] ?? 0;
  const rawDocs = sortDocuments(me.documents);
  const allRequiredApproved = rawDocs
    .filter((d) => d.applies && d.required)
    .every((d) => d.validation_status === "approved");
  const bloodTypeDone = !!me.blood_type;
  const terminal = step >= 3;
  const stepLabel =
    me.status === "awaiting_documents"
      ? "Envie seus documentos"
      : me.status === "documents_under_review"
        ? "Documentos em análise"
        : me.status === "blood_type_pending"
          ? "Falta pouco"
          : "Quase lá";

  const items: DocumentItem[] = rawDocs.map((doc) => mapStudentDocToItem(doc));

  const handleUploadItem = async (item: DocumentItem, file: File) => {
    const rawType = ITEM_ID_TO_DOC_TYPE[item.id] || "id_card";
    if (rawType === "id_card") {
      const lower = file.name.toLowerCase();
      if (lower.includes("cnh") || lower.includes("habilitacao")) {
        setShowCnhRejectModal(true);
        throw new Error("O MEC veda expressamente o uso de CNH para emissão de Certificado EJA. Envie seu RG ou CIN.");
      }
    }

    setBusy(true);
    try {
      if (rawType === "address_proof") {
        await uploadEnrollmentAddressProof(file);
      } else {
        await postStudentDocument(rawType, file);
      }
      const updated = await getStudentMe();
      setMe(updated);
      if (updated.status === "exam_released") {
        router.replace("/provas");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleBloodTypeSubmit = async (bloodType: BloodTypeValue) => {
    const updated = await postStudentBloodType(bloodType);
    setMe(updated);
    if (updated.status === "exam_released") {
      router.replace("/provas");
    }
  };

  return (
    <main id="conteudo" className="flex flex-1 px-6 pt-6 pb-16">
      <div className="mx-auto my-auto flex w-full max-w-md flex-col gap-6">
        <BackLink href="/painel">Painel</BackLink>

        <ActiveBlocksBanner />

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
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="card-in"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div
                className={`group relative flex items-center justify-between rounded-2xl border p-4.5 transition-all shadow-md ${
                  item.status === "approved"
                    ? "border-emerald-500/40 bg-slate-900/95"
                    : item.status === "analyzing" || item.status === "review"
                      ? "border-blue-500/40 bg-slate-900/95"
                      : item.status === "needs_action"
                        ? "border-red-500/40 bg-slate-900/95 ring-1 ring-red-500/20"
                        : "border-slate-800 bg-slate-900/95 hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col gap-1 pr-3">
                  <span className="text-[15px] font-bold text-white group-hover:text-brand-blue-glow transition">
                    {item.title}
                  </span>
                  <span className="text-[12px] text-white/60 line-clamp-1">
                    {item.description}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveDrawerItem(item)}
                    className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    {item.status === "approved" ? "Ver" : "Enviar"}
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="my-2 h-px bg-white/15" />

          <div className="card-in" style={{ animationDelay: `${items.length * 50}ms` }}>
            <BloodTypeCard
              current={(me.blood_type as BloodTypeValue) ?? null}
              enabled={allRequiredApproved}
              onSubmit={handleBloodTypeSubmit}
            />
          </div>
        </div>

        {!terminal ? (
          <p className="text-center text-[12px] leading-relaxed text-white/60">
            Quando tudo for validado, sua prova é liberada automaticamente.
          </p>
        ) : null}
      </div>

      {activeDrawerItem && (
        <DocumentResolutionDrawer
          isOpen={true}
          item={activeDrawerItem}
          persona="student"
          onClose={() => setActiveDrawerItem(null)}
          onResolveUpload={async (item: DocumentItem, file: File) => {
            await handleUploadItem(item, file);
            setActiveDrawerItem(null);
          }}
        />
      )}

      {activeInspectorItem && (
        <DocumentInspectorModal
          isOpen={true}
          item={activeInspectorItem}
          onClose={() => setActiveInspectorItem(null)}
        />
      )}

      <FeedbackModal
        isOpen={showCnhRejectModal}
        variant="danger"
        title="CNH não permitida para Alunos"
        description="O Ministério da Educação (MEC) veda expressamente o uso de CNH para emissão de Certificado e Histórico EJA. Por favor, envie seu RG ou Carteira de Identidade Nacional (CIN) com filiação completa e naturalidade visíveis."
        primaryAction={{
          label: "Entendi, vou enviar RG",
          onClick: () => setShowCnhRejectModal(false),
        }}
        onClose={() => setShowCnhRejectModal(false)}
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

function mapStudentDocToItem(doc: StudentDocument): DocumentItem {
  let status: DocumentItem["status"] = "empty";
  if (doc.validation_status === "approved") status = "approved";
  else if (doc.validation_status === "rejected") status = "needs_action";
  else if (doc.validation_status === "review") status = "review";
  else if (doc.uploaded_at) status = "analyzing";

  let category: DocumentItem["category"] = "academic";
  if (doc.type === "id_card") category = "civil";
  else if (doc.type === "address_proof") category = "address";
  else if (doc.type === "birth_certificate") category = "civil";
  else if (doc.type === "military") category = "civil";

  return {
    id: DOC_MAP_TO_ITEM_ID[doc.type] || "identity",
    title: DOC_TITLES[doc.type] || "Documento",
    category,
    description: DOC_DESCRIPTIONS[doc.type] || "Documento acadêmico obrigatório",
    status,
    fileUrl: doc.photo_url ?? undefined,
    reason: doc.analysis_reason ?? undefined,
    allowedAudiences: ["student"],
  };
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
