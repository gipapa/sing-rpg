import test from 'node:test';
import assert from 'node:assert/strict';
import { duration, cameraAt, warp } from '../spell-fx.js';
import { starsPlan } from '../spell-stars.js';
import { ringsPlan } from '../spell-rings.js';
import { petalsPlan } from '../spell-petals.js';
import { drumSpells } from '../drum-spells.js';

const plans = { stars: starsPlan, rings: ringsPlan, petals: petalsPlan };

// Minimal 2D context that rejects the inputs real canvases throw on.
function mockContext() {
  const gradient = { addColorStop(offset) { assert.ok(offset >= 0 && offset <= 1); } };
  return new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return (...args) => {
        assert.ok(args.every(Number.isFinite), key + ' received ' + args);
        if (key === 'createRadialGradient') assert.ok(args[2] >= 0 && args[5] >= 0, 'negative radius');
        return gradient;
      };
      if (key === 'arc' || key === 'ellipse') return (...args) => {
        assert.ok(args.every(Number.isFinite), key + ' received ' + args);
        assert.ok(args[2] >= 0 && (key === 'arc' || args[3] >= 0), key + ' negative radius ' + args);
      };
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; }
  });
}

test('every drum spell has its own cinematic plan', () => {
  for (const spell of drumSpells) assert.ok(plans[spell.id], spell.id);
  assert.notEqual(ringsPlan.shots, starsPlan.shots);
  assert.notEqual(petalsPlan.shots, starsPlan.shots);
});

for (const [id, plan] of Object.entries(plans)) {
  test(id + ' plan has ordered shots, a mid-cinematic impact and a camera change per shot', () => {
    assert.ok(plan.shots.length >= 8);
    assert.equal(plan.shots[0][0], 0);
    plan.shots.forEach((shot, i) => {
      if (i) assert.ok(shot[0] > plan.shots[i - 1][0]);
      assert.ok(shot[0] < duration);
      assert.notDeepEqual(shot[2], shot[3], 'camera moves within ' + shot[1]);
    });
    assert.equal(new Set(plan.shots.map(shot => shot[1])).size, plan.shots.length);
    assert.ok(plan.shots.some(shot => shot[0] === plan.impact));
    assert.ok(plan.attack[0] < plan.impact && plan.impact < plan.attack[1]);
    assert.ok(plan.subtitle);
  });

  test(id + ' renders every frame in full and reduced motion without invalid canvas calls', () => {
    for (const reduced of [false, true]) for (let t = 0; t <= duration; t += 20) {
      const { cam, shot } = cameraAt(plan, t, reduced);
      assert.ok(cam.every(Number.isFinite), id + ' camera at ' + t);
      assert.ok(shot[1]);
      const ctx = { color: '#a1dcf2', reduced, spell: { id }, foeY: 163 };
      const w = warp(t, plan.impact);
      plan.back(mockContext(), t, w, ctx);
      plan.front(mockContext(), t, w, ctx);
      assert.ok(Number.isFinite(plan.shake(t)));
    }
  });
}

test('reduced motion holds a steady camera', () => {
  for (const plan of Object.values(plans)) {
    assert.deepEqual(cameraAt(plan, 1500, true).cam, cameraAt(plan, 8000, true).cam);
  }
});

test('hit-stop slows time briefly then resumes continuously', () => {
  assert.equal(warp(1000, 7800), 1000);
  assert.ok(warp(7900, 7800) - warp(7800, 7800) < 20);
  assert.ok(Math.abs(warp(8060, 7800) - (8060 - 229)) < 1);
});
