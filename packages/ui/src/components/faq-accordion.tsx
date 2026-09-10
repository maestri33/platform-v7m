import React from 'react';

export interface FaqAccordionItemProps
  extends Omit<React.DetailsHTMLAttributes<HTMLDetailsElement>, 'style'> {
  question: string;
  answer: string | React.ReactNode;
  brand?: 'supletivo' | 'promotor';
  className?: string;
  style?: React.CSSProperties | string | any;
}

function parseStyleProp(style: React.CSSProperties | string | undefined): React.CSSProperties | undefined {
  if (!style) return undefined;
  if (typeof style === 'object') return style;
  if (typeof style === 'string') {
    const obj: Record<string, string> = {};
    for (const rule of style.split(';')) {
      const trimmed = rule.trim();
      if (!trimmed) continue;
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.slice(0, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();
        obj[key] = value;
      }
    }
    return obj as React.CSSProperties;
  }
  return undefined;
}

/**
 * Item de FAQ / Acordeão baseado em <details>/<summary> nativos.
 * 100% acessível, funciona com Zero-JS na thread principal,
 * suporta animação suave do chevron via CSS puro e temas do Design System V7M.
 */
export function FaqAccordionItem({
  question,
  answer,
  brand = 'supletivo',
  className = '',
  style,
  children,
  ...detailsProps
}: FaqAccordionItemProps) {
  const resolvedStyle = parseStyleProp(style);

  return (
    <details
      className={`v7m-faq-item v7m-faq-item--${brand} ${className}`.trim()}
      style={resolvedStyle}
      {...detailsProps}
    >
      <summary className="v7m-faq-summary">
        <h3 className="v7m-faq-question">{question}</h3>
        <svg
          className="v7m-faq-chevron"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className="v7m-faq-content">
        {typeof answer === 'string' ? <p>{answer}</p> : answer}
        {children}
      </div>
    </details>
  );
}
