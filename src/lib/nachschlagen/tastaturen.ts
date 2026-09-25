/**
 * Tastaturlayouts zum Nachschlagen (Regelheft Anhang H).
 *
 * Rätsel mit Tastaturen fragen nach Nachbartasten („eins nach rechts“), nach
 * dem Zeichen auf der Umschaltebene („! ist 1“) oder nach dem, was auf dem
 * Handy hinter einem langen Druck liegt. Dafür steht hier die Lage jeder
 * Taste, nicht ihre Bedeutung.
 *
 * Die PC-Tastatur ist die deutsche nach DIN 2137 (Grund- und Umschaltebene
 * wie auf jeder deutschen Tastatur). Von der AltGr-Ebene stehen nur die
 * Zeichen, die überall gleich liegen; die vielen Sonderzeichen und Tottasten
 * der erweiterten Belegung E1 fehlen bewusst.
 */

export interface Taste {
  /** Was ohne Umschalten entsteht; bei Buchstaben der Buchstabe selbst. */
  basis: string;
  umschalt?: string;
  altgr?: string;
  /** Lange drücken (Handy). */
  lang?: string;
  /** Breite in Tasteneinheiten, Standard 1. */
  breite?: number;
  /** Steuertaste ohne Zeichen – grau, nur Beschriftung. */
  steuer?: boolean;
}

export type Reihe = ReadonlyArray<Taste>;

export interface Tastatur {
  id: string;
  titel: string;
  hinweis: string;
  reihen: ReadonlyArray<Reihe>;
}

const t = (basis: string, umschalt?: string, altgr?: string): Taste => ({
  basis,
  ...(umschalt ? { umschalt } : {}),
  ...(altgr ? { altgr } : {})
});
const buchstaben = (folge: string, altgr: Record<string, string> = {}): Taste[] =>
  [...folge].map((b) => ({ basis: b, ...(altgr[b] ? { altgr: altgr[b] } : {}) }));
const steuer = (basis: string, breite: number): Taste => ({ basis, breite, steuer: true });

export const PC_DEUTSCH: Tastatur = {
  id: 'pc',
  titel: 'PC-Tastatur, deutsch',
  hinweis:
    'Oben links die Umschaltebene, unten links die Grundbelegung, unten rechts AltGr. ^, ´ und ` sind Tottasten: Sie setzen einen Akzent auf den nächsten Buchstaben.',
  reihen: [
    [
      t('^', '°'), t('1', '!'), t('2', '"', '²'), t('3', '§', '³'), t('4', '$'), t('5', '%'),
      t('6', '&'), t('7', '/', '{'), t('8', '(', '['), t('9', ')', ']'), t('0', '=', '}'),
      t('ß', '?', '\\'), t('´', '`'), steuer('⌫', 2)
    ],
    [steuer('⇥', 1.5), ...buchstaben('QWERTZUIOPÜ', { Q: '@', E: '€' }), t('+', '*', '~'), steuer('↵', 1.5)],
    [steuer('⇪', 1.75), ...buchstaben('ASDFGHJKLÖÄ'), t('#', "'"), steuer('', 1.25)],
    [
      steuer('⇧', 1.25), t('<', '>', '|'), ...buchstaben('YXCVBNM', { M: 'µ' }),
      t(',', ';'), t('.', ':'), t('-', '_'), steuer('⇧', 2.75)
    ],
    [
      steuer('Strg', 1.5), steuer('⊞', 1.25), steuer('Alt', 1.25), steuer('', 5.75),
      steuer('AltGr', 1.25), steuer('⊞', 1.25), steuer('☰', 1.25), steuer('Strg', 1.5)
    ]
  ]
};

const lang = (folge: string, zeichen: string): Taste[] =>
  [...folge].map((b, i) => ({ basis: b, lang: [...zeichen][i] as string }));

export const HANDY_DEUTSCH: Tastatur = {
  id: 'handy',
  titel: 'Handy-Tastatur, deutsch (Gboard)',
  hinweis: 'Die kleine Ziffer oder das kleine Zeichen erscheint, wenn man die Taste lange drückt.',
  reihen: [
    lang('QWERTZUIOP', '1234567890'),
    [steuer('', 0.5), ...lang('ASDFGHJKL', '@#$_&-+()'), steuer('', 0.5)],
    [steuer('⇧', 1.5), ...lang('YXCVBNM', '*"\':;!?'), steuer('⌫', 1.5)],
    [steuer('?123', 1.5), { basis: ',', lang: '☺' }, steuer('', 5), { basis: '.' }, steuer('↵', 1.5)]
  ]
};

export const TASTATUREN: ReadonlyArray<Tastatur> = [PC_DEUTSCH, HANDY_DEUTSCH];

export function reihenbreite(reihe: Reihe): number {
  return reihe.reduce((summe, taste) => summe + (taste.breite ?? 1), 0);
}
