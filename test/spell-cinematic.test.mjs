import test from 'node:test';
import assert from 'node:assert/strict';
import { duration, cameraAt, warp } from '../spell-fx.js';
import { starsPlan } from '../spell-stars.js';
import { ringsPlan } from '../spell-rings.js';
import { petalsPlan } from '../spell-petals.js';
import { forestPlan } from '../spell-forest.js';
import { tidePlan } from '../spell-tide.js';
import { spellPlans } from '../spell-plans.js';
import { drumSpells } from '../drum-spells.js';

const plans = spellPlans;

// Minimal 2D context that rejects the inputs real canvases throw on.
function mockContext(strictAlpha = false) {
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
    set(target, key, value) {
      // Real canvases silently ignore an out-of-range alpha and keep the previous one.
      if (strictAlpha && key === 'globalAlpha') assert.ok(value >= 0 && value <= 1.0001, 'globalAlpha ' + value);
      target[key] = value; return true;
    }
  });
}

test('every drum spell has its own cinematic plan', () => {
  for (const spell of drumSpells) assert.ok(plans[spell.id], spell.id);
  for (const plan of Object.values(plans)) assert.ok(plan.impact < (plan.duration ?? duration));
  assert.notEqual(ringsPlan.shots, starsPlan.shots);
  assert.notEqual(petalsPlan.shots, starsPlan.shots);
});

