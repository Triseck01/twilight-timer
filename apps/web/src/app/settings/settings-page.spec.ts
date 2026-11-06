import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEFAULT_CONFIG, presetConfig } from '@twilight-timer/domain';
import { STORAGE } from '../core/storage';
import { SettingsPage } from './settings-page';
import { SettingsStore } from './settings-store';

describe('SettingsPage (E2)', () => {
  let fixture: ComponentFixture<SettingsPage>;
  let el: HTMLElement;
  let store: SettingsStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [provideRouter([]), { provide: STORAGE, useValue: null }],
    });
    fixture = TestBed.createComponent(SettingsPage);
    store = TestBed.inject(SettingsStore);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const button = (name: string) =>
    [...el.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim() === name)!;
  const value = (id: string) => el.querySelector(`[data-testid="${id}"]`)?.textContent?.trim();
  const click = async (name: string) => {
    const b = button(name);
    expect(b, `Knopf „${name}“ fehlt`).toBeTruthy();
    b.click();
    await fixture.whenStable();
  };

  it('zeigt Überschrift und alle Zeiten als m:ss (zweisprachige Begriffe)', () => {
    expect(el.querySelector('h1')?.textContent).toContain('Einstellungen');
    expect(value('turnSec')).toBe('1:30');
    expect(value('startBankSec')).toBe('30:00');
    expect(value('bankCapSec')).toBe('60:00');
    expect(value('strategyPickSec')).toBe('5:00');
    expect(value('agendaVoteSec')).toBe('3:00');
    expect(el.textContent).toContain('Zugzeit');
  });

  it('vier Voreinstellungen; die aktive ist markiert', async () => {
    for (const name of ['Bank mit Gutschrift', 'Hybrid', 'Nur Zeiten', 'Eigene']) {
      expect(button(name), name).toBeTruthy();
    }
    expect(button('Bank mit Gutschrift').getAttribute('aria-pressed')).toBe('true');
    await click('Hybrid');
    expect(store.config()).toEqual(presetConfig('hybrid'));
    expect(button('Hybrid').getAttribute('aria-pressed')).toBe('true');
    expect(value('startBankSec')).toBe('60:00');
  });

  it('+/− ändern in Schritten und schalten auf „Eigene“', async () => {
    await click('Zugzeit erhöhen');
    expect(value('turnSec')).toBe('1:45');
    expect(store.config().preset).toBe('custom');
    expect(button('Eigene').getAttribute('aria-pressed')).toBe('true');
    await click('Startbank verringern');
    expect(value('startBankSec')).toBe('25:00');
  });

  it('Untergrenze: „verringern“ wird gesperrt', async () => {
    for (let i = 0; i < 10; i++) await click('Zugzeit verringern');
    expect(value('turnSec')).toBe('0:15');
    expect(button('Zugzeit verringern').disabled).toBe(true);
  });

  it('Obergrenze und „Pass gutschreiben“ nur mit Gutschrift sichtbar', async () => {
    expect(el.querySelector('[data-testid="bankCapSec"]')).not.toBeNull();
    expect(el.textContent).toContain('Pass gutschreiben');
    const credit = el.querySelector<HTMLInputElement>('input[name="credit"]')!;
    credit.click();
    await fixture.whenStable();
    expect(store.config().credit).toBe(false);
    expect(el.querySelector('[data-testid="bankCapSec"]')).toBeNull();
    expect(el.textContent).not.toContain('Pass gutschreiben');
  });

  it('„Pass gutschreiben“ schalten', async () => {
    el.querySelector<HTMLInputElement>('input[name="creditPass"]')!.click();
    await fixture.whenStable();
    expect(store.config()).toMatchObject({ creditPass: true, preset: 'custom' });
  });

  it('„Standard wiederherstellen“', async () => {
    await click('Hybrid');
    await click('Standard wiederherstellen');
    expect(store.config()).toEqual(DEFAULT_CONFIG);
  });

  it('Sprache umschalten: sofort Englisch, Deutsch ist vorausgewählt (L3)', async () => {
    expect(button('Deutsch').getAttribute('aria-pressed')).toBe('true');
    await click('English');
    expect(el.querySelector('h1')?.textContent).toContain('Settings');
    expect(el.textContent).toContain('Turn time');
    expect(button('Increase Turn time')).toBeTruthy();
    expect(button('English').getAttribute('aria-pressed')).toBe('true');
  });

  it('Link zurück zum Start', () => {
    expect(el.querySelector('a[href="/"]')).not.toBeNull();
  });
});
