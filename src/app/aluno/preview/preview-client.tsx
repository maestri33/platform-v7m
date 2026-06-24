"use client";

import { useState } from "react";

import { type DocumentType, type StudentDocument, type BloodType } from "@/lib/api";

import { BloodTypeField } from "../_components/blood-type-field";
import { DocumentCard } from "../_components/document-card";
import { DocumentUploadSheet } from "../_components/document-upload-sheet";
import { StudentStepper } from "../_components/student-stepper";

const STEPS = ["Documentos", "Em análise", "Tipo sanguíneo"];

const DOC_TYPES: DocumentType[] = [
  "certificate",
  "transcript",
  "address_proof",
  "id_card",
  "birth_certificate",
  "military",
];

/**
 * Dev-only: renderiza a tela /aluno com um status forçado, pra inspeção
 * visual de cada estado da máquina. Sem auth, sem backend, sem polling real.
 */
export function AlunoPreview({ status }: { status: string }) {
  const [me, setMe] = useState<import("@/lib/api").StudentMe>(() =>
    buildMock(status, null),
  );
  const [openDoc, setOpenDoc] = useState<DocumentType | null>(null);

  const step = stepFor(status);
  const terminal = step >= 3;
  const allRequiredApproved = (me.documents ?? [])
    .filter((d) => d.applies && d.required)
    .every((d) => d.validation_status === "approved");

  return (
    <div className="flex w-full max-w-lg flex-col gap-7">
      <span className="text-sm font-bold text-brand-blue">← Painel</span>

      <header className="flex flex-col gap-4">
        <h1 className="text-[26px] font-extrabold leading-tight text-brand-ink">
          {labelFor(status)}
        </h1>
        <StudentStepper current={terminal ? STEPS.length : step} labels={STEPS} />
      </header>

      <div className="flex flex-col gap-3">
        {(me.documents ?? []).map((d, i) => (
          <div key={d.type} className="card-in" style={{ animationDelay: `${i * 50}ms` }}>
            <DocumentCard doc={d} onUpload={setOpenDoc} />
          </div>
        ))}

        <div className="my-2 h-px bg-brand-border" />

        <div className="card-in" style={{ animationDelay: `${DOC_TYPES.length * 50}ms` }}>
          <BloodTypeField
            current={me.blood_type ?? null}
            enabled={allRequiredApproved}
            onSubmitted={(next) => setMe(next)}
          />
        </div>
      </div>

      <DocumentUploadSheet
        open={openDoc !== null}
        docType={openDoc}
        onClose={() => setOpenDoc(null)}
        onSettled={(next) => setMe(next)}
      />
    </div>
  );
}

function stepFor(status: string): number {
  if (status === "documents_under_review") return 1;
  if (status === "blood_type_pending") return 2;
  if (status === "exam_released") return 3;
  return 0;
}

function labelFor(status: string): string {
  if (status === "documents_under_review") return "Documentos em análise";
  if (status === "blood_type_pending") return "Falta pouco";
  if (status === "exam_released") return "Quase lá";
  return "Envie seus documentos";
}

function buildMock(
  status: string,
  blood: BloodType | null,
): import("@/lib/api").StudentMe {
  const docs: StudentDocument[] = DOC_TYPES.map((t) => buildDoc(t, status));
  return {
    external_id: "preview-uuid",
    name: "Aluno Preview",
    status,
    platform: null,
    documents: docs,
    blood_type: blood,
  };
}

function buildDoc(type: DocumentType, status: string): StudentDocument {
  if (status === "awaiting_documents") {
    return {
      type,
      applies: type === "military" ? false : true,
      required: true,
      uploaded_at: null,
      validation_status: null,
      analysis_reason: null,
      photo_url: null,
    };
  }
  if (status === "documents_under_review") {
    return {
      type,
      applies: type === "military" ? false : true,
      required: true,
      uploaded_at: "2026-06-20T12:00:00Z",
      validation_status: "pending",
      analysis_reason: null,
      photo_url: null,
    };
  }
  // blood_type_pending / exam_released: tudo aprovado
  return {
    type,
    applies: type === "military" ? false : true,
    required: true,
    uploaded_at: "2026-06-20T12:00:00Z",
    validation_status: "approved",
    analysis_reason: null,
    photo_url: null,
  };
}
