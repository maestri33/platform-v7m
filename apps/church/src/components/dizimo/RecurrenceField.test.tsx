import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RecurrenceField from './RecurrenceField';

describe('RecurrenceField motion', () => {
  it('revela o seletor sem animar height de zero para auto', () => {
    render(
      <RecurrenceField
        enabled
        dayOfMonth={15}
        onEnabledChange={vi.fn()}
        onDayChange={vi.fn()}
      />,
    );

    const reveal = screen.getByRole('radiogroup', {
      name: 'Dia do mês para a cobrança',
    }).parentElement?.parentElement;

    expect(reveal).not.toBeNull();
    expect((reveal as HTMLElement).style.height).toBe('');
  });
});
