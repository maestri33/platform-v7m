"use client";

import { LoadingOverlay } from "@/components/ui/loading-overlay";

import { InfoSheet } from "./info-sheet";
import { LeadModal } from "./lead-modal";
import styles from "./lead-flow.module.css";
import { ScreenCheck } from "./screen-check";
import { ScreenCheckout } from "./screen-checkout";
import { ScreenCpf } from "./screen-cpf";
import { ScreenEmail } from "./screen-email";
import { ScreenEnroll, ScreenEnrollDone } from "./screen-enroll";
import { ScreenHome } from "./screen-home";
import { ScreenLogin } from "./screen-login";
import { ScreenPainel } from "./screen-painel";
import { ScreenPlanos } from "./screen-planos";
import { Switcher } from "./switcher";
import { useLeadFlow } from "./use-lead-flow";

/**
 * Funil do lead (protótipo navegável) — porte fiel do
 * `Lead Supletivo (protótipo).dc.html` para o app real.
 *
 * Uma única "tela" client-side por estado (sem rotas): Início (telefone) →
 * OTP → CPF (pergaminho) → E-mail → Painel/Planos → Checkout → Matrícula →
 * App do aluno. Toda chamada de rede é simulada com gatilhos determinísticos
 * (ver flow-data.ts) — o backend real deve se moldar a esta sequência.
 */
export function LeadFlow({ referral }: { referral: string }) {
  const { s, act } = useLeadFlow(referral);

  // Toda espera ganha o véu: blur na tela inteira + loop centralizado + o que
  // está acontecendo — ninguém fica perdido olhando spinner pequeno no canto.
  const veilMsg = s.checking
    ? "Verificando seu número…"
    : s.otpBusy
      ? "Conferindo seu código…"
      : s.cpfChecking
        ? "Confirmando seu CPF…"
        : s.emailPhase === "processing"
          ? "Verificando seu e-mail…"
          : s.camPhase === "sending"
            ? s.eSendLabel
            : null;

  const screen = (() => {
    switch (s.screen) {
      case "check":
        return <ScreenCheck s={s} act={act} />;
      case "login":
        return <ScreenLogin s={s} act={act} />;
      case "cpf":
        return <ScreenCpf s={s} act={act} />;
      case "email":
        return <ScreenEmail s={s} act={act} />;
      case "planos":
        return <ScreenPlanos s={s} act={act} />;
      case "checkout":
        return <ScreenCheckout s={s} act={act} />;
      case "painel":
        return <ScreenPainel s={s} act={act} />;
      case "e_doc":
      case "e_addr":
      case "e_edu":
      case "e_selfie":
        return <ScreenEnroll s={s} act={act} />;
      case "e_done":
        return <ScreenEnrollDone act={act} />;
      case "home":
        return <ScreenHome s={s} act={act} />;
    }
  })();

  return (
    <>
      {/* Transição app-like entre passos: avança da direita, volta da esquerda. */}
      <div
        key={s.screen}
        className={`flex flex-1 flex-col ${s.dir === "left" ? "step-in-left" : "step-in-right"}`}
      >
        {screen}
      </div>

      <LoadingOverlay show={!!veilMsg} message={veilMsg ?? undefined} />
      {s.modalKind && <LeadModal kind={s.modalKind} act={act} docError={s.docError} />}
      {s.info && <InfoSheet info={s.info} act={act} />}
      {s.flashShow && <div className={styles.eflash} aria-hidden />}
      <Switcher s={s} act={act} />
    </>
  );
}
