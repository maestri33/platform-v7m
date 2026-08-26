"use client";

import { Camera, FileUp, Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, ReadOnlyField } from "@/components/ui/field";
import { FileInput } from "@/components/ui/file-input";
import { Spinner } from "@/components/ui/spinner";
import { StatusBanner } from "@/components/ui/status-banner";
import { FunnelStepper } from "@/components/ui/stepper";
import { OtpInput } from "@/components/ui/otp-input";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/ui/page-header";

import { ShowcaseGroup, Variant } from "./_parts";
import { ShowcaseShell } from "./index";

// Datas estáveis p/ os snapshots de StatusBanner (evita Date.now em render
// — Date.now é impure per React 19 rules-of-purity).
const SELFIE_APPROVED_TS = "12/06/2025 14:32";
const SELFIE_PENDING_TS = "13/06/2025 09:15";
const SELFIE_REJECTED_TS = "13/06/2025 11:42";

/**
 * Forms renderizados em todos os estados visuais (sem submit, sem useState
 * pesado). Marca cada variante com um `Badge tone="muted"` pra QA entender
 * "isso é um snapshot, não um form vivo".
 */
export function FormsSection() {
  return (
    <ShowcaseShell
      kicker="Dev preview · Forms"
      title="Forms em todos os estados"
      description="Visual only — não envia, não avança. Cada Variant é um snapshot estático do JSX real do form correspondente."
    >
      {/* ── CEP / Endereço ──────────────────────────────────────────── */}
      <ShowcaseGroup
        label="CEP / Endereço (EnderecoForm)"
        description="2 estágios: Stage 1 (CEP) → Stage 2 (resto)."
      >
        <Variant label="Stage 1 — CEP vazio">
          <div className="auth-card">
            <Field label="CEP" value="" onChange={() => {}} inputMode="numeric" placeholder="00000-000" required />
            <Button size="xl" className="mt-5 w-full">Buscar CEP</Button>
          </div>
        </Variant>
        <Variant label="Stage 1 — CEP preenchido">
          <div className="auth-card">
            <Field label="CEP" value="30130-000" onChange={() => {}} inputMode="numeric" required />
            <Button size="xl" className="mt-5 w-full">Buscar CEP</Button>
          </div>
        </Variant>
        <Variant label="Stage 1 — CEP com erro">
          <div className="auth-card">
            <Field label="CEP" value="3013" onChange={() => {}} inputMode="numeric" required />
            <FieldError>Esse CEP não tem 8 dígitos. Confira e tente de novo.</FieldError>
            <Button size="xl" className="mt-5 w-full">Buscar CEP</Button>
          </div>
        </Variant>
        <Variant label="Stage 1 — buscando (LoadingOverlay)">
          <div className="auth-card relative" style={{ transform: "translateZ(0)" }}>
            <Field label="CEP" value="30130-000" onChange={() => {}} inputMode="numeric" required />
            <Button size="xl" loading className="mt-5 w-full">Buscando…</Button>
            <div className="auth-overlay" role="status" aria-label="Buscando CEP…">
              <div className="overlay-mark">
                <div className="auth-ring" aria-hidden />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="" aria-hidden className="overlay-logo" />
              </div>
            </div>
          </div>
        </Variant>
        <Variant label="Stage 2 — todos preenchidos, salvar habilitado">
          <div className="auth-card">
            <div className="grid grid-cols-3 gap-3">
              <ReadOnlyField className="col-span-2" label="CEP" value="30130-000" />
              <Field label="Número" value="1500" onChange={() => {}} required inputMode="numeric" />
            </div>
            <Field className="mt-3" label="Rua" value="Av. Afonso Pena" onChange={() => {}} />
            <Field className="mt-3" label="Complemento" value="Apto 302" onChange={() => {}} />
            <Field className="mt-3" label="Bairro" value="Centro" onChange={() => {}} />
            <div className="mt-3 grid grid-cols-3 gap-3">
              <ReadOnlyField className="col-span-2" label="Cidade" value="Belo Horizonte" />
              <ReadOnlyField label="UF" value="MG" />
            </div>
            <Button size="xl" className="mt-5 w-full">Salvar e continuar</Button>
          </div>
        </Variant>
        <Variant label="Stage 2 — salvando (LoadingOverlay)">
          <div className="auth-card relative" style={{ transform: "translateZ(0)" }}>
            <ReadOnlyField label="CEP" value="30130-000" />
            <Button size="xl" loading className="mt-5 w-full">Salvando…</Button>
            <div className="auth-overlay" role="status" aria-label="Salvando endereço…">
              <div className="overlay-mark">
                <div className="auth-ring" aria-hidden />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="" aria-hidden className="overlay-logo" />
              </div>
            </div>
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── Pix Form ──────────────────────────────────────────────────── */}
      <ShowcaseGroup
        label="Pix (PixForm)"
        description="Detecção automática: EMAIL/EVP/CPF/PHONE/AMBIGUOUS. AMBIGUOUS abre painel de escolha."
      >
        <Variant label="Vazio">
          <div className="auth-card">
            <Field
              label="Chave"
              value=""
              onChange={() => {}}
              placeholder="CPF, e-mail, celular ou chave aleatória"
              hint="Precisa ser uma chave SUA, do mesmo CPF do cadastro — identificamos o tipo automaticamente."
              required
            />
            <Button size="xl" disabled className="mt-5 w-full">Validar chave</Button>
          </div>
        </Variant>
        <Variant label="Com e-mail (detectado: EMAIL)">
          <div className="auth-card">
            <Field
              label="Chave"
              value="bia@exemplo.com"
              onChange={() => {}}
              hint="Detectamos: E-mail"
              required
            />
            <Button size="xl" className="mt-5 w-full">Validar chave</Button>
          </div>
        </Variant>
        <Variant label="Com 11 dígitos (AMBIGUOUS) — painel de escolha">
          <div className="auth-card">
            <Field
              label="Chave"
              value="12345678901"
              onChange={() => {}}
              hint="Detectamos: CPF ou celular"
              required
            />
            <div className="auth-card mt-3 space-y-3 border-brand-gold/50">
              <p className="font-display text-base">CPF ou celular?</p>
              <p className="text-sm text-[var(--surface-text-muted)]">
                Você digitou 11 dígitos. Pra ter certeza de validar a chave certa, me
                diz: você quer conferir como CPF ou como celular?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button size="xl" className="w-full">Como CPF</Button>
                <Button size="xl" variant="ghost" className="w-full">Como celular</Button>
              </div>
            </div>
          </div>
        </Variant>
        <Variant label="Com CPF válido (detectado: CPF)">
          <div className="auth-card">
            <Field
              label="Chave"
              value="123.456.789-09"
              onChange={() => {}}
              hint="Detectamos: CPF"
              required
            />
            <Button size="xl" className="mt-5 w-full">Validar chave</Button>
          </div>
        </Variant>
        <Variant label="Com celular 11 dígitos (detectado: PHONE direto)">
          <div className="auth-card">
            <Field
              label="Chave"
              value="(11) 98765-4321"
              onChange={() => {}}
              hint="Detectamos: Celular"
              required
            />
            <Button size="xl" className="mt-5 w-full">Validar chave</Button>
          </div>
        </Variant>
        <Variant label="Validando (LoadingOverlay)">
          <div className="auth-card relative" style={{ transform: "translateZ(0)" }}>
            <Field
              label="Chave"
              value="bia@exemplo.com"
              onChange={() => {}}
              hint="Detectamos: E-mail"
              required
            />
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-brand-gold-ink" role="status">
              <Spinner /> Conferindo como E-mail…
            </p>
            <Button size="xl" loading className="mt-5 w-full">Validando…</Button>
            <div className="auth-overlay" role="status" aria-label="Validando chave…">
              <div className="overlay-mark">
                <div className="auth-ring" aria-hidden />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="" aria-hidden className="overlay-logo" />
              </div>
            </div>
          </div>
        </Variant>
        <Variant label="Com erro (PIX_INVALID)">
          <div className="auth-card">
            <Field
              label="Chave"
              value="outra@email.com"
              onChange={() => {}}
              hint="Detectamos: E-mail"
              required
            />
            <FieldError>Essa chave não apareceu no seu CPF. Sem estresse: confira se digitou certo — ela precisa ser sua, do mesmo CPF do cadastro.</FieldError>
            <Button size="xl" className="mt-5 w-full">Validar chave</Button>
          </div>
        </Variant>
        <Variant label="Sucesso (success banner)">
          <div className="auth-card">
            <div className="banner banner-ok" role="status">
              <p className="font-display">Chave validada ✓</p>
              <p className="text-sm mt-1 opacity-90">
                Tudo certo: ela é sua e já está pronta pra receber. Vamos pra próxima etapa.
              </p>
            </div>
            <Button size="xl" className="mt-5 w-full">Continuar</Button>
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── Documento (DocForm) ───────────────────────────────────────── */}
      <ShowcaseGroup
        label="Documento (DocForm)"
        description="Escolha RG/CNH + upload. Slot-a-slot (RG precisa de frente e verso)."
      >
        <Variant label="RG selecionado — frente pendente">
          <div className="auth-card space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-brand-gold bg-brand-gold-light/10 px-4 py-3">
                <input className="accent-gold-deep mr-2" type="radio" name="d1" checked readOnly />
                RG
              </label>
              <label className="flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3">
                <input className="accent-gold-deep mr-2" type="radio" name="d1" />
                CNH
              </label>
            </div>
            <div className="rounded-[var(--radius)] border border-dashed border-[var(--surface-border-hover)] bg-[var(--surface)] p-4 space-y-3">
              <p className="font-semibold">Primeiro envie a FRENTE do RG</p>
              <p className="text-xs text-[var(--surface-text-muted)]">
                A foto só precisa mostrar o documento inteiro e legível. A conferência detalhada não prende você nesta tela.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button type="button"><Camera size={18} aria-hidden /> Tirar foto</Button>
                <Button type="button" variant="ghost"><FileUp size={18} aria-hidden /> Enviar arquivo</Button>
              </div>
            </div>
          </div>
        </Variant>
        <Variant label="RG — frente enviada, pedindo verso">
          <div className="auth-card space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-brand-gold bg-brand-gold-light/10 px-4 py-3">
                <input className="accent-gold-deep mr-2" type="radio" name="d2" checked readOnly />
                RG
              </label>
              <label className="flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3">
                <input className="accent-gold-deep mr-2" type="radio" name="d2" />
                CNH
              </label>
            </div>
            <div className="rounded-[var(--radius)] border border-dashed border-[var(--surface-border-hover)] bg-[var(--surface)] p-4 space-y-3">
              <p className="font-semibold">Agora envie o VERSO do RG</p>
              <p className="text-xs text-[var(--surface-text-muted)]">
                A foto só precisa mostrar o documento inteiro e legível.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button type="button"><Camera size={18} aria-hidden /> Tirar foto</Button>
                <Button type="button" variant="ghost"><FileUp size={18} aria-hidden /> Enviar arquivo</Button>
              </div>
            </div>
            <div className="banner banner-ok" role="status">Frente recebida. A leitura continua em segundo plano.</div>
          </div>
        </Variant>
        <Variant label="CNH selecionada — pedindo foto completa">
          <div className="auth-card space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3">
                <input className="accent-gold-deep mr-2" type="radio" name="d3" />
                RG
              </label>
              <label className="flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-brand-gold bg-brand-gold-light/10 px-4 py-3">
                <input className="accent-gold-deep mr-2" type="radio" name="d3" checked readOnly />
                CNH
              </label>
            </div>
            <div className="rounded-[var(--radius)] border border-dashed border-[var(--surface-border-hover)] bg-[var(--surface)] p-4 space-y-3">
              <p className="font-semibold">Envie a CNH aberta ou um PDF da CNH Digital</p>
              <p className="text-xs text-[var(--surface-text-muted)]">
                A foto só precisa mostrar o documento inteiro e legível.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button type="button"><Camera size={18} aria-hidden /> Tirar foto</Button>
                <Button type="button" variant="ghost"><FileUp size={18} aria-hidden /> Enviar arquivo</Button>
              </div>
            </div>
          </div>
        </Variant>
        <Variant label="Com erro (legibilidade)">
          <div className="auth-card space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-brand-gold bg-brand-gold-light/10 px-4 py-3">
                <input className="accent-gold-deep mr-2" type="radio" name="d4" checked readOnly />
                RG
              </label>
              <label className="flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3">
                <input className="accent-gold-deep mr-2" type="radio" name="d4" />
                CNH
              </label>
            </div>
            <div className="rounded-[var(--radius)] border border-dashed border-[var(--surface-border-hover)] bg-[var(--surface)] p-4 space-y-3">
              <p className="font-semibold">Primeiro envie a FRENTE do RG</p>
              <div className="grid grid-cols-2 gap-3">
                <Button type="button">Tirar foto</Button>
                <Button type="button" variant="ghost">Enviar arquivo</Button>
              </div>
            </div>
            <FieldError>O documento não está legível o suficiente. Tire outra foto com boa luz e sem cortes.</FieldError>
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── Selfie Form ─────────────────────────────────────────────── */}
      <ShowcaseGroup
        label="Selfie (SelfieForm)"
        description="Acordo (AgreementSheet) → upload → status IA (pending/approved/rejected/review)."
      >
        <Variant
          label="AgreementSheet (pré-selfie)"
          hint="Preview estático do bottom-sheet de aceite — o acordo obrigatório antes da 1ª selfie."
        >
          {/* Réplica estática (não o modal fixed) pra evitar roubo de foco e
              escape do fixed no scroll do showcase. O componente real está em
              src/app/(app)/selfie/AgreementSheet.tsx. */}
          <div className="overflow-hidden rounded-t-[26px] border border-[var(--surface-border)] bg-[var(--surface)]">
            <div className="space-y-3 px-5 pb-3 pt-4">
              <div className="mx-auto h-1 w-10 rounded-full bg-brand-border" aria-hidden />
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-brand-char p-1 font-display text-[10px] font-bold text-brand-gold-light">
                  V7M
                </div>
                <h2 className="font-display text-base leading-snug">
                  Antes da selfie: seu acordo com a V7M
                </h2>
              </div>
            </div>
            <div className="space-y-3 px-5 pb-4">
              <div className="flex gap-2.5">
                <span aria-hidden className="shrink-0 text-sm text-brand-gold-ink">✦</span>
                <p className="text-sm leading-relaxed">
                  Você atua como promotor(a) parceiro(a) autônomo(a) da V7M — sem vínculo
                  empregatício. Remuneração 100% por comissão: R$100 por matrícula paga + R$500
                  de bônus nas semanas de 5 matrículas.
                </p>
              </div>
              <div className="flex gap-2.5">
                <span aria-hidden className="shrink-0 text-sm text-brand-gold-ink">✦</span>
                <p className="text-sm leading-relaxed">
                  Sua selfie funciona como assinatura eletrônica deste acordo — guardamos data,
                  hora e dispositivo como comprovante.
                </p>
              </div>
              <div className="flex gap-2.5">
                <span aria-hidden className="shrink-0 text-sm text-brand-gold-ink">✦</span>
                <p className="text-sm leading-relaxed">
                  Seus dados são usados só pra validar o cadastro e pagar comissões (LGPD). Você
                  pode encerrar a parceria quando quiser, sem multa.
                </p>
              </div>
            </div>
            <div className="border-t border-[var(--surface-border)] px-5 pb-4 pt-3">
              <Button size="xl" className="w-full">Li e concordo — continuar</Button>
            </div>
          </div>
        </Variant>
        <Variant label="Default (tirar selfie)">
          <div className="auth-card space-y-3">
            <p className="text-sm text-[var(--surface-text-muted)]">
              Selfie ao vivo, bem iluminada, sem óculos escuros e sem chapéu. Ela é a assinatura eletrônica do seu acordo.
            </p>
            <FileInput accept="image/*" />
            <Button size="xl" className="w-full">Tirar selfie e assinar</Button>
          </div>
        </Variant>
        <Variant label="Pending (analisando…)">
          <div className="auth-card space-y-3">
            <StatusBanner
              status="pending"
              subject="f"
              footnote={`Enviada em ${SELFIE_PENDING_TS}`}
            />
            <p className="text-sm text-[var(--surface-text-muted)]">Siga as dicas acima e tire outra selfie — dá pra resolver agora, sem esperar ninguém.</p>
            <FileInput accept="image/*" />
            <Button size="xl" className="w-full">Tirar outra selfie e assinar</Button>
          </div>
        </Variant>
        <Variant label="Aprovada">
          <div className="auth-card space-y-3">
            <StatusBanner
              status="approved"
              subject="f"
              footnote={`Enviada em ${SELFIE_APPROVED_TS}`}
            />
          </div>
        </Variant>
        <Variant label="Reprovada + WhatsApp fallback">
          <div className="auth-card space-y-3">
            <StatusBanner
              status="rejected"
              reason="A foto está com iluminação baixa. Como resolver: tire em ambiente bem iluminado, sem óculos de sol ou chapéu, e olhe para a câmera."
              subject="f"
              footnote={`Enviada em ${SELFIE_REJECTED_TS}`}
            />
            <p className="text-sm text-[var(--surface-text-muted)]">Siga as dicas acima e tire outra selfie — dá pra resolver agora, sem esperar ninguém.</p>
            <FileInput accept="image/*" />
            <Button size="xl" className="w-full">Tirar outra selfie e assinar</Button>
            <Button
              href="https://wa.me/5531999998888"
              variant="ghost"
              className="w-full"
              target="_blank"
              rel="noopener noreferrer"
            >
              Prefiro falar com o polo no WhatsApp
            </Button>
          </div>
        </Variant>
        <Variant label="Em análise manual (review)">
          <div className="auth-card space-y-3 text-center">
            <h2 className="font-display text-lg">Selfie em análise manual</h2>
            <p className="text-sm text-[var(--surface-text-muted)]">
              Avisamos por WhatsApp assim que confirmarmos — não devia demorar.
            </p>
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── Perfil (PerfilForm) ──────────────────────────────────────── */}
      <ShowcaseGroup label="Perfil (PerfilForm)" description="Read-only + campos editáveis. Auto-avança ao salvar.">
        <Variant label="Preenchido, submit habilitado">
          <div className="auth-card space-y-3">
            <ReadOnlyField label="Nome" value="Ana Candidata" />
            <ReadOnlyField
              label="Data de nascimento"
              value="12/04/1998"
              hint="Confirmado pelo CPF, não editável."
            />
            <Field label="Nome da mãe" value="Maria das Dores Silva" onChange={() => {}} />
            <Field label="Nome do pai" value="João da Silva" onChange={() => {}} />
            <Field label="Naturalidade (cidade/UF)" value="Belo Horizonte/MG" onChange={() => {}} />
            <Field label="Estado civil" value="Solteiro(a)" onChange={() => {}} />
            <Field label="Nacionalidade" value="Brasileira" onChange={() => {}} />
            <Button size="xl" className="w-full">Salvar e continuar</Button>
          </div>
        </Variant>
        <Variant label="Disabled (preparando / hidratando)">
          <div className="auth-card space-y-3">
            <ReadOnlyField label="Nome" value="—" />
            <Field label="Nome da mãe" value="" onChange={() => {}} disabled />
            <Field label="Nome do pai" value="" onChange={() => {}} disabled />
            <Button size="xl" disabled className="w-full">Preparando…</Button>
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── Escolaridade (EscolaridadeForm) ──────────────────────────── */}
      <ShowcaseGroup
        label="Escolaridade (EscolaridadeForm)"
        description="Carrossel de etapa → status → série/ano → chat assistant."
      >
        <Variant label="Stage 1 — carrossel (escolher etapa)">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">Sua trajetória</p>
              <h2 className="mt-1 font-display text-2xl">Até que etapa você estudou?</h2>
              <p className="mt-1 text-sm text-[var(--surface-text-muted)]">Escolha a etapa mais recente que você frequentou.</p>
            </div>
            <div className="education-stage-carousel -mx-1 grid snap-x snap-mandatory auto-cols-[82%] grid-flow-col gap-3 overflow-x-auto px-1 pb-3 sm:auto-cols-[46%] lg:grid-flow-row lg:grid-cols-3 lg:overflow-visible">
              {(["fundamental", "medio", "superior"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="group snap-start overflow-hidden rounded-[var(--radius)] border border-[var(--surface-border)] bg-[var(--surface-deep)] text-left shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:border-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
                >
                  <span className="block aspect-[16/9] overflow-hidden">
                    <div className="grid h-full w-full place-items-center bg-[var(--char)] text-xs text-[var(--muted-on-dark)]">
                      [scene: {s}]
                    </div>
                  </span>
                  <span className="block border-t border-white/10 px-4 py-4 font-display text-lg text-white">
                    {s === "fundamental" ? "Ensino Fundamental" : s === "medio" ? "Ensino Médio" : "Ensino Superior"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Variant>
        <Variant label="Stage 2 — status (cards de escolha)">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">Sobre essa etapa</p>
              <h2 className="mt-1 font-display text-2xl">Você concluiu o Ensino Médio?</h2>
            </div>
            <div className="space-y-3">
              <button type="button" className="choice-card w-full text-left">
                <strong className="block">Sim, concluí essa etapa</strong>
                <span className="mt-1 block text-sm text-[var(--surface-text-muted)]">Terminou o último ano dessa etapa.</span>
              </button>
              <button type="button" className="choice-card w-full text-left">
                <strong className="block">Ainda estou estudando</strong>
                <span className="mt-1 block text-sm text-[var(--surface-text-muted)]">Está matriculado e cursando agora.</span>
              </button>
              <button type="button" className="choice-card w-full text-left">
                <strong className="block">Não, parei durante essa etapa</strong>
                <span className="mt-1 block text-sm text-[var(--surface-text-muted)]">Começou, mas não terminou a etapa.</span>
              </button>
            </div>
          </div>
        </Variant>
        <Variant label="Chat assistant com input + send">
          <div className="education-card space-y-4">
            <div className="space-y-3">
              <div className="rounded-[var(--radius-sm)] border border-white/10 bg-white/5 p-3 text-sm text-white">
                Qual foi a última série ou ano que você frequentou? Diga também se concluiu ou parou no meio.
              </div>
              <div className="rounded-[var(--radius-sm)] border border-brand-gold/30 bg-brand-gold/10 p-3 text-sm text-white">
                Terminei o 3º ano do Ensino Médio em 2018.
              </div>
              <div className="rounded-[var(--radius-sm)] border border-white/10 bg-white/5 p-3 text-sm text-white">
                Perfeito! E a cidade onde você concluiu?
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="input flex-1"
                placeholder="Responda aqui…"
                defaultValue="Belo Horizonte"
              />
              <Button type="button" size="md" className="px-4">Enviar</Button>
            </div>
          </div>
        </Variant>
        <Variant label="Concluída (success state)">
          <div className="education-card space-y-4">
            <div className="banner banner-ok" role="status">
              <p className="font-display">Escolaridade registrada</p>
              <p className="text-sm mt-1 opacity-90">
                Guardamos seu nível de ensino. Você pode revisar aqui ou voltar pro painel e seguir pras próximas etapas.
              </p>
            </div>
            <Button size="xl" className="w-full">Voltar pro painel</Button>
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── Training Submission ──────────────────────────────────────── */}
      <ShowcaseGroup
        label="Treinamento — submissão (SubmissionForm)"
        description="Texto OU áudio. Enviada → IA corrige em background."
      >
        <Variant label="Default (texto)">
          <div className="auth-card space-y-3">
            <textarea
              className="input"
              rows={6}
              defaultValue="O lead está comparando. O promotor não empurra matrícula: ele explica o que muda na vida da pessoa com a formação."
            />
            <div>
              <p className="label">Ou responda por áudio</p>
              <Button type="button" variant="ghost" className="w-full border-[var(--surface-border)] text-[var(--surface-text)]">
                <Mic size={16} aria-hidden /> Gravar resposta em áudio
              </Button>
            </div>
            <Button size="xl" className="w-full">Enviar resposta</Button>
          </div>
        </Variant>
        <Variant label="Recording (com stop + counter)">
          <div className="auth-card space-y-3">
            <textarea className="input" rows={6} disabled />
            <div>
              <p className="label">Ou responda por áudio</p>
              <Button type="button" variant="ghost" className="w-full border-brand-danger/50 text-brand-danger">
                <Square size={16} aria-hidden /> Parar e enviar (0:23)
              </Button>
            </div>
            <Button size="xl" disabled className="w-full">Enviar resposta</Button>
          </div>
        </Variant>
        <Variant label="Submitted (resposta recebida)">
          <div className="auth-card">
            <div className="banner banner-info" role="status">
              <div className="flex items-center gap-2">
                <Spinner />
                <p className="font-display">Resposta recebida ✓ — nossa IA está avaliando…</p>
              </div>
            </div>
          </div>
        </Variant>
        <Variant label="Reprovada (rejected, refazer)">
          <div className="auth-card space-y-3">
            <div className="banner banner-warn" role="status">
              <p className="font-display">Quase lá — tente responder de novo</p>
              <p className="text-sm mt-1 opacity-90">
                A resposta ficou muito curta e não demonstra entendimento da relação entre meta semanal e mensal. Releia o material e responda com suas palavras, por texto ou áudio.
              </p>
            </div>
            <textarea className="input" rows={6} placeholder="Escreva com suas palavras…" />
            <div>
              <p className="label">Ou responda por áudio</p>
              <Button type="button" variant="ghost" className="w-full">
                <Mic size={16} aria-hidden /> Gravar resposta em áudio
              </Button>
            </div>
            <Button size="xl" className="w-full">Enviar resposta</Button>
          </div>
        </Variant>
        <Variant label="Aprovada (success)">
          <div className="auth-card space-y-3">
            <div className="banner banner-ok" role="status">
              <p className="font-display">Matéria concluída ✓</p>
              <p className="text-sm mt-1 opacity-90">Liberando seu painel…</p>
            </div>
            <Button type="button" className="w-full">Abrir painel</Button>
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── CheckFlow estático ───────────────────────────────────────── */}
      <ShowcaseGroup
        label="Auth (CheckFlow)"
        description="3 estágios: check → register → otp. Não interativo aqui — só a estrutura."
      >
        <Variant label="check (telefone)">
          <PageShell width="narrow">
            <PageHeader
              kicker="Sua renda extra começa aqui"
              title="Passa seu WhatsApp pra mim?"
              subtitle="Pode ficar sossegado — é só pra confirmar seu acesso. Sem cadastro? A gente cria na hora."
              tone="dark"
            />
            <div className="auth-card">
              <div className="mx-auto max-w-[17.5rem]">
                <p className="label">Telefone (WhatsApp)</p>
                <div className="relative">
                  <span className="phone-prefix">+55</span>
                  <input className="input text-center pl-16" placeholder="(11) 98765-4321" defaultValue="(11) 98765-4321" />
                </div>
              </div>
              <Button size="xl" className="mt-5 w-full">Continuar</Button>
            </div>
          </PageShell>
        </Variant>
        <Variant label="register (CPF + e-mail)">
          <PageShell width="narrow">
            <PageHeader
              kicker="Criar cadastro"
              title="Confirme seus dados para continuar."
              subtitle="Este número ainda não possui cadastro."
              tone="dark"
            />
            <div className="auth-card space-y-4">
              <div>
                <p className="label">Telefone (WhatsApp)</p>
                <div className="input flex items-center text-white/70">(11) 98765-4321</div>
              </div>
              <div>
                <p className="label">CPF</p>
                <input className="input" defaultValue="123.456.789-09" />
              </div>
              <div>
                <p className="label">E-mail</p>
                <input className="input" type="email" defaultValue="bia@exemplo.com" />
              </div>
              <Button size="xl" className="w-full">Criar cadastro</Button>
            </div>
          </PageShell>
        </Variant>
        <Variant label="otp (código 6 dígitos)">
          <PageShell width="narrow">
            <PageHeader
              kicker="Confirme o código"
              title="Confirme o código"
              subtitle={<>Enviamos um código de 6 dígitos para o WhatsApp <strong>(11) 98765-4321</strong>.</>}
              tone="dark"
            />
            <div className="auth-card space-y-4">
              <FunnelStepper current="selfie" />
              <OtpInput value="123" onChange={() => {}} />
              <Button size="xl" className="w-full">Entrar</Button>
              <div className="flex items-center justify-center gap-2">
                <Button size="md" variant="ghost" className="border-[rgb(var(--gold-rgb)_/_0.4)] text-brand-gold-light">
                  Reenviar código (47s)
                </Button>
                <button type="button" className="text-[13px] text-[var(--muted-on-dark)]">Outro número</button>
              </div>
            </div>
          </PageShell>
        </Variant>
      </ShowcaseGroup>
    </ShowcaseShell>
  );
}
