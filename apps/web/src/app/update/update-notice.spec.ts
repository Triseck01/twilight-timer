import { TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { RELOAD_PAGE } from './reload-page';
import { UpdateNotice } from './update-notice';

describe('UpdateNotice', () => {
  let versionUpdates: Subject<VersionEvent>;
  let activateUpdate: ReturnType<typeof vi.fn>;
  let reload: ReturnType<typeof vi.fn>;

  function setup(isEnabled = true) {
    localStorage.clear(); // keine Spracheinstellung aus anderen Tests übernehmen
    versionUpdates = new Subject<VersionEvent>();
    activateUpdate = vi.fn().mockResolvedValue(true);
    reload = vi.fn();
    TestBed.configureTestingModule({
      imports: [UpdateNotice],
      providers: [
        { provide: SwUpdate, useValue: { isEnabled, versionUpdates, activateUpdate } },
        { provide: RELOAD_PAGE, useValue: reload },
      ],
    });
    const fixture = TestBed.createComponent(UpdateNotice);
    fixture.detectChanges();
    return fixture;
  }

  const button = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('button');

  it('zeigt nichts, solange keine neue Version bereitliegt', async () => {
    const fixture = setup();
    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'b' } });
    await fixture.whenStable();
    expect(button(fixture.nativeElement)).toBeNull();
  });

  it('zeigt „Neue Version / New version – neu laden“, sobald VERSION_READY eintrifft', async () => {
    const fixture = setup();
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });
    await fixture.whenStable();
    expect(button(fixture.nativeElement)?.textContent).toContain('Neue Version – neu laden');
  });

  it('aktiviert beim Tippen das Update und lädt die Seite neu', async () => {
    const fixture = setup();
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });
    await fixture.whenStable();
    button(fixture.nativeElement)?.click();
    await fixture.whenStable();
    expect(activateUpdate).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('bleibt still, wenn der Service Worker deaktiviert ist (Entwicklung)', async () => {
    const fixture = setup(false);
    await fixture.whenStable();
    expect(button(fixture.nativeElement)).toBeNull();
  });
});
