import { afterNextRender, Component, computed, type ElementRef, input, output, signal, viewChild } from '@angular/core';
import { factionLabel, type Expansion, type Faction } from '@twilight-timer/domain';
import { FactionBadge } from '../core/faction-badge';

const GROUP_TITLES: Record<Expansion, string> = {
  base: 'Basisspiel / Base game',
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
      [attr.aria-label]="'Volk wählen für ' + playerName()"
      (keydown.escape)="closed.emit()"
    >
      <div class="picker-head">
        <input
          #search
          type="search"
          data-testid="faction-search"
          aria-label="Volk suchen"
          placeholder="Suchen / Search"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />
        <button type="button" (click)="closed.emit()">Schließen / Close</button>
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
          <p>Kein Volk gefunden / No faction found</p>
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

  protected readonly query = signal('');
  private readonly search = viewChild.required<ElementRef<HTMLInputElement>>('search');

  constructor() {
    // Fokus ins Suchfeld, sobald die Auswahl offen ist (Fokusführung für Tastatur/Screenreader).
    afterNextRender(() => this.search().nativeElement.focus());
  }
  protected readonly label = factionLabel;

  protected readonly groups = computed(() => {
    const q = this.query().trim().toLowerCase();
    const matches = this.factions().filter((f) => !q || `${f.en} ${f.de ?? ''} ${f.id}`.toLowerCase().includes(q));
    return GROUP_ORDER.map((expansion) => ({
      expansion,
      title: GROUP_TITLES[expansion],
      factions: matches.filter((f) => f.expansion === expansion),
    })).filter((g) => g.factions.length > 0);
  });
}
