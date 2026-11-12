import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, realms, available, roster, monsters, equipment } from '../catalog.js';
import { newTrip, advance, currentArea } from '../adventure.js';

function nextEvent(game, wanted) {
  for (let i = 0; i < 2000; i++) {
    const event = advance(game, 0.25, true);
    if (event === wanted) return;
    assert.notEqual(event, 'chapter', 'unexpected chapter');
  }
  assert.fail('timed out waiting for ' + wanted);
}

test('the atlas has unique names and every local encounter and drop pool exists', () => {
  const regions = new Set();
  for (const [country, realm] of realms.entries()) {
    for (const land of realm.land)
      for (const element of realm.sub) regions.add([country, land, element].join('/'));
    for (const element of realm.sub)
      for (let base = 0; base < 6; base++) {
        for (const book of [monsters, equipment]) {
          const variants = book.filter(
            (e) => e.country === country && e.element === element && e.base === base
          );
          assert.equal(new Set(variants.map((e) => e.form)).size, 8);
          for (const e of variants) assert.equal(book[e.id], e);
        }
      }
  }
  assert.equal(regions.size, 96);
  for (const book of [monsters, equipment]) assert.equal(new Set(book.map((e) => e.name)).size, 1152);
});

test('a country keeps its enemy, area and HP while away or reloading', () => {
  let game = newGame();
  assert.equal(game.name, 'あああ');
  game.name = '勇者あおい';
  game.cleared.push(0);
  game.runs[0] = newTrip(0);
  nextEvent(game, 'battle');
  const run = game.runs[0],
    { foe, hp } = run;
  for (let i = 0; i < 16; i++) advance(game, 0.25, false);
  assert.equal(run.hp, hp);
  nextEvent(game, 'hit');
  const snapshot = structuredClone(run);
  game.country = 2;
  game.runs[2] = newTrip(2);
  nextEvent(game, 'loot');
  game = JSON.parse(JSON.stringify(game));
  game.country = 0;
  assert.deepEqual(game.runs[0], snapshot);
  assert.equal(game.name, '勇者あおい');
  assert.equal(game.seen[foe].count, 1);
  assert.equal(currentArea(run).element, monsters[foe].element);
  nextEvent(game, 'loot');
  assert.equal(game.total, 2);
});

test('eight first clears recruit exactly once, then the princess can replay indefinitely', () => {
  let game = newGame();
  assert.deepEqual(roster(game), [0, 1]);
  assert.equal(available(game, 1), false);
  game.story = null;
  for (const country of [0, 4, 1, 5, 2, 6, 3, 7]) {
    assert.equal(available(game, country), true);
    if (country !== 7) assert.equal(available(game, 7), false);
    game.country = country;
    const trip = (game.runs[country] = newTrip(country));
    assert.equal(new Set(trip.areas.map((a) => a.land)).size, 4);
    assert.equal(trip.areas[3].land, 3);
    for (let i = 0; i < 12; i++) {
      nextEvent(game, 'battle');
      const foe = monsters[trip.foe];
      assert.equal(foe.type, i === 11 ? '國主' : i % 3 === 2 ? '菁英' : '普通');
      nextEvent(game, i === 11 ? 'chapter' : 'loot');
      const reward = equipment[game.lastDrop];
      assert.equal(reward.country, country);
      assert.equal(reward.element, foe.element);
    }
    game = JSON.parse(JSON.stringify(game));
    assert.equal(game.story, country);
    assert.equal(game.runs[country], undefined);
    game.story = null;
  }
  assert.deepEqual(
    roster(game).toSorted((a, b) => a - b),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  );
  game.partner = 9;
  const gift = equipment[game.lastDrop];
  game.loadouts[9][gift.slot] = gift.id;
  assert.equal(game.loadouts[0][gift.slot], -1);
  game.country = 0;
  game.runs[0] = newTrip(0);
  for (let i = 0; i < 24; i++) nextEvent(game, 'loot');
  nextEvent(game, 'travel');
  assert.equal(game.runs[0].step, 0);
  assert.equal(game.total, 120);
  assert.equal(
    Object.values(game.owned).reduce((a, b) => a + b, 0),
    120
  );
  assert.equal(game.cleared.length, 8);
  assert.equal(game.story, null);
});
