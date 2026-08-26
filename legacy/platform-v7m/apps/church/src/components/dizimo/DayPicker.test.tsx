import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DayPicker from './DayPicker';

describe('DayPicker', () => {
  it('permite escolher qualquer dia de 1 a 31', () => {
    const onChange = vi.fn();
    render(<DayPicker value={31} onChange={onChange} />);

    expect(screen.getAllByRole('radio')).toHaveLength(31);
    expect(
      screen.getByRole('radio', { name: 'Dia 31' }).getAttribute('aria-checked'),
    ).toBe('true');

    fireEvent.click(screen.getByRole('radio', { name: 'Dia 29' }));
    expect(onChange).toHaveBeenCalledWith(29);
  });
});
