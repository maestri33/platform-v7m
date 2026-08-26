/**
 * Fonte única do FAQ: alimenta o componente <Faq /> e o schema FAQPage (JSON-LD).
 * Regras de copy: nada de promessa de "renda garantida"; só a mecânica real.
 * Ordem: maiores objeções primeiro (custo, como/quando recebe).
 *
 * `cat` (categoria) é usado pelo filtro de chips no <Faq />. Quatro categorias
 * cobrem as quatro dúvidas que a pessoa chega com: "isso é pra mim?",
 * "como recebo?", "o que eu indico?", "como faço pra entrar?".
 */
import { COMMISSION_DIRECT, BONUS_FLAT, BONUS_THRESHOLD, BONUS_REPEATS, CLOSING_LABEL, brl } from '../config';

export type FaqCategory = 'trabalho' | 'pagamento' | 'produto' | 'cadastro';

export const FAQ_CATEGORIES: { id: FaqCategory; label: string }[] = [
  { id: 'trabalho', label: 'Sobre o trabalho' },
  { id: 'pagamento', label: 'Sobre o pagamento' },
  { id: 'produto', label: 'Sobre o produto' },
  { id: 'cadastro', label: 'Cadastro' },
];

export interface FaqItem {
  q: string;
  a: string;
  cat: FaqCategory;
}

const bonusFrase = BONUS_REPEATS
  ? `${brl(BONUS_FLAT)} de bônus a cada ${BONUS_THRESHOLD} matrículas pagas na mesma semana`
  : `${brl(BONUS_FLAT)} de bônus ao atingir ${BONUS_THRESHOLD} matrículas pagas na semana (bônus único por semana, não acumula)`;

export const faq: FaqItem[] = [
  {
    q: 'Preciso pagar alguma coisa para ser promotor?',
    a: 'Não. Entrar é de graça e você nunca paga nada para ser promotor. Quem se inscreve são as pessoas que você indica — e é a matrícula delas que gera a sua comissão.',
    cat: 'trabalho',
  },
  {
    q: 'Isso não é pirâmide?',
    a: 'Não. Pirâmide não tem produto e paga por recrutar gente. Aqui é o contrário: existe um curso real (o supletivo) que a pessoa estuda e conclui, e você ganha por indicar a matrícula dele — nunca por trazer outros promotores.',
    cat: 'trabalho',
  },
  {
    q: 'Preciso vender, ter estoque ou investir em alguma coisa?',
    a: 'Não. Não tem estoque, não tem mensalidade e você não vende nada. Você só compartilha o seu link com quem quer estudar; quem se matricula e paga é a pessoa.',
    cat: 'trabalho',
  },
  {
    q: 'Preciso acompanhar o aluno depois que ele se matricula?',
    a: 'Não. Sua parte termina quando a pessoa paga a matrícula. O acompanhamento do estudo é com a equipe do polo, não com você.',
    cat: 'trabalho',
  },
  {
    q: 'Funciona para qualquer pessoa?',
    a: 'Funciona melhor para quem conhece gente que quer voltar a estudar ou terminar o ensino médio. Se ninguém da sua rede tem esse perfil, o ganho pode ser baixo — não é renda garantida, é comissão por matrícula paga.',
    cat: 'trabalho',
  },
  {
    q: 'Como eu recebo?',
    a: `Por Pix, ${CLOSING_LABEL}, de forma automática. O fechamento da semana soma suas comissões e o valor cai direto na sua chave Pix — a mesma que você cadastra e que é validada no banco.`,
    cat: 'pagamento',
  },
  {
    q: 'Quando começo a ganhar?',
    a: 'Assim que alguém que você indicou paga a matrícula. A comissão é sua a partir daí — você não precisa acompanhar o aluno depois disso.',
    cat: 'pagamento',
  },
  {
    q: 'Quanto eu ganho por indicação?',
    a: `Você recebe ${brl(COMMISSION_DIRECT)} por cada matrícula paga que vier do seu link, mais ${bonusFrase}. Os valores podem mudar; sempre valem os do seu painel.`,
    cat: 'pagamento',
  },
  {
    q: 'Que curso a pessoa compra com o meu link?',
    a: 'O supletivo da V7M (EJA): um curso online para concluir o ensino fundamental ou o médio e tirar o certificado, válido em todo o Brasil, emitido por instituição parceira credenciada e amparado pela LDB (Lei nº 9.394/96). A pessoa estuda pelo celular, no ritmo dela. Ou seja: você indica um produto de verdade, não "só um link".',
    cat: 'produto',
  },
  {
    q: 'O curso vale a pena para quem se matricula?',
    a: 'Vale para quem precisa terminar os estudos: é online, a pessoa estuda pelo celular no próprio ritmo (só a prova final é presencial), e o certificado serve para faculdade, concurso, tirar a CNH e comprovar escolaridade. Você indica com tranquilidade porque a pessoa também sai ganhando.',
    cat: 'produto',
  },
  {
    q: 'Como eu faço login? Tem senha?',
    a: 'Não tem senha. Você entra com um código que chega no seu WhatsApp (login por OTP). É mais simples e mais seguro do que decorar senha.',
    cat: 'cadastro',
  },
  {
    q: 'Por que pedem documento, selfie e chave Pix?',
    a: 'Para garantir que o dinheiro vai para a pessoa certa e manter o programa sério. Sua chave Pix é validada de verdade no banco (precisa estar no seu CPF), o documento e a selfie confirmam que é você mesmo.',
    cat: 'cadastro',
  },
  {
    q: 'Quanto tempo leva para ser aprovado?',
    a: 'É rápido, mas tem um filtro: cadastro pelo celular, um treininho rápido online (com correção na hora) e uma conversa com o coordenador do polo. Aprovado, seu link é liberado na hora.',
    cat: 'cadastro',
  },
  {
    q: 'Posso perder o cadastro?',
    a: 'Pode. Condutas que violam as regras do programa (fraude, indicação falsa, abuso) podem suspender o seu acesso e travar o seu link. Jogando limpo, não tem com o que se preocupar.',
    cat: 'cadastro',
  },
];
