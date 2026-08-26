"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";

/**
 * Acordo exibido antes da 1ª selfie. A selfie é a assinatura eletrônica (o
 * backend registra foto + data/hora/dispositivo); o aceite aqui é client-side,
 * só liberando a captura. Header e rodapé fixos, SÓ o texto rola.
 */
const PARAGRAPHS = [
  "Você atua como promotor(a) parceiro(a) autônomo(a) da V7M — sem vínculo empregatício, societário ou de estágio. Você decide como e quando divulgar; não há jornada fixa nem exclusividade.",
  "Remuneração 100% por comissão: R$100 por matrícula paga que você trouxe, mais um bônus fixo de R$500 nas semanas em que fechar 5 matrículas pagas. Fechamento semanal toda sexta às 18h, direto na sua chave Pix.",
  "Sua selfie funciona como assinatura eletrônica deste acordo — junto com a foto, guardamos data, hora e o dispositivo usado, como comprovante de que foi você quem assinou.",
  "Comparamos a selfie com a foto do seu documento pra confirmar sua identidade. Essa verificação tem validade e pode ser pedida de novo depois de um tempo, por segurança.",
  "Seus dados (documento, selfie, endereço, Pix) são usados só pra validar seu cadastro e pagar comissões, conforme a LGPD. Você pode pedir a exclusão falando com o seu polo.",
  "Você pode encerrar essa parceria quando quiser, sem multa — é só avisar o coordenador do seu polo.",
];

export function AgreementSheet({ onAccept }: { onAccept: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Acordo obrigatório: sem caminho de cancelar, então SÓ prende o foco (nada de
  // Escape-fecha). Tab cicla entre o primeiro e o último focável do diálogo;
  // impede tabular pro fundo (a11y de aria-modal). O autoFocus do botão segue.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-[var(--scrim)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="selfie-agreement-title"
    >
      <div className="flex max-h-[82dvh] flex-col overflow-hidden rounded-t-[26px] border-t border-brand-gold/40 bg-[var(--surface)]">
        <div className="shrink-0 space-y-3 px-5 pb-3 pt-4">
          <div className="mx-auto h-1 w-10 rounded-full bg-brand-border" aria-hidden />
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 shrink-0 rounded-[10px] bg-brand-char p-1">
              <Image src="/icon.svg" alt="V7M" width={24} height={24} className="h-full w-full object-contain" />
            </div>
            <h2 id="selfie-agreement-title" className="font-display text-base leading-snug">
              Antes da selfie: seu acordo com a V7M
            </h2>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4">
          {PARAGRAPHS.map((p, i) => (
            <div key={i} className="flex gap-2.5">
              <span aria-hidden className="shrink-0 text-sm text-brand-gold-ink">✦</span>
              <p className="text-sm leading-relaxed">{p}</p>
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t border-[var(--surface-border)] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
          {/* autoFocus: teclado/leitor de tela entram direto na ação do diálogo */}
          <Button type="button" size="xl" onClick={onAccept} autoFocus className="w-full">
            Li e concordo — continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
