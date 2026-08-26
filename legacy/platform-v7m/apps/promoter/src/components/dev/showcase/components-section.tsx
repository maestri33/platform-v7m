"use client";

import { useState } from "react";
import {
  Camera,
  FileUp,
  Home,
  Users,
  DollarSign,
  UserCircle,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Sparkles,
  Mic,
  Square,
  Play,
  FileText,
  AlignLeft,
  Image as ImageIcon,
  ArrowLeft,
  ArrowUp,
  Bot,
  LoaderCircle,
  Pencil,
  Sun,
  Moon,
  Monitor,
  X,
  ChevronRight,
  KeyRound,
  GraduationCap,
  IdCard,
  RefreshCcw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardLink } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Countdown } from "@/components/ui/countdown";
import { Field, FieldError, ReadOnlyField, SelectField, TextareaField } from "@/components/ui/field";
import { FileInput } from "@/components/ui/file-input";
import { FunnelStepper } from "@/components/ui/stepper";
import { OtpInput } from "@/components/ui/otp-input";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { Stat } from "@/components/ui/stat";
import { StatusBanner } from "@/components/ui/status-banner";
import { AppNav } from "@/components/layout/AppNav";
import { PaymentHoldAlert } from "@/components/painel/PaymentHoldAlert";

import { ShowcaseGroup, Variant, VariantRow } from "./_parts";
import { ShowcaseShell } from "./index";

/**
 * Showcase de TODOS os primitivos da UI, em todos os tamanhos/tons/estados.
 *
 * Padrão: cada componente vira um `ShowcaseGroup` (card branco), com 1+
 * `Variant` (sub-bloco tracejado) com a variante real renderizada.
 *
 * Visual-only: o input é "controlled-on-mount" via useState (não muda de verdade
 * porque não há submit) — o foco é o snapshot de cada estado.
 */
