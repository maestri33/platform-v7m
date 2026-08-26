/**
 * Funil do candidato (ordem do backend) — helpers compartilhados entre o painel
 * e as páginas de etapa. O wizard é auto-avançante: concluir uma etapa navega
 * direto pra próxima, nunca volta pra um hub de cards.
 */
import type { CandidateMe, CandidateStatus } from "@/lib/api/types";

/** Ordem do funil (mesma do backend). `status` nomeia a PRÓXIMA etapa a fazer. */
export const FUNNEL_ORDER: CandidateStatus[] = [
  "started",
  "profile",
  "address",
  "documents",
  "pix",
  "education",
  "selfie",
  "completed",
];

/** Página da etapa atual — pra onde o painel manda o candidato direto. */
export const STAGE_HREF: Record<CandidateStatus, string> = {
  started: "/documento",
  profile: "/documento",
  address: "/documento",
  documents: "/pix",
  pix: "/pix",
  education: "/selfie",
  selfie: "/selfie",
  completed: "/painel",
  approved: "/painel",
  rejected: "/painel",
};

/**
 * `STAGE_HREF` à prova de drift: se o backend ganhar um status que este build
 * não conhece, cai no painel em vez de `redirect(undefined)` (500 na cara do
 * candidato — aconteceu quando `education` nasceu só no back).
 */
export function stageHref(status: string | undefined | null): string {
  return STAGE_HREF[status as CandidateStatus] ?? "/painel";
}

/** Retomada canônica usando também os flags que o `status` sozinho não distingue. */
export function candidateStageHref(me: CandidateMe): string {
  if (me.address_proof?.status === "rejected" || me.address_proof?.needs_kinship) {
    return "/endereco";
  }
  const recovery = me.blocks?.find((block) =>
    ["rg", "cnh", "address_proof", "selfie"].includes(block.source_type),
  );
  if (recovery?.source_type === "address_proof") return "/endereco";
  if (recovery?.source_type === "rg" || recovery?.source_type === "cnh") {
    return "/documento";
  }
  if (recovery?.source_type === "selfie") return "/selfie";
  if (["started", "profile", "address", "documents", "pix"].includes(me.status)) {
    if (!hasCapturedIdentityDocument(me)) return "/documento";
    if (!me.address_proof?.photo) return "/endereco";
    if (!me.pix_validated) return "/pix";
    return "/escolaridade";
  }
  return stageHref(me.status);
}

export function hasCapturedIdentityDocument(me: CandidateMe): boolean {
  const rg = me.documents?.rg;
  const cnh = me.documents?.cnh;
  const rgComplete = Boolean(rg?.full_photo || (rg?.front_photo && rg?.back_photo));
  const cnhComplete = Boolean(cnh?.full_photo || cnh?.front_photo || cnh?.back_photo);
  return rgComplete || cnhComplete;
}

export function documentSectionCaptured(doc: {
  doc_type?: string | null;
  has_front?: boolean;
  has_back?: boolean;
  has_full?: boolean;
  front_photo?: string | null;
  back_photo?: string | null;
  full_photo?: string | null;
}): boolean {
  const hasFront = Boolean(doc.has_front || doc.front_photo);
  const hasBack = Boolean(doc.has_back || doc.back_photo);
  const hasFull = Boolean(doc.has_full || doc.full_photo);
  if (doc.doc_type === "rg") return hasFull || (hasFront && hasBack);
  if (doc.doc_type === "cnh") return hasFull || hasFront || hasBack;
  return false;
}

/** Próximo passo depois de concluir cada etapa (navegação direta dos forms). */
export const NEXT_STAGE: Record<string, string> = {
  profile: "/documento",
  address: "/pix",
  documents: "/endereco",
  pix: "/escolaridade",
  education: "/selfie",
  selfie: "/painel",
};

/**
 * A etapa `stage` já foi concluída pra quem está em `current`? Usado pra travar
 * etapas preenchidas em resumo somente-leitura (só reabre se o back reprovar).
 */
export function stageCompleted(stage: CandidateStatus, me: CandidateMe): boolean {
  const currentIndex = FUNNEL_ORDER.indexOf(me.status);
  switch (stage) {
    case "profile":
      return currentIndex >= FUNNEL_ORDER.indexOf("profile");
    case "address":
      return currentIndex >= FUNNEL_ORDER.indexOf("address");
    case "documents":
      return currentIndex >= FUNNEL_ORDER.indexOf("pix");
    case "pix":
      return Boolean(me.pix_validated);
    case "education":
      return (
        me.profile?.education_level != null &&
        me.profile?.education_completed != null
      );
    default:
      return currentIndex > FUNNEL_ORDER.indexOf(stage);
  }
}

/**
 * `WRONG_STATUS` (409): a etapa desta tela não é a atual do funil (aba velha /
 * fora de ordem). NÃO adivinhamos o destino aqui: mandamos pro resolvedor
 * `/continuar`, que lê o `candidate/me` fresco no servidor e aplica o
 * `candidateStageHref` (que considera `blocks`, comprovante e pix).
 *
 * Adivinhar pelo `STAGE_HREF` fechava laço: `expected_status: "education"`
 * devolvia `/selfie` — a MESMA tela que acabou de recusar — e, quando o destino
 * era a própria página, o push virava no-op silencioso (o botão não fazia nada).
 * O `from` deixa o resolvedor detectar esse caso e escapar pro painel.
 */
