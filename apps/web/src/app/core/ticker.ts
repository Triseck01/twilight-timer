import { DestroyRef, DOCUMENT, inject, InjectionToken, Service, signal } from '@angular/core';

/** Quelle der aktuellen Zeit (ms). In Tests ersetzbar. Die Domain liest nie selbst die Uhr (ADR 0003). */
export const NOW = new InjectionToken<() => number>('NOW', { factory: () => () => Date.now() });

/**
 * Taktgeber für Live-Anzeigen: mehrmals pro Sekunde und sofort bei Rückkehr in die App.
 * Nur für die Anzeige – gerechnet wird immer mit Zeitstempeln (Safari drosselt Timer im Hintergrund).
 */
@Service()
export class Ticker {
  private readonly nowFn = inject(NOW);
  private readonly state = signal(this.nowFn());
  readonly now = this.state.asReadonly();

  constructor() {
    const doc = inject(DOCUMENT);
    const refresh = () => this.refresh();
    const id = setInterval(refresh, 250);
    doc.addEventListener('visibilitychange', refresh);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(id);
      doc.removeEventListener('visibilitychange', refresh);
    });
  }

  refresh(): void {
    this.state.set(this.nowFn());
  }
}
