import { readingSettings, validateScore, validateCollection } from './songbook-data.js';

let connection;
function openDatabase() {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(Error('此瀏覽器無法保存歌本；仍可閱讀示範譜。')); return; }
    const request = indexedDB.open('sing-rpg-songbook', 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('songs', { keyPath: 'id' });
      db.createObjectStore('settings', { keyPath: 'id' });
    };
    request.onerror = () => reject(Error('無法開啟本機歌本，請檢查瀏覽器的儲存權限。'));
    request.onblocked = () => { blocked = true; reject(Error('請先關閉其他開啟此網站的分頁，再重新開啟歌本。')); };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) { db.close(); return; }
      db.onversionchange = () => { db.close(); connection = null; };
      resolve(db);
    };
  }).catch(error => { connection = null; throw error; });
  return connection;
}
async function transaction(stores, mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    const result = {};
    let failure;
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(failure || Error(tx.error?.name === 'QuotaExceededError'
      ? '儲存空間不足，歌譜尚未儲存。請先匯出備份並騰出空間。' : '歌本未能儲存，請重試。'));
    try { action(tx, result, error => { failure = error; tx.abort(); }); }
    catch (error) { failure = error; tx.abort(); }
  });
}
export async function loadSongLibrary() {
  return transaction(['songs', 'settings'], 'readonly', (tx, result) => {
    tx.objectStore('songs').getAll().onsuccess = event => { result.songs = event.target.result; };
    tx.objectStore('settings').getAll().onsuccess = event => { result.settings = event.target.result; };
  });
}
function validateId(id) {
  if (typeof id !== 'string' || !/^[\w-]{1,100}$/.test(id)) throw Error('歌譜編號不正確。');
}
export async function saveSongs(records, { addOnly = false, preferences = [] } = {}) {
  if (records.length) validateCollection(records);
  else if (!preferences.length) throw Error('沒有要儲存的歌譜。');
  const ids = new Set();
  for (const song of records) {
    validateId(song.id);
    if (ids.has(song.id)) throw Error('歌譜編號重複。');
    ids.add(song.id);
  }
  for (const item of preferences) validateId(item.id);
  // Validate the final collection and commit every imported song together.
  return transaction(['songs', 'settings'], 'readwrite', (tx, result, abort) => {
    const store = tx.objectStore('songs');
    store.getAll().onsuccess = event => {
      const existing = event.target.result;
      if (addOnly && existing.some(song => ids.has(song.id))) { abort(Error('歌譜編號重複，未匯入任何歌曲。')); return; }
      const merged = [...existing.filter(song => !ids.has(song.id)), ...records];
      try { if (merged.length) validateCollection(merged); }
      catch (error) { abort(error); return; }
      for (const song of records) {
        store.put({ id: song.id, chordpro: validateScore(song.chordpro), updatedAt: Date.now() });
        tx.objectStore('settings').put({ id: song.id, ...readingSettings(song.settings) });
      }
      for (const item of preferences) tx.objectStore('settings').put({ id: item.id, ...readingSettings(item) });
    };
  });
}
export async function deleteSong(id) {
  validateId(id);
  return transaction(['songs', 'settings'], 'readwrite', tx => {
    tx.objectStore('songs').delete(id);
    tx.objectStore('settings').delete(id);
  });
}
export async function saveReadingSettings(id, settings) {
  validateId(id);
  return transaction(['settings'], 'readwrite', tx => tx.objectStore('settings').put({ id, ...readingSettings(settings) }));
}