export function wrongStatusHref(
  code: string | undefined,
  expectedStatus: string | undefined,
  from?: string,
): string | null {
  if (code !== "WRONG_STATUS") return null;
  const params = new URLSearchParams();
  if (expectedStatus) params.set("expected", expectedStatus);
  if (from) params.set("from", from);
  const query = params.toString();
  return query ? `/continuar?${query}` : "/continuar";
}

export type ChecklistStepKey =
  | "documents"
  | "address"
  | "pix"
  | "education"
  | "selfie";

export type ChecklistItemState = "todo" | "pending" | "approved" | "needs_action";

export type ChecklistItem = {
  key: ChecklistStepKey;
  label: string;
  href: string;
  state: ChecklistItemState;
  badgeLabel: string;
  description: string;
  icon: string;
};

/** Avalia o estado assíncrono dos 5 deveres cadastrais a partir do CandidateMe. */
export function getFunnelChecklist(me: CandidateMe): ChecklistItem[] {
  // 1. Documentos (RG ou CNH)
  const docCaptured = hasCapturedIdentityDocument(me);
  const docRejected =
    me.documents?.rg?.validation_status === "rejected" ||
    me.documents?.cnh?.validation_status === "rejected" ||
    Boolean(me.blocks?.some((b) => b.source_type === "rg" || b.source_type === "cnh"));
  const docApproved =
    me.documents?.rg?.validation_status === "approved" ||
    me.documents?.cnh?.validation_status === "approved";
  const docState: ChecklistItemState = docApproved
    ? "approved"
    : docRejected
      ? "needs_action"
      : docCaptured
        ? "pending"
        : "todo";

  // 2. Comprovante de Residência
  const addressState: ChecklistItemState =
    me.address_proof?.status === "approved"
      ? "approved"
      : me.address_proof?.status === "rejected" ||
          me.address_proof?.needs_kinship ||
          Boolean(me.blocks?.some((b) => b.source_type === "address_proof"))
        ? "needs_action"
        : me.address_proof?.photo
          ? "pending"
          : "todo";

  // 3. Chave Pix
  const pixState: ChecklistItemState = me.pix_validated ? "approved" : "todo";

  // 4. Escolaridade
  const educationState: ChecklistItemState =
    me.profile?.education_level != null && me.profile?.education_completed != null
      ? "approved"
      : "todo";

  // 5. Selfie & Acordo
  const selfieRejected =
    me.selfie?.analysis_status === "rejected" ||
    Boolean(me.blocks?.some((b) => b.source_type === "selfie"));
  const selfieApproved = me.selfie?.analysis_status === "approved";
  const selfieState: ChecklistItemState = selfieApproved
    ? "approved"
    : selfieRejected
      ? "needs_action"
      : me.selfie?.taken_at
        ? "pending"
        : "todo";

  return [
    {
      key: "documents",
      label: "Documento oficial (RG/CNH)",
      href: "/documento",
      state: docState,
      badgeLabel:
        docState === "approved"
          ? "Aprovado ✓"
          : docState === "pending"
            ? "Em análise ⏳"
            : docState === "needs_action"
              ? "Ajustar ⚠️"
              : "Pendente",
      description:
        docState === "approved"
          ? "Documento verificado com sucesso."
          : docState === "pending"
            ? "Foto recebida. OCR conferindo em segundo plano."
            : docState === "needs_action"
              ? "Foto ilegível ou incompleta. Envie novamente."
              : "Envie foto da frente e verso do RG ou da CNH.",
      icon: "🪪",
    },
    {
      key: "address",
      label: "Comprovante de residência",
      href: "/endereco",
      state: addressState,
      badgeLabel:
        addressState === "approved"
          ? "Aprovado ✓"
          : addressState === "pending"
            ? "Em análise ⏳"
            : addressState === "needs_action"
              ? "Ajustar ⚠️"
              : "Pendente",
      description:
        addressState === "approved"
          ? "Comprovante conferido."
          : addressState === "pending"
            ? "Comprovante recebido. Análise em segundo plano."
            : addressState === "needs_action"
              ? "Confirme o titular ou envie outro comprovante."
              : "Conta de água, luz, gás ou telefone recente.",
      icon: "🏠",
    },
    {
      key: "pix",
      label: "Chave Pix para saque",
      href: "/pix",
      state: pixState,
      badgeLabel: pixState === "approved" ? "Validada ✓" : "Pendente",
      description:
        pixState === "approved"
          ? "Chave vinculada para receber suas comissões."
          : "Cadastre onde você quer receber seus pagamentos.",
      icon: "🔑",
    },
    {
      key: "education",
      label: "Escolaridade",
      href: "/escolaridade",
      state: educationState,
      badgeLabel: educationState === "approved" ? "Registrada ✓" : "Pendente",
      description:
        educationState === "approved"
          ? "Nível de ensino registrado."
          : "Informe sua última série ou formação concluída.",
      icon: "🎓",
    },
    {
      key: "selfie",
      label: "Selfie & Acordo de parceria",
      href: "/selfie",
      state: selfieState,
      badgeLabel:
        selfieState === "approved"
          ? "Assinado ✓"
          : selfieState === "pending"
            ? "Em análise ⏳"
            : selfieState === "needs_action"
              ? "Ajustar ⚠️"
              : "Pendente",
      description:
        selfieState === "approved"
          ? "Assinatura eletrônica confirmada."
          : selfieState === "pending"
            ? "Selfie recebida. Vivacidade em análise."
            : selfieState === "needs_action"
              ? "Tire outra selfie seguindo as orientações."
              : "Foto ao vivo sem óculos para assinar o acordo.",
      icon: "🤳",
    },
  ];
}
