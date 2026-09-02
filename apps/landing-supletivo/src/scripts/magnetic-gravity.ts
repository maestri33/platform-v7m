/**
 * Magnetic Gravity Hover Engine
 * Atrai suavemente botões e CTAs em direção ao cursor do mouse.
 * Desativação automática em touch/mobile e prefers-reduced-motion.
 */

interface MagneticElement {
  el: HTMLElement;
  rect: DOMRect;
  targetX: number;
  targetY: number;
  currX: number;
  currY: number;
  isHovered: boolean;
}

export function initMagneticGravity(): void {
  if (typeof window === 'undefined') return;
  const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

  if (isReduced || !hasFinePointer) return;

  const elements = document.querySelectorAll<HTMLElement>('[data-magnetic], a.btn');
  if (elements.length === 0) return;

  const items: MagneticElement[] = [];
  let isRunning = false;
  const ATTRACTION_RADIUS = 80;
  const STRENGTH = 0.28;

  elements.forEach((el) => {
    const item: MagneticElement = {
      el,
      rect: el.getBoundingClientRect(),
      targetX: 0,
      targetY: 0,
      currX: 0,
      currY: 0,
      isHovered: false,
    };

    const updateRect = () => {
      item.rect = el.getBoundingClientRect();
    };

    const handlePointerMove = (e: PointerEvent) => {
      const { left, top, width, height } = item.rect;
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      const distX = e.clientX - centerX;
      const distY = e.clientY - centerY;
      const dist = Math.hypot(distX, distY);

      if (dist < ATTRACTION_RADIUS) {
        item.isHovered = true;
        item.targetX = distX * STRENGTH;
        item.targetY = distY * STRENGTH;
        startLoop();
      } else if (item.isHovered) {
        item.isHovered = false;
        item.targetX = 0;
        item.targetY = 0;
      }
    };

    el.addEventListener('pointerenter', () => {
      updateRect();
    });

    el.addEventListener('pointerleave', () => {
      item.isHovered = false;
      item.targetX = 0;
      item.targetY = 0;
    });

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize', updateRect, { passive: true });
    window.addEventListener('scroll', updateRect, { passive: true });

    items.push(item);
  });

  function startLoop() {
    if (isRunning) return;
    isRunning = true;
    requestAnimationFrame(render);
  }

  function render() {
    let hasMotion = false;

    for (const item of items) {
      const dx = item.targetX - item.currX;
      const dy = item.targetY - item.currY;

      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05 || item.isHovered) {
        item.currX += dx * 0.15;
        item.currY += dy * 0.15;
        hasMotion = true;
        item.el.style.transform = `translate3d(${item.currX.toFixed(2)}px, ${item.currY.toFixed(2)}px, 0)`;
      } else if (Math.abs(item.currX) > 0.05 || Math.abs(item.currY) > 0.05) {
        item.currX += dx * 0.15;
        item.currY += dy * 0.15;
        hasMotion = true;
        item.el.style.transform = `translate3d(${item.currX.toFixed(2)}px, ${item.currY.toFixed(2)}px, 0)`;
      } else {
        item.currX = 0;
        item.currY = 0;
        item.el.style.transform = '';
      }
    }

    if (hasMotion) {
      requestAnimationFrame(render);
    } else {
      isRunning = false;
    }
  }
}
