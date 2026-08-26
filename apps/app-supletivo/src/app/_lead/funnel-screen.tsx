"use client";

import { ScreenCheck } from "./screen-check";
import { ScreenCheckout } from "./screen-checkout";
import { ScreenCpf } from "./screen-cpf";
import { ScreenEmail } from "./screen-email";
import { ScreenLogin } from "./screen-login";
import { ScreenPainel } from "./screen-painel";
import { ScreenPlanos } from "./screen-planos";
import { useFunnel } from "./lead-flow";

/**
 * Renderizador único das telas do funil — cada page do grupo `(funil)` monta
 * este componente; QUAL tela aparece vem da máquina, que por sua vez segue a
 * URL (FunnelProvider).
 */
export function FunnelScreen() {
  const { s, act } = useFunnel();

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
      default:
        return <ScreenCheck s={s} act={act} />;
    }
  })();

  return (
    // Transição app-like entre passos: avança da direita, volta da esquerda.
    <div
      key={s.screen}
      className={`flex flex-1 flex-col ${s.dir === "left" ? "step-in-left" : "step-in-right"}`}
    >
      {screen}
    </div>
  );
}
