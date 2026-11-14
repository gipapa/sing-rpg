import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecipheriv } from 'node:crypto';
import { mkdtemp, readFile, writeFile, stat, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createSongbookKey, encryptSongbook, decryptSongbook } from '../songbook-crypto.js';
import { parseChordPro, transposeChord } from '../chordpro.js';

const sample = { songs: [{ id: 'one', chordpro: '{title: 測試歌曲}\n[C]原創測試文字 [G/B]第二段' }] };
test('encrypted book round trips Chinese text without exposing titles or chords', async () => {
  const secret = createSongbookKey();
  const envelope = await encryptSongbook(sample, secret);
  assert.deepEqual(await decryptSongbook(envelope, secret), sample);
  assert.equal(JSON.stringify(envelope).includes('測試歌曲'), false);
  assert.equal(JSON.stringify(envelope).includes('[G/B]'), false);
  assert.equal(JSON.stringify(envelope).includes(secret), false);
});
test('each encryption uses a new 96-bit IV even with the same key', async () => {
  const secret = createSongbookKey();
  const a = await encryptSongbook(sample, secret), b = await encryptSongbook(sample, secret);
  assert.notEqual(a.iv, b.iv);
  assert.notEqual(a.ciphertext, b.ciphertext);
  assert.equal(Buffer.from(a.iv, 'base64url').length, 12);
});
test('Web Crypto output interoperates with Node AES-256-GCM including authenticated format', async () => {
  const secret = createSongbookKey(), envelope = await encryptSongbook(sample, secret);
  const bytes = Buffer.from(envelope.ciphertext, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(secret.split('.')[1], 'base64url'), Buffer.from(envelope.iv, 'base64url'));
  decipher.setAAD(Buffer.from('sing-rpg-songbook:1:AES-GCM'));
  decipher.setAuthTag(bytes.subarray(-16));
  const plain = Buffer.concat([decipher.update(bytes.subarray(0, -16)), decipher.final()]);
  assert.deepEqual(JSON.parse(plain.toString()), sample);
});
test('wrong key, changed ciphertext and changed IV fail authentication', async () => {
  const secret = createSongbookKey(), envelope = await encryptSongbook(sample, secret);
  await assert.rejects(decryptSongbook(envelope, createSongbookKey()), /金鑰不正確/);
  for (const field of ['iv', 'ciphertext']) {
    const bytes = Buffer.from(envelope[field], 'base64url');
    bytes[0] ^= 1;
    await assert.rejects(decryptSongbook({ ...envelope, [field]: bytes.toString('base64url') }, secret), /金鑰不正確/);
  }
});
test('unsupported format, malformed keys and invalid song payloads are rejected', async () => {
  const secret = createSongbookKey(), envelope = await encryptSongbook(sample, secret);
  await assert.rejects(decryptSongbook({ ...envelope, version: 2 }, secret), /格式/);
  await assert.rejects(decryptSongbook({ ...envelope, algorithm: 'AES-CBC' }, secret), /格式/);
  await assert.rejects(decryptSongbook(envelope, 'password'), /完整/);
  await assert.rejects(encryptSongbook({ songs: [] }, secret), /1–100/);
  await assert.rejects(encryptSongbook({ songs: [sample.songs[0], sample.songs[0]] }, secret), /歌曲資料/);
});
test('ChordPro preserves Chinese word positions, slash chords, sections and TAB', () => {
  const song = parseChordPro('\uFEFF{t: 示範}\r\n{artist: 作者}\n{key: C}\n{capo: 2}\n{start_of_verse: 第一段}\n[Cadd9]風 [G/B]吹來\n{end_of_verse}\n{soc}\n[Am7][F]星光\n{eoc}\n{sot}\nE--0--3--\n{eot}');
  assert.equal(song.title, '示範');
  assert.equal(song.artist, '作者');
  assert.equal(song.capo, '2');
  assert.deepEqual(song.blocks[1].tokens, [{ chord: 'Cadd9', lyric: '風 ' }, { chord: 'G/B', lyric: '吹來' }]);
  assert.equal(song.blocks[2].text, '副歌');
  assert.deepEqual(song.blocks[3].tokens, [{ chord: 'Am7', lyric: '' }, { chord: 'F', lyric: '星光' }]);
  assert.equal(song.blocks[4].type, 'tab');
});
test('unknown directives do not become HTML or alter object prototypes', () => {
  const song = parseChordPro('{__proto__: bad}\n{unknown: hidden}\n<script>alert(1)</script>\n[C]<img src=x onerror=alert(1)>');
  assert.equal(Object.getPrototypeOf(song), Object.prototype);
  assert.equal(song.blocks[0].tokens[0].lyric, '<script>alert(1)</script>');
  assert.equal(song.blocks[1].tokens[0].lyric, '<img src=x onerror=alert(1)>');
});
test('transposition retains chord quality, handles bass notes and leaves annotations alone', () => {
  assert.equal(transposeChord('Cadd9', 2), 'Dadd9');
  assert.equal(transposeChord('G/B', 2), 'A/C#');
  assert.equal(transposeChord('Am7/G', -2), 'Gm7/F');
  assert.equal(transposeChord('EØ/Bb', -1), 'EbØ/A');
  assert.equal(transposeChord('F♯m7', 1), 'Gm7');
  assert.equal(transposeChord('N.C.', 2), 'N.C.');
  assert.equal(transposeChord('*下撥', 2), '*下撥');
});
test('CLI keeps keys external, creates private key file, reuses it and never overwrites ciphertext', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sing-rpg-crypto-test-'));
  try {
    const source = join(dir, 'song.cho'), key = join(dir, 'unlock.key'), out = join(dir, 'book.enc.json');
    await writeFile(source, sample.songs[0].chordpro);
    const args = ['scripts/encrypt-songbook.mjs', '--out', out, '--key-file', key, source];
    const run = values => execFileSync(process.execPath, values, { cwd: resolve(import.meta.dirname, '..'), encoding: 'utf8', stdio: 'pipe' });
    const log = run(args), secret = (await readFile(key, 'utf8')).trim();
    assert.equal(log.includes(secret), false);
    assert.equal((await stat(key)).mode & 0o777, 0o600);
    assert.equal((await decryptSongbook(JSON.parse(await readFile(out, 'utf8')), secret)).songs[0].chordpro, sample.songs[0].chordpro);
    const out2 = join(dir, 'book2.enc.json');
    run(['scripts/encrypt-songbook.mjs', '--out', out2, '--key-file', key, source]);
    assert.equal((await readFile(key, 'utf8')).trim(), secret);
    const previous = await readFile(out, 'utf8');
    assert.throws(() => run(args));
    assert.equal(await readFile(out, 'utf8'), previous);
    assert.throws(() => run(['scripts/encrypt-songbook.mjs', '--out', out2, '--key-file', './bad.key', source]));
    const linked = join(dir, 'project-link');
    await symlink(resolve(import.meta.dirname, '..'), linked);
    assert.throws(() => run(['scripts/encrypt-songbook.mjs', '--out', out2, '--key-file', join(linked, 'bad.key'), source]));
    assert.throws(() => run(['scripts/encrypt-songbook.mjs', '--out', out2, '--key-file', key, './songs/ai-wo-bie-zou.template.cho']));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
