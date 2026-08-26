/**
 * Fonte única do FAQ: alimenta o componente <Faq /> e o schema FAQPage (JSON-LD).
 * Regras de copy: sem nome de instituição parceira, sem números de prova social.
 * Ordem: maiores objeções primeiro (medo de golpe e dinheiro).
 */
import { cardLine, pixBRL } from './price';

export interface FaqItem {
  q: string;
  a: string;
}

export const faq: FaqItem[] = [
  {
    q: 'O certificado é reconhecido? Vale em todo o Brasil?',
    a: 'Sim. A certificação é emitida por instituição parceira credenciada ao MEC e tem validade em todo o território nacional, com amparo na Lei nº 9.394/96 (LDB).',
  },
  {
    q: 'Quais são as formas de pagamento?',
    a: `Você pode pagar em ${cardLine} no cartão de crédito ou ${pixBRL} à vista no Pix. A escolha é feita na matrícula, dentro do app. O valor é promocional e pode mudar sem aviso.`,
  },
  {
    q: 'O certificado serve para faculdade, concurso e CNH?',
    a: 'Sim. O certificado de conclusão serve para se matricular em faculdades, prestar concursos públicos, tirar a CNH e comprovar escolaridade no trabalho.',
  },
  {
    q: 'Qual é a idade mínima para fazer o supletivo?',
    a: 'Pela Lei nº 9.394/96 (LDB), a idade mínima é de 15 anos completos para concluir o Ensino Fundamental e de 18 anos completos para o Ensino Médio.',
  },
  {
    q: 'Em quanto tempo consigo terminar?',
    a: 'Depende do seu ritmo. Você estuda 100% online, nos horários que tiver, e marca a prova final presencial quando se sentir preparado. Quanto mais constância nos estudos, mais cedo você chega ao certificado.',
  },
  {
    q: 'Como são as provas?',
    a: 'A prova final é presencial: você escolhe um dos nossos polos e o dia que quiser. É nesse encontro que você assina a documentação que é enviada à Secretaria de Educação do estado — esse passo oficial é o que dá validade ao seu certificado. Todo o estudo até lá é online, no seu ritmo.',
  },
  {
    q: 'Preciso de computador para estudar?',
    a: 'Para estudar, não: a matrícula e todo o conteúdo funcionam pelo celular (também dá para usar computador ou tablet). Só a prova final é presencial, em um dos nossos polos.',
  },
  {
    q: 'Posso fazer o Ensino Fundamental e o Médio no mesmo lugar?',
    a: 'Sim. O Supletivo Brasil atende às duas etapas da EJA: você conclui o Ensino Fundamental e depois segue direto para o Ensino Médio, estudando 100% online em ambas.',
  },
  {
    q: 'Como faço para me matricular agora?',
    a: 'É só tocar no botão "Quero meu diploma" aqui da página: você cai direto no app de matrícula, faz o cadastro pelo celular em poucos minutos e escolhe a forma de pagamento (12x no cartão ou Pix).',
  },
];
