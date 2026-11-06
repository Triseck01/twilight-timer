import { DOCUMENT, effect, inject, Service, signal } from '@angular/core';
import type { Lang } from '@twilight-timer/domain';
import { STORAGE } from '../storage';
import { DE, EN, type MessageKey } from './messages';

export const LANGUAGE_KEY = 'twilight-timer.language.v1';
const MESSAGES: Record<Lang, Record<MessageKey, string>> = { de: DE, en: EN };

export type MessageParams = Readonly<Record<string, string | number>>;

/** Sprache der Oberfläche (Standard Deutsch), umschaltbar, im Browser gespeichert (M2-L, ADR 0007). */
@Service()
export class I18n {
  private readonly storage = inject(STORAGE);
  private readonly state = signal<Lang>(this.load());
  readonly lang = this.state.asReadonly();

  constructor() {
    const doc = inject(DOCUMENT);
    effect(() => (doc.documentElement.lang = this.state()));
  }

  /** Text zum Schlüssel in der aktuellen Sprache; liest das Sprach-Signal, Vorlagen aktualisieren sich daher selbst. */
  readonly t = (key: MessageKey, params?: MessageParams): string => {
    const text = MESSAGES[this.state()][key];
    return params ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m)) : text;
  };

  setLang(lang: Lang): void {
    this.state.set(lang);
    try {
      this.storage?.setItem(LANGUAGE_KEY, lang);
    } catch {
      // Speicher blockiert: Sprache gilt für diese Sitzung.
    }
  }

  private load(): Lang {
    try {
      const raw = this.storage?.getItem(LANGUAGE_KEY);
      return raw === 'en' ? 'en' : 'de';
    } catch {
      return 'de';
    }
  }
}
