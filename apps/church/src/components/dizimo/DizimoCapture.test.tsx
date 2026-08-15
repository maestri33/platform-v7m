// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Charge, DizimoApi } from '@/api/contract';
import { DizimoCapture } from './index';

const PIX_CHARGE: Charge = {
  id: 'ch_public_test',
  status: 'pending',
  amount_cents: 10000,
  method: 'pix',
  recurrence_id: 'recur_public_test',
  created_at: '2026-08-13T00:00:00.000Z',
  expires_at: '2026-08-13T01:00:00.000Z',
  payment: {
    pix: {
      qr_code_payload:
        '<svg viewBox="0 0 10 10"><rect width="10" height="10" /></svg>',
      copy_paste: 'pix-copia-e-cola',
      txid: 'tx_public_test',
    },
  },
};

const CARD_CHARGE: Charge = {
  ...PIX_CHARGE,
  id: 'ch_card_public_test',
  method: 'cartao',
  payment: {
    card: {
      redirect_url: 'https://checkout.example.test/card/public',
      session_id: 'sess_private_test',
    },
  },
};

function createApi(overrides: Partial<DizimoApi> = {}): DizimoApi {
  return {
    createCharge: vi.fn().mockResolvedValue(PIX_CHARGE),
    getCharge: vi.fn().mockResolvedValue(PIX_CHARGE),
    cancelRecurrence: vi.fn().mockResolvedValue(undefined),
    onWebhookEvent: vi.fn().mockReturnValue(() => undefined),
    ...overrides,
  };
}

describe('DizimoCapture — interface pública', () => {
  it('usa heading nível 2 quando embedado na página', () => {
    render(<DizimoCapture apiClient={createApi()} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Dízimo e ofertas' }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Dízimo e ofertas' }),
    ).toBeNull();
  });

  it('dá feedback de pressão 0.97 no CTA e respeita movimento reduzido', () => {
    render(<DizimoCapture apiClient={createApi()} />);

    const submit = screen.getByRole('button', {
      name: 'Continuar para pagamento',
    });
    expect(submit.className).toContain('active:scale-[0.97]');
    expect(submit.className).toContain('motion-reduce:transform-none');
    expect(submit.className).toContain('motion-reduce:active:scale-100');
  });

  it('renderiza, preenche, envia e avança para a etapa Pix', async () => {
    const api = createApi();
    const { container } = render(<DizimoCapture apiClient={api} />);

    fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Continuar para pagamento' }),
    );

    expect(await screen.findByRole('heading', { name: 'Pague com Pix' })).toBeTruthy();
    expect(api.createCharge).toHaveBeenCalledTimes(1);
    expect(api.createCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotency_key: expect.any(String),
        method: 'pix',
      }),
    );
    const liveRegion = container.querySelector(
      '[aria-live="polite"][aria-atomic="true"]',
    );
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.textContent).toContain('Pague com Pix');
  });

  it('permite enviar o formulário semanticamente pelo teclado', async () => {
    const api = createApi();
    render(<DizimoCapture apiClient={api} />);

    fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
    fireEvent.submit(
      screen.getByRole('form', { name: 'Formulário de contribuição' }),
    );

    expect(await screen.findByRole('heading', { name: 'Pague com Pix' })).toBeTruthy();
    expect(api.createCharge).toHaveBeenCalledTimes(1);
  });

  it('consulta getCharge e mostra progresso ao verificar um Pix pago', async () => {
    let resolveVerification: ((charge: Charge) => void) | undefined;
    const getCharge = vi.fn(
      () =>
        new Promise<Charge>((resolve) => {
          resolveVerification = resolve;
        }),
    );
    const api = createApi({ getCharge });
    const onPaid = vi.fn();
    render(<DizimoCapture apiClient={api} onPaid={onPaid} />);

    fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Continuar para pagamento' }),
    );

    const verifyButton = await screen.findByRole('button', {
      name: 'Já paguei, verificar agora',
    });
    fireEvent.click(verifyButton);

    expect(getCharge).toHaveBeenCalledWith(PIX_CHARGE.id);
    expect(
      (
        screen.getByRole('button', {
          name: 'Verificando pagamento…',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    resolveVerification?.({ ...PIX_CHARGE, status: 'paid' });
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Contribuição confirmada' }),
      ).toBeTruthy(),
    );
    expect(onPaid).toHaveBeenCalledTimes(1);
    expect(onPaid).toHaveBeenCalledWith(
      expect.objectContaining({ id: PIX_CHARGE.id, status: 'paid' }),
    );
  });

  it('reutiliza a chave idempotente ao tentar novamente após erro', async () => {
    const createCharge = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(PIX_CHARGE);
    const api = createApi({ createCharge });
    render(<DizimoCapture apiClient={api} />);

    fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Continuar para pagamento' }),
    );
    await screen.findByRole('alert');
    fireEvent.click(
      screen.getByRole('button', { name: 'Continuar para pagamento' }),
    );
    await screen.findByRole('heading', { name: 'Pague com Pix' });

    const firstKey = createCharge.mock.calls[0]?.[0].idempotency_key;
    const retryKey = createCharge.mock.calls[1]?.[0].idempotency_key;
    expect(firstKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(retryKey).toBe(firstKey);
  });

  it('entrega o redirect_url do cartão sem fabricar pagamento local', async () => {
    const api = createApi({ createCharge: vi.fn().mockResolvedValue(CARD_CHARGE) });
    const navigateToHostedCheckout = vi.fn();
    render(
      <DizimoCapture
        apiClient={api}
        navigateToHostedCheckout={navigateToHostedCheckout}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /cartão/i }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Continuar para pagamento' }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Redirecionando para o checkout',
      }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /ir agora/i }));
    expect(navigateToHostedCheckout).toHaveBeenCalledWith(
      CARD_CHARGE.payment.card?.redirect_url,
    );

    expect(screen.queryByRole('heading', { name: 'Contribuição confirmada' })).toBeNull();
  });
});
