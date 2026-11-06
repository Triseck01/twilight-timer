import { describe, expect, it } from 'vitest';
import { formatDuration } from './format';

describe('formatDuration', () => {
  it.each([
    [90, '1:30'],
    [0, '0:00'],
    [5, '0:05'],
    [1800, '30:00'],
    [3661, '61:01'],
    [-5, '-0:05'],
    [-75, '-1:15'],
  ])('%i s → %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it('rundet Sekundenbruchteile ab (Restzeit springt nicht zu früh)', () => {
    expect(formatDuration(89.9)).toBe('1:29');
  });

  it('zeigt bei negativen Bruchteilen bereits die angebrochene Überzeit', () => {
    expect(formatDuration(-0.4)).toBe('-0:01');
  });
});
