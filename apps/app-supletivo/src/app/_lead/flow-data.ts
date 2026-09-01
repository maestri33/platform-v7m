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
  | "painel";

/**
 * Rotas do funil: cada passo tem URL própria.
 */
export const SCREEN_ROUTES: Record<Screen, string> = {
  check: "/",
  login: "/login",
  cpf: "/cpf",
  email: "/email",
  planos: "/planos",
  checkout: "/checkout",
  painel: "/painel",
};

/** Inverso de SCREEN_ROUTES: pathname → tela (p/ sincronizar URL → máquina). */
export const ROUTE_SCREENS: Record<string, Screen> = Object.fromEntries(
  Object.entries(SCREEN_ROUTES).map(([screen, route]) => [route, screen as Screen]),
) as Record<string, Screen>;

/** Ordem canônica dos passos — só p/ direção da transição (índice menor = voltar). */
export const FUNNEL_ORDER: Screen[] = [
  "check",
  "login",
  "cpf",
  "email",
  "planos",
  "checkout",
  "painel",
];

// E-mail NÃO tem modal de erro (DOCUMENTACAO §216-217): outra conta vira o
// estado-escudo inline da tela e formato inválido vira shake + hint no campo.
export type ModalKind =
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
  | "sessionexpired"
  | "docerror";

export interface ModalCopy {
  title: string;
  body: string;
  btn: string;
}

export const MODALS: Record<ModalKind, ModalCopy> = {
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
    body: "Encontramos uma conta já vinculada a este CPF. Por segurança, não dá pra continuar com um número de telefone diferente do já cadastrado. Se você trocou de número, a gente te ajuda a recuperar o acesso. Já desfizemos o cadastro deste número automaticamente.",
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
  docerror: {
    title: "Não deu pra usar esse arquivo",
    body: "Tenta de novo com uma imagem nítida ou um PDF.",
    btn: "Tentar de novo",
  },
};

/**
 * Fallback de preços (valores do protótipo). A vitrine REAL vem de GET /pricing
 * (`runPricing`) e substitui isto em `FlowState.pricing` assim que responde —
 * isto só aparece se a vitrine estiver fora do ar (e no mock de build).
 */
export const PRICING = {
  pix: "1.00",
  card: { installments: 12, installment: "0.08", total: "1.00" },
} as const;

export const CHECKOUT_MSGS = [
  "Preparando ambiente seguro…",
  "Conectando ao parceiro de pagamento…",
  "Gerando seu checkout…",
  "Quase tudo pronto…",
] as const;

/** Destinos externos (roteamento de apps — DOCUMENTACAO 2026-07-18). */
export const APP_URL = "https://app.supletivo.net.br";
export const V7M_URL = "https://app.maestri.group";
export const EAD_URL = "https://app.supletivo.net.br";
export const WHATSAPP_URL = "https://wa.me/5511912345678";

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

/**
 * Idade a partir do `birth_date` (ISO YYYY-MM-DD) que o passo 3 devolve. Sem data, ou com
 * data que não faz sentido, devolve null — e o pergaminho omite a linha "Depois de N anos"
 * em vez de estampar "Depois de NaN anos" na única tela que precisa soar como documento.
 *
 * Lê a data pelos números, sem `new Date(iso)`: a string sem fuso é interpretada como UTC,
 * e num fuso negativo como o nosso isso recua um dia — o que muda a idade de quem faz
 * aniversário hoje.
 */
export function ageFromIso(iso: string | null | undefined, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const beforeBirthday =
    now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day);
  const age = now.getFullYear() - year - (beforeBirthday ? 1 : 0);
  return age >= 0 && age < 130 ? age : null;
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
];

export const SCREEN_NAMES: Record<Screen, string> = {
  check: "Início",
  login: "Login",
  cpf: "CPF",
  email: "E-mail",
  planos: "Planos",
  checkout: "Checkout",
  painel: "Painel",
};

/** Gatilhos de teste (sem backend, cada erro tem um valor determinístico). */
export const TRIGGERS: Array<{ k: string; v: string }> = [
  { k: "Número válido → OTP", v: "(11) 91234-5678" },
  { k: "Erro de servidor", v: "termina em 00" },
  { k: "Servidor lento ☕", v: "termina em 11" },
  { k: "Sem internet", v: "termina em 22" },
  { k: "Acesso da equipe", v: "termina em 77" },
  { k: "Já é aluno → app.supletivo.net.br", v: "termina em 33" },
  { k: "WhatsApp não verificado", v: "termina em 88" },
  { k: "Número inválido", v: "termina em 99" },
  { k: "OTP incorreto", v: "000000" },
  { k: "OTP expirado", v: "111111" },
  { k: "CPF inválido", v: "DV errado" },
  { k: "CPF já existe", v: "CPF válido term. em 0" },
  { k: "CPF erro servidor", v: "CPF válido term. em 9" },
  { k: "CPF novo (sucesso)", v: "qualquer CPF válido" },
  { k: "E-mail de outra conta", v: "outro@… ou usado@…" },
  { k: "E-mail já seu (mesmo CPF)", v: "mesmo@…" },
  { k: "Sugestão de domínio", v: "…@gmial.com ou …@g" },
  { k: "E-mail temporário", v: "…@mailinator.com" },
  { k: "Checkout com erro", v: "escolher Cartão" },
];
