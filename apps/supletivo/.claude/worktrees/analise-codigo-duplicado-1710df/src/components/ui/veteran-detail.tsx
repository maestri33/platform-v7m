"use client";

import { useEffect, useState } from "react";

import {
  ApiError,
  DOCUMENT_LABEL,
  type DocumentType,
  type VeteranMe,
  getErrorMessage,
  getVeteranMe,
  mediaUrl,
} from "@/lib/api";
import { ErrorBox } from "@/components/ui/error-box";

/**
 * Visão consolidada READ-ONLY do VETERANO (GET /veteran/me). O fluxo do diploma é do COORDENADOR:
 * o veterano só LÊ aqui o estado final — dados pessoais, bloco da matrícula, os documentos que ele
 * postou como aluno e o que o coordenador postou (diploma + histórico + foto da retirada). Os paths
 * de mídia vêm relativos do backend → passam por mediaUrl() (proxiado em /media/ pela mesma origem).
 * Componente auto-suficiente: busca o próprio /veteran/me (o painel só decide montá-lo no stage veteran).
 */
export function VeteranDetail() {
  const [data, setData] = useState<VeteranMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVeteranMe()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        // 401 já é tratado no silent-refresh/guard do painel; só mostramos erros reais.
        if (cancelled || (e instanceof ApiError && e.status === 401)) return;
        setError(getErrorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <ErrorBox tone="neutral" message={error} />;
  }

  if (!data) {
    return <ErrorBox tone="neutral" message="Carregando sua jornada…" />;
  }

  const diploma = data.diploma;
  const enr = data.enrollment;

  return (
    <div className="flex flex-col gap-5">
      {/* Diploma — o destaque: arquivos postados pelo COORDENADOR. */}
      {diploma ? (
        <Section title="Seu diploma">
          <div className="flex flex-col gap-2.5">
            {diploma.issued_at ? (
              <Field label="Emitido em" value={formatDate(diploma.issued_at)} />
            ) : null}
            {diploma.picked_up_at ? (
              <Field label="Retirada registrada em" value={formatDate(diploma.picked_up_at)} />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <FileLink href={mediaUrl(diploma.diploma_file)} label="Abrir diploma (PDF)" />
              <FileLink href={mediaUrl(diploma.transcript_file)} label="Abrir histórico (PDF)" />
            </div>
            {mediaUrl(diploma.pickup_photo) ? (
              <figure className="mt-1 overflow-hidden rounded-xl border border-brand-border">
                <img
                  src={mediaUrl(diploma.pickup_photo) ?? undefined}
                  alt="Foto da retirada do diploma"
                  className="max-h-72 w-full object-cover"
                />
                <figcaption className="bg-brand-bg px-3 py-1.5 text-[12px] font-semibold text-brand-muted">
                  Foto da retirada
                </figcaption>
              </figure>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* Dados pessoais. */}
      <Section title="Seus dados">
        <div className="flex flex-col gap-2.5">
          <Field label="Nome" value={data.user.name} />
          <Field label="CPF" value={data.user.cpf} />
          <Field label="WhatsApp" value={data.user.phone} />
          <Field label="E-mail" value={data.user.email} />
          {data.blood_type ? <Field label="Tipo sanguíneo" value={data.blood_type} /> : null}
        </div>
      </Section>

      {/* Bloco da matrícula. */}
      {enr ? (
        <Section title="Sua matrícula">
          <div className="flex flex-col gap-2.5">
            {enr.education?.level ? (
              <Field
                label="Escolaridade"
                value={`${enr.education.level === "medio" ? "Ensino médio" : "Ensino fundamental"}${
                  enr.education.grade ? ` — ${enr.education.grade}ª série` : ""
                }`}
              />
            ) : null}
            {enr.address?.city ? (
              <Field
                label="Endereço"
                value={addressLine(enr.address)}
              />
            ) : null}
            {enr.rg?.number ? <Field label="RG" value={enr.rg.number} /> : null}
            <div className="flex flex-wrap gap-2">
              <FileLink href={mediaUrl(enr.rg?.front_photo)} label="RG (frente)" />
              <FileLink href={mediaUrl(enr.rg?.back_photo)} label="RG (verso)" />
              <FileLink href={mediaUrl(enr.rg?.full_photo)} label="RG (completo)" />
              <FileLink href={mediaUrl(enr.selfie?.photo)} label="Selfie da matrícula" />
            </div>
          </div>
        </Section>
      ) : null}

      {/* Documentos que o ALUNO postou. */}
      {data.documents.length ? (
        <Section title="Documentos enviados">
          <ul className="flex flex-col gap-2">
            {data.documents.map((d) => {
              const url = mediaUrl(d.photo);
              const label = DOCUMENT_LABEL[d.doc_type as DocumentType] ?? d.doc_type;
              return (
                <li
                  key={d.doc_type}
                  className="flex items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-bg px-3.5 py-2.5"
                >
                  <span className="text-[14px] font-semibold text-brand-ink">{label}</span>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 shrink-0 items-center text-[13px] font-bold text-brand-blue underline underline-offset-4"
                    >
                      Abrir
                    </a>
                  ) : (
                    <span className="shrink-0 text-[12px] font-semibold text-brand-muted">
                      sem arquivo
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-brand-border bg-white/60 p-4">
      <h2 className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-brand-blue/80">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-bold uppercase tracking-wide text-brand-muted">{label}</span>
      <span className="text-[15px] font-semibold text-brand-ink">{value}</span>
    </div>
  );
}

/** Link de arquivo (PDF/imagem) que abre em nova aba. Não renderiza nada se não houver URL. */
function FileLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center rounded-lg border border-brand-blue/30 bg-brand-blue/10 px-3 text-[13px] font-bold text-brand-blue transition hover:bg-brand-blue/20"
    >
      {label}
    </a>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function addressLine(a: NonNullable<VeteranMe["enrollment"]>["address"]): string {
  if (!a) return "";
  const parts = [
    [a.street, a.number].filter(Boolean).join(", "),
    a.neighborhood,
    [a.city, a.state].filter(Boolean).join(" - "),
  ].filter(Boolean);
  return parts.join(" • ");
}
