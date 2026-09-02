import { test as setup } from "@playwright/test";

/**
 * Aquecimento do dev server (projeto-dependência, roda ANTES da suíte).
 *
 * Turbopack compila rota sob demanda; a PRIMEIRA visita a cada uma dispara o
 * compile e o client pode receber full-reload no meio de um teste paralelo —
 * timer de 2,2s do modal "client" morre, estado zera, teste flaka. Visitar
 * tudo aqui garante que a suíte roda contra um server 100% quente.
 */
// `/matricula` e `/aluno` entram na lista desde a tela 2: o login roteia por role e os testes
// do re-login aterrissam neles — compilar sob demanda no meio do teste dá o mesmo flake.
const ROTAS = [
  "/healthz",
  "/",
  "/login",
  "/cpf",
  "/email",
  "/planos",
  "/checkout",
  "/painel",
  "/matricula",
  "/matricula/rg",
  "/aluno",
];

setup("aquece todas as rotas do funil", async ({ request }) => {
  setup.setTimeout(120_000); // primeira compilação de tudo pode ser lenta no CI
  for (const rota of ROTAS) {
    await request.get(rota).catch(() => {
      /* aquecimento é best-effort: rota nova quebrada vai falhar ALTO no teste dela */
    });
  }
});
