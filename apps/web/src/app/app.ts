import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18n } from './core/i18n/i18n';
import { UpdateNotice } from './update/update-notice';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UpdateNotice],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly buildVersion = BUILD_VERSION;
  protected readonly t = inject(I18n).t;
}
