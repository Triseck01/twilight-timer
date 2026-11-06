import { formatLong } from './format';

describe('formatLong', () => {
  it.each([
    [0, '0:00'],
    [59_999, '0:59'],
    [61_000, '1:01'],
    [3_600_000, '1:00:00'],
    [4 * 3_600_000 + 12 * 60_000 + 5_500, '4:12:05'],
    [-5000, '0:00'],
  ])('%i ms → %s', (ms, text) => {
    expect(formatLong(ms)).toBe(text);
  });
});
