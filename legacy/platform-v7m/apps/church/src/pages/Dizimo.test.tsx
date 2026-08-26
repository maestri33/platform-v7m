import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Dizimo from './Dizimo';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('Página /dizimo — integração de produção', () => {
  it('envia pela API HTTP e não usa o mock local silenciosamente', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'ch_route_http',
            status: 'pending',
            amount_cents: 10000,
            method: 'pix',
            created_at: '2026-08-13T00:00:00.000Z',
            expires_at: '2026-08-13T01:00:00.000Z',
            payment: {
              pix: {
                qr_code_payload: '000201010212',
                copy_paste: '000201010212',
                txid: 'tx_route_http',
              },
            },
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    globalThis.fetch = fetcher;
    render(<Dizimo />);

    fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Continuar para pagamento' }),
    );

    expect(await screen.findByRole('heading', { name: 'Pague com Pix' })).toBeTruthy();
    expect(fetcher).toHaveBeenCalledWith(
      '/api/dizimo/charges',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
