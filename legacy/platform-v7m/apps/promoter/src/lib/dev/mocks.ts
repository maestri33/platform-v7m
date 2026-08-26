/**
 * Mock data fixtures for the dev preview (`/dev-preview`).
 *
 * Single source of truth so every section in the showcase (components, forms,
 * pages, states) sees the SAME realistic data — no fabricated duplicates.
 * Shapes mirror the real `src/lib/api/types.ts` so TS strict-mode catches drift.
 *
 * Auth/Session shape: identical to `readSession()` in `lib/auth/server.ts`.
 */
import type { Session } from "@/lib/auth/server";
import type {
  AddressProofBlock,
  CandidateMe,
  Commission,
  Lead,
  PromoterMe,
  PromoterSummary,
  SelfieSection,
  TrainingMaterial,
} from "@/lib/api/types";

// =============================================================================
// Sessions — same shape the real AppShell expects
// =============================================================================

export const mockSessions: Record<string, { session: Session }> = {
  candidate: {
    session: { external_id: "demo-cand", name: "Ana Candidata", roles: ["candidate"] },
  },
  promoter: {
    session: { external_id: "demo-prom", name: "Bia Promotora", roles: ["promoter"] },
  },
  coordinator: {
    session: {
      external_id: "demo-coord",
      name: "Cau Coordenador",
      roles: ["promoter", "coordinator"],
    },
  },
  training: {
    session: {
      external_id: "demo-train",
      name: "Dudu Trainee",
      roles: ["promoter", "training"],
    },
  },
  // Para o showcase de auth (sem AppShell). Mantém shape mínima.
  outsider: {
    session: { external_id: "demo-out", name: "Visitante", roles: [] },
  },
};

// =============================================================================
// Promoter summary — 4 variantes (default, goal_reached, com bolsa, com hold)
// =============================================================================

const nextFriday18 = (offsetDays = 3) => {
  // Próxima sexta 18:00 (BRL) — base estável p/ Countdown
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
};

