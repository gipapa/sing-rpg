// Hold the writer lock until the page has finished its synchronous pagehide save.
// Waiting pages read the save for the first time only after the previous owner leaves.
export async function claimGameSession(waitingDialog) {
  if (!navigator.locks) return null;
  const pending = new AbortController();
  const abort = () => pending.abort();
  window.addEventListener('pagehide', abort, { once: true });
  const notice = setTimeout(() => waitingDialog.showModal(), 200);
  try {
    return await new Promise((resolve, reject) => {
      let releaseWriter;
      const lifetime = new Promise(release => { releaseWriter = release; });
      navigator.locks.request('sing-rpg.game-writer', { signal: pending.signal }, () => {
        resolve(releaseWriter);
        return lifetime;
      }).catch(error => {
        if (pending.signal.aborted) reject(error);
        else resolve(null);
      });
    });
  } finally {
    window.removeEventListener('pagehide', abort);
    clearTimeout(notice);
    if (waitingDialog.open) waitingDialog.close();
  }
}

// On origins without Web Locks, serialize comparison and replacement across tabs
// in an IndexedDB readwrite transaction. The existing localStorage save stays compatible.
let guardDatabase;
async function guardedWrite(write) {
  if (!guardDatabase) {
    guardDatabase = new Promise((resolve, reject) => {
      const request = indexedDB.open('sing-rpg-save-guard', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('writer');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    }).catch(error => { guardDatabase = null; throw error; });
  }
  const db = await guardDatabase;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('writer', 'readwrite');
    let error;
    tx.objectStore('writer').get(0).onsuccess = () => {
      try { write(); } catch (cause) { error = cause; tx.abort(); }
    };
    tx.oncomplete = resolve;
    tx.onabort = () => reject(error || tx.error);
  });
}

export class SaveConflict extends Error {}
export function gameSave(exclusive) {
  const key = 'sing-rpg.eight-realms-v1';
  let previous;
  try { previous = localStorage.getItem(key); } catch { /* Retry storage on the next save. */ }
  let game;
  try { game = JSON.parse(previous); } catch { /* Older unreadable saves start a new game. */ }
  return {
    game,
    write(data) {
      const next = JSON.stringify(data);
      function commit() {
        if (localStorage.getItem(key) !== (previous ?? null)) throw new SaveConflict('其他分頁已更新遠征進度。請重新載入以接續最新存檔。');
        localStorage.setItem(key, next);
        previous = next;
      }
      if (exclusive) return commit();
      return guardedWrite(commit);
    }
  };
}
