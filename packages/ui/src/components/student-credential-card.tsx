"use client";

import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  GraduationCap,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CardContainer, CardBody, CardItem } from "../primitives/card";

export interface StudentCredentialCardProps {
  name: string;
  photo?: string | null;
  age?: number | null;
  protocol: string;
  issuedAt: string;
  badgeText?: string;
  onContinue?: () => void;
  className?: string;
  children?: ReactNode;
  cpf?: string | null;
  phone?: string | null;
  sex?: "M" | "F" | string | null;
  modalidade?: string;
  autoAdvancing?: boolean;
  /** Ativa efeito 3D parallax. Padrão: true */
  tilt?: boolean;
}

function formatMaskedCpf(raw?: string | null): string {
  if (!raw) return "•••.•••.•••-••";
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) return raw;
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
}

/**
 * Cartão de credencial oficial do estudante / confirmação de identidade — @v7m/ui.
 * Apresentação de alta fidelidade com suporte a 3D tilt e elevação em camadas.
 */
export function StudentCredentialCard({
  name,
  photo,
  age,
  protocol,
  issuedAt,
  badgeText = "✦ Vaga reservada",
  onContinue,
  className = "",
  children,
  cpf,
  sex,
  modalidade = "EJA Ensino Médio • 100% Online",
  autoAdvancing = false,
  tilt = true,
}: StudentCredentialCardProps) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    ((words[0]?.[0] ?? "") + (words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : ""))
      .toUpperCase() || "•";

  const maskedCpf = formatMaskedCpf(cpf);
  const studentRole =
    sex === "F" ? "Aluna Matriculada" : sex === "M" ? "Aluno Matriculado" : "Estudante Matriculado(a)";

  const cardInner = (
    <div
      role="region"
      aria-label={`Identidade confirmada: ${name}`}
      className={`relative flex w-full max-w-[420px] flex-col items-center overflow-hidden rounded-[28px] border border-white/80 bg-gradient-to-b from-white/95 via-white/90 to-white/98 p-5 sm:p-6 text-center shadow-[0_20px_50px_-12px_rgba(11,27,59,0.22),inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-2xl transition-all ${className}`}
    >
      {/* Moldura holográfica suave / Aura gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[28px] bg-gradient-to-tr from-brand-green/20 via-transparent to-brand-blue/20 opacity-70"
      />

      {/* Marca d'água de segurança / Padrão Guilloché em SVG */}
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 size-48 text-brand-green/5 opacity-80"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        <circle cx="50" cy="50" r="45" strokeDasharray="3 3" />
        <circle cx="50" cy="50" r="35" />
        <circle cx="50" cy="50" r="25" strokeDasharray="2 2" />
        <path d="M50 5 L50 95 M5 50 L95 50" />
      </svg>

      {/* ── CABEÇALHO INSTITUCIONAL ── */}
      <div className="relative z-10 flex w-full items-center justify-between gap-2 border-b border-brand-border/60 pb-3">
        <CardItem translateZ={30} className="flex items-center gap-2 text-left">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green-dark shadow-xs">
            <GraduationCap className="size-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-brand-muted">
              República Federativa do Brasil
            </span>
            <span className="text-[11px] font-extrabold text-brand-ink">
              Sistema Oficial EJA • MEC
            </span>
          </div>
        </CardItem>

        {/* Badge Vaga Reservada com alto contraste */}
        <CardItem translateZ={45}>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800 bg-[#00734d] px-3 py-1 shadow-sm">
            <span className="size-2 rounded-full bg-emerald-300 animate-pulse" />
            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-white">
              {badgeText}
            </span>
          </div>
        </CardItem>
      </div>

      {/* ── AVATAR & IDENTIFICAÇÃO DO INDIVÍDUO ── */}
      <div className="relative z-10 my-3 flex flex-col items-center">
        <CardItem translateZ={65} className="relative grid size-24 place-items-center">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-blue via-brand-green to-brand-blue-bright p-[3px] shadow-[0_8px_24px_rgba(0,156,59,0.25)]"
          >
            <div className="size-full rounded-full bg-white" />
          </div>

          {photo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={name}
                className="relative size-[86px] rounded-full object-cover shadow-inner"
              />
              <span className="absolute -bottom-1 -right-1 inline-flex items-center gap-0.5 rounded-full border-2 border-white bg-[#25D366] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                <Check className="size-2.5 stroke-[3]" />
                WhatsApp
              </span>
            </>
          ) : (
            <span className="relative grid size-[86px] place-items-center rounded-full bg-gradient-to-br from-brand-blue/10 to-brand-green/10 text-2xl font-black text-brand-ink">
              {initials}
            </span>
          )}
        </CardItem>

        <CardItem translateZ={40} className="mt-2 flex flex-col items-center gap-0.5">
          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-green-dark">
            <Sparkles className="size-3 text-brand-green" />
            <span>Identidade Validada na Base Oficial</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-brand-ink">
            {name}
          </h3>
          <p className="text-xs font-semibold text-brand-muted">
            {age !== null && age !== undefined ? (
              <>
                <b className="font-bold text-brand-ink">{age} anos</b> · {studentRole}
              </>
            ) : (
              studentRole
            )}
          </p>
        </CardItem>
      </div>

      {/* ── GRID DE DADOS OFICIAIS DO INDIVÍDUO ── */}
      <CardItem translateZ={30} className="relative z-10 my-2 grid w-full grid-cols-2 gap-2 text-left">
        {/* Bloco CPF */}
        <div className="flex flex-col rounded-2xl border border-brand-border/60 bg-white/75 p-2.5 shadow-xs transition-all hover:bg-white">
          <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
            Documento CPF
          </span>
          <span className="mt-0.5 font-mono text-sm font-extrabold text-brand-ink">
            {maskedCpf}
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-brand-green-dark">
            <BadgeCheck className="size-3 text-brand-green" /> Verificado Oficial
          </span>
        </div>

        {/* Bloco Protocolo */}
        <div className="flex flex-col rounded-2xl border border-brand-border/60 bg-white/75 p-2.5 shadow-xs transition-all hover:bg-white">
          <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
            Protocolo Nacional
          </span>
          <span className="mt-0.5 font-mono text-sm font-extrabold text-brand-blue">
            {protocol}
          </span>
          <span className="mt-1 text-[10px] font-semibold text-brand-muted">
            Emitido em {issuedAt}
          </span>
        </div>

        {/* Bloco Modalidade */}
        <div className="flex flex-col rounded-2xl border border-brand-border/60 bg-white/75 p-2.5 shadow-xs transition-all hover:bg-white">
          <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
            Programa de Ensino
          </span>
          <span className="mt-0.5 text-xs font-bold text-brand-ink line-clamp-1">
            {modalidade}
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-muted">
            <ShieldCheck className="size-3 text-brand-blue" /> Lei nº 9.394/96
          </span>
        </div>

        {/* Bloco Vaga */}
        <div className="flex flex-col rounded-2xl border border-brand-border/60 bg-white/75 p-2.5 shadow-xs transition-all hover:bg-white">
          <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted">
            Situação da Vaga
          </span>
          <span className="mt-0.5 text-xs font-black text-[#00734d]">
            Garantida e Reservada
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-muted">
            <CheckCircle2 className="size-3 text-brand-green" /> Polo Digital Liberado
          </span>
        </div>
      </CardItem>

      {children}

      {/* ── FEEDBACK DE AUTO-AVANÇO / ATALHO DE CONTINUAR ── */}
      <div className="relative z-10 mt-3 flex w-full flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-brand-muted">
          <span className="inline-flex items-center gap-1.5 text-brand-ink">
            <Lock className="size-3 text-brand-blue" /> Matrícula Segura & Criptografada
          </span>
          <span className="font-extrabold text-brand-green-dark">Portaria MEC nº 183</span>
        </div>

        {onContinue && !autoAdvancing && (
          <CardItem translateZ={45} className="w-full">
            <button
              type="button"
              onClick={onContinue}
              className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand-green-dark py-3 text-sm font-black text-white shadow-[var(--shadow-button)] transition-all hover:bg-brand-green-hover hover:shadow-[var(--shadow-button-hover)] active:scale-[0.99]"
            >
              <span>Confirmar e Continuar</span>
              <ArrowRight className="size-4" />
            </button>
          </CardItem>
        )}
      </div>
    </div>
  );

  if (tilt) {
    return (
      <CardContainer containerClassName="w-full p-0 py-2 flex justify-center" className="w-full max-w-[420px]">
        <CardBody className="w-full flex justify-center">{cardInner}</CardBody>
      </CardContainer>
    );
  }

  return cardInner;
}
