import test from 'node:test';
import assert from 'node:assert/strict';
import {
  completedRuns,
  travelingParty,
  newGame,
  realms,
  available,
  roster,
  monsters,
  equipment
} from '../catalog.js';
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
  game.story = null;
  assert.equal(game.name, 'あああ');
  game.name = '吟遊詩人あおい';
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
  assert.equal(game.name, '吟遊詩人あおい');
  assert.equal(game.seen[foe].count, 1);
  assert.equal(currentArea(run).element, monsters[foe].element);
  nextEvent(game, 'loot');
  assert.equal(game.total, 2);
  assert.equal(completedRuns(game), 0);
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
    assert.equal(game.runs[country].step, 11);
    assert.equal(game.runs[country].stage, 'loot');
    game.story = null;
  }
  assert.deepEqual(
    roster(game).toSorted((a, b) => a - b),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  );
  assert.equal(completedRuns(game), 8);
  game.partner = 9;
  assert.deepEqual(travelingParty(game), [9, 1, 2, 6, 3, 7, 4, 8, 5]);
  const gift = equipment[game.lastDrop];
  game.loadouts[9][gift.slot] = gift.id;
  assert.equal(game.loadouts[0][gift.slot], -1);
  game.country = 0;
  game.runs[0] = newTrip(0);
  for (let i = 0; i < 24; i++) {
    nextEvent(game, 'loot');
    assert.equal(completedRuns(game), 8 + Math.floor((i + 1) / 12));
  }
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

test('first-clear stories preserve the reward and resume at the same country’s first battle', () => {
  let game = newGame();
  game.story = null;
  game.runs[0] = newTrip(0);
  nextEvent(game, 'chapter');
  assert.equal(game.total, 12);
  assert.deepEqual(game.cleared, [0]);
  const snapshot = JSON.stringify(game);
  for (let i = 0; i < 200; i++) advance(game, 0.1, true);
  assert.equal(JSON.stringify(game), snapshot, 'combat waits for the story to finish');
  game = JSON.parse(snapshot);
  game.story = null;
  nextEvent(game, 'travel');
  assert.equal(game.country, 0);
  assert.equal(game.runs[0].step, 0);
  nextEvent(game, 'battle');
  assert.equal(monsters[game.runs[0].foe].type, '普通');
  assert.equal(game.total, 12, 'the boss reward is not granted twice');
  assert.deepEqual(roster(game), [0, 1, 2]);
});

test('a 90-minute session keeps advancing and looping after bosses without losing progress', () => {
  let game = newGame();
  game.story = null;
  game.runs[0] = newTrip(0);
  let storySeconds = 0,
    chapters = 0,
    restarts = 0;
  for (let tick = 0; tick < 90 * 60 * 10; tick++) {
    if (game.story !== null) {
      storySeconds += 0.1;
      if (storySeconds >= 13) game.story = null;
      continue;
    }
    const event = advance(game, 0.1, true);
    if (event === 'chapter') chapters++;
    if (event === 'travel' && game.runs[0].step === 0) restarts++;
    if (tick % 1000 === 0) game = JSON.parse(JSON.stringify(game));
    assert.equal(game.country, 0);
    assert.ok(game.runs[0].step >= 0 && game.runs[0].step < 12);
  }
  assert.equal(chapters, 1);
  assert.ok(restarts > 20, 'many full runs complete during a long session');
  assert.ok(completedRuns(game) >= restarts);
  assert.deepEqual(roster(game), [0, 1, 2]);
  assert.equal(Object.values(game.owned).reduce((sum, count) => sum + count, 0), game.total);
});
