// Setup global para Vitest
// Adiciona matchers de @testing-library/jest-dom se estiverem disponíveis
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  cleanup();
});
