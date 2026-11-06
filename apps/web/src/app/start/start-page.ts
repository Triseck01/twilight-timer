import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Startbildschirm (M2/E1). „Spiel fortsetzen“ folgt mit M7. */
@Component({
  selector: 'app-start-page',
  imports: [RouterLink],
  template: `
    <main class="page start">
      <img src="icons/icon-192.png" alt="" width="96" height="96" />
      <h1>Twilight Timer</h1>
      <nav class="actions" aria-label="Hauptmenü">
        <a routerLink="/neues-spiel" class="button primary">Neues Spiel / New game</a>
        <a routerLink="/einstellungen" class="button secondary">Einstellungen / Settings</a>
      </nav>
      <p class="notice">
        Fan-Projekt, nicht mit Fantasy Flight Games oder Asmodee verbunden. Twilight Imperium, Völkernamen und -symbole © der
        jeweiligen Rechteinhaber; Discordant-Stars-Symbole © deren Autoren.
      </p>
    </main>
  `,
  styles: `
    .start {
      display: grid;
      justify-items: center;
      align-content: center;
      min-height: 100dvh;
      text-align: center;
    }
    .actions {
      display: grid;
      gap: 1rem;
      width: min(28rem, 100%);
    }
    .notice {
      max-width: 36rem;
      margin-top: 3rem;
      font-size: 0.8rem;
      color: var(--tt-muted);
    }
    .primary {
      font-size: 1.5rem;
      padding-block: 1.5rem;
    }
  `,
})
export class StartPage {}
