/**
 * Formatiert Sekunden als „m:ss“, negativ mit „-“ (Überzeit).
 * Positive Werte werden abgerundet, damit die Restzeit nicht zu früh springt;
 * negative aufgerundet, damit angebrochene Überzeit sofort sichtbar ist.
 */
export function formatDuration(seconds: number): string {
  const negative = seconds < 0;
  const whole = negative ? Math.ceil(-seconds) : Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = String(whole % 60).padStart(2, '0');
  return `${negative ? '-' : ''}${minutes}:${rest}`;
}
