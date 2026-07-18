/**
 * Funil do lead (protótipo) — dados e contratos da simulação.
 *
 * Fonte da verdade: `Lead Supletivo (protótipo).dc.html` + DOCUMENTACAO.md do
 * projeto de design. Não há backend: cada erro/estado tem um GATILHO
 * determinístico (sufixo de telefone, código fixo, sufixo de CPF), listados em
 * TRIGGERS e na ferramenta de navegação. Quando o backend real chegar, este
 * módulo é o mapa do contrato que a API precisa cumprir.
 */

export type Screen =
  | "check"
  | "login"
  | "cpf"
  | "email"
  | "planos"
  | "checkout"
  | "painel"
  | "e_doc"
  | "e_addr"
  | "e_edu"
  | "e_selfie"
  | "e_done"
  | "home";

export type ModalKind =
  | "emailinvalid"
  | "emailtaken"
  | "client"
  | "server"
  | "slow"
  | "invalid"
  | "unverified"
  | "staff"
  | "otp"
  | "expired"
  | "resent"
  | "cpfinvalid"
  | "exists"
  | "support"
  | "offline"
  | "success"
  | "sessionexpired";

export interface ModalCopy {
  title: string;
  body: string;
  btn: string;
}

export const MODALS: Record<ModalKind, ModalCopy> = {
  emailinvalid: {
    title: "Esse e-mail não parece certo…",
    body: "Confere se digitou direitinho — precisa ter @ e o domínio (tipo seunome@gmail.com).",
    btn: "Revisar e-mail",
  },
  emailtaken: {
    title: "Esse e-mail já tem dono",
    body: "Ele já está vinculado a outra conta. Use outro e-mail ou fale com o suporte pra recuperar o acesso.",
    btn: "Usar outro e-mail",
  },
  client: {
    title: "Conta já ativa",
    body: "Este número já possui acesso à plataforma. Vamos te direcionar para o seu ambiente.",
    btn: "Acessar minha conta →",
  },
  server: {
    title: "Peraí um tiquinho…",
    body: "Deu um probleminha no nosso servidor — não foi você, fui eu. Respira, espera uns segundinhos e tenta de novo. 🙏",
    btn: "Tentar de novo",
  },
  slow: {
    title: "Calma que já vai…",
    body: "O servidor foi ali tomar um cafezinho ☕ e já tá voltando. Segura mais um pouquinho que é rapidinho.",
    btn: "Beleza",
  },
  invalid: {
    title: "Número inválido",
    body: "Não encontrei um WhatsApp ativo nesse número. Confere os dígitos e tenta com outro — esse aqui já anotei como inválido.",
    btn: "Entendi",
  },
  unverified: {
    title: "Não consegui confirmar",
    body: "Não deu pra verificar seu WhatsApp agora — a linha caiu do nosso lado. Tenta de novo em instantes.",
    btn: "Tentar de novo",
  },
  staff: {
    title: "Acesso em outro ambiente",
    body: "Este número está vinculado a um perfil da equipe. O acesso é feito pelo portal correspondente.",
    btn: "Ir para o portal →",
  },
  otp: {
    title: "Código incorreto",
    body: "Ihh, esse código não bateu. Dá uma conferida no WhatsApp e digita de novo — tô aqui te esperando.",
    btn: "Digitar de novo",
  },
  expired: {
    title: "Esse código venceu ⏳",
    body: "Passou do tempo e o código expirou (segurança é segurança). Já disparei um novinho no seu WhatsApp — é só digitar quando fechar aqui.",
    btn: "Beleza, já vi",
  },
  resent: {
    title: "Código novo a caminho! 🚀",
    body: "Prontinho, mandei um código fresquinho no seu WhatsApp. O anterior não vale mais, tá?",
    btn: "Beleza",
  },
  cpfinvalid: {
    title: "Vamos conferir esse CPF?",
    body: "Os números não fecharam certinho — acontece! Confere com calma e digita de novo, tô aqui pra te ajudar.",
    btn: "Revisar CPF",
  },
  exists: {
    title: "Sua identidade está protegida",
    body: "Encontramos uma conta já vinculada a este CPF. Por segurança, não dá pra continuar com um número de telefone diferente do já cadastrado. Se você trocou de número, a gente te ajuda a recuperar o acesso.",
    btn: "Recuperar acesso",
  },
  support: {
    title: "Falar com o suporte",
    body: "Se você não tem mais acesso ao WhatsApp cadastrado nesse CPF, o suporte resolve rapidinho e com segurança. É só chamar a gente.",
    btn: "Chamar o suporte",
  },
  offline: {
    title: "Cadê a internet? 📡",
    body: "Parece que você tá sem conexão agora. Dá uma olhada no Wi-Fi ou nos dados móveis e tenta de novo.",
    btn: "Tentar de novo",
  },
  success: {
    title: "Deu certo! ✅",
    body: "Tudo certo por aqui — pode seguir tranquilo que o resto é com a gente.",
    btn: "Continuar",
  },
  sessionexpired: {
    title: "Sua sessão expirou",
    body: "Por segurança a gente encerrou sua sessão depois de um tempinho parada. É rapidinho entrar de novo.",
    btn: "Entrar de novo",
  },
};

