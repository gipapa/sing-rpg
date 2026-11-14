import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChordPro } from '../chordpro.js';
import { scoreTimeline, timelinePosition, timelineTimeAt, timelineEntryAtBlock, scoreClock } from '../score-timing.js';

const timed = source => scoreTimeline(parseChordPro(source));
test('barlines and 4/4 meter count musical beats rather than chord changes', () => {
  const score = timed('{tempo: 120}\n{time: 4/4}\n|[C]第一句 [G]換和弦 |[Am]第二句 |');
  assert.equal(score.totalBeats, 8);
  assert.equal(score.duration, 4);
  assert.equal(score.entries.length, 1);
  assert.equal(score.estimated, false);
});
test('BPM and time signature changes apply from their place in the score', () => {
  const song = parseChordPro('{tempo: 120}\n{time: 4/4}\n|[C]第一句 |[G]第二句 |\n{tempo: 60}\n{time: 3/4}\n|[Am]第三句 |');
  const score = scoreTimeline(song);
  assert.equal(song.tempo, '120');
  assert.equal(song.time, '4/4');
  assert.deepEqual(score.entries.map(entry => [entry.start, entry.end, entry.beats]), [[0, 4, 8], [4, 7, 3]]);
  assert.equal(score.duration, 7);
});
test('explicit beat duration applies only to the next musical line', () => {
  const score = timed('{tempo: 120}\n{time: 4/4}\n{beats: 6}\n{comment: 下一行六拍}\n[C]文字\n[G]下一行 [Am]換和弦');
  assert.equal(score.entries[0].beats, 6);
  assert.equal(score.entries[0].estimated, false);
  assert.equal(score.entries[1].beats, 8);
  assert.equal(score.entries[1].estimated, true);
  assert.equal(score.duration, 7);
});
test('6/8 counts three quarter-note beats per bar', () => {
  const score = timed('{tempo: 90}\n{meta: time 6/8}\n|[C]一小節 |');
  assert.equal(score.totalBeats, 3);
  assert.equal(score.duration, 2);
  assert.equal(score.estimated, false);
});
test('unmarked charts explicitly use an estimate of one bar per chord', () => {
  const score = timed('{tempo: 120}\n{time: 4/4}\n[C]文字 [G/B]文字 [Am]文字');
  assert.equal(score.totalBeats, 12);
  assert.equal(score.duration, 6);
  assert.equal(score.estimated, true);
  assert.equal(timed('{tempo: 120}\n|[C]未設拍號 |').estimated, true);
});
test('a six-string text TAB system counts its bars once', () => {
  const score = timed('{tempo: 120}\n{time: 4/4}\n{sot}\nE|--0--|--3--|\nB|-----|-----|\nG|-----|-----|\nD|-----|-----|\nA|-----|-----|\nE|-----|-----|\n{eot}');
  assert.equal(score.entries.length, 1);
  assert.equal(score.entries[0].endBlockIndex, score.entries[0].blockIndex + 5);
  assert.equal(score.totalBeats, 8);
  assert.equal(score.duration, 4);
});
test('empty metadata, missing tempo and unusable tempo do not invent a playback speed', () => {
  assert.equal(timed('{tempo: 120}\n{time: 4/4}').entries.length, 0);
  assert.match(timed('[C]沒有 BPM').error, /tempo/);
  assert.equal(timed('{tempo: 0}\n[C]文字').duration, 0);
  assert.equal(timed('{tempo: 1e-323}\n[C]文字').duration, 0);
});
test('repeat signs flag a printed-pass estimate rather than promising repeated playback', () => {
  const score = timed('{tempo: 120}\n{time: 4/4}\n|:[C]文字 |[G]文字 :|');
  assert.equal(score.totalBeats, 8);
  assert.equal(score.estimated, true);
});
test('pixel distance follows musical time and can change without changing duration', () => {
  const score = timed('{tempo: 120}\n{time: 4/4}\n|[C]第一行 |\n|[G]第二行 |');
  assert.equal(score.duration, 4);
  assert.deepEqual(timelinePosition(score, [0, 100, 200], 1), { top: 50, index: 0 });
  assert.deepEqual(timelinePosition(score, [0, 200, 500], 1), { top: 100, index: 0 });
  assert.deepEqual(timelinePosition(score, [0, 100, 200], 3), { top: 150, index: 1 });
  assert.deepEqual(timelinePosition(score, [0, 100, 200], 999), { top: 200, index: 1 });
  assert.equal(timelineTimeAt(score, [0, 100, 200], 150), 3);
});
test('playback uses elapsed time and does not slow down when frames are skipped', () => {
  let now = 1000;
  const clock = scoreClock(() => now);
  clock.load(90); clock.play();
  now += 32123;
  assert.equal(clock.position(), 32.123);
});
test('pause and resume retain the fractional beat and exclude paused time', () => {
  let now = 0;
  const clock = scoreClock(() => now);
  clock.load(10); clock.play(); now = 1250; clock.pause();
  now = 15250;
  assert.equal(clock.position(), 1.25);
  clock.play(); now += 500;
  assert.equal(clock.position(), 1.75);
  clock.pause(); clock.seek(8); clock.play(); now += 500;
  assert.equal(clock.position(), 8.5);
});
test('playback clamps to the end and can restart from the beginning', () => {
  let now = 0;
  const clock = scoreClock(() => now);
  clock.load(2); clock.play(); now = 3000;
  assert.equal(clock.position(), 2);
  clock.pause(); clock.play();
  assert.equal(clock.position(), 0);
  clock.load(4, 1.5);
  assert.equal(clock.playing, false);
  assert.equal(clock.position(), 1.5);
});
test('lyric block activation seeks to its musical start across tempo changes', () => {
  const score = timed('{tempo: 120}\n{time: 4/4}\n{start_of_verse: 主歌}\n|[C]第一行 |\n{tempo: 60}\n|[G]第二行 |');
  assert.equal(timelineEntryAtBlock(score, 0), null);
  assert.equal(timelineEntryAtBlock(score, score.entries[1].blockIndex).start, 2);
  assert.equal(timelineEntryAtBlock(score, 999), null);
  const tab = timed('{tempo: 120}\n{time: 4/4}\n{sot}\nE|--0--|\nB|-----|\n{eot}');
  assert.equal(timelineEntryAtBlock(tab, tab.entries[0].endBlockIndex), tab.entries[0]);
});
test('seeking forward and backward while playing preserves playback and continues from the new time', () => {
  let now = 0;
  const clock = scoreClock(() => now);
  const score = timed('{tempo: 120}\n{time: 4/4}\n|[C]第一行 |\n|[G]第二行 |\n|[Am]第三行 |');
  clock.load(score.duration); clock.play(); now = 500;
  clock.seek(score.entries[2].start);
  assert.equal(clock.playing, true);
  now += 250;
  assert.equal(clock.position(), 4.25);
  clock.seek(timelineTimeAt(score, [0, 100, 200, 300], 50));
  assert.equal(clock.playing, true);
  now += 500;
  assert.equal(clock.position(), 1.5);
  clock.pause(); clock.seek(score.entries[1].start); now += 1000;
  assert.equal(clock.playing, false);
  assert.equal(clock.position(), 2);
});
