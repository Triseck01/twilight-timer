import { TestBed } from '@angular/core/testing';
import { Countdown } from './countdown';

describe('Countdown (S2)', () => {
  async function show(ms: number) {
    const f = TestBed.createComponent(Countdown);
    f.componentRef.setInput('remainingMs', ms);
    await f.whenStable();
    const el = (f.nativeElement as HTMLElement).querySelector('[data-testid="countdown"]')!;
    return { text: el.textContent!.trim(), overtime: el.classList.contains('overtime') };
  }

  it.each([
    [300_000, '5:00', false],
    [299_999, '5:00', false],
    [299_000, '4:59', false],
    [500, '0:01', false],
    [0, '0:00', false],
    [-1, '-0:01', true],
    [-10_000, '-0:10', true],
    [-10_001, '-0:11', true],
  ])('%i ms → %s (rot: %s)', async (ms, text, overtime) => {
    expect(await show(ms)).toEqual({ text, overtime });
  });
});
