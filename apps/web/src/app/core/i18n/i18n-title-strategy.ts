import { effect, inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18n } from './i18n';
import type { MessageKey } from './messages';

/** Seitentitel aus dem Wörterbuch: Routen tragen einen Schlüssel als `title`; bei Sprachwechsel neu gesetzt. */
@Injectable()
export class I18nTitleStrategy extends TitleStrategy {
  private readonly i18n = inject(I18n);
  private readonly title = inject(Title);
  private key: MessageKey = 'title.start';

  constructor() {
    super();
    effect(() => this.title.setTitle(this.i18n.t(this.key)));
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key = (this.buildTitle(snapshot) as MessageKey | undefined) ?? 'title.start';
    this.title.setTitle(this.i18n.t(this.key));
  }
}
