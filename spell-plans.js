import { starsPlan } from './spell-stars.js';
import { ringsPlan } from './spell-rings.js';
import { petalsPlan } from './spell-petals.js';
import { forestPlan } from './spell-forest.js';
import { tidePlan } from './spell-tide.js';
import { forgePlan } from './spell-forge.js';
import { frostPlan } from './spell-frost.js';
import { galePlan } from './spell-gale.js';

// Each spell owns its choreography: camera shots, impact beat, speed lines, flashes,
// shake curve and the world-space effect layers drawn behind/in front of the actors.
export const spellPlans = {
  stars: starsPlan, rings: ringsPlan, petals: petalsPlan,
  'legend-0': forestPlan, 'legend-1': tidePlan, 'legend-2': forgePlan,
  'legend-3': frostPlan,
  'legend-4': galePlan
};
// Legendary skills without a finished cinematic settle with the cut-in only.
export const hasCinematic = (spell) => !!spellPlans[spell.id];
