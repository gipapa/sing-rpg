#!/usr/bin/env node
import { readFile, writeFile, mkdir, realpath, stat, unlink } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSongbookKey, encryptSongbook, maxSongbookBytes } from '../songbook-crypto.js';

const projectRoot = await realpath(fileURLToPath(new URL('..', import.meta.url)));
const help = `用法：
  node scripts/encrypt-songbook.mjs --out songs/private.enc.json --key-file ~/.config/sing-rpg/songbook.key /外部路徑/歌曲.cho [...更多譜檔]

金鑰檔存在時沿用，否則產生新的隨機金鑰（只寫入該檔，不印出）。
明文譜與金鑰必須放在專案外；輸出檔不覆寫既有檔案。
將輸出檔加入 songs/index.json，網頁便能選取。`;
function outsideProject(path) {
  const rel = relative(projectRoot, path);
  return rel && (rel === '..' || rel.startsWith('..' + '/') || isAbsolute(rel));
}
async function main(args) {
  if (args.includes('--help') || !args.length) { console.log(help); return; }
  let output, keyPath;
  const sources = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) output = resolve(args[++i]);
    else if (args[i] === '--key-file' && args[i + 1]) keyPath = resolve(args[++i]);
    else if (args[i].startsWith('--')) throw Error('不認識或不完整的參數：' + args[i]);
    else sources.push(resolve(args[i]));
  }
  if (!output || !keyPath || !sources.length) throw Error(help);
  if (!outsideProject(keyPath)) throw Error('金鑰檔必須放在專案外。');
  if (output === keyPath || sources.includes(output)) throw Error('輸出檔不能與金鑰或來源譜相同。');
  const songs = [];
  let total = 0;
  if (sources.length > 100) throw Error('每本歌本最多 100 首。');
  for (const [i, path] of sources.entries()) {
    if (!outsideProject(await realpath(path))) throw Error('明文譜必須放在專案外：' + path);
    const size = (await stat(path)).size;
    total += size;
    if (total > maxSongbookBytes) throw Error('歌本超過 2 MB，請分成多本。');
    songs.push({ id: 'song-' + (i + 1), chordpro: await readFile(path, 'utf8') });
  }
  await mkdir(dirname(keyPath), { recursive: true, mode: 0o700 });
  if (!outsideProject(await realpath(dirname(keyPath)))) throw Error('金鑰目錄不能連結到專案內。');
  let secret, createdKey = false;
  try {
    if (!outsideProject(await realpath(keyPath))) throw Error('金鑰檔不能連結到專案內。');
    secret = (await readFile(keyPath, 'utf8')).trim();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    secret = createSongbookKey();
    await writeFile(keyPath, secret + '\n', { mode: 0o600, flag: 'wx' });
    createdKey = true;
  }
  try {
    const encrypted = await encryptSongbook({ songs }, secret);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(encrypted, null, 2) + '\n', { flag: 'wx' });
  } catch (error) {
    if (createdKey) await unlink(keyPath);
    throw error;
  }
  console.log(`已加密 ${songs.length} 首歌：${output}\n解密金鑰另存於：${keyPath}\n僅將加密輸出放進 repo；金鑰請另外保存。`);
}
main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
