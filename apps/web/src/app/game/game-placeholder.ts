import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Platzhalter für die Spielansicht bis M3. */
@Component({
  selector: 'app-game-placeholder',
  imports: [RouterLink],
  template: `
    <main class="page">
      <a routerLink="/" class="back">← Start</a>
      <h1>Spiel / Game</h1>
    </main>
  `,
})
export class GamePlaceholder {}
