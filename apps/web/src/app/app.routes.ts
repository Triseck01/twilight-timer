import { Routes } from '@angular/router';

// `title` ist ein Wörterbuch-Schlüssel (core/i18n/messages.ts), übersetzt von I18nTitleStrategy.

export const routes: Routes = [
  { path: '', title: 'title.start', loadComponent: () => import('./start/start-page').then((m) => m.StartPage) },
  {
    path: 'einstellungen',
    title: 'title.settings',
    loadComponent: () => import('./settings/settings-page').then((m) => m.SettingsPage),
  },
  {
    path: 'neues-spiel',
    title: 'title.newGame',
    loadComponent: () => import('./new-game/new-game-page').then((m) => m.NewGamePage),
  },
  {
    path: 'spiele',
    title: 'title.savedGames',
    loadComponent: () => import('./games/saved-games-page').then((m) => m.SavedGamesPage),
  },
  { path: 'spiel', title: 'title.game', loadComponent: () => import('./game/game-page').then((m) => m.GamePage) },
  { path: '**', redirectTo: '' },
];
