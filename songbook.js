import { parseChordPro, transposeChord } from './chordpro.js';
import { readingSettings, validateScore, validateCollection, importSongbook, exportSongbook, uniqueImports, maxBookBytes } from './songbook-data.js';
import { loadSongLibrary, saveSongs, deleteSong, saveReadingSettings } from './songbook-store.js';

const $ = id => document.getElementById(id);
const newSource = '{title: 新歌曲}\n{artist: }\n{key: C}\n{capo: 0}\n{tempo: 90}\n{time: 4/4}\n\n{start_of_verse: 主歌}\n[C]在這裡填入歌詞與和弦\n{end_of_verse}\n';
const newId = () => 'user-' + crypto.randomUUID();

export function songbook() {
  const dialog = $('songbookDialog'), editor = $('songEditor'), viewport = $('scoreViewport');
  let builtins = [], songs = [], settings = new Map(), selected = '', prefs = readingSettings();
  let battle = false, writable = false, busy = false, loaded = false, loading;
  let scrolling = false, frame = 0, previous = 0, scrollPosition = 0;
  let editTarget = null, originalSource = '', editPrefs;
  let lastSelected;
  try { lastSelected = localStorage.getItem('sing-rpg.songbook-selected'); } catch { /* Optional. */ }
  const current = () => songs.find(song => song.id === selected);
  const dirty = () => editor.open && $('scoreSource').value !== originalSource;
  function status(message) { $('songbookStatus').textContent = message; }
  function stopScroll() {
    scrolling = false;
    cancelAnimationFrame(frame);
    $('scoreScroll').textContent = '開始捲動';
    $('scoreScroll').setAttribute('aria-pressed', 'false');
  }
  function controls() {
    const song = current();
    $('songbookManagement').hidden = battle;
    $('scoreSettings').hidden = battle;
    for (const el of $('songbookManagement').querySelectorAll('button, input')) el.disabled = busy;
    $('scoreNew').disabled = busy || !writable;
    $('scoreImportButton').disabled = busy || !writable;
    $('scoreImport').disabled = busy || !writable;
    $('scoreEdit').disabled = busy || !writable || !song;
    $('scoreDelete').disabled = busy || !writable || !song || song.builtin;
    $('scoreExportSong').disabled = busy || !song;
    $('scoreExportBook').disabled = busy || !songs.some(song => !song.builtin);
    $('scoreSong').disabled = busy || !songs.length;
    $('scoreScroll').disabled = !song;
    $('songbookReader').hidden = !song;
    $('songbookEmpty').hidden = !!song;
    $('scoreEdit').textContent = song?.builtin ? '編輯副本' : '編輯';
  }
  function setBusy(value) { busy = value; controls(); }
  function rememberSelected() {
    try { localStorage.setItem('sing-rpg.songbook-selected', selected); } catch { /* Optional. */ }
  }
  function renderOptions(preferred = selected || lastSelected) {
    const groups = [document.createElement('optgroup'), document.createElement('optgroup')];
    groups[0].label = '我的歌本'; groups[1].label = '示範譜';
    for (const song of songs) groups[Number(!!song.builtin)].append(new Option(parseChordPro(song.chordpro).title, song.id));
    $('scoreSong').replaceChildren(...groups.filter(group => group.children.length));
    selected = songs.some(song => song.id === preferred) ? preferred : songs[0]?.id || '';
    $('scoreSong').value = selected;
    prefs = readingSettings(settings.get(selected));
    rememberSelected(); render(); controls();
  }
  async function refresh(preferred) {
    const library = await loadSongLibrary();
    writable = true;
    songs = [...library.songs.sort((a, b) => b.updatedAt - a.updatedAt), ...builtins];
    settings = new Map(library.settings.map(value => [value.id, value]));
    renderOptions(preferred);
  }
  async function loadBuiltins() {
    const base = new URL('./songs/', import.meta.url);
    const response = await fetch(new URL('index.json', base), { cache: 'no-store' });
    if (!response.ok) throw Error('示範譜清單無法載入。');
    const entries = await response.json();
    if (!Array.isArray(entries) || entries.length > 100) throw Error('示範譜清單格式不正確。');
    const ids = new Set();
    return Promise.all(entries.map(async entry => {
      if (!entry || !/^[\w-]{1,80}$/.test(entry.id) || typeof entry.file !== 'string' || ids.has(entry.id)) throw Error('示範譜清單格式不正確。');
      ids.add(entry.id);
      const url = new URL(entry.file, base);
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.search || url.hash) throw Error('示範譜需放在本站 songs 目錄。');
      const score = await fetch(url);
      if (!score.ok) throw Error('部分示範譜無法載入。');
      return { id: 'builtin-' + entry.id, chordpro: validateScore(await score.text()), builtin: true };
    }));
  }
  async function load() {
    setBusy(true); status('正在開啟歌本…');
    const messages = [];
    if (!loaded) {
      try { builtins = await loadBuiltins(); loaded = true; }
      catch (error) { messages.push(error.message); }
    }
    try { await refresh(selected || lastSelected); }
    catch (error) {
      writable = false;
      songs = [...songs.filter(song => !song.builtin), ...builtins];
      renderOptions(); messages.push(error.message);
    }
    setBusy(false);
    status(messages.join(' ') || (battle ? '自行播放音樂，選好譜後開始捲動。' : '匯入與編輯的歌譜只保存在目前瀏覽器。可匯出備份，帶到另一台裝置。'));
  }
  async function open() {
    if (!dialog.open) dialog.showModal();
    if (loading) return loading;
    if (busy) return;
    loading = load().finally(() => { loading = null; });
    return loading;
  }
  $('openSongbook').onclick = open;
  $('scoreToggle').onclick = open;
  $('closeSongbook').onclick = () => dialog.close();
  dialog.addEventListener('close', stopScroll);
  $('scoreSong').onchange = () => {
    selected = $('scoreSong').value; prefs = readingSettings(settings.get(selected));
    rememberSelected(); render(); controls();
  };
  function render() {
    stopScroll();
    const record = current();
    if (!record) { $('scoreContent').replaceChildren(); $('scoreTitle').textContent = ''; $('scoreMeta').textContent = ''; return; }
    const song = parseChordPro(record.chordpro);
    $('scoreTitle').textContent = song.title;
    $('scoreMeta').textContent = [song.artist, song.key ? '調性 ' + transposeChord(song.key, prefs.shift) : '',
      song.capo ? 'Capo ' + song.capo : '', song.tempo ? song.tempo + ' BPM' : '', song.time ? song.time + ' 拍' : '',
      prefs.shift ? '移調 ' + (prefs.shift > 0 ? '+' : '') + prefs.shift : '原譜'].filter(Boolean).join(' · ');
    $('scoreContent').replaceChildren(...song.blocks.map(block => {
      const el = document.createElement(block.type === 'section' ? 'h3' : 'div');
      el.className = 'score-' + block.type;
      if (block.type === 'line') {
        for (const token of block.tokens) {
          const segment = document.createElement('span'), chord = document.createElement('b'), lyric = document.createElement('span');
          segment.className = 'score-token';
          chord.textContent = transposeChord(token.chord, prefs.shift) || '\u00a0';
          lyric.textContent = token.lyric || '\u00a0';
          segment.append(chord, lyric); el.append(segment);
        }
      } else el.textContent = block.text || '\u00a0';
      return el;
    }));
    $('scoreTransposeValue').textContent = prefs.shift > 0 ? '+' + prefs.shift : String(prefs.shift);
    $('scoreLower').disabled = prefs.shift <= -12; $('scoreHigher').disabled = prefs.shift >= 12;
    $('scoreFont').value = prefs.font; $('scoreFontValue').value = prefs.font + ' px';
    $('scoreContent').style.fontSize = prefs.font + 'px';
    $('scoreSpeed').value = prefs.speed; $('scoreSpeedValue').value = prefs.speed + ' px/s';
    viewport.scrollTop = 0;
  }
  function persistPreferences() {
    settings.set(selected, { ...prefs });
    if (!writable) return;
    void saveReadingSettings(selected, { ...prefs }).catch(error => status(error.message));
  }
  function transpose(delta) { if (battle) return; prefs.shift = Math.max(-12, Math.min(12, prefs.shift + delta)); render(); persistPreferences(); }
  $('scoreLower').onclick = () => transpose(-1);
  $('scoreHigher').onclick = () => transpose(1);
  $('scoreReset').onclick = () => transpose(-prefs.shift);
  $('scoreFont').oninput = () => { if (battle) return; prefs.font = Number($('scoreFont').value); render(); persistPreferences(); };
  $('scoreSpeed').oninput = () => {
    prefs.speed = Number($('scoreSpeed').value); $('scoreSpeedValue').value = prefs.speed + ' px/s'; persistPreferences();
  };
  dialog.addEventListener('click', event => { if (!event.target.closest('#scoreSettings')) $('scoreSettings').open = false; });
  function download(text, filename, type) {
    const url = URL.createObjectURL(new Blob([text], { type })), link = document.createElement('a');
    link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('scoreExportSong').onclick = () => {
    if (battle || busy || !current()) return;
    const name = parseChordPro(current().chordpro).title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 100) || 'song';
    download(current().chordpro, name + '.cho', 'text/plain;charset=utf-8');
  };
  $('scoreExportBook').onclick = () => {
    if (battle || busy || !songs.length) return;
    try {
      const source = songs.filter(song => !song.builtin).map(song => ({ chordpro: song.chordpro, settings: settings.get(song.id) }));
      download(exportSongbook(source), 'sing-rpg-songbook.json', 'application/json');
      status('已匯出整本歌本，包含歌譜與閱讀設定。');
    } catch (error) { status(error.message); }
  };
  $('scoreImportButton').onclick = () => { if (!battle && writable && !busy) $('scoreImport').click(); };
  $('scoreImport').onchange = async () => {
    const files = [...$('scoreImport').files]; $('scoreImport').value = '';
    if (battle || !writable || busy || !files.length) return;
    setBusy(true);
    try {
      if (files.length > 500 || files.reduce((sum, file) => sum + file.size, 0) > maxBookBytes) throw Error('每次匯入最多 500 個檔案、合計 10 MB。');
      const library = await loadSongLibrary();
      const incoming = (await Promise.all(files.map(async file => importSongbook(await file.text(), file.name)
        .map(song => ({ ...song, restoreSettings: /\.json$/i.test(file.name) }))))).flat();
      // Built-in examples do not replace the user's own saved copy on restore.
      const existing = library.songs, fresh = uniqueImports(existing, incoming);
      const fingerprint = source => source.replaceAll('\r', '').replace(/^\uFEFF/, '').trim();
      const known = new Map(existing.map(song => [fingerprint(song.chordpro), song.id]));
      const preferences = incoming.filter(song => song.restoreSettings && known.has(fingerprint(song.chordpro)))
        .map(song => ({ id: known.get(fingerprint(song.chordpro)), ...song.settings }));
      if (!fresh.length && !preferences.length) { status('這些歌譜已在歌本中，沒有重複匯入。'); return; }
      if (fresh.length) validateCollection([...library.songs, ...fresh]);
      const records = fresh.map(song => ({ ...song, id: newId() }));
      await saveSongs(records, { addOnly: true, preferences }); await refresh(records[0]?.id || selected);
      status(fresh.length ? '已匯入 ' + fresh.length + ' 首歌譜到本機歌本。' + (incoming.length > fresh.length ? '重複內容已略過。' : '')
        : '沒有重複新增歌譜，已還原閱讀設定。');
    } catch (error) { status(error.message); }
    finally { setBusy(false); }
  };
  function beginEdit(isNew) {
    if (battle || busy || !writable) return;
    stopScroll();
    const song = isNew ? null : current();
    if (!isNew && !song) return;
    editTarget = song && !song.builtin ? song.id : null;
    editPrefs = isNew ? readingSettings() : readingSettings(settings.get(song.id));
    originalSource = song?.chordpro || newSource;
    $('scoreSource').value = originalSource;
    $('songEditorTitle').textContent = isNew ? '新增歌譜' : song.builtin ? '編輯示範譜副本' : '編輯歌譜';
    $('scoreEditorStatus').textContent = '儲存後會保留在目前瀏覽器的「我的歌本」。';
    $('discardScore').hidden = true; $('saveScore').disabled = false; editor.showModal();
  }
  $('scoreNew').onclick = () => beginEdit(true);
  $('scoreEdit').onclick = () => beginEdit(false);
  $('scoreSource').oninput = () => { $('scoreEditorStatus').textContent = dirty() ? '尚未儲存變更。' : ''; };
  function closeEditor() {
    if ($('saveScore').disabled) return;
    if (dirty()) { $('discardScore').hidden = false; return; }
    editor.close();
  }
  $('cancelScore').onclick = closeEditor;
  editor.addEventListener('cancel', event => { event.preventDefault(); closeEditor(); });
  $('keepEditingScore').onclick = () => { $('discardScore').hidden = true; };
  $('discardScoreChanges').onclick = () => editor.close();
  window.addEventListener('beforeunload', event => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
  $('scoreEditorForm').onsubmit = async event => {
    event.preventDefault();
    if (battle || !writable || $('saveScore').disabled) return;
    $('saveScore').disabled = true;
    try {
      const source = validateScore($('scoreSource').value), id = editTarget || newId();
      await saveSongs([{ id, chordpro: source, settings: editPrefs }], { addOnly: !editTarget });
      originalSource = source;
      await refresh(id);
      editor.close(); status('歌譜已儲存在本機歌本。');
    } catch (error) { $('scoreEditorStatus').textContent = error.message; }
    finally { $('saveScore').disabled = false; }
  };
  $('scoreDelete').onclick = () => {
    if (battle || busy || !writable || !current() || current().builtin) return;
    $('deleteScoreName').textContent = parseChordPro(current().chordpro).title;
    $('confirmDeleteScore').dataset.id = selected; $('deleteScoreDialog').showModal();
  };
  $('cancelDeleteScore').onclick = () => $('deleteScoreDialog').close();
  $('confirmDeleteScore').onclick = async () => {
    if (battle || busy) return;
    const id = $('confirmDeleteScore').dataset.id;
    setBusy(true);
    try { await deleteSong(id); $('deleteScoreDialog').close(); await refresh(); status('已刪除歌譜。'); }
    catch (error) { status(error.message); $('deleteScoreDialog').close(); }
    finally { setBusy(false); }
  };
  function scroll(now) {
    if (!scrolling) return;
    scrollPosition += prefs.speed * Math.min(.1, (now - previous) / 1000);
    viewport.scrollTop = scrollPosition; previous = now;
    if (viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1) { stopScroll(); return; }
    frame = requestAnimationFrame(scroll);
  }
  $('scoreScroll').onclick = () => {
    if (scrolling) { stopScroll(); return; }
    if (!current()) return;
    scrolling = true; scrollPosition = viewport.scrollTop; previous = performance.now();
    $('scoreScroll').textContent = '暫停捲動'; $('scoreScroll').setAttribute('aria-pressed', 'true'); frame = requestAnimationFrame(scroll);
  };
  viewport.addEventListener('wheel', stopScroll, { passive: true });
  viewport.addEventListener('touchstart', stopScroll, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopScroll(); });
  window.addEventListener('pagehide', stopScroll);
  controls();
  return { setBattle(active) { battle = active; $('scoreSettings').open = false; controls(); } };
}
