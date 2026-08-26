"use client";

/**
 * Diálogo do TITULAR do comprovante (needs_kinship) do candidato/promotor, conduzido por IA via
 * CopilotKit. Quando o comprovante está no nome de outra pessoa, a IA conversa em pt-BR e, quando o
 * vínculo faz sentido, chama a ação `registrarParentesco` → /api/me/document/address-proof/kinship.
 * O backend (evaluate_kinship, compartilhado com o aluno) avalia o fundamento e corrige o português.
 * O provider <CopilotKit> precisa envolver esta árvore (ver AddressProofSection, no passo endereço).
 */
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useCopilotAction } from "@copilotkit/react-core";

const INSTRUCTIONS = `Você ajuda a pessoa a explicar de quem é o comprovante de residência quando \
não está no nome dela. Fale em português do Brasil, simples e acolhedor. Pergunte de quem é a conta \
e qual o vínculo/parentesco (mãe, pai, cônjuge, avó, tio, locador...). Quando a explicação fizer \
sentido, chame a ação "registrarParentesco" com o texto claro do vínculo. NÃO exija documentos nem \
prova — só uma explicação plausível. Se não fizer sentido, peça gentilmente pra explicar melhor.`;

export function KinshipChat({ onSubmit }: { onSubmit: (relation: string) => Promise<string> }) {
  useCopilotAction({
    name: "registrarParentesco",
    description:
      "Registra a explicação de quem é o titular do comprovante e o vínculo da pessoa com ele.",
    parameters: [
      {
        name: "explicacao",
        type: "string",
        description: "A explicação clara do vínculo, ex.: 'É minha mãe, Maria da Silva.'",
        required: true,
      },
    ],
    // A resposta vem do RESULTADO real do backend (aprovou/recusou o vínculo) —
    // antes o chat confirmava "registrado" mesmo quando a explicação era recusada.
    handler: async ({ explicacao }: { explicacao: string }) => {
      return await onSubmit(explicacao);
    },
  });

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--surface-border)]">
      <CopilotChat
        instructions={INSTRUCTIONS}
        labels={{
          initial:
            "Oi! O comprovante está no nome de outra pessoa. De quem é a conta e qual é o seu parentesco com ela?",
          placeholder: "Ex.: é a conta da minha mãe, Maria…",
        }}
      />
    </div>
  );
}
