"use client";

/**
 * Diálogo do TITULAR do comprovante (needs_kinship), conduzido por IA via CopilotKit.
 *
 * Quando o comprovante está no nome de outra pessoa, o backend pede o parentesco. Aqui a IA
 * conversa em pt-BR ("de quem é a conta? qual seu vínculo?"), e quando a resposta faz sentido,
 * chama a ação `registrarParentesco` → `submitAddressProofKinship`. O backend (evaluate_kinship)
 * ainda avalia o FUNDAMENTO e corrige o português no servidor — este chat é a camada de coleta
 * amigável (human-in-the-loop). O provider <CopilotKit> já envolve a matrícula (page.tsx).
 */
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useCopilotAction } from "@copilotkit/react-core";

const INSTRUCTIONS = `Você ajuda um aluno a explicar de quem é o comprovante de residência quando \
não está no nome dele. Fale em português do Brasil, de forma simples, curta e acolhedora (o público \
tem baixa escolaridade). Pergunte de quem é a conta e qual o vínculo/parentesco do aluno com o \
titular (mãe, pai, cônjuge, avó, tio, locador...). Quando o aluno der uma explicação que faça \
sentido, chame a ação "registrarParentesco" com o texto claro do vínculo (ex.: "É minha mãe, Maria \
da Silva."). NÃO exija documentos nem prova — só uma explicação plausível. Se a resposta não fizer \
sentido, peça gentilmente pra explicar melhor.`;

export function KinshipChat({
  onSubmit,
  busy,
}: {
  /** registra o parentesco (texto) → submitAddressProofKinship no chamador */
  onSubmit: (relation: string) => Promise<void>;
  busy?: boolean;
}) {
  // A IA chama esta ação quando o aluno deu uma explicação plausível do titular.
  useCopilotAction({
    name: "registrarParentesco",
    description:
      "Registra a explicação de quem é o titular do comprovante e o vínculo do aluno com ele.",
    parameters: [
      {
        name: "explicacao",
        type: "string",
        description:
          "A explicação clara do vínculo, ex.: 'É minha mãe, Maria da Silva.'",
        required: true,
      },
    ],
    handler: async ({ explicacao }: { explicacao: string }) => {
      await onSubmit(explicacao);
      return "Explicação registrada. Vamos conferir e liberar seu comprovante.";
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-extrabold text-brand-ink">De quem é a conta?</h2>
      <p className="text-[15px] leading-relaxed text-brand-muted">
        O comprovante está no nome de outra pessoa. Conte pra gente quem é o titular e qual é o seu
        parentesco — pode responder aqui embaixo.
      </p>
      <div className="overflow-hidden rounded-2xl border border-brand-border" aria-busy={busy}>
        <CopilotChat
          instructions={INSTRUCTIONS}
          labels={{
            initial:
              "Oi! Vi que o comprovante está no nome de outra pessoa. De quem é a conta e qual é o seu parentesco com ela?",
            placeholder: "Ex.: é a conta da minha mãe, Maria…",
          }}
        />
      </div>
    </div>
  );
}
