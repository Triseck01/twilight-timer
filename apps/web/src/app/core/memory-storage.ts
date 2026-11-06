import type { KeyValueStorage } from './storage';

/** Speicher im Arbeitsspeicher – für Tests; `failWrites` simuliert vollen/blockierten Speicher. */
export function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string>; failWrites: boolean } {
  const data: Record<string, string> = { ...initial };
  const store = {
    data,
    failWrites: false,
    getItem: (k: string) => (Object.prototype.hasOwnProperty.call(data, k) ? data[k]! : null),
    setItem: (k: string, v: string) => {
      if (store.failWrites) throw new Error('QuotaExceededError');
      data[k] = v;
    },
    removeItem: (k: string) => void delete data[k],
  };
  return store;
}