for (const [id, plan] of Object.entries(plans)) {
  test(id + ' plan has ordered shots, a mid-cinematic impact and a camera change per shot', () => {
    assert.ok(plan.shots.length >= 8);
    assert.equal(plan.shots[0][0], 0);
    plan.shots.forEach((shot, i) => {
      if (i) assert.ok(shot[0] > plan.shots[i - 1][0]);
      assert.ok(shot[0] < (plan.duration ?? duration));
      assert.notDeepEqual(shot[2], shot[3], 'camera moves within ' + shot[1]);
    });
    assert.equal(new Set(plan.shots.map(shot => shot[1])).size, plan.shots.length);
    assert.ok(plan.shots.some(shot => shot[0] === plan.impact));
    assert.ok(plan.attack[0] < plan.impact && plan.impact < plan.attack[1]);
    assert.ok(plan.subtitle);
  });

  test(id + ' renders every frame in full and reduced motion without invalid canvas calls', () => {
    for (const reduced of [false, true]) for (let t = 0; t <= (plan.duration ?? duration); t += 20) {
      const { cam, shot } = cameraAt(plan, t, reduced);
      assert.ok(cam.every(Number.isFinite), id + ' camera at ' + t);
      assert.ok(shot[1]);
      const ctx = { color: '#a1dcf2', reduced, spell: { id }, foeY: 163 };
      const w = plan.warp ? plan.warp(t) : warp(t, plan.impact);
      // New legendary plans also guard against alphas that real canvases would ignore.
      const strict = id.startsWith('legend-');
      plan.back(mockContext(strict), t, w, ctx);
      plan.front(mockContext(strict), t, w, ctx);
      assert.ok(Number.isFinite(plan.shake(t)));
      const pose = plan.pose?.(t, w, reduced);
      if (pose) for (const value of [...Object.values(pose.hero), ...Object.values(pose.foe)]) assert.ok(Number.isFinite(value));
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

test('森冠裁決 finale: low-angle hoist, charge, dread, tracking swing, pre-hit freeze, then the cut', () => {
  const plan = forestPlan, at = (caption) => plan.shots.find(shot => shot[1] === caption);
  const order = ['天劍 · 鹿角成刃', '高舉 · 天劍指天', '蓄勢 · 風壓萬鈞', '威壓 · 天劍臨頭', '裁決 · 一刀兩斷', '停格 · 刃落一瞬', '命中 · 森冠斷海', '殘光 · 樹海兩分', '終幕 · 森冠裁決'];
  const starts = order.map(caption => at(caption)?.[0]);
  assert.ok(starts.every(Number.isFinite), 'finale shots exist');
  assert.deepEqual([...starts].sort((a, b) => a - b), starts);
  const [, raise, charge, dread, strike, freeze, impact] = starts;
  assert.equal(impact, plan.impact);
  // The hoist opens as a big low close-up and cranes up; the charge pushes in further.
  assert.ok(at('高舉 · 天劍指天')[2][2] >= 4 && at('高舉 · 天劍指天')[3][1] < at('高舉 · 天劍指天')[2][1]);
  assert.ok(at('蓄勢 · 風壓萬鈞')[3][2] > at('蓄勢 · 風壓萬鈞')[2][2]);
  // The hero raises the blade back over the shoulder before swinging it down onto the foe.
  const angle = (t) => plan.pose(t, plan.warp(t)).hero.angle;
  assert.ok(angle(charge + 200) < -.4 && angle(strike) < -.4);
  assert.ok(angle(freeze - 1) > angle(strike) + 1.5);
  // The freeze holds the swing nearly still, short of the full arc, and the camera goes quiet.
  assert.ok(Math.abs(angle(impact - 1) - angle(freeze)) < .05);
  assert.ok(angle(impact) > angle(impact - 1));
  for (let t = freeze; t < impact; t += 25) assert.equal(plan.shake(t), 0);
  assert.ok(plan.shake(impact) > Math.max(...Array.from({ length: 60 }, (_, i) => plan.shake(i * 200))));
  // The world clock nearly stops during the freeze, then runs on continuously.
  assert.ok(plan.warp(impact - 1) - plan.warp(freeze) < 25);
  for (let t = 0; t < plan.duration; t += 10) assert.ok(plan.warp(t + 10) >= plan.warp(t) && plan.warp(t + 10) - plan.warp(t) <= 10.001);
  // The foe cowers under the raised sword, then is thrown back by the cut.
  const foe = (t) => plan.pose(t, plan.warp(t)).foe;
  assert.ok(foe(dread + 400).tilt < 0);
  assert.ok(foe(impact + 1100).dx > foe(impact - 1).dx + 20);
  // The bars close for the charge and the freeze through the impact.
  for (const t of [charge + 100, freeze + 100, impact + 300]) assert.ok(plan.close.some(([a, b]) => t >= a && t < b), 'bars at ' + t);
  assert.ok(raise < charge && dread < strike);
});

test('滄海王令 crowns the sea, draws back, tracks one thrust, holds before contact and pierces', () => {
  const plan = tidePlan;
  const [form, raise, charge, dread, strike, freeze, impact, after, title] = plan.shots.slice(6);
  assert.ok(plan.impact / plan.duration >= .75 && plan.impact / plan.duration <= .8);
  assert.equal(impact[0], plan.impact);
  assert.ok(raise[2][2] >= 4 && raise[3][1] < raise[2][1]);
  assert.ok(charge[3][2] > charge[2][2]);
  assert.ok(strike[3][0] > strike[2][0] + 100, 'camera follows thrust to the right');
  assert.ok(form[2][2] < 1 && after[3][2] < 1, 'scale contrasts with the close-ups');
  const pose = t => plan.pose(t, plan.warp(t));
  assert.ok(pose(dread[0]).hero.dx < -10, 'draw back to coil the thrust');
  assert.ok(pose(freeze[0]).hero.dx > pose(strike[0]).hero.dx + 40);
  assert.deepEqual(pose(freeze[0]), pose(impact[0] - 1), 'both actors hold throughout the freeze');
  // The charged 132 px trident stops short of the foe, then crosses it during contact.
  const tip = t => 159 + pose(t).hero.dx + Math.sin(pose(t).hero.angle) * 132;
  assert.ok(tip(freeze[0]) < 330 + pose(freeze[0]).foe.dx - 10);
  assert.ok(tip(impact[0] + 150) > 330);
  for (let t = freeze[0]; t < impact[0]; t += 5) assert.equal(plan.shake(t), 0);
  for (let t = 0; t < impact[0]; t += 10) assert.ok(plan.shake(t) < plan.shake(impact[0]));
  assert.equal(Math.max(...plan.flashes.map(f => f[2])), plan.flashes.find(f => f[0] === plan.impact)[2]);
  assert.ok(plan.warp(impact[0]) - plan.warp(freeze[0]) <= 20.001);
  for (let t = 0; t < plan.duration; t++) {
    const step = plan.warp(t + 1) - plan.warp(t);
    assert.ok(step >= 0 && step <= 1.00001, 'continuous monotonic clock at ' + t);
  }
  assert.ok(pose(dread[0] + 300).foe.tilt < -.1);
  assert.ok(pose(impact[0] + 1100).foe.dx > pose(freeze[0]).foe.dx + 30);
  for (const t of [charge[0] + 100, freeze[0] + 100, impact[0] + 300]) {
    assert.ok(plan.close.some(([a, b]) => t >= a && t < b));
  }
  assert.ok(title[0] >= impact[0] + 2000 && plan.titleAt >= title[0]);
  // No pose discontinuity at any cut or anticipation keyframe.
  for (const t of [1100, 1400, 1900, 2200, 4400, 5000, 5500, 7000, 8000, 9000, 10200, 10800, 11250, 11650, 11800, 12450, 13850]) {
    for (const actor of ['hero', 'foe']) for (const key of Object.keys(pose(t)[actor])) {
      assert.ok(Math.abs(pose(t + .001)[actor][key] - pose(t - .001)[actor][key]) < .01, actor + key + ' at ' + t);
    }
  }
  const normal = plan.pose(impact[0] + 1100, plan.warp(impact[0] + 1100));
  const reduced = plan.pose(impact[0] + 1100, plan.warp(impact[0] + 1100), true);
  assert.ok(reduced.foe.dx < normal.foe.dx, 'reduced-motion knockback is smaller');
});

test('滄海王令 shot endpoints frame their subjects inside the rotated viewport', () => {
  // Explicit subject anchors for both endpoints: tips, hero, foe, crown, then contact.
  const subjects = [
    [[160, 133], [160, 130]], [[150, 158], [150, 156]],
    [[240, 112], [240, 65]], [[336, 168], [338, 168]],
    [[154, 152], [150, 158]], [[150, 154], [155, -140]],
    [[155, 75], [155, 50]], [[150, 174], [150, 160]],
    [[140, 158], [137, 160]], [[338, 168], [338, 168]],
    [[150, 160], [318, 153]], [[318, 153], [320, 153]],
    [[338, 153], [360, 153]], [[320, 153], [250, 130]],
    [[230, 150], [225, 150]]
  ];
  tidePlan.shots.forEach((shot, i) => {
    for (let end = 0; end < 2; end++) {
      const [cx, cy, z, roll] = shot[2 + end], [sx, sy] = subjects[i][end];
      const x = 240 + z * ((sx - cx) * Math.cos(roll) - (sy - cy) * Math.sin(roll));
      const y = 126 + z * ((sx - cx) * Math.sin(roll) + (sy - cy) * Math.cos(roll));
      assert.ok(x > 18 && x < 462 && y > 24 && y < 216, shot[1] + ' endpoint ' + end + ': ' + [x, y]);
      // Invert all four viewport corners too, ensuring finite bounds for wide cranes.
      for (const [vx, vy] of [[0, 0], [480, 0], [480, 240], [0, 240]]) {
        const wx = cx + ((vx - 240) * Math.cos(roll) + (vy - 126) * Math.sin(roll)) / z;
        const wy = cy + (-(vx - 240) * Math.sin(roll) + (vy - 126) * Math.cos(roll)) / z;
        assert.ok(wx > -1200 && wx < 1800 && wy > -2000 && wy < 1000, 'background covers viewport');
      }
    }
  });
  // A linear crane plus zoom can accidentally dip the actor below frame midway.
  for (let t = 8000; t < 9000; t += 10) {
    const [cx, cy, z, roll] = cameraAt(tidePlan, t, false).cam;
    const hero = tidePlan.pose(t, tidePlan.warp(t)).hero;
    const faceY = 126 + z * ((154 + hero.dx - cx) * Math.sin(roll) + (151 + hero.dy - cy) * Math.cos(roll));
    assert.ok(faceY > 24 && faceY < 216, 'hoist keeps hero readable at ' + t);
  }
  for (const [a, b] of [[3600, 4400], [10200, 10800]]) for (let t = a; t < b; t += 10) {
    const [cx, cy, z, roll] = cameraAt(tidePlan, t, false).cam;
    const foe = tidePlan.pose(t, tidePlan.warp(t)).foe;
    for (const y of [158, 178]) {
      const sy = 126 + z * ((330 + foe.dx - cx) * Math.sin(roll) + (y - cy) * Math.cos(roll));
      assert.ok(sy > 24 && sy < 216, 'preview foe stays in close-up at ' + t);
    }
  }
});
