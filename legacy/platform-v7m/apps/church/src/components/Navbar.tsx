import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

const LINKS = [
  { to: '/', label: 'Início', end: true },
  { to: '/sobre', label: 'Sobre' },
  { to: '/cultos', label: 'Cultos' },
  { to: '/nova-casa', label: 'Nova Casa' },
  { to: '/contato', label: 'Contato' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [openAtPath, setOpenAtPath] = useState<string | null>(null);
  const location = useLocation();
  const open = openAtPath === location.pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header
        className="sticky top-0 z-50 h-[72px] transition-[background-color,border-color,backdrop-filter] [transition-duration:250ms]"
        style={{
          transitionTimingFunction: 'var(--ease-out)',
          backgroundColor: scrolled || open ? 'rgba(11,11,11,0.6)' : 'transparent',
          backdropFilter: scrolled || open ? 'blur(20px) saturate(1.4)' : 'none',
          WebkitBackdropFilter: scrolled || open ? 'blur(20px) saturate(1.4)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(216,207,191,0.08)' : '1px solid transparent',
        }}
      >
        <div className="container-brand flex h-full items-center justify-between">
          <Link to="/" className="flex items-center gap-3" aria-label="IEADPG Jardim Amália — Início">
            <img src="/ieadpg-logo.webp" alt="IEADPG" className="h-9 w-auto" width={72} height={36} />
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-cream-muted sm:block">
              IEADPG · Jardim Amália
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 min-[860px]:flex" aria-label="Navegação principal">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `nav-link relative pb-1 text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'text-gold after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gold'
                      : 'text-cream-2'
                  }`
                }
                style={{ transitionTimingFunction: 'var(--ease-out)' }}
              >
                {l.label}
              </NavLink>
            ))}
            <Link
              to="/contato"
              className="rounded-full border border-gold-dark px-5 py-2 text-sm font-medium text-gold transition-colors duration-200 hover:bg-[rgba(210,178,100,0.1)] active:scale-[0.98]"
              style={{ transitionTimingFunction: 'var(--ease-out)' }}
            >
              Visite-nos
            </Link>
          </nav>

          {/* Hamburger mobile */}
          <button
            type="button"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            onPointerDown={() =>
              setOpenAtPath((path) =>
                path === location.pathname ? null : location.pathname,
              )
            }
            className="relative flex h-10 w-10 items-center justify-center transition-transform duration-100 active:scale-[0.97] min-[860px]:hidden"
          >
            <span
              className={`absolute h-px w-6 bg-cream transition-transform duration-200 ${
                open ? 'rotate-45' : '-translate-y-[4px]'
              }`}
              style={{ transitionTimingFunction: 'var(--ease-out)' }}
            />
            <span
              className={`absolute h-px w-6 bg-cream transition-transform duration-200 ${
                open ? '-rotate-45' : 'translate-y-[4px]'
              }`}
              style={{ transitionTimingFunction: 'var(--ease-out)' }}
            />
          </button>
        </div>
      </header>

      {/* Drawer mobile full-screen */}
      <div
        className={`fixed inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-ink/95 backdrop-blur-xl transition-opacity [transition-duration:350ms] min-[860px]:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ transitionTimingFunction: 'var(--ease-drawer)' }}
        aria-hidden={!open}
      >
        {LINKS.map((l, i) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={() => setOpenAtPath(null)}
            tabIndex={open ? 0 : -1}
            className={({ isActive }) =>
              `font-display py-2 font-medium transition-[transform,opacity,color] [transition-duration:350ms] ${
                isActive ? 'text-gold' : 'text-cream'
              }`
            }
            style={{
              fontSize: 'clamp(2rem, 8vw, 3rem)',
              transitionTimingFunction: 'var(--ease-drawer)',
              transitionDelay: open ? `${i * 50}ms` : '0ms',
              transform: open ? 'translateY(0)' : 'translateY(24px)',
              opacity: open ? 1 : 0,
            }}
          >
            {l.label}
          </NavLink>
        ))}
        <Link
          to="/contato"
          onClick={() => setOpenAtPath(null)}
          tabIndex={open ? 0 : -1}
          className="mt-6 rounded-full border border-gold-dark px-8 py-3 text-sm font-semibold text-gold transition-[transform,opacity,color] [transition-duration:350ms]"
          style={{
            transitionTimingFunction: 'var(--ease-drawer)',
            transitionDelay: open ? `${LINKS.length * 50}ms` : '0ms',
            transform: open ? 'translateY(0)' : 'translateY(24px)',
            opacity: open ? 1 : 0,
          }}
        >
          Visite-nos
        </Link>
      </div>
    </>
  );
}
