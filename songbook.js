import { decryptSongbook, maxSongbookBytes } from './songbook-crypto.js';
import { parseChordPro, transposeChord } from './chordpro.js';

const $ = id => document.getElementById(id);
const settingsKey = 'sing-rpg.songbook-settings';
const maxEnvelopeBytes = Math.ceil(maxSongbookBytes * 4 / 3) + 2048;

export function songbook() {
  const dialog = $('songbookDialog'), viewport = $('scoreViewport');
  let books = [], songs = [], selected = 0, shift = 0, request = 0;
  let manifestLoaded = false, busy = false, scrolling = false, frame = 0, previous = 0, scrollPosition = 0;
  let font = 22, speed = 22;
  try {
    const saved = JSON.parse(localStorage.getItem(settingsKey));
    if (Number.isFinite(saved?.font)) font = Math.max(16, Math.min(36, saved.font));
    if (Number.isFinite(saved?.speed)) speed = Math.max(5, Math.min(70, saved.speed));
  } catch { /* Reading preferences is optional. Scores and keys are never stored. */ }
  function saveSettings() {
    try { localStorage.setItem(settingsKey, JSON.stringify({ font, speed })); } catch { /* Optional. */ }
  }
  function status(message) { $('songbookStatus').textContent = message; }
  function stopScroll() {
    scrolling = false;
    cancelAnimationFrame(frame);
    $('scoreScroll').textContent = '開始捲動';
    $('scoreScroll').setAttribute('aria-pressed', 'false');
  }
  function setBusy(value) {
    busy = value;
    $('unlockSongbook').disabled = value || !books.length;
    $('songbookSource').disabled = value || !books.length;
    $('songbookKey').disabled = value;
  }
  function lock() {
    request++;
    stopScroll();
    songs = [];
    selected = 0;
    shift = 0;
    $('songbookKey').value = '';
    $('scoreSong').replaceChildren();
    $('scoreContent').replaceChildren();
    $('scoreTitle').textContent = '';
    $('scoreMeta').textContent = '';
    $('scoreSettings').open = false;
    $('songbookReader').hidden = true;
    $('songbookUnlock').hidden = false;
    setBusy(false);
    status('歌本已鎖定。貼上解密金鑰即可閱讀。');
  }
  async function fetchJSON(url, limit) {
    const response = await fetch(url, { cache: 'no-store', credentials: 'omit', redirect: 'error' });
    if (!response.ok) throw Error('無法載入歌本（' + response.status + '），請確認檔案已發布。');
    if (Number(response.headers.get('Content-Length')) > limit) throw Error('歌本檔案過大。');
    const reader = response.body.getReader(), chunks = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > limit) { await reader.cancel(); throw Error('歌本檔案過大。'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  async function loadManifest() {
    status('正在載入加密歌本清單…');
    try {
      const entries = await fetchJSON(new URL('./songs/index.json', import.meta.url), 100000);
      if (!Array.isArray(entries) || entries.length > 100) throw Error('歌本清單格式不正確。');
      const base = new URL('./songs/', import.meta.url);
      books = entries.map((entry, i) => {
        if (!entry || typeof entry.file !== 'string' || typeof entry.label !== 'string') throw Error('歌本清單格式不正確。');
        const url = new URL(entry.file, base);
        if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.search || url.hash) {
          throw Error('加密歌本必須放在本站的 songs 目錄。');
        }
        return { url, label: entry.label, id: String(i) };
      });
      $('songbookSource').replaceChildren(...books.map(book => new Option(book.label, book.id)));
      manifestLoaded = true;
      status(books.length ? '音樂請自行播放；貼上歌本的解密金鑰後選譜。' : '目前沒有加密歌本。');
    } catch {
      status('歌本清單無法載入，請稍後重新開啟歌本。');
    }
    setBusy(false);
  }
  async function open() {
    if (!dialog.open) dialog.showModal();
    if (!manifestLoaded && !busy) {
      setBusy(true);
      await loadManifest();
    }
  }
  $('openSongbook').onclick = open;
  $('scoreToggle').onclick = open;
  $('closeSongbook').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    request++;
    $('songbookKey').value = '';
    stopScroll();
    setBusy(false);
    if (!$('songbookUnlock').hidden && books.length) status('貼上解密金鑰即可閱讀。');
  });
  $('songbookUnlock').onsubmit = async event => {
    event.preventDefault();
    if (busy || !books.length) return;
    const attempt = ++request, book = books[Number($('songbookSource').value)];
    let secret = $('songbookKey').value.trim();
    $('songbookKey').value = '';
    setBusy(true);
    status('正在裝置內解密…');
    try {
      const envelope = await fetchJSON(book.url, maxEnvelopeBytes);
      if (attempt !== request) return;
      const content = await decryptSongbook(envelope, secret);
      if (attempt !== request) return;
      songs = content.songs.map(song => parseChordPro(song.chordpro));
      $('scoreSong').replaceChildren(...songs.map((song, i) => new Option(song.title, String(i))));
      selected = 0;
      shift = 0;
      $('songbookUnlock').hidden = true;
      $('songbookReader').hidden = false;
      render();
      status('已解鎖 ' + songs.length + ' 首；鎖定或重新整理後需再次解鎖。');
    } catch (error) {
      if (attempt === request) status(error instanceof SyntaxError ? '歌本檔案格式不正確。' : error.message);
    } finally {
      secret = '';
      if (attempt === request) setBusy(false);
    }
  };
  $('lockSongbook').onclick = () => { lock(); $('songbookKey').focus(); };
  function render() {
    stopScroll();
    const song = songs[selected];
    $('scoreTitle').textContent = song.title;
    const key = song.key ? '調性 ' + transposeChord(song.key, shift) : '';
    $('scoreMeta').textContent = [song.artist, key, song.capo ? 'Capo ' + song.capo : '', shift ? '移調 ' + (shift > 0 ? '+' : '') + shift : '原譜'].filter(Boolean).join(' · ');
    $('scoreTransposeValue').textContent = shift > 0 ? '+' + shift : String(shift);
    $('scoreLower').disabled = shift <= -12;
    $('scoreHigher').disabled = shift >= 12;
    const nodes = song.blocks.map(block => {
      const el = document.createElement(block.type === 'section' ? 'h3' : 'div');
      el.className = 'score-' + block.type;
      if (block.type === 'line') {
        for (const token of block.tokens) {
          const segment = document.createElement('span'), chord = document.createElement('b'), lyric = document.createElement('span');
          segment.className = 'score-token';
          chord.textContent = transposeChord(token.chord, shift) || '\u00a0';
          lyric.textContent = token.lyric || '\u00a0';
          segment.append(chord, lyric);
          el.append(segment);
        }
      } else el.textContent = block.text || '\u00a0';
      return el;
    });
    $('scoreContent').replaceChildren(...nodes);
    viewport.scrollTop = 0;
  }
  $('scoreSong').onchange = () => { selected = Number($('scoreSong').value); shift = 0; render(); };
  dialog.addEventListener('click', event => {
    if (!event.target.closest('#scoreSettings')) $('scoreSettings').open = false;
  });
  $('scoreLower').onclick = () => { shift = Math.max(-12, shift - 1); render(); };
  $('scoreHigher').onclick = () => { shift = Math.min(12, shift + 1); render(); };
  $('scoreReset').onclick = () => { shift = 0; render(); };
  $('scoreFont').value = font;
  function updateFont() {
    $('scoreContent').style.fontSize = font + 'px';
    $('scoreFontValue').value = font + ' px';
  }
  $('scoreFont').oninput = () => { font = Number($('scoreFont').value); updateFont(); saveSettings(); };
  updateFont();
  $('scoreSpeed').value = speed;
  function updateSpeed() { $('scoreSpeedValue').value = speed + ' px/s'; }
  $('scoreSpeed').oninput = () => { speed = Number($('scoreSpeed').value); updateSpeed(); saveSettings(); };
  updateSpeed();
  function scroll(now) {
    if (!scrolling) return;
    scrollPosition += speed * Math.min(.1, (now - previous) / 1000);
    viewport.scrollTop = scrollPosition;
    previous = now;
    if (viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1) { stopScroll(); return; }
    frame = requestAnimationFrame(scroll);
  }
  $('scoreScroll').onclick = () => {
    if (scrolling) { stopScroll(); return; }
    scrolling = true;
    scrollPosition = viewport.scrollTop;
    previous = performance.now();
    $('scoreScroll').textContent = '暫停捲動';
    $('scoreScroll').setAttribute('aria-pressed', 'true');
    frame = requestAnimationFrame(scroll);
  };
  viewport.addEventListener('wheel', stopScroll, { passive: true });
  viewport.addEventListener('touchstart', stopScroll, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopScroll(); });
  window.addEventListener('pagehide', lock);
  lock();
}
