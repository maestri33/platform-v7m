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

const BASE_INSTRUCTIONS = `Fale em português do Brasil, de forma simples, curta e acolhedora (o \
público tem baixa escolaridade). Quando o aluno der uma explicação que faça sentido, chame a ação \
"registrarParentesco" com o texto claro do vínculo (ex.: "É minha mãe, Maria da Silva."). NÃO \
exija documentos nem prova — só uma explicação plausível. Se a resposta não fizer sentido, peça \
gentilmente pra explicar melhor.`;

/**
 * Dois tons, um por situação (Victor 2026-07-28): `confirm` = a IA achou sobrenome em comum
 * (provável família) e só falta o GRAU; `justify` = titular sem relação aparente — o aluno
 * precisa explicar POR QUE aquele comprovante prova o endereço dele.
 */
const COPY = {
  confirm: {
    title: "Qual é o parentesco?",
    body: "O comprovante parece estar no nome de alguém da sua família. Confirma pra gente quem é e o grau de parentesco?",
    initial:
      "Oi! O comprovante parece estar no nome de alguém da sua família. Quem é — mãe, pai, cônjuge, avó…?",
    instructions: `Você confirma o GRAU DE PARENTESCO do aluno com o titular do comprovante de \
residência — o sobrenome bate, então provavelmente é família. Pergunte só quem é (mãe, pai, \
cônjuge, avó, tio...). ${BASE_INSTRUCTIONS}`,
  },
  justify: {
    title: "De quem é a conta?",
    body: "O comprovante está no nome de outra pessoa. Conte pra gente quem é o titular e qual é o seu vínculo com esse endereço — pode responder aqui embaixo.",
    initial:
      "Oi! Vi que o comprovante está no nome de outra pessoa. De quem é a conta e por que ela comprova o SEU endereço (mora junto, aluguel, pensão…)?",
    instructions: `Você ajuda um aluno a JUSTIFICAR um comprovante de residência que está no nome \
de uma pessoa sem relação aparente com ele. Pergunte de quem é a conta e qual o vínculo do aluno \
com o titular e com o endereço (cônjuge, locador, mora de favor, pensão...). ${BASE_INSTRUCTIONS}`,
  },
} as const;

export function KinshipChat({
  onSubmit,
  busy,
  kind = "justify",
}: {
  /** registra o parentesco (texto) → submitAddressProofKinship no chamador */
  onSubmit: (relation: string) => Promise<void>;
  busy?: boolean;
  /** "confirm" = sobrenome em comum (só o grau) · "justify" = sem relação aparente (vínculo). */
  kind?: "confirm" | "justify";
}) {
  const copy = COPY[kind];
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
      <h2 className="text-xl font-extrabold text-brand-ink">{copy.title}</h2>
      <p className="text-[15px] leading-relaxed text-brand-muted">{copy.body}</p>
      <div className="overflow-hidden rounded-2xl border border-brand-border" aria-busy={busy}>
        <CopilotChat
          instructions={copy.instructions}
          labels={{
            initial: copy.initial,
            placeholder: "Ex.: é a conta da minha mãe, Maria…",
          }}
        />
      </div>
    </div>
  );
}
