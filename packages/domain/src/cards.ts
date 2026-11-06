/** Strategiekarten, Nummer = Initiative; Anzeige zweisprachig (Konzept §5.6). */
export interface StrategyCard {
  readonly number: number;
  readonly en: string;
  readonly de: string;
}

export const STRATEGY_CARDS: readonly StrategyCard[] = [
  { number: 1, en: 'Leadership', de: 'Führungsstärke' },
  { number: 2, en: 'Diplomacy', de: 'Diplomatie' },
  { number: 3, en: 'Politics', de: 'Politik' },
  { number: 4, en: 'Construction', de: 'Infrastruktur' },
  { number: 5, en: 'Trade', de: 'Handel' },
  { number: 6, en: 'Warfare', de: 'Kriegsführung' },
  { number: 7, en: 'Technology', de: 'Technologie' },
  { number: 8, en: 'Imperial', de: 'Imperium' },
];

export function cardLabel(number: number): string {
  const card = STRATEGY_CARDS.find((c) => c.number === number);
  return card ? `${card.en} / ${card.de}` : '';
}
