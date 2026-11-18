import test from 'node:test';
import assert from 'node:assert/strict';
import { phoneMicrophone, microphoneSession, listen } from '../mic.js';

const phone = { kind: 'audioinput', deviceId: 'phone', label: 'iPhone Microphone' };
const car = { kind: 'audioinput', deviceId: 'car', label: 'Car Hands-Free' };
function capture(device) {
  const track = { label: device.label, muted: false, stopped: false,
    getSettings: () => ({ deviceId: device.deviceId }), stop() { this.stopped = true; } };
  return { track, getTracks: () => [track], getAudioTracks: () => [track] };
}

test('phone capture requests the concrete built-in device, skipping car and default aliases', async () => {
  const calls = [];
  const stream = capture(phone);
  const result = await phoneMicrophone({ mediaDevices: {
    enumerateDevices: async () => [car, { ...phone, deviceId: 'default' }, phone],
    getUserMedia: async constraints => { calls.push(constraints); return stream; }
  } });
  assert.equal(result, stream);
  assert.deepEqual(calls, [{ audio: { echoCancellation: false, autoGainControl: false,
    noiseSuppression: false, deviceId: { exact: 'phone' } } }]);
  assert.equal(stream.track.stopped, false);
});

test('permission capture is stopped before opening the explicitly selected phone microphone', async () => {
  const bootstrap = capture(car), selected = capture(phone);
  let lists = 0, requests = 0;
  const result = await phoneMicrophone({ mediaDevices: {
    enumerateDevices: async () => ++lists === 1 ? [{ kind: 'audioinput', deviceId: '', label: '' }] : [car, phone],
    getUserMedia: async constraints => {
      if (++requests === 1) return bootstrap;
      assert.equal(bootstrap.track.stopped, true);
      assert.equal(constraints.audio.deviceId.exact, 'phone');
      return selected;
    }
  } });
  assert.equal(result, selected);
  assert.equal(requests, 2);
});

test('unidentified inputs never become the test microphone and permission capture is released', async () => {
  const bootstrap = capture(car);
  await assert.rejects(phoneMicrophone({ mediaDevices: {
    enumerateDevices: async () => [car], getUserMedia: async () => bootstrap
  } }), /無法確認手機內建麥克風/);
  assert.equal(bootstrap.track.stopped, true);
});

test('browser selecting a different microphone despite the constraint fails and releases capture', async () => {
  const wrong = capture(car);
  await assert.rejects(phoneMicrophone({ mediaDevices: {
    enumerateDevices: async () => [phone, car], getUserMedia: async () => wrong
  } }), /無法確認手機內建麥克風/);
  assert.equal(wrong.track.stopped, true);
});

test('enumeration errors release temporary capture; denied permission is preserved', async () => {
  const bootstrap = capture(car);
  let lists = 0;
  await assert.rejects(phoneMicrophone({ mediaDevices: {
    enumerateDevices: async () => { if (++lists > 1) throw Error('enumeration failed'); return []; },
    getUserMedia: async () => bootstrap
  } }), /enumeration failed/);
  assert.equal(bootstrap.track.stopped, true);
  const denied = new DOMException('denied', 'NotAllowedError');
  await assert.rejects(phoneMicrophone({ mediaDevices: {
    enumerateDevices: async () => [], getUserMedia: async () => { throw denied; }
  } }), error => error === denied);
});

test('unsupported device selection fails before opening a microphone', async () => {
  await assert.rejects(phoneMicrophone({ mediaDevices: {
    enumerateDevices: async () => [phone], getSupportedConstraints: () => ({ deviceId: false }),
    getUserMedia: async () => assert.fail('must not open an unspecified microphone')
  } }), /無法確認手機內建麥克風/);
});

test('automatic session is restored without overriding a later session change', () => {
  const host = { audioSession: { type: 'playback' } };
  const release = microphoneSession(host, 'auto');
  assert.equal(host.audioSession.type, 'auto');
  release();
  assert.equal(host.audioSession.type, 'playback');
  const releaseAgain = microphoneSession(host, 'auto');
  host.audioSession.type = 'play-and-record';
  releaseAgain();
  assert.equal(host.audioSession.type, 'play-and-record');
});

test('test mode monitors the selected phone at zero added delay without changing camp settings', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const connections = [], contexts = [], streams = [];
  class Audio {
    constructor(options) { this.options = options; this.state = 'suspended'; this.destination = {}; contexts.push(this); }
    async resume() { this.state = 'running'; }
    async close() { this.state = 'closed'; }
    createMediaStreamSource(stream) {
      this.stream = stream;
      return { connect(node) { connections.push(node); return node; } };
    }
    createDelay() { return { delayTime: {}, connect: node => connections.push(node) }; }
    createBiquadFilter() { return { frequency: {}, Q: {}, connect() {} }; }
    createAnalyser() { return {}; }
  }
  const host = { audioSession: { type: 'ambient' }, mediaDevices: {
    enumerateDevices: async () => [phone, car],
    getUserMedia: async () => {
      assert.equal(host.audioSession.type, contexts.at(-1).options ? 'auto' : 'play-and-record');
      const stream = capture(phone); streams.push(stream); return stream;
    }
  } };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: host });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext: Audio } });
  try {
    const game = { echoEnabled: false, echoDelay: 700 };
    const input = await listen(game, { bluetoothTest: true });
    assert.deepEqual(contexts[0].options, { latencyHint: 'interactive' });
    assert.equal(contexts[0].stream, streams[0]);
    assert.equal(connections[0].delayTime.value, 0);
    assert.equal(connections[1], contexts[0].destination);
    assert.deepEqual(game, { echoEnabled: false, echoDelay: 700 });
    input.close();
    assert.equal(streams[0].track.stopped, true);
    assert.equal(contexts[0].state, 'closed');
    assert.equal(host.audioSession.type, 'ambient');
    connections.length = 0;
    const normal = await listen(game);
    assert.equal(contexts[1].options, undefined);
    assert.equal(connections.length, 1, 'normal mode with echo off connects only its analyser branch');
    normal.close();
    assert.equal(host.audioSession.type, 'ambient');
    host.mediaDevices.enumerateDevices = async () => [car];
    await assert.rejects(listen(game, { bluetoothTest: true }), /無法確認手機內建麥克風/);
    assert.equal(contexts[2].state, 'closed');
    assert.equal(streams[2].track.stopped, true);
    assert.equal(host.audioSession.type, 'ambient');
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globalThis.window;
  }
});
