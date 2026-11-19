// Only names are needed for the camp catalogue. The browser caches each imported module.
const modules = {
  stars: 'stars', rings: 'rings', petals: 'petals',
  'legend-0': 'forest', 'legend-1': 'tide', 'legend-2': 'forge', 'legend-3': 'frost',
  'legend-4': 'gale', 'legend-5': 'amber', 'legend-6': 'thunder', 'legend-7': 'eclipse'
};
export const hasCinematic = spell => Object.hasOwn(modules, spell.id);
export async function loadSpellPlan(id) {
  if (!Object.hasOwn(modules, id)) throw Error('找不到招式分鏡。');
  const name = modules[id];
  const module = await import(`./spell-${name}.js`);
  return module[name + 'Plan'];
}
