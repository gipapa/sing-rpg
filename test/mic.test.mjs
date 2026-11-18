import test from 'node:test';
import assert from 'node:assert/strict';
import { phoneMicrophone, microphoneSession, microphoneSettings, listMicrophones, soundDetector, listen } from '../mic.js';

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

test('unidentified inputs never become the phone microphone and permission capture is released', async () => {
  const bootstrap = capture(car);
  await assert.rejects(phoneMicrophone({ mediaDevices: {
    enumerateDevices: async () => [{ kind: 'audioinput', label: '', deviceId: '' }], getUserMedia: async () => bootstrap
  } }), /無法確認手機內建麥克風/);
  assert.equal(bootstrap.track.stopped, true);
});

test('browser selecting a different microphone despite the constraint fails and releases capture', async () => {
  const wrong = capture(car);
  await assert.rejects(phoneMicrophone({ mediaDevices: {
    enumerateDevices: async () => [phone, car], getUserMedia: async () => wrong
  } }), /未使用指定的麥克風/);
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

test('microphone settings default to automatic combat and validate saved options', () => {
  assert.deepEqual(microphoneSettings(), { source: 'none', session: 'play-and-record', latency: 'interactive',
    echoCancellation: true, noiseSuppression: false, autoGainControl: false, threshold: 2, cooldown: 1000 });
  assert.deepEqual(microphoneSettings({ micSource: 'invalid', micSessionType: 'playback', micLatencyHint: -1,
    micEchoCancellation: 'false', micNoiseSuppression: 'true', micAutoGainControl: 1 }), microphoneSettings());
  assert.equal(microphoneSettings({ micSource: 'device:' }).source, 'none');
  assert.equal(microphoneSettings({ micSource: 'default' }).source, 'default');
  assert.equal(microphoneSettings({ micThreshold: NaN, micCooldown: Infinity }).cooldown, 1000);
  assert.equal(microphoneSettings({ micThreshold: NaN }).threshold, 2);
  assert.equal(microphoneSettings({ micThreshold: 0 }).threshold, .1);
  assert.equal(microphoneSettings({ micThreshold: 99 }).threshold, 20);
  assert.equal(microphoneSettings({ micCooldown: 0 }).cooldown, 300);
  assert.equal(microphoneSettings({ micCooldown: 99999 }).cooldown, 3000);
});

test('no microphone returns without touching capture or audio APIs', async () => {
  assert.equal(await listen({ micSource: 'none', echoEnabled: true }), null);
  assert.equal(await listen(), null);
});

test('volume detection ignores quiet audio and isolated clicks, then accepts sustained sound', () => {
  const detector = soundDetector(.02);
  const quiet = new Float32Array(512).fill(.01);
  const loud = Float32Array.from({ length: 512 }, (_, i) => i % 2 ? -.08 : .04);
  for (let i = 0; i < 30; i++) assert.equal(detector.sample(quiet, .1), false);
  assert.equal(detector.sample(loud, .1), false, 'brief click');
  assert.equal(detector.sample(quiet, .1), false, 'silence clears the hold');
  assert.equal(detector.sample(loud, .1), false);
  assert.equal(detector.sample(loud, .1), true);
  assert.equal(detector.sample(loud, .1), true, 'sustained audio stays eligible');
  assert.equal(detector.sample(quiet, .1), false);
  detector.sample(loud, .2);
  detector.reset();
  assert.equal(detector.sample(loud, .1), false, 'resume requires a fresh hold');
  assert.equal(detector.sample(new Float32Array(), .2), false);
});

test('volume threshold can be tuned without requiring periodic or pitched sound', () => {
  const samples = new Float32Array(512).fill(.03);
  assert.equal(soundDetector(.02).sample(samples, .2), true);
  assert.equal(soundDetector(.04).sample(samples, .2), false);
});

test('listing named inputs needs no capture and excludes aliases and outputs', async () => {
  const inputs = await listMicrophones({ mediaDevices: {
    enumerateDevices: async () => [phone, car, { ...phone, deviceId: 'default' }, { kind: 'audiooutput', deviceId: 'speaker' }],
    getUserMedia: async () => assert.fail('permission already granted')
  } });
  assert.deepEqual(inputs, [phone, car]);
});

test('selected microphone and independent audio settings reach capture, playback and cleanup', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const connections = [], contexts = [], streams = [], requests = [];
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
    createAnalyser() {
      this.reads = 0;
      this.analyser = { getFloatTimeDomainData: samples => { this.reads++; samples.fill(.04); } };
      return this.analyser;
    }
  }
  const host = { audioSession: { type: 'ambient' }, mediaDevices: {
    enumerateDevices: async () => [phone, car],
    getUserMedia: async constraints => {
      requests.push({ constraints, session: host.audioSession.type });
      const stream = capture(constraints.audio.deviceId?.exact === 'car' ? car : phone);
      streams.push(stream); return stream;
    }
  } };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: host });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext: Audio } });
  try {
    const game = { micSource: 'phone', micSessionType: 'auto', micLatencyHint: 'balanced',
      micEchoCancellation: false, micNoiseSuppression: true, micAutoGainControl: true,
      echoEnabled: true, echoDelay: 350, micThreshold: 3, micCooldown: 1500 };
    const saved = structuredClone(game);
    const input = await listen(game);
    assert.deepEqual(contexts[0].options, { latencyHint: 'balanced' });
    assert.deepEqual(requests[0], { session: 'auto', constraints: { audio: {
      echoCancellation: false, autoGainControl: true, noiseSuppression: true, deviceId: { exact: 'phone' }
    } } });
    assert.equal(contexts[0].stream, streams[0]);
    assert.equal(connections[0].delayTime.value, .35);
    assert.equal(connections[1], contexts[0].destination);
    assert.deepEqual(game, saved);
    assert.equal(input.cooldown, 1.5);
    assert.equal(contexts[0].analyser.fftSize, 512);
    assert.equal(input.sample(.1), false);
    assert.equal(input.sample(.1), true);
    input.track.muted = true;
    assert.equal(input.sample(.1), false);
    assert.equal(contexts[0].reads, 2, 'muted microphone skips sample acquisition');
    input.track.muted = false;
    assert.equal(input.sample(.1), false);
    contexts[0].state = 'suspended';
    assert.equal(input.sample(.1), false);
    assert.equal(contexts[0].reads, 3, 'suspended context skips sample acquisition');
    contexts[0].state = 'running';
    input.track.readyState = 'ended';
    assert.equal(input.sample(.1), false);
    assert.equal(contexts[0].reads, 3, 'ended track skips sample acquisition');
    input.close();
    assert.equal(streams[0].track.stopped, true);
    assert.equal(contexts[0].state, 'closed');
    assert.equal(host.audioSession.type, 'ambient');
    connections.length = 0;
    const normal = await listen({ micSource: 'default' });
    assert.deepEqual(contexts[1].options, { latencyHint: 'interactive' });
    assert.deepEqual(requests[1], { session: 'play-and-record', constraints: { audio: {
      echoCancellation: true, autoGainControl: false, noiseSuppression: false
    } } });
    assert.equal(connections.length, 1, 'normal mode with echo off connects only its analyser branch');
    normal.close();
    assert.equal(host.audioSession.type, 'ambient');
    connections.length = 0;
    const external = await listen({ micSource: 'device:car', micLatencyHint: 'playback', echoEnabled: true, echoDelay: 0 });
    assert.equal(external.track.label, car.label);
    assert.equal(requests[2].constraints.audio.deviceId.exact, 'car');
    assert.deepEqual(contexts[2].options, { latencyHint: 'playback' });
    assert.equal(requests[2].session, 'play-and-record', 'playback latency preference does not set playback-only session');
    assert.equal(connections[0].delayTime.value, 0);
    external.close();
    assert.equal(streams[2].track.stopped, true);
    host.mediaDevices.enumerateDevices = async () => [car];
    await assert.rejects(listen(game), /無法確認手機內建麥克風/);
    assert.equal(contexts[3].state, 'closed');
    assert.equal(requests.length, 3, 'missing phone does not acquire a default input');
    assert.equal(host.audioSession.type, 'ambient');
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globalThis.window;
  }
});
