export const maxSongBytes = 256 * 1024;
export const maxBookBytes = 10 * 1024 * 1024;
const byteSize = text => new TextEncoder().encode(text).length;
export function readingSettings(value = {}) {
  const bounded = (key, fallback, min, max) => Number.isFinite(value?.[key]) ? Math.max(min, Math.min(max, Math.round(value[key]))) : fallback;
  return { font: bounded('font', 22, 16, 36), shift: bounded('shift', 0, -12, 12) };
}
export function validateScore(source) {
  if (typeof source !== 'string' || !source.trim()) throw Error('歌譜內容不能空白。');
  if (byteSize(source) > maxSongBytes) throw Error('每首歌譜最多 256 KB。');
  return source;
}
export function validateCollection(songs) {
  if (!Array.isArray(songs) || !songs.length || songs.length > 500) throw Error('歌本需包含 1–500 首歌譜。');
  const normalized = songs.map(song => ({ chordpro: validateScore(song?.chordpro), settings: readingSettings(song?.settings) }));
  if (byteSize(JSON.stringify({ format: 'sing-rpg-songbook', version: 2, songs: normalized })) + 1 > maxBookBytes) {
    throw Error('歌本超過 10 MB，請分批匯入或減少歌曲。');
  }
  return normalized;
}
export function importSongbook(text, filename) {
  if (typeof text !== 'string' || byteSize(text) > maxBookBytes) throw Error('匯入檔案最多 10 MB。');
  if (!/\.json$/i.test(filename)) {
    if (!/\.(cho|chordpro|chopro|crd|chord|pro|txt)$/i.test(filename)) throw Error('請選擇 ChordPro 文字譜或歌本 JSON。');
    return validateCollection([{ chordpro: text }]);
  }
  let book;
  try { book = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw Error('歌本 JSON 格式不正確。'); }
  if (book?.format !== 'sing-rpg-songbook' || book.version !== 2) throw Error('請匯入本站匯出的明文歌本 JSON，或 ChordPro 譜檔。');
  return validateCollection(book.songs);
}
export function exportSongbook(songs) {
  // Compact JSON keeps every backup within the same import size limit.
  return JSON.stringify({ format: 'sing-rpg-songbook', version: 2, songs: validateCollection(songs) }) + '\n';
}
export function uniqueImports(existing, incoming) {
  const fingerprint = source => source.replaceAll('\r', '').replace(/^\uFEFF/, '').trim();
  const known = new Set(existing.map(song => fingerprint(song.chordpro)));
  return incoming.filter(song => {
    const key = fingerprint(song.chordpro);
    if (known.has(key)) return false;
    known.add(key);
    return true;
  });
}
