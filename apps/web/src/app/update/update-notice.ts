import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';
import { RELOAD_PAGE } from './reload-page';

/** Zeigt einen Hinweis, sobald der Service Worker eine neue Version geladen hat (Konzept §10: alte Version im Cache). */
@Component({
  selector: 'app-update-notice',
  template: `
    @if (ready()) {
      <button type="button" class="notice" (click)="update()">Neue Version / New version – neu laden</button>
    }
  `,
  styles: `
    .notice {
      position: fixed;
      inset: auto 1rem 1rem auto;
      padding: 0.75rem 1.25rem;
      border: 0;
      border-radius: 0.5rem;
      background: #d4a94a;
      color: #0f1115;
      font: inherit;
      font-weight: 600;
    }
  `,
})
export class UpdateNotice {
  private readonly swUpdate = inject(SwUpdate);
  private readonly reload = inject(RELOAD_PAGE);
  protected readonly ready = signal(false);

  constructor() {
    if (!this.swUpdate.isEnabled) return;
    this.swUpdate.versionUpdates
      .pipe(
        filter((event) => event.type === 'VERSION_READY'),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.ready.set(true));
  }

  protected async update(): Promise<void> {
    await this.swUpdate.activateUpdate();
    this.reload();
  }
}
