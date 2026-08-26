"use client";

import { FileQuestion, Inbox, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Spinner } from "@/components/ui/spinner";
import { StatusBanner } from "@/components/ui/status-banner";

import { ShowcaseGroup, Variant, VariantRow } from "./_parts";
import { ShowcaseShell } from "./index";

/**
 * Estados transversais (loading/empty/error/success/404). Tudo que aparece
 * entre "carregando" e "renderizou o conteúdo" mora aqui.
 */
export function StatesSection() {
  return (
    <ShowcaseShell
      kicker="Dev preview · Estados"
      title="Loading, empty, error, success, 404"
      description="Cada estado transversal em pelo menos 1 componente. Usado em todas as páginas."
    >
      {/* ── Loading ────────────────────────────────────────────────── */}
      <ShowcaseGroup label="Loading">
        <VariantRow label="Spinner inline">
          <span className="flex items-center gap-2 text-sm text-[var(--surface-text-muted)]">
            <Spinner /> Carregando…
          </span>
        </VariantRow>
        <VariantRow label="Spinner tamanhos">
          <Spinner className="text-xs" />
          <Spinner className="text-base" />
          <Spinner className="text-2xl" />
          <Spinner className="text-4xl" />
        </VariantRow>
        <Variant label="LoadingOverlay (sem logo)">
          <div
            className="relative h-44 overflow-hidden rounded-[var(--radius)] border border-[var(--surface-border)] bg-[var(--char-2)]"
            style={{ transform: "translateZ(0)" }}
          >
            <LoadingOverlay label="Carregando…" />
          </div>
        </Variant>
        <Variant label="LoadingOverlay (com logo)">
          <div
            className="relative h-44 overflow-hidden rounded-[var(--radius)] border border-[var(--surface-border)] bg-[var(--char-2)]"
            style={{ transform: "translateZ(0)" }}
          >
            <LoadingOverlay label="Validando chave…" logo />
          </div>
        </Variant>
        <Variant label="AuthOverlay (login transition)">
          <div
            className="relative h-44 overflow-hidden rounded-[var(--radius)] border border-[var(--surface-border)]"
            style={{ transform: "translateZ(0)" }}
          >
            <div className="auth-overlay" role="status" aria-label="Entrando…">
              <div className="overlay-mark">
                <div className="auth-ring" aria-hidden />
              </div>
            </div>
          </div>
        </Variant>
        <Variant label="Skeletal 'loading.tsx' (server)">
          <div className="rounded-[var(--radius)] border border-[var(--surface-border)] bg-[var(--surface)] p-4 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--surface-border)]" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-[var(--surface-border)]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--surface-border)]" />
            <div className="h-24 animate-pulse rounded-[var(--radius)] bg-[var(--surface-border)]" />
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── Empty ─────────────────────────────────────────────────── */}
      <ShowcaseGroup label="Empty">
        <Variant label="Empty leads">
          <div className="auth-card space-y-4">
            <EmptyIcon Icon={Inbox} label="Sem leads ainda" />
            <p className="text-[var(--surface-text-muted)]">
              Seus primeiros leads vão aparecer aqui. Compartilhe seu link de captação — cada matrícula paga é R$100 no seu Pix.
            </p>
            <Button href="/painel">Pegar meu link de captação</Button>
          </div>
        </Variant>
        <Variant label="Empty comissões">
          <div className="auth-card text-[var(--surface-text-muted)]">
            <EmptyIcon Icon={Inbox} label="Sem comissões ainda" />
            Suas comissões vão aparecer aqui depois do primeiro fechamento — toda sexta às 18h, direto na sua chave Pix. Bora buscar a primeira?
          </div>
        </Variant>
        <Variant label="Empty treinamento (matérias sendo preparadas)">
          <div className="auth-card text-[var(--surface-text-muted)]">
            <EmptyIcon Icon={Inbox} label="Matérias a caminho" />
            Suas matérias estão sendo preparadas — assim que chegarem, aparecem aqui sozinhas. Você não precisa fazer nada por enquanto.
          </div>
        </Variant>
        <Variant label="Empty notificação (genérico)">
          <div className="auth-card text-center">
            <EmptyIcon Icon={Inbox} label="Nada por aqui" />
            <p className="text-sm text-[var(--surface-text-muted)]">Quando chegar conteúdo novo, ele aparece aqui.</p>
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── Error ─────────────────────────────────────────────────── */}
      <ShowcaseGroup label="Error">
        <Variant label="FieldError (texto simples)">
          <div className="rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] p-3">
            <p className="label">CPF</p>
            <input className="input" defaultValue="000.000.000-00" />
            <FieldError>Esse CPF não fechou — confira os números e tente de novo.</FieldError>
          </div>
        </Variant>
        <Variant label="StatusBanner danger (rejected com motivo)">
          <StatusBanner
            status="rejected"
            subject="f"
            reason="A foto está com iluminação baixa. Como resolver: tire em ambiente bem iluminado, sem óculos de sol ou chapéu, e olhe para a câmera."
          />
        </Variant>
        <Variant label="Banner genérico de erro (rede)">
          <div className="auth-card space-y-3 border border-[var(--danger)]/40 bg-[var(--danger)]/8">
            <div className="flex items-start gap-3">
              <WifiOff aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--danger)]" />
              <div>
                <p className="font-display text-base text-[var(--surface-text)]">A conexão oscilou</p>
                <p className="mt-0.5 text-sm text-[var(--surface-text-muted)]">
                  Tente de novo em alguns segundos — nada foi perdido.
                </p>
              </div>
            </div>
            <Button>Tentar de novo</Button>
          </div>
        </Variant>
        <Variant label="PixForm error (PIX_INVALID)">
          <FieldError>
            Essa chave não apareceu no seu CPF. Sem estresse: confira se digitou certo — ela precisa ser sua, do mesmo CPF do cadastro.
          </FieldError>
        </Variant>
        <Variant label="Auth RATE_LIMITED">
          <div className="auth-card text-center">
            <p role="alert" className="text-[13px] text-[var(--danger-soft)]">
              Muitas tentativas seguidas. Respira 60 segundos e tente de novo.
            </p>
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── Success ───────────────────────────────────────────────── */}
      <ShowcaseGroup label="Success">
        <Variant label="StatusBanner approved">
          <StatusBanner status="approved" subject="f" />
        </Variant>
        <Variant label="PixForm success">
          <div className="banner banner-ok" role="status">
            <p className="font-display">Chave validada ✓</p>
            <p className="text-sm mt-1 opacity-90">
              Tudo certo: ela é sua e já está pronta pra receber. Vamos pra próxima etapa.
            </p>
          </div>
        </Variant>
        <Variant label="Treinamento ✓ concluído">
          <div className="banner banner-ok" role="status">
            <p className="font-display">✓ Treinamento concluído</p>
            <p className="text-sm mt-1 opacity-90">Liberando seu painel…</p>
          </div>
        </Variant>
        <Variant label="Matéria concluída (training submission)">
          <div className="banner banner-ok" role="status">
            <p className="font-display">Matéria concluída ✓</p>
            <p className="text-sm mt-1 opacity-90">Liberando seu painel…</p>
          </div>
        </Variant>
        <Variant label="Pagamento liberado (Painel)">
          <div className="flex items-start gap-3 rounded-[var(--radius)] border border-ok/40 bg-ok/8 p-4">
            <StatusBanner status="approved" subject="m" />
          </div>
        </Variant>
      </ShowcaseGroup>

      {/* ── 404 / not found ───────────────────────────────────────── */}
      <ShowcaseGroup label="Not found / 404">
        <Variant label="not-found.tsx (genérico)">
          <div className="rounded-[var(--radius)] border border-[var(--surface-border)] bg-[var(--surface)] p-6 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
            <FileQuestion aria-hidden className="mx-auto size-12 text-[var(--surface-text-muted)]" />
            <h2 className="mt-3 font-display text-lg text-[var(--surface-text)]">Página não encontrada</h2>
            <p className="mt-1 text-sm text-[var(--surface-text-muted)]">Esse endereço não leva a lugar nenhum.</p>
            <Button href="/painel" className="mt-4">Voltar pro painel</Button>
          </div>
        </Variant>
        <Variant label="CardLink quebrado (404 estilizado)">
          <Card>
            <div className="text-center">
              <FileQuestion aria-hidden className="mx-auto size-10 text-[var(--surface-text-muted)]" />
              <p className="mt-2 font-display text-base text-[var(--surface-text)]">Matéria não encontrada</p>
              <p className="mt-1 text-sm text-[var(--surface-text-muted)]">Esse link de treinamento expirou ou já foi concluído.</p>
            </div>
          </Card>
        </Variant>
      </ShowcaseGroup>

      {/* ── Edge: lock states (training trava / outsider) ──────────── */}
      <ShowcaseGroup
        label="Lock states"
        description="Treinamento trava, sessão sem role, treinamento concluído."
      >
        <Variant label="Training gate (overlay estático)">
          <div className="relative h-44 overflow-hidden rounded-[var(--radius)] border border-[var(--surface-border)] bg-[var(--bg)]">
            <div
              role="status"
              aria-live="polite"
              className="absolute inset-0 z-50 flex items-center justify-center bg-brand-bg px-6 text-center"
            >
              <p className="text-brand-muted">Treinamento obrigatório — levando você para as matérias…</p>
            </div>
          </div>
        </Variant>
        <Variant label="OutsideApp (conta do app do cliente)">
          <div className="flex min-h-[200px] flex-col items-center justify-center bg-brand-char px-6 text-center rounded-[var(--radius)]">
            <div className="mb-5 h-14 w-14 rounded-2xl bg-white p-2 grid place-items-center text-xs text-black font-bold">V7M</div>
            <h1 className="font-display text-xl text-white">Esse acesso é de outro app</h1>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-brand-muted-on-dark">
              Sua conta não tem papel de candidato, treinamento ou promotor por aqui — essa área é do Supletivo. Vamos te levar pra lá.
            </p>
            <a href="https://app.supletivo.net.br" className="btn mt-6">Ir para app.supletivo.net.br ↗</a>
          </div>
        </Variant>
      </ShowcaseGroup>
    </ShowcaseShell>
  );
}

function EmptyIcon({ Icon, label }: { Icon: React.ComponentType<{ "aria-hidden"?: boolean; className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[var(--surface-text-muted)]">
      <Icon aria-hidden className="size-4" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}
