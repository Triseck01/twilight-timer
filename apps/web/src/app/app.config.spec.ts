import { isDevMode } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwRegistrationOptions } from '@angular/service-worker';
import { appConfig } from './app.config';

describe('appConfig', () => {
  it('registriert den Service Worker nur außerhalb des Entwicklungsmodus', () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const options = TestBed.inject(SwRegistrationOptions);
    expect(options.enabled).toBe(!isDevMode());
  });
});
