/**
 * Navegação para checkout hospedado (cartão de crédito).
 * Provider-agnostic — implementação default usa `globalThis.location.assign`,
 * mas pode ser sobrescrita via `DizimoCapture.navigateToHostedCheckout`.
 *
 * Por que isolated em `lib/`:
 * - Permite SSR/Next.js usar `next/navigation` no lugar de `location.assign`.
 * - Permite testes stubarem a navegação sem monkey-patch de `globalThis`.
 * - Centraliza a regra "só navega para HTTPS ou caminho da mesma origem" (o
 *   adapter já valida a URL via zod, mas este seam é o ponto único de saída).
 */

export function defaultNavigateToHostedCheckout(redirectUrl: string): void {
  globalThis.location.assign(redirectUrl);
}

export type HostedCheckoutNavigator = (redirectUrl: string) => void;
