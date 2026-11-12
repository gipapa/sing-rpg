import test from 'node:test';
import assert from 'node:assert/strict';
import { drumCharge, drumVolume } from '../drums.js';
import { echoSettings, connectEcho, microphoneSession } from '../mic.js';
import { drumStyle } from '../drum-spells.js';

test('taps award every percentage from one to five without microphone input', () => {
  for (let i = 0; i < 5; i++) {
    const meter = drumCharge(() => i / 5);
    assert.deepEqual(meter.tap(), { added: i + 1, cast: false });
    assert.equal(meter.charge, i + 1);
  }
});
test('charge caps at 100 and resets for another cycle', () => {
  const meter = drumCharge(() => .99);
  for (let i = 0; i < 19; i++) assert.equal(meter.tap().cast, false);
  assert.equal(meter.tap().cast, true);
  assert.equal(meter.charge, 100);
  meter.reset();
  assert.equal(meter.charge, 0);
});
test('singing and tapping share energy and silence adds none', () => {
  const meter = drumCharge(() => .99);
  assert.equal(meter.sing(.5, true), null);
  assert.equal(meter.sing(10, false), null);
  meter.tap();
  assert.equal(meter.charge, 5);
  assert.deepEqual(meter.sing(.5, true), { added: 5, cast: false });
  assert.equal(meter.charge, 10);
  for (let i = 0; i < 17; i++) meter.tap();
  assert.deepEqual(meter.sing(1, true), { added: 5, cast: true });
  assert.equal(meter.charge, 100);
});
test('legacy saves use defaults and volume preserves mute', () => {
  assert.equal(drumVolume({}), 85);
  assert.equal(drumVolume({ drumVolume: 0 }), 0);
  assert.equal(drumStyle({}).spell.id, 'stars');
  assert.deepEqual(echoSettings({}), { enabled: false, delay: 200 });
});
test('echo routes one delayed copy only when enabled, including zero delay', () => {
  for (const enabled of [false, true]) {
    const connections = [];
    const output = {};
    const delay = { delayTime: { value: -1 }, connect(node) { connections.push(node); } };
    const source = { connect(node) { connections.push(node); return delay; } };
    const context = { destination: output, createDelay() { return delay; } };
    connectEcho(context, source, { echoEnabled: enabled, echoDelay: 0 });
    assert.equal(delay.delayTime.value, 0);
    assert.deepEqual(connections, enabled ? [delay, output] : []);
  }
  assert.equal(echoSettings({ echoDelay: NaN }).delay, 200);
  assert.equal(echoSettings({ echoDelay: 1000 }).delay, 1000);
});

test('microphone communication session restores the previous mode when released', () => {
  const host = { audioSession: { type: 'auto' } };
  const release = microphoneSession(host);
  assert.equal(host.audioSession.type, 'play-and-record');
  release();
  assert.equal(host.audioSession.type, 'auto');
  assert.doesNotThrow(() => microphoneSession({})());
  const locked = { audioSession: Object.freeze({ type: 'auto' }) };
  assert.doesNotThrow(() => microphoneSession(locked)());
});
