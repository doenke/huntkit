import type { Quelle } from './types';

/**
 * Woher eine Tafel stammt – damit man nachlesen kann, und damit man sieht, ob
 * eine Tafel woanders dieselbe ist: Gleiche Quelle, gleiche Zuordnung.
 *
 * Angegeben ist, was die Hefte selbst nennen, Adressen genau wie gedruckt.
 * Wo ein Heft keine Quelle nennt, steht das Heft mit seinem Anhang da.
 */

const NACHTSCHICHT = 'Dortmunder Nachtschicht 2026, Regelheft';
const RAETSELNACHT = 'RätselNacht 5 (2025), Infoheft';

export function nachtschicht(anhang: string, thema: string): Quelle {
  return { titel: `${NACHTSCHICHT}, Anhang ${anhang}: ${thema}`, url: 'https://dortmunder-nachtschicht.de/' };
}

export function raetselnacht(anhang: string, thema: string): Quelle {
  return { titel: `${RAETSELNACHT}, Anhang ${anhang}: ${thema}`, url: 'https://raetselnacht.de/' };
}

/** Eine Wikipedia-Seite, wie ein Heft sie als Quelle nennt. */
export function wikipedia(titel: string, url: string): Quelle {
  return { titel: `Wikipedia: ${titel}`, url };
}
