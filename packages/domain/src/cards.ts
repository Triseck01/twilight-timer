import type { Lang } from './types';

/** Strategiekarten, Nummer = Initiative; Anzeige zweisprachig, eingestellte Sprache zuerst (Konzept §5.6, M2-L). */
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

export function cardLabel(number: number, lang: Lang = 'de'): string {
  const card = STRATEGY_CARDS.find((c) => c.number === number);
  if (!card) return '';
  return lang === 'de' ? `${card.de} / ${card.en}` : `${card.en} / ${card.de}`;
}
