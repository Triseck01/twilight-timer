import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Twilight Timer', loadComponent: () => import('./start/start-page').then((m) => m.StartPage) },
  {
    path: 'einstellungen',
    title: 'Einstellungen – Twilight Timer',
    loadComponent: () => import('./settings/settings-page').then((m) => m.SettingsPage),
  },
  {
    path: 'neues-spiel',
    title: 'Neues Spiel – Twilight Timer',
    loadComponent: () => import('./new-game/new-game-page').then((m) => m.NewGamePage),
  },
  { path: 'spiel', title: 'Spiel – Twilight Timer', loadComponent: () => import('./game/game-placeholder').then((m) => m.GamePlaceholder) },
  { path: '**', redirectTo: '' },
];
