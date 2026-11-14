#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import { parseChordPro } from '../../../../chordpro.js';
import { scoreTimeline } from '../../../../score-timing.js';
import { validateScore, maxSongBytes } from '../../../../songbook-data.js';

const args = process.argv.slice(2);
const usage = '用法：node .agents/skills/sing-rpg-chordpro/scripts/check-score.mjs [--strict] file.cho [more.cho]';
if (args.includes('--help')) { console.log(usage); process.exit(0); }
const strict = args.includes('--strict');
const files = args.filter(arg => arg !== '--strict');
if (!files.length || files.some(arg => arg.startsWith('--'))) { console.error(usage); process.exit(1); }

for (const file of files) {
  try {
    if ((await stat(file)).size > maxSongBytes) throw Error('歌譜超過 256 KB。');
    const source = validateScore(new TextDecoder('utf-8', { fatal: true }).decode(await readFile(file)));
    const song = parseChordPro(source), timing = scoreTimeline(song), warnings = [];
    if (song.title === '未命名歌曲') warnings.push('未設定 title。');
    if (!song.time) warnings.push('未設定拍號；未明確指定拍數的行會以 4/4 估算。');
    if (timing.estimated) warnings.push('仍有估算段落；請確認小節、逐行 beats 與反覆順序。');
    const error = timing.error || (strict && timing.estimated ? '嚴格模式需要可確定的拍數。' : '');
    console.log(JSON.stringify({
      file, ok: !error, title: song.title, bpm: Number(song.tempo) || null, time: song.time || null,
      beats: timing.totalBeats, seconds: Number(timing.duration.toFixed(3)),
      timedRows: timing.entries.length, estimated: timing.estimated, warnings,
      ...(error ? { error } : {})
    }, null, 2));
    if (error) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({ file, ok: false, error: error.message }));
    process.exitCode = 1;
  }
}
