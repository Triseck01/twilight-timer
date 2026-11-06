import { TestBed } from '@angular/core/testing';
import { NOW, Ticker } from './ticker';

describe('Ticker (S7)', () => {
  let t = 1000;
  beforeEach(() => {
    t = 1000;
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [{ provide: NOW, useValue: () => t }] });
  });
  afterEach(() => vi.useRealTimers());

  it('liefert die aktuelle Zeit als Signal', () => {
    expect(TestBed.inject(Ticker).now()).toBe(1000);
  });

  it('aktualisiert sich mehrmals pro Sekunde', () => {
    const ticker = TestBed.inject(Ticker);
    t = 1250;
    vi.advanceTimersByTime(250);
    expect(ticker.now()).toBe(1250);
  });

  it('aktualisiert sofort, wenn die Seite wieder sichtbar wird (App-Wechsel, Sperre)', () => {
    const ticker = TestBed.inject(Ticker);
    t = 99_000;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(ticker.now()).toBe(99_000);
  });
});
