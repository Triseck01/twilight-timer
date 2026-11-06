import { DOCUMENT, inject, InjectionToken } from '@angular/core';

/** Minimaler Schlüssel-Wert-Speicher (Teilmenge von `Storage`), damit Tests ihn ersetzen können. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Browser-`localStorage`; `null`, wenn nicht verfügbar (z. B. blockiert). Zugriffe trotzdem in try/catch. */
export const STORAGE = new InjectionToken<KeyValueStorage | null>('STORAGE', {
  factory: () => {
    try {
      return inject(DOCUMENT).defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  },
});
