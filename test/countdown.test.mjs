import test from 'node:test';
import assert from 'node:assert/strict';
import { countdown } from '../countdown.js';

function clock(t) {
  let now = 0,
    poll = null;
  t.mock.method(performance, 'now', () => now);
  t.mock.method(globalThis, 'setInterval', (callback) => {
    poll = callback;
    return 1;
  });
  t.mock.method(globalThis, 'clearInterval', () => {
    poll = null;
  });
  return (milliseconds) => {
    now += milliseconds;
    poll?.();
  };
}

test('a delayed timer advances exactly once at its deadline', (t) => {
  const advance = clock(t),
    output = { textContent: '' },
    timer = countdown(output);
  let completed = 0;
  timer.start(10, (seconds) => String(seconds), () => completed++);
  assert.equal(output.textContent, '10');
  advance(9750);
  assert.equal(output.textContent, '1');
  assert.equal(completed, 0);
  advance(20000);
  assert.equal(output.textContent, '');
  assert.equal(completed, 1);
  advance(20000);
  assert.equal(completed, 1);
});

test('canceling a dialog prevents its pending automatic action', (t) => {
  const advance = clock(t),
    output = { textContent: '' },
    timer = countdown(output);
  timer.start(10, String, () => assert.fail('canceled action ran'));
  advance(3000);
  timer.cancel();
  advance(20000);
  assert.equal(output.textContent, '');
});

test('manual advancement replaces the old deadline and can chain into the final step', (t) => {
  const advance = clock(t),
    output = { textContent: '' },
    timer = countdown(output);
  let completed = 0;
  timer.start(4, String, () => assert.fail('old frame advanced again'));
  advance(3000);
  timer.start(4, String, () => timer.start(5, String, () => completed++));
  advance(1000);
  assert.equal(output.textContent, '3');
  advance(3000);
  assert.equal(output.textContent, '5');
  advance(5000);
  assert.equal(completed, 1);
});
