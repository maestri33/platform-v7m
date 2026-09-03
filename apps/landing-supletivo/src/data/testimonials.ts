export type Testimonial = {
  quote: string;
  name: string;
  designation: string;
  badge?: string;
  outcome?: string;
  src: string;
};

export const testimonialsSupletivo: Testimonial[] = [
  {
    quote:
      "Trabalhei quase 20 anos na construção civil e perdi várias chances de promoção por não ter o Ensino Médio. Consegui estudar à noite no meu ritmo, direto pelo celular. Assim que peguei meu certificado oficial publicado e reconhecido, fui promovido a encarregado geral com 60% de aumento. Mudou a vida da minha família.",
    name: "Reginaldo dos Santos",
    designation: "42 anos · São Paulo - SP",
    badge: "Encarregado de Obras",
    outcome: "+60% de renda e liderança de equipe",
    src: "/images/testimonials/reginaldo.png",
  },
  {
    quote:
      "Parei os estudos na adolescência para criar meus dois filhos e achava que nunca realizaria o sonho do diploma universitário. A flexibilidade dos estudos me deu a segurança que eu precisava. O certificado foi aceito de primeira no vestibular e hoje estou no 3º semestre da faculdade de Enfermagem.",
    name: "Claudia Ferreira da Silva",
    designation: "34 anos · Belo Horizonte - MG",
    badge: "Estudante Universitária",
    outcome: "Aprovada no Vestibular de Enfermagem",
    src: "/images/testimonials/claudia.png",
  },
  {
    quote:
      "Fazia mais de 12 horas por dia como motorista de aplicativo buscando estabilidade para o futuro. Quando saiu o concurso da prefeitura, vi minha grande chance. Concluí as matérias com agilidade, apresentei o certificado na posse e hoje sou servidor público concursado.",
    name: "Marcos Vinícius de Oliveira",
    designation: "29 anos · Salvador - BA",
    badge: "Servidor Público Concursado",
    outcome: "Aprovado e Empossado em Concurso",
    src: "/images/testimonials/marcos.png",
  },
  {
    quote:
      "Sentia uma trava profissional enorme por não ter concluído os estudos na juventude. Quando abriram vaga de supervisão na empresa, o Ensino Médio era exigência básica. Estudei nos meus horários livres, regularizei minha situação escolar e conquistei a gerência do setor.",
    name: "Luciana Mendes",
    designation: "47 anos · Curitiba - PR",
    badge: "Supervisora Comercial",
    outcome: "Promovida a Gestão de Setor",
    src: "/images/testimonials/luciana.png",
  },
  {
    quote:
      "Fiz um curso técnico mas não conseguia emitir minha carteira do conselho de classe porque faltava o certificado do Ensino Médio. Em poucos meses resolvi a pendência, dei entrada no meu registro profissional e dobrei meus contratos de prestação de serviços.",
    name: "Edson Moreira",
    designation: "36 anos · Goiânia - GO",
    badge: "Técnico em Eletrotécnica",
    outcome: "Registro Profissional Homologado",
    src: "/images/testimonials/edson.png",
  },
];
