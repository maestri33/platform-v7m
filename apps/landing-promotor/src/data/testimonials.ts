export type Testimonial = {
  quote: string;
  name: string;
  designation: string;
  badge?: string;
  outcome?: string;
  src: string;
};

export const testimonialsPromotor: Testimonial[] = [
  {
    quote:
      "Eu precisava de uma renda extra para ajudar nas contas de casa e não tinha tempo para um segundo emprego fixo. Com o programa de promotores do Maestri.group, comecei indicando para pessoas do meu bairro e do meu círculo de amizades que não tinham o ensino médio. Na minha primeira semana recebi R$ 300 direto no Pix. Hoje tiro em média R$ 1.500 por mês trabalhando só pelo celular nos meus horários livres.",
    name: "Juliana Camargo",
    designation: "31 anos · Campinas - SP",
    badge: "Promotora Ouro",
    outcome: "R$ 1.800+ recebidos no Pix no último mês",
    src: "/images/testimonials/claudia.png",
  },
  {
    quote:
      "Sou estudante de Administração e buscava algo prático para conciliar com as aulas. Indicar o supletivo é gratificante porque você realmente ajuda a pessoa a mudar de vida tirando o diploma oficial do MEC. As comissões caem certinho toda semana na minha conta. Já indiquei mais de 35 alunos.",
    name: "Rodrigo Alencar",
    designation: "24 anos · Curitiba - PR",
    badge: "Embaixador Diamante",
    outcome: "Mais de 35 matrículas pagas indicadas",
    src: "/images/testimonials/marcos.png",
  },
  {
    quote:
      "Trabalho no comércio e vejo muita gente boa perdendo vaga de emprego porque não terminou o fundamental ou o médio. Quando apresento o supletivo do Maestri.group, as pessoas se sentem seguras pelo credenciamento oficial. O suporte ao promotor é nota dez e os pagamentos via Pix são pontuais.",
    name: "Patrícia Nogueira",
    designation: "39 anos · Rio de Janeiro - RJ",
    badge: "Promotora Pro",
    outcome: "Média de R$ 400 por semana no Pix",
    src: "/images/testimonials/luciana.png",
  },
  {
    quote:
      "Eu era cético no começo, achei que fosse promessa de internet. Mas entrei sem pagar um centavo, peguei meu link exclusivo e compartilhei nos grupos da igreja e da comunidade. Em três dias duas pessoas se matricularam e o dinheiro caiu na sexta-feira. Não largo mais!",
    name: "Carlos Eduardo Santos",
    designation: "45 anos · Salvador - BA",
    badge: "Promotor Ouro",
    outcome: "Comissões pagas toda sexta-feira",
    src: "/images/testimonials/reginaldo.png",
  },
];
