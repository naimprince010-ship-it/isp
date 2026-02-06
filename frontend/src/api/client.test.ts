import { describe, it, expect } from 'vitest';
import { api } from './client';

describe('api client', () => {
  it('exports api function', () => {
    expect(typeof api).toBe('function');
  });
});
