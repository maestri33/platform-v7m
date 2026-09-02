"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Check } from "lucide-react";

const PARAGRAPHS = [
  "Você atua como promotor(a) parceiro(a) autônomo(a) da V7M — sem vínculo empregatício, societário ou de estágio. Você decide como e quando divulgar; não há jornada fixa nem exclusividade.",
  "Remuneração 100% por comissão: R$ 100 por matrícula paga trazida por você, mais bônus de metas semanais. Fechamento semanal toda sexta às 18h, direto na sua chave Pix.",
  "Sua selfie funciona como assinatura eletrônica deste acordo — junto com a foto, guardamos data, hora e o dispositivo usado, como comprovante de que foi você quem assinou.",
  "Comparamos a selfie com a foto do seu documento para confirmar sua identidade e prevenir fraudes contra o seu próprio saldo.",
  "Seus dados (documento, selfie, endereço, Pix) são protegidos rigorosamente conforme as diretrizes da LGPD.",
  "Você pode encerrar essa parceria quando quiser, sem qualquer taxa ou multa contratual.",
];

export function AgreementSheet({ onAccept }: { onAccept: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border border-brand-border bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="shrink-0 p-5 border-b border-brand-border flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-brand-ink">
              Termo de Adesão & Parceria V7M
            </h2>
            <p className="text-xs text-brand-muted">
              Leia os termos da parceria antes de prosseguir com a selfie biométrica.
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-3.5 overflow-y-auto p-5 text-xs text-brand-ink leading-relaxed">
          {PARAGRAPHS.map((p, i) => (
            <div key={i} className="flex gap-2.5 items-start">
              <span className="mt-0.5 size-4 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0 text-[10px] font-bold">
                ✓
              </span>
              <p>{p}</p>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-brand-border p-4 bg-slate-50 flex flex-col gap-2">
          <Button type="button" onClick={onAccept} className="w-full">
            <Check className="size-4 mr-2" />
            Li e Concordo — Ir para Selfie
          </Button>
        </div>
      </div>
    </div>
  );
}