const weekStartThisWeek = () => {
  const d = new Date();
  // segunda-feira 00:00
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const weekStartLastWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day - 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export const mockSummaryDefault: PromoterSummary = {
  week_goal: 5,
  week_paid_leads: 2,
  week_commission_total: "200.00",
  bonus_amount: "500.00",
  goal_reached: false,
  next_closing_at: nextFriday18(3),
  week_start: weekStartThisWeek(),
  lifetime: {
    total_received: "1340.00",
    total_students: 14,
    goals_hit: 1,
  },
  payout_hold: {
    held: false,
    reason: "none",
    amount_held: "0.00",
    next_payout_at: null,
  },
};

export const mockSummaryGoalReached: PromoterSummary = {
  week_goal: 5,
  week_paid_leads: 6,
  week_commission_total: "600.00",
  bonus_amount: "500.00",
  goal_reached: true,
  next_closing_at: nextFriday18(2),
  week_start: weekStartThisWeek(),
  lifetime: {
    total_received: "5820.00",
    total_students: 48,
    goals_hit: 7,
  },
  payout_hold: {
    held: false,
    reason: "none",
    amount_held: "0.00",
    next_payout_at: null,
  },
};

export const mockSummaryScholarship: PromoterSummary = {
  ...mockSummaryGoalReached,
  week_paid_leads: 2,
  week_commission_total: "200.00",
  goal_reached: false,
  lifetime: {
    total_received: "2200.00",
    total_students: 6, // a 3 da bolsa (enrollGoal) e a 4 da prova (examGoal=10)
    goals_hit: 0,
  },
  payout_hold: {
    held: true,
    reason: "onboarding_incomplete",
    amount_held: "200.00",
    next_payout_at: nextFriday18(7),
  },
};

export const mockSummaryPendingPolo: PromoterSummary = {
  ...mockSummaryDefault,
  payout_hold: {
    held: true,
    reason: "pending_polo_approval",
    amount_held: "200.00",
    next_payout_at: nextFriday18(7),
  },
};

// =============================================================================
// Leads — mix de estados
// =============================================================================

export const mockLeads: Lead[] = [
  {
    external_id: "lead-001",
    name: "Marina Andrade",
    phone: "+5511987654321",
    status: "paid",
    created_at: weekStartThisWeek(), // pago nesta semana → paid_pending
  },
  {
    external_id: "lead-002",
    name: "Rafael Oliveira",
    phone: "+5511976543210",
    status: "paid",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // também esta semana
  },
  {
    external_id: "lead-003",
    name: "Júlia Pereira",
    phone: "+5511965432109",
    status: "paid",
    created_at: weekStartLastWeek(), // semana passada → paid_settled
  },
  {
    external_id: "lead-004",
    name: "Bruno Souza",
    phone: "+5511954321098",
    status: "waiting_payment",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    external_id: "lead-005",
    name: "Carolina Lima",
    phone: "+5511943210987",
    status: "waiting_payment",
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

// =============================================================================
// Commissions — pendentes, pagas e uma falha
// =============================================================================

export const mockCommissions: Commission[] = [
  {
    external_id: "com-001",
    amount: "100.00",
    status: "pending",
    source: "lead",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    external_id: "com-002",
    amount: "100.00",
    status: "pending",
    source: "lead",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    external_id: "com-003",
    amount: "500.00",
    status: "paid",
    source: "goal_bonus",
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    paid_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    external_id: "com-004",
    amount: "100.00",
    status: "paid",
    source: "enrollment",
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    paid_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    external_id: "com-005",
    amount: "100.00",
    status: "failed",
    source: "lead",
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    external_id: "com-006",
    amount: "500.00",
    status: "paid",
    source: "bonus",
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    paid_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// =============================================================================
// CandidateMe — variantes por etapa do funil
// =============================================================================

const candidateBase = {
  profile: {
    mother_name: "Maria das Dores Silva",
    father_name: "João da Silva",
    birthplace: "Belo Horizonte/MG",
    marital_status: "single",
    nationality: "Brasileira",
    name: "Ana Candidata",
    birth_date: "1998-04-12",
  },
  address: {
    zipcode: "30130-000",
    street: "Av. Afonso Pena",
    number: "1500",
    complement: "Apto 302",
    neighborhood: "Centro",
    city: "Belo Horizonte",
    state: "MG",
    missing_fields: [],
  },
};

export const mockCandidateStarted: CandidateMe = {
  ...candidateBase,
  status: "started",
  profile: null, // ainda não preencheu
  address: null,
  address_proof: null,
  documents: null,
  selfie: null,
  pix_validated: false,
  blocks: [],
};

export const mockCandidateMidFunnel: CandidateMe = {
  ...candidateBase,
  status: "education",
  documents: {
    rg: {
      validation_status: "approved",
      number: "MG-12.345.678",
      issuing_agency: "SSP/MG",
      has_front: true,
      has_back: true,
      has_full: false,
      front_photo: null,
      back_photo: null,
      full_photo: null,
    },
  },
  address_proof: {
    exists: true,
    photo: null,
    status: "approved",
    reason: null,
    needs_kinship: false,
    kinship_relation: null,
  } satisfies AddressProofBlock,
  pix_validated: true,
  blocks: [],
};

export const mockCandidateRejected: CandidateMe = {
  ...candidateBase,
  status: "selfie", // aguardando refazer selfie
  documents: {
    rg: {
      validation_status: "approved",
      has_front: true,
      has_back: true,
      has_full: false,
      front_photo: null,
      back_photo: null,
      full_photo: null,
    },
  },
  address_proof: {
    exists: true,
    photo: null,
    status: "approved",
    reason: null,
    needs_kinship: false,
    kinship_relation: null,
  },
  pix_validated: true,
  selfie: {
    taken_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    analysis_status: "rejected",
    analysis_reason:
      "A foto está com iluminação baixa. Como resolver: tire em ambiente bem iluminado, sem óculos de sol ou chapéu, e olhe para a câmera.",
    expires_at: null,
    photo: null,
    hub_whatsapp: "5531999998888",
  },
  blocks: [],
};

export const mockCandidateOnboardingInProgress: CandidateMe = {
  ...candidateBase,
  status: "documents",
  documents: null, // ainda não enviou documento
  address_proof: null,
  pix_validated: false,
  selfie: null,
  blocks: [],
};

export const mockCandidateApproved: CandidateMe = {
  ...candidateBase,
  status: "approved",
  documents: {
    rg: {
      validation_status: "approved",
      has_front: true,
      has_back: true,
      has_full: false,
      front_photo: null,
      back_photo: null,
      full_photo: null,
    },
  },
  address_proof: {
    exists: true,
    photo: null,
    status: "approved",
    reason: null,
    needs_kinship: false,
    kinship_relation: null,
  },
  pix_validated: true,
  selfie: {
    taken_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    analysis_status: "approved",
    analysis_reason: null,
    expires_at: null,
    photo: "https://placehold.co/200x200/1d1d20/d9b15a?text=Selfie",
    hub_whatsapp: null,
  } satisfies SelfieSection,
  blocks: [],
};

// =============================================================================
// Promoter me
// =============================================================================

export const mockPromoterMe: PromoterMe = {
  external_id: "demo-prom",
  hub_external_id: "hub-sp-001",
  status: "active",
  ref_url: "https://v7m.app/r/demo-prom",
  pre_matriculado: false,
  blocks: [],
};

export const mockPromoterMeWithScholarship: PromoterMe = {
  ...mockPromoterMe,
  pre_matriculado: true,
};

export const mockPromoterMeSuspended: PromoterMe = {
  ...mockPromoterMe,
  status: "suspended",
};

// =============================================================================
// Training materials — diferentes estados
// =============================================================================

export const mockTrainingMaterials: TrainingMaterial[] = [
  {
    material_external_id: "mat-001",
    title: "Como funciona o programa V7M",
    blocking: true,
    kind: "video",
    question:
      "Em suas palavras: qual é o papel do promotor no programa V7M e como ele ganha por isso?",
    text_content: null,
    video: "https://example.com/v7m-intro.mp4",
    photo: null,
    content_blocks: null,
    assignment_status: "approved",
    submission_status: "approved",
    grade: 9,
    justification: null,
  },
  {
    material_external_id: "mat-002",
    title: "Abordagem e primeiro contato com o lead",
    blocking: true,
    kind: "text",
    question:
      "Como você abriria conversa com alguém que demonstrou interesse no material? Dê 2-3 frases de exemplo.",
    text_content:
      "O lead está comparando. O promotor não empurra matrícula: ele explica o que muda na vida da pessoa com a formação. Tom: curioso, sem pressa.\n\nAntes de oferecer link, entenda o momento: trabalho atual, motivo de buscar o curso, dúvida principal.",
    photo: null,
    video: null,
    content_blocks: null,
    assignment_status: "approved",
    submission_status: "approved",
    grade: 8,
    justification: null,
  },
  {
    material_external_id: "mat-003",
    title: "Compliance: o que NÃO dizer ao lead",
    blocking: true,
    kind: "text",
    question:
      "Liste 2 afirmações proibidas na conversa com o lead e como você reformularia cada uma.",
    text_content: null,
    photo: null,
    video: null,
    content_blocks: null,
    assignment_status: null,
    submission_status: "pending", // sendo corrigido
    grade: null,
    justification: null,
  },
  {
    material_external_id: "mat-004",
    title: "Como funciona o pagamento semanal",
    blocking: true,
    kind: "pdf",
    question: null,
    text_content:
      "Toda sexta às 18h o sistema fecha a semana. As comissões de R$100 por matrícula + R$500 de bônus (se você bateu 5) caem no Pix validado em até 2h.",
    photo: null,
    video: null,
    content_blocks: null,
    assignment_status: null,
    submission_status: null,
    grade: null,
    justification: null,
  },
  {
    material_external_id: "mat-005",
    title: "Cases de promotores que se destacaram",
    blocking: false, // extra
    kind: "video",
    question: null,
    text_content: null,
    video: "https://example.com/cases.mp4",
    photo: null,
    content_blocks: null,
    assignment_status: null,
    submission_status: null,
    grade: null,
    justification: null,
  },
  {
    material_external_id: "mat-006",
    title: "Erros comuns na primeira semana",
    blocking: false,
    kind: "text",
    question: null,
    text_content:
      "Os 3 erros mais comuns na primeira semana: 1) mandar link sem antes explicar; 2) esquecer o follow-up em 48h; 3) não checar a chave Pix antes de compartilhar.",
    photo: null,
    video: null,
    content_blocks: null,
    assignment_status: null,
    submission_status: null,
    grade: null,
    justification: null,
  },
  {
    material_external_id: "mat-007",
    title: "Resposta que precisa refazer",
    blocking: true,
    kind: "text",
    question: "Como você calcularia sua meta mensal com base na meta semanal?",
    text_content: "A meta é fixa: 5 leads pagos por semana.",
    photo: null,
    video: null,
    content_blocks: null,
    assignment_status: null,
    submission_status: "rejected",
    grade: 3,
    justification:
      "A resposta ficou muito curta e não demonstra entendimento da relação entre meta semanal e mensal. Releia o material e responda com suas palavras, dando exemplos práticos.",
  },
];

// =============================================================================
// Selfie / Address proof — variantes de status
// =============================================================================

export const mockSelfiePending: SelfieSection = {
  taken_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  analysis_status: "pending",
  analysis_reason: null,
  expires_at: null,
  photo: "https://placehold.co/200x200/1d1d20/d9b15a?text=Selfie",
  hub_whatsapp: null,
};

export const mockSelfieApproved: SelfieSection = {
  taken_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  analysis_status: "approved",
  analysis_reason: null,
  expires_at: null,
  photo: "https://placehold.co/200x200/79d39b/0b0b0c?text=Aprovada",
  hub_whatsapp: null,
};

export const mockSelfieRejected: SelfieSection = {
  taken_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  analysis_status: "rejected",
  analysis_reason:
    "A foto está com iluminação baixa. Como resolver: tire em ambiente bem iluminado, sem óculos de sol ou chapéu, e olhe para a câmera.",
  expires_at: null,
  photo: "https://placehold.co/200x200/c0392b/ffffff?text=Reprovada",
  hub_whatsapp: "5531999998888",
};

export const mockSelfieReview: SelfieSection = {
  taken_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  analysis_status: "review",
  analysis_reason: null,
  expires_at: null,
  photo: "https://placehold.co/200x200/f0c361/0b0b0c?text=Em+análise",
  hub_whatsapp: null,
};

export const mockAddressProofPending: AddressProofBlock = {
  exists: true,
  photo: "https://placehold.co/200x280/f0c361/0b0b0c?text=Comprovante",
  status: "pending",
  reason: null,
  needs_kinship: false,
  kinship_relation: null,
};

export const mockAddressProofApproved: AddressProofBlock = {
  ...mockAddressProofPending,
  status: "approved",
  reason: null,
};

export const mockAddressProofRejected: AddressProofBlock = {
  ...mockAddressProofPending,
  status: "rejected",
  reason: "Documento ilegível. Envie uma foto com mais luz e sem cortes nas bordas.",
};

export const mockAddressProofNeedsKinship: AddressProofBlock = {
  ...mockAddressProofPending,
  status: "needs_kinship",
  reason: "A conta está no nome de outra pessoa.",
  needs_kinship: true,
  kinship_relation: null,
};

// =============================================================================
// Painel por role — persona canônica de cada role no /painel (home do app).
// =============================================================================
// Usado pelo grupo "Painel — persona atual" do pages-section: cada role vê um
// estado realista no /painel em vez do mesmo mock fixo. O `candidate` vai
// bruto (CandidateMe) e o pages-section converte via candidateToMeCandidate,
// igual às variantes do catálogo — mantém um único caminho de derivação.

export type PainelRoleMock = {
  /** Rótulo curto da persona (ex.: "Bia Promotora"). */
  personaLabel: string;
  /** Por que essa persona mostra esse estado (legenda do variant). */
  hint: string;
  summary: PromoterSummary;
  /** Subconjunto de PromoterMe que o PainelMock lê. */
  promoter: Pick<PromoterMe, "status" | "ref_url" | "pre_matriculado">;
  /** Candidato bruto; pages-section deriva os steps. null = sem grade. */
  candidate: CandidateMe | null;
  showHold: "none" | "onboarding_incomplete" | "pending_polo_approval";
};

export const mockPainelByRole: Record<string, PainelRoleMock> = {
  promoter: {
    personaLabel: "Bia Promotora",
    hint: "Promotora ativa — meta da semana em andamento, sem hold.",
    summary: mockSummaryDefault,
    promoter: mockPromoterMe,
    candidate: null,
    showHold: "none",
  },
  candidate: {
    personaLabel: "Ana Candidata",
    hint: "Onboarding incompleto — hold visível + grade de etapas pendentes.",
    summary: mockSummaryDefault,
    promoter: mockPromoterMe,
    candidate: mockCandidateOnboardingInProgress,
    showHold: "onboarding_incomplete",
  },
  coordinator: {
    personaLabel: "Cau Coordenador",
    hint: "Promotor sênior (também coordena) — meta batida, bônus garantido.",
    summary: mockSummaryGoalReached,
    promoter: mockPromoterMe,
    candidate: null,
    showHold: "none",
  },
  training: {
    personaLabel: "Dudu Trainee",
    hint: "Bolsista (pré-matriculado) — default + card de bolsa de estudos.",
    summary: mockSummaryDefault,
    promoter: mockPromoterMeWithScholarship,
    candidate: null,
    showHold: "none",
  },
  // Visitante (auth showcase, sem AppShell) — fallback pra persona promoter.
  outsider: {
    personaLabel: "Visitante",
    hint: "Sem sessão — fallback pra persona promoter.",
    summary: mockSummaryDefault,
    promoter: mockPromoterMe,
    candidate: null,
    showHold: "none",
  },
};
