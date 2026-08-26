import { motion, useReducedMotion } from 'framer-motion';
import BlurText from './BlurText';

const EASE_OUT = [0.23, 1, 0.32, 1] as [number, number, number, number];

type Props = {
  eyebrow: string;
  title: string;
  lead?: string;
  align?: 'center' | 'left';
  eyebrowClassName?: string;
};

/** Padrão de abertura de seção: ornamento + eyebrow BlurText + H2 BlurText (design.md §5.4) */
export default function SectionHeader({ eyebrow, title, lead, align = 'center', eyebrowClassName = '' }: Props) {
  const alignCls = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const reduce = useReducedMotion();
  return (
    <div className={`flex flex-col gap-5 ${alignCls}`}>
      <div className="flex items-center gap-4">
        {/* Ornamento: hairline 48px gold-dark + losango 6px gold */}
        <motion.span
          className="block h-px w-12 bg-gold-dark"
          style={{ transformOrigin: 'center' }}
          initial={reduce ? { opacity: 0 } : { transform: 'scaleX(0)' }}
          whileInView={reduce ? { opacity: 1 } : { transform: 'scaleX(1)' }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: reduce ? 0.2 : 0.4, ease: EASE_OUT }}
          aria-hidden
        />
        <motion.span
          className="block h-1.5 w-1.5 rotate-45 bg-gold"
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'rotate(0deg) scale(0.9)' }}
          whileInView={reduce ? { opacity: 1 } : { opacity: 1, transform: 'rotate(45deg) scale(1)' }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: reduce ? 0.2 : 0.4, delay: reduce ? 0 : 0.1, ease: EASE_OUT }}
          aria-hidden
        />
        <BlurText
          text={eyebrow}
          animateBy="words"
          delay={60}
          stepDuration={0.35}
          easing={EASE_OUT}
          threshold={0.2}
          className={`eyebrow ${align === 'center' ? 'justify-center' : ''} ${eyebrowClassName}`}
          animationFrom={{ filter: 'blur(6px)', opacity: 0, y: 8 }}
          animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
        />
      </div>
      <BlurText
        text={title}
        animateBy="words"
        delay={80}
        stepDuration={0.5}
        easing={EASE_OUT}
        threshold={0.2}
        className={`fs-h2 font-display font-medium text-cream ${align === 'center' ? 'justify-center' : ''}`}
        animationFrom={{ filter: 'blur(10px)', opacity: 0, y: 16 }}
        animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
      />
      {lead && <p className="fs-lead max-w-[52ch] text-cream-muted">{lead}</p>}
    </div>
  );
}
