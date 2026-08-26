import { DizimoCapture } from '../components/dizimo';
import { httpDizimoApi } from '../api/httpDizimoApi';
import { Flame } from 'lucide-react';

/**
 * Página fina de dízimo — composição simples.
 * O componente `DizimoCapture` é auto-contido, isolado, e pode ser
 * embedado em qualquer rota.
 */
export default function Dizimo() {
  return (
    <div className="relative">
      {/* Hero enxuto */}
      <section className="border-b border-gold/10 bg-ink-warm py-16 sm:py-20">
        <div className="container-brand flex flex-col items-center gap-4 text-center">
          <span className="flex items-center gap-2 eyebrow">
            <Flame className="h-3.5 w-3.5" aria-hidden />
            Contribuição
          </span>
          <h1 className="font-display fs-h1 text-cream">
            Dízimo e ofertas
          </h1>
          <p className="fs-lead max-w-2xl text-cream-2">
            Sua generosidade sustenta a obra da nossa igreja. Cada contribuição
            é uma semente de fé — e cada semente é cuidada com responsabilidade
            e oração.
          </p>
        </div>
      </section>

      {/* Componente principal */}
      <section className="bg-ink py-16 sm:py-20">
        <div className="container-brand">
          <DizimoCapture apiClient={httpDizimoApi} />
        </div>
      </section>
    </div>
  );
}
