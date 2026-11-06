import { afterNextRender, Component, computed, type ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { factionLabel, type Expansion, type Faction } from '@twilight-timer/domain';
import { FactionBadge } from '../core/faction-badge';
import { I18n } from '../core/i18n/i18n';

/** Eigennamen der Erweiterungen bleiben unübersetzt; „Basisspiel“ kommt aus dem Wörterbuch. */
const GROUP_TITLES: Record<Exclude<Expansion, 'base'>, string> = {
  pok: 'Prophecy of Kings',
  keleres: 'Council Keleres',
  te: "Thunder's Edge",
  ds: 'Discordant Stars',
};
const GROUP_ORDER: readonly Expansion[] = ['base', 'pok', 'keleres', 'te', 'ds'];

/** Auswahl des Volks: nach Erweiterung gruppiert, mit Suche; belegte Völker ausgegraut. */
@Component({
  selector: 'app-faction-picker',
  imports: [FactionBadge],
  template: `
    <div
      class="picker"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="t('picker.dialog', { name: playerName() || t('picker.defaultName') })"
      (keydown.escape)="closed.emit()"
    >
      <div class="picker-head">
        <input
          #search
          type="search"
          data-testid="faction-search"
          [attr.aria-label]="t('picker.search')"
          [placeholder]="t('picker.searchPlaceholder')"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />
        <button type="button" (click)="closed.emit()">{{ t('picker.close') }}</button>
      </div>
      <div class="picker-list">
        @for (group of groups(); track group.expansion) {
          <section data-testid="faction-group">
            <h3>{{ group.title }}</h3>
            <div class="options">
              @for (f of group.factions; track f.id) {
                <button
                  type="button"
                  data-testid="faction-option"
                  class="choice"
                  [attr.aria-pressed]="f.id === selected()"
                  [disabled]="taken().has(f.id) && f.id !== selected()"
                  (click)="chosen.emit(f.id)"
                >
                  <app-faction-badge [factionId]="f.id" />
                  <span>{{ label(f.id) }}</span>
                </button>
              }
            </div>
          </section>
        } @empty {
          <p>{{ t('picker.none') }}</p>
        }
      </div>
    </div>
  `,
  styleUrl: './faction-picker.scss',
})
export class FactionPicker {
  readonly factions = input.required<readonly Faction[]>();
  readonly taken = input.required<ReadonlySet<string>>();
  readonly selected = input<string | null>(null);
  readonly playerName = input('');
  readonly chosen = output<string>();
  readonly closed = output();

  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly query = signal('');
  private readonly search = viewChild.required<ElementRef<HTMLInputElement>>('search');

  constructor() {
    // Fokus ins Suchfeld, sobald die Auswahl offen ist (Fokusführung für Tastatur/Screenreader).
    afterNextRender(() => this.search().nativeElement.focus());
  }
  protected label(id: string): string {
    return factionLabel(id, this.i18n.lang());
  }

  protected readonly groups = computed(() => {
    const q = this.query().trim().toLowerCase();
    const matches = this.factions().filter((f) => !q || `${f.en} ${f.de ?? ''} ${f.id}`.toLowerCase().includes(q));
    return GROUP_ORDER.map((expansion) => ({
      expansion,
      title: expansion === 'base' ? this.t('newGame.baseGame') : GROUP_TITLES[expansion],
      factions: matches.filter((f) => f.expansion === expansion),
    })).filter((g) => g.factions.length > 0);
  });
}
