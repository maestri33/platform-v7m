import { createElement, type ReactNode } from 'react';

const ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'rect',
  'circle',
  'ellipse',
  'path',
  'line',
  'polyline',
  'polygon',
]);

const ALLOWED_ATTRIBUTES = new Map<string, string>([
  ['viewBox', 'viewBox'],
  ['width', 'width'],
  ['height', 'height'],
  ['x', 'x'],
  ['y', 'y'],
  ['x1', 'x1'],
  ['x2', 'x2'],
  ['y1', 'y1'],
  ['y2', 'y2'],
  ['cx', 'cx'],
  ['cy', 'cy'],
  ['r', 'r'],
  ['rx', 'rx'],
  ['ry', 'ry'],
  ['d', 'd'],
  ['points', 'points'],
  ['fill', 'fill'],
  ['stroke', 'stroke'],
  ['stroke-width', 'strokeWidth'],
  ['stroke-linecap', 'strokeLinecap'],
  ['stroke-linejoin', 'strokeLinejoin'],
  ['fill-rule', 'fillRule'],
  ['clip-rule', 'clipRule'],
  ['opacity', 'opacity'],
]);
const MAX_QR_PAYLOAD_LENGTH = 250_000;

export interface PixQrSvgProps {
  payload: string;
  className?: string;
}

function safeImageSource(payload: string): string | null {
  const trimmed = payload.trim();
  if (/^data:image\/(png|jpeg|webp);base64,/i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function toSafeReactNode(element: Element, key: string): ReactNode {
  const tag = element.tagName.toLowerCase();
  if (!ALLOWED_ELEMENTS.has(tag)) return null;

  const props: Record<string, string | boolean> = { key };
  for (const attribute of Array.from(element.attributes)) {
    const reactName = ALLOWED_ATTRIBUTES.get(attribute.name);
    if (reactName) props[reactName] = attribute.value;
  }
  if (tag === 'svg') {
    props['aria-hidden'] = true;
    props.focusable = false;
  }

  const children = Array.from(element.children)
    .map((child, index) => toSafeReactNode(child, `${key}-${index}`))
    .filter((child): child is ReactNode => child !== null);
  return createElement(tag, props, ...children);
}

function parseSafeSvg(payload: string): ReactNode {
  if (payload.length > MAX_QR_PAYLOAD_LENGTH) return null;
  if (!payload.trimStart().startsWith('<svg')) return null;
  if (typeof DOMParser === 'undefined') return null;

  const document = new DOMParser().parseFromString(payload, 'image/svg+xml');
  const root = document.documentElement;
  if (root.tagName.toLowerCase() !== 'svg') return null;
  return toSafeReactNode(root, 'pix-qr');
}

export default function PixQrSvg({ payload, className }: PixQrSvgProps) {
  const safeSvg = parseSafeSvg(payload);
  const safeSource = safeSvg ? null : safeImageSource(payload);

  return (
    <div
      className={className}
      aria-label="QR Code para pagamento Pix"
      role="img"
    >
      {safeSvg}
      {!safeSvg && safeSource && (
        <img src={safeSource} alt="" referrerPolicy="no-referrer" />
      )}
      {!safeSvg && !safeSource && (
        <span className="text-xs text-ink">QR Code indisponível.</span>
      )}
    </div>
  );
}

export { PixQrSvg };
