import test from 'node:test';
import assert from 'node:assert/strict';
import { legends, LEGEND_BASE, LEGEND_DROP_RATE, rollLegend, equipLegend, unequipLegend, equippedLegend, battleStyle, isLegendId } from '../legends.js';
import { newGame, equipment, monsters, realms } from '../catalog.js';
import { castSpell, newTrip } from '../adventure.js';
import { forestPlan } from '../spell-forest.js';
import { hasCinematic } from '../spell-plans.js';

const expected = [
  ['銀角王劍', '森冠裁決', '鹿角騎士'], ['白潮三叉戟', '滄海王令', '潮汐女王'],
  ['赤爐重鎚', '熔心天墜', '熔爐巨像'], ['霜冠長弓', '永冬穿星', '霜冠白鹿'],
  ['天帆翼槍', '蒼穹破陣', '天帆翼獅'], ['琥珀王刃', '砂皇獅吼', '琥珀獅王'],
  ['伏雷戰鼓', '九霄雷奏', '鳴雷天將'], ['蝕月龍鐮', '終夜月蝕', '蝕月之龍']
];

test('eight legendary weapons map to their sovereigns and skills with 10 damage', () => {
  assert.equal(legends.length, 8);
  legends.forEach((legend, i) => {
    assert.deepEqual([legend.name, legend.spell.name, legend.boss], expected[i]);
    assert.equal(legend.country, i);
    assert.equal(realms[i].boss, legend.boss);
    assert.equal(legend.spell.damage, 10);
    assert.equal(legend.id, LEGEND_BASE + i);
  });
  assert.equal(LEGEND_DROP_RATE, 0.2);
});

test('legendary weapons stay out of the regular equipment collection', () => {
  assert.ok(equipment.length < LEGEND_BASE);
  for (const legend of legends) assert.ok(!equipment.some((item) => item.name === legend.name));
  assert.equal(equipment.length, 1152);
});

test('sovereign drop rolls at 20%', () => {
  const game = newGame();
  assert.equal(rollLegend(game, 2, () => .19), 2);
  assert.equal(rollLegend(game, 2, () => .2), null);
  assert.equal(rollLegend(game, 2, () => .05), 2);
  assert.deepEqual(game.legends, { 2: 2 });
});

test('only sovereign victories can drop a legend, alongside the regular reward', () => {
  const original = Math.random;
  try {
    Math.random = () => 0;
    const game = newGame();
    game.story = null;
    const trip = game.runs[0] = newTrip(0);
    const boss = monsters.find((m) => m.country === 0 && m.base === 5);
    Object.assign(trip, { step: 11, stage: 'battle', foe: boss.id, hp: 5, maxHp: 24 });
    assert.equal(castSpell(game, legends[0].spell), 'chapter');
    assert.equal(trip.legend, 0);
    assert.equal(game.legends[0], 1);
    assert.equal(game.total, 1);
    const minion = monsters.find((m) => m.country === 0 && m.base === 0);
    const next = game.runs[0] = newTrip(0);
    game.story = null;
    Object.assign(next, { step: 0, stage: 'battle', foe: minion.id, hp: 3, maxHp: 7 });
    castSpell(game, legends[0].spell);
    assert.equal(next.legend, null);
    assert.equal(game.legends[0], 1);
  } finally {
    Math.random = original;
  }
});

test('a legendary skill deals exactly 10 in one settlement', () => {
  for (const legend of legends) {
    const game = newGame();
    game.story = null;
    const trip = game.runs[0] = newTrip(0);
    const boss = monsters.find((m) => m.country === 0 && m.base === 5);
    Object.assign(trip, { step: 11, stage: 'battle', foe: boss.id, hp: 24, maxHp: 24 });
    assert.equal(castSpell(game, legend.spell), 'hit');
    assert.equal(trip.hp, 14);
  }
});

test('equipping swaps the charge skill; switching changes it; unequipping restores the setting', () => {
  const game = newGame();
  game.drumSpell = 'rings';
  game.owned[40] = 1;
  game.loadouts[0][2] = 40;
  assert.equal(battleStyle(game).spell.id, 'rings');
  assert.equal(equipLegend(game, 0), false, 'cannot equip an unowned legend');
  game.legends = { 0: 1, 5: 1 };
  assert.ok(equipLegend(game, 0));
  assert.equal(equippedLegend(game), legends[0]);
  assert.equal(battleStyle(game).spell.name, '森冠裁決');
  assert.ok(isLegendId(game.loadouts[0][2]));
  equipLegend(game, 5);
  assert.equal(battleStyle(game).spell.name, '砂皇獅吼');
  unequipLegend(game);
  assert.equal(game.loadouts[0][2], 40);
  assert.equal(battleStyle(game).spell.id, 'rings');
  assert.equal(game.drumSpell, 'rings');
});

test('all eight legendary skills are available in the cinematic catalogue', () => {
  for (const legend of legends) assert.equal(hasCinematic(legend.spell), true, legend.name);
  assert.ok(forestPlan.shots.length >= 10);
  assert.ok(forestPlan.duration > 12000);
});
