import type { PlayerId } from './types';

/** Bei 3–4 Spielern wählt jeder zwei Karten, sonst eine (Konzept §3.2). */
export function cardsPerPlayer(playerCount: number): 1 | 2 {
  return playerCount <= 4 ? 2 : 1;
}

/** Sitzreihenfolge im Uhrzeigersinn, beginnend bei `firstId`. */
function rotate(seatIds: readonly PlayerId[], firstId: PlayerId): PlayerId[] {
  const i = seatIds.indexOf(firstId);
  return [...seatIds.slice(i), ...seatIds.slice(0, i)];
}

/** Wahlreihenfolge: Sprecher zuerst, dann im Uhrzeigersinn; bei zwei Karten ein zweiter Durchgang in gleicher Reihenfolge. */
export function pickOrder(seatIds: readonly PlayerId[], speakerId: PlayerId): PlayerId[] {
  const pass = rotate(seatIds, speakerId);
  return cardsPerPlayer(seatIds.length) === 2 ? [...pass, ...pass] : pass;
}

/** Aktionsreihenfolge nach Initiative: niedrigste eigene Karte; Initiative-0-Token zuerst (Konzept §3.3, §3.7). */
export function actionOrder(
  holdings: readonly { readonly playerId: PlayerId; readonly cards: readonly number[] }[],
  initiativeZeroHolder: PlayerId | null,
): PlayerId[] {
  const initiative = (h: (typeof holdings)[number]) => (h.playerId === initiativeZeroHolder ? 0 : Math.min(...h.cards));
  return [...holdings].sort((a, b) => initiative(a) - initiative(b)).map((h) => h.playerId);
}

/** Sekundärreihenfolge: links vom aktiven Spieler im Uhrzeigersinn, ohne ihn selbst. */
export function secondaryOrder(seatIds: readonly PlayerId[], activeId: PlayerId): PlayerId[] {
  return rotate(seatIds, activeId).slice(1);
}

/** Abstimmungsreihenfolge: links vom Sprecher beginnend, Sprecher zuletzt (Konzept §3.5). */
export function voteOrder(seatIds: readonly PlayerId[], speakerId: PlayerId): PlayerId[] {
  return [...secondaryOrder(seatIds, speakerId), speakerId];
}

/** Nächster nicht gepasster Spieler nach `afterId` in Initiativreihenfolge; derselbe, wenn alle anderen gepasst haben. */
export function nextActor(order: readonly PlayerId[], passed: ReadonlySet<PlayerId>, afterId: PlayerId): PlayerId | null {
  const start = order.indexOf(afterId);
  for (let i = 1; i <= order.length; i++) {
    const id = order[(start + i) % order.length]!;
    if (!passed.has(id)) return id;
  }
  return null;
}