/** Preços fixos do protótipo — em produção vêm de GET /pricing. */
export const PRICING = {
  pix: "999.00",
  card: { installments: 12, installment: "99.00", total: "1188.00" },
} as const;

export const CHECKOUT_MSGS = [
  "Preparando ambiente seguro…",
  "Conectando ao parceiro de pagamento…",
  "Gerando seu checkout…",
  "Quase tudo pronto…",
] as const;

/** Destinos externos (roteamento de apps — DOCUMENTACAO 2026-07-18). */
export const APP_URL = "https://app.supletivo.net.br";
export const V7M_URL = "https://app.v7m.org";
export const EAD_URL = "https://ead.supletivo.net.br";
export const WHATSAPP_URL = "https://wa.me/5511920062177";

/** Identidade mockada devolvida pela "consulta de CPF" do protótipo. */
export const MOCK_IDENTITY = {
  name: "Maria Aparecida da Silva",
  nameUpper: "MARIA APARECIDA DA SILVA",
  birthYear: 1979,
  /** 0-based: 2 = março */
  birthMonth: 2,
  birthDay: 12,
  sex: "F" as "F" | "M",
};

/** Idade da identidade mockada (nascida em 12/03/1979). */
export function mockAge(now = new Date()): number {
  const beforeBirthday =
    now.getMonth() < MOCK_IDENTITY.birthMonth ||
    (now.getMonth() === MOCK_IDENTITY.birthMonth && now.getDate() < MOCK_IDENTITY.birthDay);
  return now.getFullYear() - MOCK_IDENTITY.birthYear - (beforeBirthday ? 1 : 0);
}

/* ---- matrícula do aluno (pós-pagamento) ---- */

export const E_STAGES = ["e_doc", "e_addr", "e_edu", "e_selfie"] as const;
export type EnrollStage = (typeof E_STAGES)[number];

export type PhotoCtx = "rgfront" | "rgback" | "proof" | "selfie";
export type CamPhase = "camera" | "preview" | "sending";

/* ---- app do aluno (home) ---- */

export type DocStatus = "approved" | "review" | "rejected";

export interface SentDoc {
  key: "rg" | "proof" | "edu" | "selfie";
  label: string;
  status: DocStatus;
  screen: EnrollStage;
}

/** Status dos docs da matrícula na home (mock; em produção vem do backend). */
export const SENT_DOCS: SentDoc[] = [
  { key: "rg", label: "RG", status: "review", screen: "e_doc" },
  { key: "proof", label: "Comprovante", status: "review", screen: "e_addr" },
  { key: "edu", label: "Escolaridade", status: "approved", screen: "e_edu" },
  { key: "selfie", label: "Selfie", status: "review", screen: "e_selfie" },
];

export const DOC_STATUS: Record<
  DocStatus,
  { label: string; pillBg: string; pillColor: string; border: string; tileBg: string }
> = {
  approved: {
    label: "Aprovado",
    pillBg: "var(--color-brand-green-bg)",
    pillColor: "var(--color-brand-green-dark)",
    border: "rgba(0,156,59,0.25)",
    tileBg: "rgba(0,156,59,0.04)",
  },
  review: {
    label: "Em análise",
    pillBg: "var(--color-brand-blue-bg)",
    pillColor: "var(--color-brand-blue)",
    border: "rgba(1,33,105,0.14)",
    tileBg: "rgba(1,33,105,0.03)",
  },
  rejected: {
    label: "Reprovado",
    pillBg: "var(--color-brand-danger-bg)",
    pillColor: "var(--color-brand-danger)",
    border: "rgba(198,40,40,0.3)",
    tileBg: "rgba(198,40,40,0.05)",
  },
};

export const PENDING_DOCS = [
  { key: "historico", label: "Histórico escolar" },
  { key: "certidao", label: "Certidão (nasc./casamento)" },
  { key: "titulo", label: "Título de eleitor" },
  { key: "residencia", label: "Comprovante de residência" },
  { key: "foto", label: "Foto 3×4" },
  { key: "reservista", label: "Reservista", maleOnly: true },
] as const;

/** Mensagens engraçadas do botão "Assistir aula" enquanto a plataforma não libera. */
export const AULA_MSGS = [
  {
    emoji: "🛠️",
    title: "Calma, futuro doutor!",
    body: "Sua sala de aula ainda está sendo montada — a matrícula precisa ser aprovada primeiro. Assim que liberar, seu login e senha caem aqui.",
  },
  {
    emoji: "🐣",
    title: "Ó, quase lá!",
    body: "A plataforma de estudos abre assim que sua matrícula for aprovada. Enquanto isso, capricha nos documentos que falta pouco!",
  },
  {
    emoji: "⏳",
    title: "Ainda não, mas já já!",
    body: "Seu acesso às aulas libera depois que a gente confere seus documentos. Fica de olho — a gente avisa no WhatsApp quando estiver pronto.",
  },
] as const;

