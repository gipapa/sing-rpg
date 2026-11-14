import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseChordPro, transposeChord } from '../chordpro.js';
import { importSongbook, exportSongbook, uniqueImports, readingSettings, validateCollection, maxSongBytes } from '../songbook-data.js';

const source = '{title: 測試歌曲}\n{artist: 測試作者}\n{tempo: 90}\n{time: 4/4}\n[C]原創測試文字 [G/B]第二段';
test('plain songbook backup round trips the full source and per-song reading settings', () => {
  const songs = [{ chordpro: source, settings: { font: 28, speed: 30, shift: -2 } }];
  const backup = exportSongbook(songs);
  const restored = importSongbook(backup, 'backup.json');
  assert.deepEqual(restored, songs);
  assert.equal(parseChordPro(restored[0].chordpro).tempo, '90');
  assert.equal(parseChordPro(restored[0].chordpro).time, '4/4');
  assert.equal(JSON.parse(backup).version, 2);
});
test('ChordPro file import retains Chinese lyrics, source formatting and slash chords', () => {
  const songs = importSongbook(source, '測試.cho');
  assert.equal(songs[0].chordpro, source);
  assert.deepEqual(songs[0].settings, { font: 22, speed: 22, shift: 0 });
});
test('invalid backups and oversize files fail before any storage operation', () => {
  assert.throws(() => importSongbook('{bad', 'backup.json'), /JSON/);
  assert.throws(() => importSongbook('PDF', 'score.pdf'), /文字譜/);
  assert.throws(() => importSongbook(JSON.stringify({ format: 'sing-rpg-songbook', version: 1, ciphertext: 'data' }), 'old.json'), /明文/);
  assert.throws(() => validateCollection([{ chordpro: source }, { chordpro: '' }]), /空白/);
  assert.throws(() => importSongbook('中'.repeat(maxSongBytes / 3 + 1), 'large.cho'), /256 KB/);
  assert.throws(() => validateCollection(Array(501).fill({ chordpro: source })), /500/);
});
test('importing the same song again skips duplicates without modifying existing songs', () => {
  const existing = [{ id: 'keep', chordpro: source }];
  const incoming = [{ chordpro: '\uFEFF' + source.replaceAll('\n', '\r\n') + '\n' }, { chordpro: '[D]另一首' }, { chordpro: '[D]另一首' }];
  assert.deepEqual(uniqueImports(existing, incoming), [{ chordpro: '[D]另一首' }]);
  assert.equal(existing[0].id, 'keep');
  assert.equal(existing[0].chordpro, source);
});
test('backup import ignores external IDs and clamps reading preferences', () => {
  const text = JSON.stringify({ format: 'sing-rpg-songbook', version: 2, songs: [{ id: 'overwrite', chordpro: source, settings: { font: 999, speed: -5, shift: 90 } }] });
  const [song] = importSongbook(text, 'backup.JSON');
  assert.equal(song.id, undefined);
  assert.deepEqual(song.settings, { font: 36, speed: 5, shift: 12 });
  assert.deepEqual(readingSettings({ font: NaN, speed: Infinity }), { font: 22, speed: 22, shift: 0 });
});
test('ChordPro preserves Chinese word positions, sections and TAB', () => {
  const song = parseChordPro('\uFEFF{t: 示範}\r\n{artist: 作者}\n{key: C}\n{capo: 2}\n{start_of_verse: 第一段}\n[Cadd9]風 [G/B]吹來\n{end_of_verse}\n{soc}\n[Am7][F]星光\n{eoc}\n{sot}\nE--0--3--\n{eot}');
  assert.equal(song.title, '示範');
  assert.equal(song.artist, '作者');
  assert.equal(song.capo, '2');
  assert.deepEqual(song.blocks[1].tokens, [{ chord: 'Cadd9', lyric: '風 ' }, { chord: 'G/B', lyric: '吹來' }]);
  assert.equal(song.blocks[2].text, '副歌');
  assert.deepEqual(song.blocks[3].tokens, [{ chord: 'Am7', lyric: '' }, { chord: 'F', lyric: '星光' }]);
  assert.equal(song.blocks[4].type, 'tab');
});
test('unknown directives and markup stay text without altering object prototypes', () => {
  const song = parseChordPro('{__proto__: bad}\n{unknown: hidden}\n<script>alert(1)</script>\n[C]<img src=x onerror=alert(1)>');
  assert.equal(Object.getPrototypeOf(song), Object.prototype);
  assert.equal(song.blocks[0].tokens[0].lyric, '<script>alert(1)</script>');
  assert.equal(song.blocks[1].tokens[0].lyric, '<img src=x onerror=alert(1)>');
});
test('tempo changes stay at their score positions without replacing the starting BPM', () => {
  const song = parseChordPro(source + '\n{tempo: 100}\n[G]第二段\n{meta: tempo 90}\n[C]第三段');
  assert.equal(song.tempo, '90');
  assert.equal(song.time, '4/4');
  assert.equal(song.blocks[1].text, '速度變更：100 BPM');
  assert.equal(song.blocks[3].text, '速度變更：90 BPM');
});
test('invalid tempo values are ignored and omitted tempo stays unspecified', () => {
  assert.equal(parseChordPro('[C]文字').tempo, '');
  const song = parseChordPro('{tempo: zero}\n{tempo: -10}\n{tempo: 0}\n{tempo: Infinity}\n{meta: tempo 92.5}\n[C]文字');
  assert.equal(song.tempo, '92.5');
  assert.equal(song.blocks.length, 1);
});
test('transposition retains chord quality and handles bass notes', () => {
  assert.equal(transposeChord('Cadd9', 2), 'Dadd9');
  assert.equal(transposeChord('G/B', 2), 'A/C#');
  assert.equal(transposeChord('Am7/G', -2), 'Gm7/F');
  assert.equal(transposeChord('EØ/Bb', -1), 'EbØ/A');
  assert.equal(transposeChord('F♯m7', 1), 'Gm7');
  assert.equal(transposeChord('N.C.', 2), 'N.C.');
});
test('every built-in score is plain ChordPro with a title and tempo', async () => {
  const base = new URL('../songs/', import.meta.url);
  const entries = JSON.parse(await readFile(new URL('index.json', base), 'utf8'));
  assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
  for (const entry of entries) {
    assert.ok(entry.file.endsWith('.cho'));
    const song = parseChordPro(await readFile(new URL(entry.file, base), 'utf8'));
    assert.notEqual(song.title, '未命名歌曲');
    assert.ok(Number(song.tempo) > 0);
  }
});
