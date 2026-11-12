import test from 'node:test';
import assert from 'node:assert/strict';
import { drumRhythm } from '../drums.js';
import { vocalOnsets } from '../mic.js';
import { drumStyle } from '../drum-spells.js';

test('four distinct vocal onsets cast a spell with early or late taps', () => {
  const rhythm = drumRhythm();
  for (let i = 0; i < 4; i++) {
    const time = 1000 + i * 600;
    const first = i % 2 ? 'beat' : 'tap';
    const second = i % 2 ? 'tap' : 'beat';
    assert.equal(rhythm[first](time), null);
    assert.equal(rhythm[second](time + 100), i === 3 ? 'cast' : 'match');
    assert.equal(rhythm.beat(time + 110), null, 'onsets cannot reuse a matched tap');
  }
  assert.equal(rhythm.charge, 0);
});

test('misses and interrupted timing preserve earned charge without false matches', () => {
  const rhythm = drumRhythm();
  rhythm.beat(1000);
  assert.equal(rhythm.tap(1151), null);
  assert.equal(rhythm.beat(1200), 'match');
  rhythm.tap(2000);
  rhythm.clearTiming();
  assert.equal(rhythm.beat(2050), null);
  assert.equal(rhythm.charge, 1);
});

test('sustained voice yields one onset and low drum fundamentals yield none', () => {
  const detector = vocalOnsets(48000, 2048);
  const spectrum = new Float32Array(1024).fill(-120);
  spectrum[4] = -20;
  for (let t = 0; t < 300; t += 30) assert.equal(detector.sample(spectrum, t), null);
  spectrum[14] = -30;
  spectrum[28] = -40;
  assert.equal(detector.sample(spectrum, 300), null);
  assert.ok(detector.sample(spectrum, 330) > 250);
  for (let t = 360; t < 900; t += 30) assert.equal(detector.sample(spectrum, t), null);
});

test('legacy saves and removed customizations use an available spell', () => {
  assert.equal(drumStyle({}).spell.id, 'stars');
  assert.equal(drumStyle({ drumSpell: 'removed', drumColor: 'removed' }).tint.id, 'original');
  assert.equal(drumStyle({ drumSpell: 'rings', drumColor: 'jade' }).color, '#95edbc');
});
