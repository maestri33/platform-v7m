// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PixQrSvg } from './PixQrSvg';

describe('PixQrSvg', () => {
  it('mantém somente elementos e atributos SVG permitidos', () => {
    const payload = [
      '<svg viewBox="0 0 10 10" onload="alert(1)">',
      '<script>alert(1)</script>',
      '<foreignObject><p>não permitido</p></foreignObject>',
      '<rect width="10" height="10" onclick="alert(2)" fill="#000" />',
      '</svg>',
    ].join('');
    const { container } = render(<PixQrSvg payload={payload} />);

    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('rect')).not.toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('foreignObject')).toBeNull();
    expect(container.querySelector('[onload], [onclick]')).toBeNull();
  });
});
