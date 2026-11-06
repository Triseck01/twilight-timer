import { DOCUMENT, inject, InjectionToken } from '@angular/core';

/** Lädt Text als Datei herunter (auf dem iPad: „In Dateien sichern“). In Tests ersetzbar. */
export const DOWNLOAD = new InjectionToken<(fileName: string, content: string) => void>('DOWNLOAD', {
  factory: () => {
    const doc = inject(DOCUMENT);
    return (fileName, content) => {
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const a = doc.createElement('a');
      a.href = url;
      a.download = fileName;
      doc.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  },
});
