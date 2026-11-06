import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UpdateNotice } from './update/update-notice';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UpdateNotice],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly buildVersion = BUILD_VERSION;
}
