import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Charge } from '@/api/contract';
import CardRedirect from './CardRedirect';

const CARD_CHARGE: Charge = {
  id: 'ch_card_public',
  status: 'pending',
  amount_cents: 10000,
  method: 'cartao',
  created_at: '2026-08-13T00:00:00.000Z',
  expires_at: '2026-08-13T01:00:00.000Z',
  payment: {
    card: {
      redirect_url: 'https://checkout.example.test/session/public',
      session_id: 'sess_must_not_reach_the_dom',
    },
  },
};

describe('CardRedirect — checkout hospedado', () => {
  it('navega para redirect_url sem expor session_id', () => {
    const onRedirect = vi.fn();
    render(<CardRedirect charge={CARD_CHARGE} onRedirect={onRedirect} />);

    expect(screen.queryByText(/sess_must_not_reach_the_dom/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /ir agora/i }));

    expect(onRedirect).toHaveBeenCalledWith(
      'https://checkout.example.test/session/public',
    );
  });

  it('redireciona no máximo uma vez quando há clique antes do contador', () => {
    vi.useFakeTimers();
    try {
      const onRedirect = vi.fn();
      render(<CardRedirect charge={CARD_CHARGE} onRedirect={onRedirect} />);

      fireEvent.click(screen.getByRole('button', { name: /ir agora/i }));
      act(() => vi.advanceTimersByTime(4000));

      expect(onRedirect).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
