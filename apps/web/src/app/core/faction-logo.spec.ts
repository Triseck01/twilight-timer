import { factionInitials, factionLogo } from './faction-logo';

describe('Völker-Logos', () => {
  it('liefert den Pfad, wenn ein Logo vorhanden ist', () => {
    expect(factionLogo('sol')).toBe('factions/sol.webp');
  });

  it('alle Völker haben ein Logo, auch GLEdge', () => {
    expect(factionLogo('gledge')).toBe('factions/gledge.webp');
  });

  it('ohne Logo: null (Oberfläche zeigt Kürzel)', () => {
    expect(factionLogo('gibt-es-nicht')).toBeNull();
  });

  it.each([
    ['gledge', 'GU'],
    ['sol', 'FS'],
    ['l1z1x', 'LM'],
    ['naalu', 'NC'],
    ['nomad', 'N'],
    ['roh-dhna', 'RM'],
  ])('Kürzel für %s: %s', (id, initials) => {
    expect(factionInitials(id)).toBe(initials);
  });
});
