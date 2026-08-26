import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FINE_POINTER_HOVER_QUERY,
  MOTION,
  pressMotion,
  shouldAnimateHover,
  stepMotion,
  uiTransition,
  useFinePointerHover,
} from './motion';

afterEach(() => {
  vi.unstubAllGlobals();
});

function HoverCapabilityProbe() {
  const canHover = useFinePointerHover();
  return <output aria-label="hover disponível">{String(canHover)}</output>;
}

describe('motion pointer capability', () => {
  it('mantém fade de 150ms no modo reduzido sem y, scale ou height', () => {
    const frames = stepMotion(true);

    expect(frames).toEqual({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    });
    expect(uiTransition(true)).toEqual({ duration: 0.15 });
    for (const frame of Object.values(frames)) {
      expect(frame).not.toHaveProperty('y');
      expect(frame).not.toHaveProperty('scale');
      expect(frame).not.toHaveProperty('height');
    }
  });

  it('preserva o feedback de pressão em 0.97 no motion normal', () => {
    expect(MOTION.pressScale).toBe(0.97);
    expect(pressMotion.scale).toBe(0.97);
  });

  it('libera deslocamento de hover somente com ponteiro preciso e motion normal', () => {
    expect(shouldAnimateHover(true, false)).toBe(true);
    expect(shouldAnimateHover(false, false)).toBe(false);
    expect(shouldAnimateHover(true, true)).toBe(false);
    expect(shouldAnimateHover(true, null)).toBe(true);
  });

  it('acompanha apenas a media query de hover com ponteiro preciso', () => {
    let matches = true;
    let changeListener: ((event: MediaQueryListEvent) => void) | undefined;
    const mediaQueryList = {
      get matches() {
        return matches;
      },
      media: FINE_POINTER_HOVER_QUERY,
      onchange: null,
      addEventListener: vi.fn(
        (_type: string, listener: (event: MediaQueryListEvent) => void) => {
          changeListener = listener;
        },
      ),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
    const matchMedia = vi.fn(() => mediaQueryList);
    vi.stubGlobal('matchMedia', matchMedia);

    render(<HoverCapabilityProbe />);
    expect(matchMedia).toHaveBeenCalledWith(FINE_POINTER_HOVER_QUERY);
    expect(screen.getByLabelText('hover disponível').textContent).toBe('true');

    act(() => {
      matches = false;
      changeListener?.({
        matches,
        media: FINE_POINTER_HOVER_QUERY,
      } as MediaQueryListEvent);
    });
    expect(screen.getByLabelText('hover disponível').textContent).toBe('false');
  });
});