/* ---- robô da escolaridade ---- */

export type BotQKey = "q1" | "oops" | "blocked" | "done" | "bye";

export interface BotQuestion {
  text: string;
  hint?: string;
  kind: "input" | "yesno" | "none";
  ph?: string;
  mic?: string;
}

/** Trava: aluno não pode ter concluído o médio / ter superior. */
export const BOT_Q: Record<BotQKey, BotQuestion> = {
  q1: {
    text: "Oi! Fala pra mim: até que ano você estudou?",
    hint: "pode escrever do seu jeito, ex: 'parei na 8ª série'",
    kind: "input",
    ph: "escreva do seu jeito…",
    mic: "parei na 8ª série",
  },
  oops: {
    text: "Hmm, essa parte eu não peguei… me explica de novo?",
    hint: "ex.: 'estudei até a 8ª série' ou 'comecei o médio'",
    kind: "input",
    ph: "escreva do seu jeito…",
    mic: "comecei o médio e parei",
  },
  blocked: {
    text: "Opa! Se você já concluiu, nem precisa de supletivo 😄 Aqui é pra quem ainda vai terminar o Fundamental ou o Médio. Até onde você foi mesmo?",
    hint: "ex.: 'terminei o fundamental' ou 'parei no 1º ano do médio'",
    kind: "input",
    ph: "escreva do seu jeito…",
    mic: "terminei o fundamental",
  },
  done: { text: "Boa! E você chegou a terminar?", kind: "yesno" },
  bye: { text: "Fechou! Já anotei tudo aqui.", kind: "none" },
};

export type BotLevel = "Fundamental" | "Médio" | "Superior" | "Pós ou além";

/** Interpreta a resposta livre do aluno (nível + concluiu?). */
export function parseBotAnswer(raw: string): { level: BotLevel | null; done: boolean | null } {
  const low = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const level: BotLevel | null = /fundamental|primario|ginasio|serie|ano|ensino basico/.test(low)
    ? "Fundamental"
    : /medio|colegial|cientifico/.test(low)
      ? "Médio"
      : /\bpos\b|mestrado|doutorado|mba|especializa/.test(low)
        ? "Pós ou além"
        : /superior|faculdade|univers|gradua|tecnolog/.test(low)
          ? "Superior"
          : null;
  const done = /(parei|nao terminei|larguei|desisti|incompleto|tranquei)/.test(low)
    ? false
    : /(terminei|conclui|completo|formei|formado|formada)/.test(low)
      ? true
      : null;
  return { level, done };
}

/* ---- ferramenta de navegação (protótipo) ---- */

export const SCREEN_LIST: Array<[Screen, string]> = [
  ["check", "Início"],
  ["login", "Login (OTP)"],
  ["cpf", "CPF"],
  ["email", "E-mail"],
  ["planos", "Planos"],
  ["checkout", "Checkout"],
  ["painel", "Painel"],
  ["e_doc", "Aluno · RG"],
  ["e_addr", "Aluno · Endereço"],
  ["e_edu", "Aluno · Escolaridade"],
  ["e_selfie", "Aluno · Selfie"],
  ["e_done", "Aluno · Concluído"],
  ["home", "Aluno · App"],
];

export const SCREEN_NAMES: Record<Screen, string> = {
  check: "Início",
  login: "Login",
  cpf: "CPF",
  email: "E-mail",
  planos: "Planos",
  checkout: "Checkout",
  painel: "Painel",
  e_doc: "RG",
  e_addr: "Endereço",
  e_edu: "Escolaridade",
  e_selfie: "Selfie",
  e_done: "Concluído",
  home: "Aluno · App",
};

/** Gatilhos de teste (sem backend, cada erro tem um valor determinístico). */
export const TRIGGERS: Array<{ k: string; v: string }> = [
  { k: "Número válido → OTP", v: "(11) 91234-5678" },
  { k: "Erro de servidor", v: "termina em 00" },
  { k: "Servidor lento ☕", v: "termina em 11" },
  { k: "Sem internet", v: "termina em 22" },
  { k: "Acesso da equipe", v: "termina em 77" },
  { k: "Já é aluno → app.v7m.org", v: "termina em 33" },
  { k: "WhatsApp não verificado", v: "termina em 88" },
  { k: "Número inválido", v: "termina em 99" },
  { k: "OTP incorreto", v: "000000" },
  { k: "OTP expirado", v: "111111" },
  { k: "CPF inválido", v: "DV errado" },
  { k: "CPF já existe", v: "CPF válido term. em 0" },
  { k: "CPF erro servidor", v: "CPF válido term. em 9" },
  { k: "CPF novo (sucesso)", v: "qualquer CPF válido" },
  { k: "E-mail de outra conta", v: "outro@… ou usado@…" },
  { k: "Checkout com erro", v: "escolher Cartão" },
];
