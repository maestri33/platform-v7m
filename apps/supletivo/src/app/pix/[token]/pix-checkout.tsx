"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button, CheckoutCard, FunnelEntryCard } from "@v7m/ui";

import { ApiError, getPixPage, type PixPage } from "@/lib/api";
import { formatBRL } from "@/lib/money";

/** Confirmação do pagamento: o webhook do Asaas é a fonte da verdade; aqui só perguntamos. */
const POLL_MS = 5_000;

type Phase = "loading" | "ready" | "paid" | "notfound" | "error";

/**
 * Cliente da página PIX. Lê o QR pelo token do link curto e fica perguntando se já pagou.
 *
 * O QR estático não muda: `qrcode_payload` e `qrcode_image` já estão persistidos no `Checkout`,
 * então recarregar a página (ou clicar no link do WhatsApp de novo) NUNCA reemite cobrança.
 */
export function PixCheckout({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<PixPage | null>(null);
  const [copied, setCopied] = useState(false);
  const paid = useRef(false);

  const load = useCallback(async () => {
    try {
      const next = await getPixPage(token);
      setData(next);
      if (next.is_paid) {
        paid.current = true;
        setPhase("paid");
      } else {
        setPhase("ready");
      }
    } catch (err) {
      // 404 = token que nunca existiu (ou checkout que não é PIX): link morto, não instabilidade.
      setPhase(err instanceof ApiError && err.status === 404 ? "notfound" : "error");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Enquanto não pagou, repergunta. Para de vez quando confirma (o webhook já rodou) ou quando
  // a aba sai de foco — não faz sentido queimar rede numa tela que ninguém está olhando.
  useEffect(() => {
    if (phase !== "ready") return;
    const timer = setInterval(() => {
      if (paid.current || document.visibilityState === "hidden") return;
      void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [phase, load]);

  const copy = useCallback(async () => {
    const payload = data?.qrcode_payload;
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      return; // clipboard bloqueado: o <textarea> abaixo continua selecionável na mão
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [data?.qrcode_payload]);

  if (phase === "loading") {
    return (
      <Shell>
        <CheckoutCard
          methodLabel="PIX à vista"
          amount="—"
          isProcessing
          statusMessage="Carregando seu código PIX…"
        />
      </Shell>
    );
  }

  if (phase === "notfound") {
    return (
      <Shell>
        <Message
          title="Link de pagamento inválido ou expirado"
          text="Este link já foi usado ou não existe mais. Abra o app da matrícula para gerar um novo pagamento."
        />
      </Shell>
    );
  }

  if (phase === "error") {
    return (
      <Shell>
        <Message
          title="Não conseguimos carregar seu PIX"
          text="Pode ter sido uma instabilidade na conexão. Tente novamente em alguns instantes."
          action={
            <Button type="button" onClick={() => void load()} className="w-full">
              Tentar novamente
            </Button>
          }
        />
      </Shell>
    );
  }

  const amount = formatBRL(data?.amount ?? "0");

  if (phase === "paid") {
    return (
      <Shell>
        <Message
          title="Pagamento confirmado!"
          text={`Recebemos ${amount}. Sua matrícula já está liberada — volte ao app para enviar os documentos.`}
          action={
            data?.receipt_url ? (
              <a
                href={data.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-brand-green px-5 text-base font-extrabold text-white"
              >
                Ver comprovante
              </a>
            ) : undefined
          }
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <CheckoutCard
        methodLabel="PIX à vista"
        amount={amount}
        isSuccess
        qrCodeUrl={data?.qrcode_image ?? undefined}
        pixCode={data?.qrcode_payload ?? undefined}
        onCopyPix={copy}
      >
        {data?.qrcode_payload && (
          <div className="flex w-full flex-col gap-2">
            <label
              htmlFor="pix-payload"
              className="text-left text-xs font-bold text-brand-muted"
            >
              PIX copia e cola
            </label>
            <textarea
              id="pix-payload"
              readOnly
              value={data.qrcode_payload}
              onClick={(e) => e.currentTarget.select()}
              className="min-h-[88px] w-full resize-y rounded-xl border border-brand-border bg-white/80 p-2.5 font-mono text-[11px] leading-relaxed text-brand-ink"
            />
            <p
              className="min-h-5 text-xs font-bold text-brand-green-dark"
              role="status"
            >
              {copied ? "Código copiado!" : ""}
            </p>
          </div>
        )}
        <p className="text-xs leading-relaxed text-brand-muted">
          Assim que o banco confirmar o pagamento, esta página avisa e sua matrícula é
          liberada automaticamente. Pode deixar aberta.
        </p>
      </CheckoutCard>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main id="conteudo" className="flex flex-1 justify-center px-6 py-6">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}

function Message({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <FunnelEntryCard>
      <h1 className="text-xl font-extrabold text-brand-ink">{title}</h1>
      <p className="text-sm leading-relaxed text-brand-muted">{text}</p>
      {action}
    </FunnelEntryCard>
  );
}
