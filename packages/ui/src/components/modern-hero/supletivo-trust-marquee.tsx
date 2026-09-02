'use client';

import React from 'react';
import {
  Award,
  Smartphone,
  GraduationCap,
  Clock,
  ShieldCheck,
  Building2,
  CalendarCheck,
  CreditCard,
} from 'lucide-react';
import './modern-hero.css';

export interface SupletivoTrustBadgeItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  gradientStyle: React.CSSProperties;
}

export const SUPLETIVO_TRUST_BADGES: SupletivoTrustBadgeItem[] = [
  {
    id: 'mec',
    title: 'Validade MEC',
    subtitle: 'Certificado Nacional',
    icon: Award,
    gradientStyle: {
      background: 'radial-gradient(circle, rgba(0, 115, 77, 0.28) 0%, rgba(255, 196, 0, 0.1) 70%, transparent 100%)',
    },
  },
  {
    id: 'online',
    title: '100% Online',
    subtitle: 'Estude no Celular',
    icon: Smartphone,
    gradientStyle: {
      background: 'radial-gradient(circle, rgba(0, 39, 118, 0.25) 0%, rgba(59, 130, 246, 0.08) 70%, transparent 100%)',
    },
  },
  {
    id: 'fundamental-medio',
    title: 'Fund. e Médio',
    subtitle: 'EJA Autorizada',
    icon: GraduationCap,
    gradientStyle: {
      background: 'radial-gradient(circle, rgba(147, 51, 234, 0.22) 0%, rgba(236, 72, 153, 0.08) 70%, transparent 100%)',
    },
  },
  {
    id: 'sem-sala',
    title: 'Sem Sala de Aula',
    subtitle: 'No seu Ritmo',
    icon: Clock,
    gradientStyle: {
      background: 'radial-gradient(circle, rgba(234, 88, 12, 0.22) 0%, rgba(251, 146, 60, 0.08) 70%, transparent 100%)',
    },
  },
  {
    id: 'garantia',
    title: 'Garantia 7 Dias',
    subtitle: 'Risco Zero',
    icon: ShieldCheck,
    gradientStyle: {
      background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(34, 197, 94, 0.08) 70%, transparent 100%)',
    },
  },
  {
    id: 'concursos',
    title: 'Faculdade & Concursos',
    subtitle: 'Validade Total',
    icon: Building2,
    gradientStyle: {
      background: 'radial-gradient(circle, rgba(14, 165, 233, 0.25) 0%, rgba(6, 182, 212, 0.08) 70%, transparent 100%)',
    },
  },
  {
    id: 'ritmo',
    title: 'Conclusão Rápida',
    subtitle: 'Você dita o tempo',
    icon: CalendarCheck,
    gradientStyle: {
      background: 'radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(168, 85, 247, 0.08) 70%, transparent 100%)',
    },
  },
  {
    id: 'pagamento',
    title: '12x no Cartão / Pix',
    subtitle: 'Matrícula Acessível',
    icon: CreditCard,
    gradientStyle: {
      background: 'radial-gradient(circle, rgba(245, 158, 11, 0.28) 0%, rgba(255, 196, 0, 0.1) 70%, transparent 100%)',
    },
  },
];

interface SupletivoTrustMarqueeProps {
  badges?: SupletivoTrustBadgeItem[];
  speedSeconds?: number;
  className?: string;
}

export const SupletivoTrustMarquee: React.FC<SupletivoTrustMarqueeProps> = ({
  badges = SUPLETIVO_TRUST_BADGES,
  speedSeconds = 32,
  className = '',
}) => {
  const loopBadges = [...badges, ...badges];

  return (
    <div className={`v7m-marquee-scroller-wrap ${className}`}>
      <div className="v7m-marquee-track" style={{ animationDuration: `${speedSeconds}s` }}>
        {loopBadges.map((item, idx) => {
          const IconComponent = item.icon;
          return (
            <div key={`${item.id}-${idx}`} className="v7m-marquee-card">
              {/* Radial gradient background scale + opacity hover effect */}
              <div className="v7m-marquee-glow" style={item.gradientStyle} />

              {/* Badge Icon */}
              <div className="v7m-marquee-icon-box">
                <IconComponent className="w-5 h-5" />
              </div>

              {/* Badge Text */}
              <div className="v7m-marquee-text-box">
                <span className="v7m-marquee-card-title">{item.title}</span>
                <span className="v7m-marquee-card-subtitle">{item.subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
