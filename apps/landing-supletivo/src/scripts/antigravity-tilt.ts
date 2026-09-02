/**
 * Antigravity 3D Tilt & Spatial Motion Engine
 * Leve (<1.5KB), zero dependências externas, 60fps via requestAnimationFrame e LERP.
 * Desativação automática em prefers-reduced-motion e touch devices.
 */

interface TiltSublayer {
  el: HTMLElement;
  depth: number;
}

interface TiltState {
  el: HTMLElement;
  rect: DOMRect;
  targetX: number;
  targetY: number;
  currX: number;
  currY: number;
  maxTilt: number;
  isHovered: boolean;
  sublayers: TiltSublayer[];
}

export function initAntigravityTilt(): void {
  if (typeof window === 'undefined') return;
  const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

  if (isReduced || !hasFinePointer) return;

  const tiltElements = document.querySelectorAll<HTMLElement>('[data-tilt-3d]');
  if (tiltElements.length === 0) return;

  const states: TiltState[] = [];
  let isRunning = false;

  tiltElements.forEach((el) => {
    const maxTilt = parseFloat(el.dataset.tiltMax || '10');
    const sublayerElements = el.querySelectorAll<HTMLElement>('[data-tilt-sublayer]');
    const sublayers: TiltSublayer[] = [];

    sublayerElements.forEach((subEl) => {
      const depth = parseFloat(subEl.dataset.tiltSublayer || '15');
      sublayers.push({ el: subEl, depth });
    });

    const state: TiltState = {
      el,
      rect: el.getBoundingClientRect(),
      targetX: 0,
      targetY: 0,
      currX: 0,
      currY: 0,
      maxTilt,
      isHovered: false,
      sublayers,
    };

    const updateRect = () => {
      state.rect = el.getBoundingClientRect();
    };

    const handleMove = (e: PointerEvent) => {
      const { left, top, width, height } = state.rect;
      if (width <= 0 || height <= 0) return;

      const x = (e.clientX - left) / width; // 0 a 1
      const y = (e.clientY - top) / height; // 0 a 1

      state.targetX = (0.5 - y) * state.maxTilt * 2;
      state.targetY = (x - 0.5) * state.maxTilt * 2;

      el.style.setProperty('--mx', `${(e.clientX - left).toFixed(1)}px`);
      el.style.setProperty('--my', `${(e.clientY - top).toFixed(1)}px`);
    };

    el.addEventListener('pointerenter', (e) => {
      state.isHovered = true;
      updateRect();
      handleMove(e);
      startLoop();
    });

    el.addEventListener('pointermove', handleMove);

    el.addEventListener('pointerleave', () => {
      state.isHovered = false;
      state.targetX = 0;
      state.targetY = 0;
    });

    window.addEventListener('resize', updateRect, { passive: true });
    window.addEventListener('scroll', updateRect, { passive: true });

    states.push(state);
  });

  function startLoop() {
    if (isRunning) return;
    isRunning = true;
    requestAnimationFrame(render);
  }

  function render() {
    let hasMotion = false;

    for (const s of states) {
      const dx = s.targetX - s.currX;
      const dy = s.targetY - s.currY;

      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01 || s.isHovered) {
        s.currX += dx * 0.12;
        s.currY += dy * 0.12;
        hasMotion = true;

        const elevation = s.isHovered ? 'translateZ(20px)' : 'translateZ(0px)';
        s.el.style.transform = `perspective(1000px) rotateX(${s.currX.toFixed(2)}deg) rotateY(${s.currY.toFixed(2)}deg) ${elevation}`;

        if (s.sublayers.length > 0) {
          s.sublayers.forEach(({ el, depth }) => {
            const subX = (s.currY * (depth / s.maxTilt) * 0.5).toFixed(2);
            const subY = (-s.currX * (depth / s.maxTilt) * 0.5).toFixed(2);
            const subZ = s.isHovered ? `${depth.toFixed(1)}px` : '0px';
            el.style.transform = `translate3d(${subX}px, ${subY}px, ${subZ})`;
          });
        }
      } else if (!s.isHovered && (Math.abs(s.currX) > 0.01 || Math.abs(s.currY) > 0.01)) {
        s.currX += dx * 0.12;
        s.currY += dy * 0.12;
        hasMotion = true;
        s.el.style.transform = `perspective(1000px) rotateX(${s.currX.toFixed(2)}deg) rotateY(${s.currY.toFixed(2)}deg) translateZ(0px)`;

        if (s.sublayers.length > 0) {
          s.sublayers.forEach(({ el, depth }) => {
            const subX = (s.currY * (depth / s.maxTilt) * 0.5).toFixed(2);
            const subY = (-s.currX * (depth / s.maxTilt) * 0.5).toFixed(2);
            el.style.transform = `translate3d(${subX}px, ${subY}px, 0px)`;
          });
        }
      } else if (!s.isHovered) {
        s.currX = 0;
        s.currY = 0;
        s.el.style.transform = '';
        if (s.sublayers.length > 0) {
          s.sublayers.forEach(({ el }) => {
            el.style.transform = '';
          });
        }
      }
    }

    if (hasMotion) {
      requestAnimationFrame(render);
    } else {
      isRunning = false;
    }
  }
}
