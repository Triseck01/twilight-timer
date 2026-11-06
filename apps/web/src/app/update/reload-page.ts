import { DOCUMENT, inject, InjectionToken } from '@angular/core';

/** Lädt die Seite neu. Als Token, damit Tests den echten Reload ersetzen können. */
export const RELOAD_PAGE = new InjectionToken<() => void>('RELOAD_PAGE', {
  factory: () => {
    const location = inject(DOCUMENT).location;
    return () => location.reload();
  },
});