export function ComponentsSection() {
  // Fiel a um dos Field, sem usar useState em cada um pra evitar cascata.
  // Esses valores são estáticos; o usuário pode editar mas o estado não é usado
  // pra render condicional.
  const [text] = useState("Bia Promotora");
  const [email] = useState("bia@exemplo.com");
  const [error] = useState("Esse CPF não fechou — confira os números e tente de novo.");
  const [textarea] = useState(
    "Lead demonstrou interesse no material. Combinamos de eu mandar o link por WhatsApp e ela se cadastra no fim de semana.",
  );
  const [selected] = useState("medio");
  const [otpFull] = useState("123456");
  const [otp3] = useState("123");

  return (
    <ShowcaseShell
      kicker="Dev preview · Componentes"
      title="Primitivos de UI"
      description="Todos os tokens, tons e estados. Use o painel de tema pra alternar entre light e dark."
    >
      {/* ── Button ────────────────────────────────────────────────────── */}
      <ShowcaseGroup
        label="Button"
        description="Variante primary/ghost, tamanho md/xl, estados idle/loading/disabled."
      >
        <Variant label="Primary · md">
          <Button>Entrar</Button>
        </Variant>
        <Variant label="Primary · xl">
          <Button size="xl" className="w-full">
            Salvar e continuar
          </Button>
        </Variant>
        <Variant label="Primary · loading">
          <Button loading>Salvando…</Button>
        </Variant>
        <Variant label="Primary · disabled">
          <Button disabled>Salvar e continuar</Button>
        </Variant>
        <Variant label="Ghost · md">
          <Button variant="ghost">Reenviar código</Button>
        </Variant>
        <Variant label="Ghost · xl">
          <Button variant="ghost" size="xl" className="w-full">
            Prefiro falar com o polo no WhatsApp
          </Button>
        </Variant>
        <Variant label="As link (href)">
          <Button href="/painel" variant="ghost">
            Voltar pro painel
          </Button>
        </Variant>
      </ShowcaseGroup>

      {/* ── Field ─────────────────────────────────────────────────────── */}
      <ShowcaseGroup label="Field" description="Tom light + dark, com/sem erro, com/sem valor.">
        <Variant label="Vazio · light">
          <Field label="Nome completo" value="" onChange={() => {}} required />
        </Variant>
        <Variant label="Preenchido · light">
          <Field label="Nome completo" value={text} onChange={() => {}} required />
        </Variant>
        <Variant label="Com hint · light">
          <Field
            label="E-mail"
            value={email}
            onChange={() => {}}
            hint="Você recebe o comprovante aqui."
            type="email"
          />
        </Variant>
        <Variant label="Com erro · light">
          <Field label="CPF" value="000.000.000-00" onChange={() => {}} />
          <FieldError>{error}</FieldError>
        </Variant>
        <Variant label="Disabled · light">
          <Field label="CPF" value="000.000.000-00" onChange={() => {}} disabled />
        </Variant>
        <Variant label="Com prefixo +55 (telefone)">
          <div className="relative">
            <span className="phone-prefix">+55</span>
            <input
              className="input pl-16"
              placeholder="(11) 98765-4321"
              defaultValue="(11) 98765-4321"
              readOnly
            />
          </div>
        </Variant>
        <Variant label="Vazio · dark" hint="Fundo escuro da auth">
          <div className="rounded-[var(--radius)] bg-[var(--char)] p-4">
            <Field label="CPF" value="" onChange={() => {}} tone="dark" />
          </div>
        </Variant>
        <Variant label="Preenchido · dark">
          <div className="rounded-[var(--radius)] bg-[var(--char)] p-4">
            <Field
              label="CPF"
              value="123.456.789-00"
              onChange={() => {}}
              tone="dark"
            />
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── SelectField ───────────────────────────────────────────────── */}
      <ShowcaseGroup label="SelectField">
        <Variant label="Placeholder">
          <SelectField
            label="Estado civil"
            value=""
            onChange={() => {}}
            options={[
              { value: "", label: "—" },
              { value: "single", label: "Solteiro(a)" },
              { value: "married", label: "Casado(a)" },
              { value: "divorced", label: "Divorciado(a)" },
            ]}
          />
        </Variant>
        <Variant label="Selecionado">
          <SelectField
            label="Última série"
            value={selected}
            onChange={() => {}}
            options={[
              { value: "fundamental", label: "Fundamental" },
              { value: "medio", label: "Ensino Médio" },
              { value: "superior", label: "Superior" },
            ]}
          />
        </Variant>
        <Variant label="Disabled">
          <SelectField
            label="Nacionalidade"
            value="brasileira"
            onChange={() => {}}
            disabled
            options={[{ value: "brasileira", label: "Brasileira" }]}
          />
        </Variant>
      </ShowcaseGroup>

      {/* ── TextareaField ─────────────────────────────────────────────── */}
      <ShowcaseGroup label="TextareaField">
        <Variant label="Vazio">
          <TextareaField
            label="Sua resposta"
            value=""
            onChange={() => {}}
            rows={4}
            placeholder="Escreva com suas palavras…"
          />
        </Variant>
        <Variant label="Preenchido">
          <TextareaField
            label="Sua resposta"
            value={textarea}
            onChange={() => {}}
            rows={4}
          />
        </Variant>
        <Variant label="Com erro">
          <TextareaField
            label="Sua resposta"
            value=""
            onChange={() => {}}
            rows={3}
            required
          />
          <FieldError>Escreva pelo menos 2 frases pra IA avaliar.</FieldError>
        </Variant>
      </ShowcaseGroup>

      {/* ── ReadOnlyField ─────────────────────────────────────────────── */}
      <ShowcaseGroup label="ReadOnlyField">
        <Variant label="Com valor">
          <ReadOnlyField label="CEP" value="30130-000" hint="Confirmado pelo ViaCEP." />
        </Variant>
        <Variant label="Sem valor (vai pra —)">
          <ReadOnlyField label="Bairro" value="" />
        </Variant>
      </ShowcaseGroup>

      {/* ── FieldError ────────────────────────────────────────────────── */}
      <ShowcaseGroup label="FieldError">
        <Variant label="Com texto">
          <FieldError>Esse CPF não fechou — confira os números e tente de novo.</FieldError>
        </Variant>
        <Variant label="Vazio (renderiza null)">
          <FieldError>{""}</FieldError>
          <p className="text-xs text-[var(--surface-text-muted)]">
            ↑ sem mensagem, sem DOM — role=alert é omitido.
          </p>
        </Variant>
      </ShowcaseGroup>

      {/* ── Badge ─────────────────────────────────────────────────────── */}
      <ShowcaseGroup label="Badge" description="Pílula de status, 5 tons semânticos.">
        <VariantRow label="Tons">
          <Badge tone="ok">Recebido ✓</Badge>
          <Badge tone="danger">Falhou</Badge>
          <Badge tone="warn">Aguardando</Badge>
          <Badge tone="muted">Pendente</Badge>
          <Badge tone="gold">Pago · cai sexta</Badge>
        </VariantRow>
        <VariantRow label="Texto longo">
          <Badge tone="warn">Em análise</Badge>
        </VariantRow>
      </ShowcaseGroup>

      {/* ── StatusBanner ──────────────────────────────────────────────── */}
      <ShowcaseGroup
        label="StatusBanner"
        description="Estado de análise IA (selfie/documento). subject=f flexiona no feminino."
      >
        <Variant label="approved · m">
          <StatusBanner status="approved" subject="m" />
        </Variant>
        <Variant label="approved · f (selfie)">
          <StatusBanner
            status="approved"
            subject="f"
            footnote="Enviada em 12/06/2025 14:32"
          />
        </Variant>
        <Variant label="rejected · com motivo">
          <StatusBanner
            status="rejected"
            reason="A foto está com iluminação baixa. Como resolver: tire em ambiente bem iluminado, sem óculos de sol ou chapéu, e olhe para a câmera."
            subject="f"
          />
        </Variant>
        <Variant label="review">
          <StatusBanner status="review" subject="m" />
        </Variant>
        <Variant label="pending">
          <StatusBanner status="pending" subject="f" />
        </Variant>
      </ShowcaseGroup>

      {/* ── Card ──────────────────────────────────────────────────────── */}
      <ShowcaseGroup label="Card" description="Estático e interativo.">
        <Variant label="Estático">
          <Card>
            <p className="font-display text-base">Card estático</p>
            <p className="mt-1 text-sm text-[var(--surface-text-muted)]">
              Apenas a superfície. Sem hover, sem CTA.
            </p>
          </Card>
        </Variant>
        <Variant label="Interativo (CardLink)">
          <CardLink href="/dev-preview?section=pages">
            <p className="font-display text-base">Card interativo →</p>
            <p className="mt-1 text-sm text-[var(--surface-text-muted)]">
              Borda dourada e elevação no hover.
            </p>
          </CardLink>
        </Variant>
      </ShowcaseGroup>

      {/* ── Spinner ───────────────────────────────────────────────────── */}
      <ShowcaseGroup label="Spinner">
        <VariantRow label="Inline (em texto)">
          <span className="flex items-center gap-2 text-sm text-[var(--surface-text-muted)]">
            <Spinner /> Carregando…
          </span>
        </VariantRow>
        <VariantRow label="Standalone">
          <Spinner className="text-2xl text-[var(--surface-text-muted)]" />
        </VariantRow>
        <VariantRow label="Tamanhos">
          <Spinner className="text-xs" />
          <Spinner className="text-base" />
          <Spinner className="text-2xl" />
          <Spinner className="text-4xl" />
        </VariantRow>
      </ShowcaseGroup>

      {/* ── CopyButton ────────────────────────────────────────────────── */}
      <ShowcaseGroup label="CopyButton">
        <Variant label="Idle (clica pra copiar)">
          <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-alt)] px-3 py-2">
            <code className="flex-1 truncate text-xs">https://v7m.app/r/demo-prom</code>
            <CopyButton value="https://v7m.app/r/demo-prom" label="Copiar" />
          </div>
        </Variant>
        <Variant label="'Copiado!' (estado pós-clique)">
          <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-alt)] px-3 py-2">
            <code className="flex-1 truncate text-xs">https://v7m.app/r/demo-prom</code>
            <span className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-brand-gold-ink">
              Copiado!
            </span>
          </div>
        </Variant>
        <Variant label="'Selecione e copie' (fallback sem clipboard)">
          <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-alt)] px-3 py-2">
            <code className="flex-1 truncate text-xs">https://v7m.app/r/demo-prom</code>
            <span className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-brand-gold-ink">
              Selecione e copie
            </span>
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── ThemeToggle (3 ícones via data-theme-choice) ─────────────── */}
      <ShowcaseGroup
        label="ThemeToggle"
        description="O tema do app é controlado pelo `<html data-theme-choice>`. Aqui simulamos os 3 estados pra comparar os ícones."
      >
        <Variant label="Light (sol)">
          <div data-theme-choice="light" className="rounded-full border border-[var(--surface-border)] bg-[var(--surface)] p-2 inline-block">
            <span className="theme-icon theme-icon-sun text-[var(--surface-text-muted)]">
              <Sun className="size-5" />
            </span>
            <span className="theme-icon theme-icon-moon text-[var(--surface-text-muted)]">
              <Moon className="size-5" />
            </span>
            <span className="theme-icon theme-icon-monitor text-[var(--surface-text-muted)]">
              <Monitor className="size-5" />
            </span>
          </div>
        </Variant>
        <Variant label="Dark (lua)">
          <div data-theme-choice="dark" className="rounded-full border border-[var(--surface-border)] bg-[var(--surface)] p-2 inline-block">
            <span className="theme-icon theme-icon-sun text-[var(--surface-text-muted)]">
              <Sun className="size-5" />
            </span>
            <span className="theme-icon theme-icon-moon text-[var(--surface-text-muted)]">
              <Moon className="size-5" />
            </span>
            <span className="theme-icon theme-icon-monitor text-[var(--surface-text-muted)]">
              <Monitor className="size-5" />
            </span>
          </div>
        </Variant>
        <Variant label="System (monitor)">
          <div data-theme-choice="system" className="rounded-full border border-[var(--surface-border)] bg-[var(--surface)] p-2 inline-block">
            <span className="theme-icon theme-icon-sun text-[var(--surface-text-muted)]">
              <Sun className="size-5" />
            </span>
            <span className="theme-icon theme-icon-moon text-[var(--surface-text-muted)]">
              <Moon className="size-5" />
            </span>
            <span className="theme-icon theme-icon-monitor text-[var(--surface-text-muted)]">
              <Monitor className="size-5" />
            </span>
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── Countdown ─────────────────────────────────────────────────── */}
      <ShowcaseGroup label="Countdown" description="Contagem regressiva até a próxima sexta 18h.">
        <Variant label="Default (sem urgência)">
          <span className="text-sm text-[var(--surface-text)]">
            Fecha em <Countdown target={(() => {
              const d = new Date();
              d.setDate(d.getDate() + 3);
              d.setHours(18, 0, 0, 0);
              return d.toISOString();
            })()} />
          </span>
        </Variant>
        <Variant label="Urgente (< 24h)">
          <span className="text-sm text-[var(--surface-text)]">
            <Countdown
              target={(() => {
                const d = new Date();
                d.setHours(d.getHours() + 8);
                return d.toISOString();
              })()}
              urgentBelowHours={24}
            />
            {" "}— meta ainda aberta
          </span>
        </Variant>
      </ShowcaseGroup>

      {/* ── OtpInput ──────────────────────────────────────────────────── */}
      <ShowcaseGroup label="OtpInput" description="6 slots visuais + input invisível por cima.">
        <Variant label="Vazio">
          <div className="mx-auto max-w-sm">
            <OtpInput value="" onChange={() => {}} />
          </div>
        </Variant>
        <Variant label="3 dígitos">
          <div className="mx-auto max-w-sm">
            <OtpInput value={otp3} onChange={() => {}} />
          </div>
        </Variant>
        <Variant label="Completo">
          <div className="mx-auto max-w-sm">
            <OtpInput value={otpFull} onChange={() => {}} />
          </div>
        </Variant>
        <Variant label="Erro">
          <div className="mx-auto max-w-sm">
            <OtpInput value="12345" onChange={() => {}} error />
          </div>
          <FieldError>Esse código não confere. Reenviamos outro pro seu WhatsApp.</FieldError>
        </Variant>
      </ShowcaseGroup>

      {/* ── FileInput ─────────────────────────────────────────────────── */}
      <ShowcaseGroup label="FileInput">
        <Variant label="Vazio (light)">
          <FileInput accept="image/*" />
        </Variant>
        <Variant label="Com arquivo selecionado (light)">
          <FileInput defaultValue="" accept="image/*" />
          <p className="text-xs text-[var(--surface-text-muted)]">
            ↑ o botão dourado é o ::file-selector-button nativo. Sem JS.
          </p>
        </Variant>
      </ShowcaseGroup>

      {/* ── FunnelStepper ─────────────────────────────────────────────── */}
      <ShowcaseGroup label="FunnelStepper" description="5 etapas: Documento → Comprovante → Pix → Escolaridade → Selfie.">
        <Variant label="Tudo done">
          <div className="rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] p-3">
            <FunnelStepper current="completed" />
          </div>
        </Variant>
        <Variant label="Metade">
          <div className="rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] p-3">
            <FunnelStepper current="pix" />
          </div>
        </Variant>
        <Variant label="Primeiro passo">
          <div className="rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] p-3">
            <FunnelStepper current="started" />
          </div>
        </Variant>
        <Variant label="Último passo (selfie)">
          <div className="rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] p-3">
            <FunnelStepper current="selfie" />
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── PageHeader ────────────────────────────────────────────────── */}
      <ShowcaseGroup label="PageHeader" description="Kicker + título + subtítulo. Tom dark = auth.">
        <Variant label="Light">
          <div className="rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] p-4">
            <PageHeader
              kicker="V7M · Cadastro"
              title="Seu documento"
              subtitle="Escolha RG ou CNH. A gente confirma se a foto é de um documento e segue."
            />
          </div>
        </Variant>
        <Variant label="Dark (auth)">
          <div className="rounded-[var(--radius-sm)] bg-[var(--char)] p-4">
            <PageHeader
              kicker="Sua renda extra começa aqui"
              title="Promotor V7M"
              subtitle="Entrar ou criar cadastro"
              tone="dark"
            />
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── Stat ──────────────────────────────────────────────────────── */}
      <ShowcaseGroup label="Stat">
        <VariantRow label="lg / xl">
          <Stat label="Pendente" value="R$ 200,00" size="lg" />
          <Stat label="Pago" value="R$ 1.340,00" size="xl" />
        </VariantRow>
      </ShowcaseGroup>

      {/* ── LoadingOverlay ────────────────────────────────────────────── */}
      <ShowcaseGroup
        label="LoadingOverlay"
        description="Anel dourado + logo opcional. NO SHOWCASE: constrained (não-fixed) pra não cobrir a página."
      >
        <Variant label="Sem logo">
          <div className="relative h-44 overflow-hidden rounded-[var(--radius)] border border-[var(--surface-border)] bg-[var(--char-2)]">
            <div
              role="status"
              aria-label="Carregando…"
              className="grid h-full w-full place-items-center"
              style={{
                background: "rgb(11 11 12 / 0.5)",
                backdropFilter: "blur(18px) saturate(1.4)",
              }}
            >
              <div className="overlay-mark">
                <div className="auth-ring" aria-hidden />
              </div>
            </div>
          </div>
        </Variant>
        <Variant label="Com logo">
          <div className="relative h-44 overflow-hidden rounded-[var(--radius)] border border-[var(--surface-border)] bg-[var(--char-2)]">
            <div
              role="status"
              aria-label="Carregando…"
              className="grid h-full w-full place-items-center"
              style={{
                background: "rgb(11 11 12 / 0.5)",
                backdropFilter: "blur(18px) saturate(1.4)",
              }}
            >
              <div className="overlay-mark">
                <div className="auth-ring" aria-hidden />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="" aria-hidden className="overlay-logo" />
              </div>
            </div>
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── AppNav (bottom navigation) ───────────────────────────────── */}
      <ShowcaseGroup
        label="AppNav"
        description="Bottom navigation. 2 layouts: promoter (4 abas) e candidate (2 abas). O `activePath` aqui sobrescreve o router (na rota real o /dev-preview não casa com nenhuma aba)."
      >
        <Variant label="Promoter (4 abas) — Início ativa">
          <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--bg)]">
            <div className="h-20" aria-hidden />
            <AppNav variant="promoter" activePath="/painel" />
          </div>
        </Variant>
        <Variant label="Candidate (2 abas) — Conta ativa">
          <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--bg)]">
            <div className="h-20" aria-hidden />
            <AppNav variant="candidate" activePath="/conta" />
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── PaymentHoldAlert ─────────────────────────────────────────── */}
      <ShowcaseGroup
        label="PaymentHoldAlert"
        description="Banner persistente do /painel. 3 estados: pagamento liberado, aguardando polo, onboarding incompleto."
      >
        <Variant label="Pagamento liberado (none)">
          <PaymentHoldAlert reason="none" pendingCount={0} amountHeld="0.00" nextPayoutAt={null} />
        </Variant>
        <Variant label="Aguardando aprovação do polo (pending_polo_approval)">
          <PaymentHoldAlert reason="pending_polo_approval" pendingCount={0} amountHeld="0.00" nextPayoutAt={null} poloWhatsapp="5531999998888" />
        </Variant>
        <Variant label="Onboarding incompleto (com saldo acumulado)">
          <PaymentHoldAlert reason="onboarding_incomplete" pendingCount={3} amountHeld="200.00" nextPayoutAt={null} poloWhatsapp="5531999998888" />
        </Variant>
      </ShowcaseGroup>

      {/* ── Ícones usados no app ──────────────────────────────────────── */}
      <ShowcaseGroup
        label="Ícones Lucide usados no app"
        description="Sanity check de consistência de stroke. Todos 1.8 / 22px (default do nav)."
      >
        <VariantRow label="Navegação / painéis">
          <IconChip Icon={Home} label="Home" />
          <IconChip Icon={Users} label="Users" />
          <IconChip Icon={DollarSign} label="DollarSign" />
          <IconChip Icon={UserCircle} label="UserCircle" />
          <IconChip Icon={KeyRound} label="KeyRound" />
          <IconChip Icon={IdCard} label="IdCard" />
          <IconChip Icon={GraduationCap} label="GraduationCap" />
        </VariantRow>
        <VariantRow label="Ações">
          <IconChip Icon={Camera} label="Camera" />
          <IconChip Icon={FileUp} label="FileUp" />
          <IconChip Icon={Mic} label="Mic" />
          <IconChip Icon={Square} label="Square" />
          <IconChip Icon={Play} label="Play" />
          <IconChip Icon={Pencil} label="Pencil" />
          <IconChip Icon={ArrowLeft} label="ArrowLeft" />
          <IconChip Icon={ArrowUp} label="ArrowUp" />
          <IconChip Icon={ChevronRight} label="ChevronRight" />
          <IconChip Icon={X} label="X" />
        </VariantRow>
        <VariantRow label="Feedback / status">
          <IconChip Icon={CheckCircle2} label="CheckCircle2" />
          <IconChip Icon={Clock3} label="Clock3" />
          <IconChip Icon={AlertTriangle} label="AlertTriangle" />
          <IconChip Icon={RefreshCcw} label="RefreshCcw" />
          <IconChip Icon={Sparkles} label="Sparkles" />
          <IconChip Icon={Bot} label="Bot" />
          <IconChip Icon={LoaderCircle} label="LoaderCircle" />
        </VariantRow>
        <VariantRow label="Conteúdo / mídia">
          <IconChip Icon={FileText} label="FileText" />
          <IconChip Icon={AlignLeft} label="AlignLeft" />
          <IconChip Icon={ImageIcon} label="ImageIcon" />
        </VariantRow>
      </ShowcaseGroup>
    </ShowcaseShell>
  );
}

function IconChip({
  Icon,
  label,
}: {
  Icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean; className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--surface-text-muted)]">
      <Icon size={16} className="text-[var(--surface-text)]" aria-hidden />
      {label}
    </span>
  );
}
