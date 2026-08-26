import { Link } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';

const MAPS_URL = 'https://maps.app.goo.gl/nKgD83xmGetsyDzKA';
const WHATSAPP_URL = 'https://wa.me/5542999384069';

export default function Footer() {
  const reduce = useReducedMotion();
  return (
    <motion.footer
      className="border-t border-[rgba(210,178,100,0.15)] bg-ink-warm"
      initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(24px)' }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)' }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: reduce ? 0.2 : 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="container-brand pb-12 pt-24">
        <div className="grid gap-12 md:grid-cols-3 md:gap-8">
          {/* Marca */}
          <div>
            <div className="flex items-center gap-3">
              <img src="/flame.webp" alt="" className="h-10 w-auto" width={25} height={40} />
              <span className="font-display text-2xl font-medium text-cream">IEADPG Jardim Amália</span>
            </div>
            <p className="mt-4 max-w-[32ch] text-sm leading-relaxed text-cream-muted">
              Uma família vivendo a unidade em amor.
            </p>
          </div>

          {/* Cultos */}
          <div>
            <h3 className="eyebrow mb-5">Cultos</h3>
            <ul className="space-y-3">
              <li>
                <span className="font-display text-lg font-semibold text-gold">Domingo · 19h</span>
                <span className="ml-2 text-sm text-cream-muted">— Celebração</span>
              </li>
              <li>
                <span className="font-display text-lg font-semibold text-gold">Quarta · 20h</span>
                <span className="ml-2 text-sm text-cream-muted">— Alinhamento</span>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="eyebrow mb-5">Contato</h3>
            <ul className="space-y-3 text-sm text-cream-2">
              <li>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-2 transition-colors duration-200 hover:text-gold"
                >
                  <img src="/icon-pin.svg" alt="" className="mt-0.5 h-4 w-4 shrink-0" />
                  Rua Paulina Oliveira Gomes, 1071 — Jardim Amália, Ponta Grossa/PR
                </a>
              </li>
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 transition-colors duration-200 hover:text-gold"
                >
                  <img src="/icon-whatsapp.svg" alt="" className="h-4 w-4 shrink-0" />
                  +55 42 99938-4069
                </a>
              </li>
            </ul>
            <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-cream-muted" aria-label="Rodapé">
              <Link to="/sobre" className="transition-colors duration-200 hover:text-gold">Sobre</Link>
              <Link to="/cultos" className="transition-colors duration-200 hover:text-gold">Cultos</Link>
              <Link to="/nova-casa" className="transition-colors duration-200 hover:text-gold">Nova Casa</Link>
              <Link to="/contato" className="transition-colors duration-200 hover:text-gold">Contato</Link>
            </nav>
          </div>
        </div>

        <div className="mt-16">
          <p className="text-center font-display text-lg italic text-cream-muted">
            “Acima de tudo, revistam-se do amor.” — Colossenses 3:14
          </p>
          <div className="hairline mx-auto mt-8 max-w-md" />
          <p className="mt-6 text-center text-xs uppercase tracking-[0.2em] text-cream-muted">
            © {new Date().getFullYear()} IEADPG · Igreja Evangélica Assembleia de Deus · Ponta Grossa/PR
          </p>
        </div>
      </div>
    </motion.footer>
  );
}
