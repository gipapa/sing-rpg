const format = 'sing-rpg-songbook';
const prefix = 'sing-rpg-key-v1.';
const aad = new TextEncoder().encode(format + ':1:AES-GCM');
export const maxSongbookBytes = 2 * 1024 * 1024;

function encode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function decode(text) {
  if (typeof text !== 'string' || !/^[A-Za-z0-9_-]+$/.test(text)) throw Error('無效的加密資料。');
  const bytes = Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
  if (encode(bytes) !== text) throw Error('無效的加密資料。');
  return bytes;
}
function webCrypto() {
  if (!globalThis.crypto?.subtle) throw Error('此功能需要 HTTPS 或 localhost，以及支援 Web Crypto 的瀏覽器。');
  return globalThis.crypto;
}
export function createSongbookKey() {
  return prefix + encode(webCrypto().getRandomValues(new Uint8Array(32)));
}
async function importKey(text, usage) {
  if (typeof text !== 'string' || !text.trim().startsWith(prefix)) throw Error('請貼上完整的解密金鑰。');
  const raw = decode(text.trim().slice(prefix.length));
  if (raw.length !== 32) throw Error('解密金鑰長度不正確。');
  try {
    return await webCrypto().subtle.importKey('raw', raw, 'AES-GCM', false, [usage]);
  } finally {
    raw.fill(0);
  }
}
export function validateSongbook(book) {
  if (!book || !Array.isArray(book.songs) || !book.songs.length || book.songs.length > 100) {
    throw Error('歌本需包含 1–100 首歌曲。');
  }
  const ids = new Set();
  for (const song of book.songs) {
    if (!song || typeof song.id !== 'string' || !/^[\w-]{1,100}$/.test(song.id) || ids.has(song.id) ||
        typeof song.chordpro !== 'string' || !song.chordpro.trim() || song.chordpro.length > 250000) {
      throw Error('歌本內的歌曲資料不正確。');
    }
    ids.add(song.id);
  }
  return book;
}
export async function encryptSongbook(book, secret) {
  validateSongbook(book);
  const plaintext = new TextEncoder().encode(JSON.stringify(book));
  if (plaintext.length > maxSongbookBytes) throw Error('歌本超過 2 MB，請分成多本。');
  const key = await importKey(secret, 'encrypt');
  const iv = webCrypto().getRandomValues(new Uint8Array(12));
  try {
    const encrypted = await webCrypto().subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, key, plaintext);
    return { format, version: 1, algorithm: 'AES-GCM', iv: encode(iv), ciphertext: encode(new Uint8Array(encrypted)) };
  } finally {
    plaintext.fill(0);
  }
}
export async function decryptSongbook(envelope, secret) {
  if (!envelope || envelope.format !== format || envelope.version !== 1 || envelope.algorithm !== 'AES-GCM' ||
      typeof envelope.ciphertext !== 'string' || envelope.ciphertext.length > Math.ceil((maxSongbookBytes + 16) * 4 / 3)) {
    throw Error('不支援這個加密歌本格式。');
  }
  const iv = decode(envelope.iv), ciphertext = decode(envelope.ciphertext);
  if (iv.length !== 12 || ciphertext.length < 16) throw Error('加密歌本資料不完整。');
  const key = await importKey(secret, 'decrypt');
  let plaintext;
  try {
    plaintext = new Uint8Array(await webCrypto().subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, key, ciphertext));
  } catch {
    throw Error('金鑰不正確，或歌本檔案已損壞。');
  }
  try {
    return validateSongbook(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext)));
  } finally {
    plaintext.fill(0);
  }
}
