import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { formatDuration } from '@twilight-timer/domain';

/** Standard-Zugzeit der Aktionsphase in Sekunden (Konzept §4.6). Wandert in M1 in die Domänen-Konfiguration. */
const DEFAULT_TURN_SEC = 90;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly defaultTurnTime = formatDuration(DEFAULT_TURN_SEC);
}
