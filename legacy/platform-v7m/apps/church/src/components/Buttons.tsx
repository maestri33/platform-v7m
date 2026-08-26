import type { ReactNode } from 'react';
import { Link } from 'react-router';
import ClickSpark from './ClickSpark';
import StarBorder from './StarBorder';

type CommonProps = {
  to: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
};

function useLinkProps(to: string, external?: boolean) {
  if (external || to.startsWith('http')) {
    return { as: 'a' as const, href: to, target: '_blank' as const, rel: 'noreferrer' };
  }
  return null;
}

/** Botão primário ouro (design.md §5.3): pill, fundo --gold, texto #0B0B0B Inter 600 14px */
export function PrimaryButton({ to, children, className = '', external }: CommonProps) {
  const inner = (
    <span className="block rounded-full bg-gold px-8 py-3.5 text-sm font-semibold text-ink transition-[background-color,box-shadow,transform] duration-200 hover:bg-gold-light hover:shadow-[0_0_32px_rgba(230,210,130,0.25)] active:scale-[0.97]">
      {children}
    </span>
  );
  const body = <ClickSpark sparkColor="#E6D282" sparkCount={8} sparkRadius={24}>{inner}</ClickSpark>;
  const ext = useLinkProps(to, external);
  if (ext) {
    return (
      <a href={ext.href} target={ext.target} rel={ext.rel} className={`inline-block ${className}`}>
        {body}
      </a>
    );
  }
  return (
    <Link to={to} className={`inline-block ${className}`}>
      {body}
    </Link>
  );
}

/** Primário destaque envolto em StarBorder (hero home + Nova Casa) */
export function StarButton({
  to,
  children,
  className = '',
  external,
  starColor = '#D2B264',
  sparkColor = '#E6D282',
}: CommonProps & { starColor?: string; sparkColor?: string }) {
  const star = (
    <StarBorder
      as="span"
      color={starColor}
      speed="5s"
      thickness={1}
      className="rounded-full"
      innerClassName="rounded-full border-transparent"
    >
      <span className="block rounded-full bg-gold px-8 py-3.5 text-sm font-semibold text-ink transition-[background-color,box-shadow,transform] duration-200 hover:bg-gold-light hover:shadow-[0_0_32px_rgba(230,210,130,0.25)] active:scale-[0.97]">
        {children}
      </span>
    </StarBorder>
  );
  const body = <ClickSpark sparkColor={sparkColor} sparkCount={8} sparkRadius={24}>{star}</ClickSpark>;
  const ext = useLinkProps(to, external);
  if (ext) {
    return (
      <a href={ext.href} target={ext.target} rel={ext.rel} className={`inline-block ${className}`}>
        {body}
      </a>
    );
  }
  return (
    <Link to={to} className={`inline-block ${className}`}>
      {body}
    </Link>
  );
}

/** Botão secundário ghost: pill, borda 1px --gold-dark, texto --gold */
export function GhostButton({ to, children, className = '', external }: CommonProps) {
  const cls = `inline-block rounded-full border border-gold-dark px-8 py-3.5 text-sm font-semibold text-gold transition-[background-color,transform] duration-200 hover:bg-[rgba(210,178,100,0.08)] active:scale-[0.98] ${className}`;
  const ext = useLinkProps(to, external);
  if (ext) {
    return (
      <a href={ext.href} target={ext.target} rel={ext.rel} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={cls}>
      {children}
    </Link>
  );
}

/** Terciário: link seta — Inter 600 14px gold + → */
export function ArrowLink({ to, children, className = '', external }: CommonProps) {
  const inner = (
    <>
      <span>{children}</span>
      <span
        aria-hidden
        className="arrow-link-icon inline-block transition-transform duration-200"
        style={{ transitionTimingFunction: 'var(--ease-out)' }}
      >
        →
      </span>
    </>
  );
  const cls = `arrow-link inline-flex items-center gap-1.5 text-sm font-semibold text-gold ${className}`;
  const ext = useLinkProps(to, external);
  if (ext) {
    return (
      <a href={ext.href} target={ext.target} rel={ext.rel} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  );
}
