import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Neues Spiel in drei Schritten (M2) – folgt nach Prüfung der Völkerliste. */
@Component({
  selector: 'app-new-game-page',
  imports: [RouterLink],
  template: `
    <main class="page">
      <a routerLink="/" class="back">← Start</a>
      <h1>Neues Spiel / New game</h1>
    </main>
  `,
})
export class NewGamePage {}
