import { parseChordPro, transposeChord } from './chordpro.js';
import { readingSettings, validateScore, validateCollection, importSongbook, exportSongbook, uniqueImports, maxBookBytes } from './songbook-data.js';
import { loadSongLibrary, saveSongs, deleteSong, saveReadingSettings } from './songbook-store.js';
import { scoreTimeline, timelinePosition, timelineTimeAt, timelineEntryAtBlock, scoreClock } from './score-timing.js';

const $ = id => document.getElementById(id);
const newSource = '{title: 新歌曲}\n{artist: }\n{key: C}\n{capo: 0}\n{tempo: 90}\n{time: 4/4}\n\n{start_of_verse: 主歌}\n|[C]在這裡填入歌詞 |[G]與和弦 |\n{end_of_verse}\n';
const newId = () => 'user-' + crypto.randomUUID();

export function songbook() {
  const dialog = $('songbookDialog'), editor = $('songEditor'), viewport = $('scoreViewport');
  let builtins = [], songs = [], settings = new Map(), selected = '', prefs = readingSettings();
  let battle = false, writable = false, busy = false, loaded = false, loading;
  let frame = 0, positions = [], lastAppliedTop = 0, activeLine = null;
  let gesture = null, suppressClick = false, manualUntil = 0;
  let renderedId = '', renderedSource = '', timeline = { entries: [], duration: 0, estimated: false };
  const clock = scoreClock();
  let editTarget = null, originalSource = '', editPrefs;
  let lastSelected;
  try { lastSelected = localStorage.getItem('sing-rpg.songbook-selected'); } catch { /* Optional. */ }
  const current = () => songs.find(song => song.id === selected);
  const dirty = () => editor.open && $('scoreSource').value !== originalSource;
  function status(message) {
    const timingError = current() ? timeline.error : '';
    const text = [message, timingError && !message.includes(timingError) ? timingError : ''].filter(Boolean).join(' ');
    $('songbookStatus').textContent = text; $('songbookStatus').hidden = !text;
  }
  const formatTime = seconds => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  function playbackControls() {
    $('scorePlay').disabled = busy || !timeline.entries.length || clock.playing;
    $('scorePause').disabled = !clock.playing;
    $('scoreProgress').textContent = timeline.entries.length ? formatTime(clock.position()) + ' / ' + formatTime(timeline.duration) : '';
    $('scoreTimingMode').textContent = timeline.entries.length ? (timeline.estimated ? '拍數估算' : '共 ' + Number(timeline.totalBeats.toFixed(2)) + ' 拍') : '';
    $('scoreTimingMode').title = timeline.estimated ? '未標小節或拍數的段落，先按每個和弦一小節估算；可在營區補上小節線或 {beats: 8}。' : '拍數以四分音符為單位。';
  }
  function stopScroll() {
    clock.pause();
    cancelAnimationFrame(frame);
    gesture = null; manualUntil = 0; suppressClick = false;
    playbackControls();
  }
  function controls() {
    const song = current();
    $('songbookManagement').hidden = battle;
    $('scoreSettings').hidden = battle;
    $('scoreToolbar').hidden = battle;
    for (const el of $('songbookManagement').querySelectorAll('button, input')) el.disabled = busy;
    $('scoreNew').disabled = busy || !writable;
    $('scoreImportButton').disabled = busy || !writable;
    $('scoreImport').disabled = busy || !writable;
    $('scoreEdit').disabled = busy || !writable || !song;
    $('scoreDelete').disabled = busy || !writable || !song || song.builtin;
    $('scoreExportSong').disabled = busy || !song;
    $('scoreExportBook').disabled = busy || !songs.some(song => !song.builtin);
    $('scoreSong').disabled = busy || !songs.length;
    playbackControls();
    $('songbookReader').hidden = !song;
    $('songbookEmpty').hidden = !!song;
    $('scoreEdit').textContent = song?.builtin ? '編輯副本' : '編輯';
    $('closeSongbook').textContent = battle ? '收起歌本' : '關閉歌本';
  }
  function syncBattleLayout() {
    document.body.classList.toggle('songbook-battle', battle && dialog.open);
  }
  function close() {
    dialog.close(); syncBattleLayout();
    if (battle) $('scoreToggle').focus({ preventScroll: true });
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
    status(messages.join(' ') || timeline.error || (battle ? '' : '匯入與編輯的歌譜只保存在目前瀏覽器。可匯出備份，帶到另一台裝置。'));
  }
  async function open() {
    if (!dialog.open) {
      if (battle) dialog.show();
      else dialog.showModal();
    }
    syncBattleLayout();
    if (loading) return loading;
    if (busy) return;
    loading = load().finally(() => { loading = null; });
    return loading;
  }
  $('openSongbook').onclick = open;
  $('scoreToggle').onclick = open;
  $('closeSongbook').onclick = close;
  $('musicToggle').addEventListener('click', () => { if (battle && dialog.open) close(); });
  dialog.addEventListener('close', () => { stopScroll(); syncBattleLayout(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && battle && dialog.open && !event.defaultPrevented && !document.querySelector('dialog:modal')) {
      event.preventDefault(); close();
    }
  });
  $('scoreSong').onchange = () => {
    selected = $('scoreSong').value; prefs = readingSettings(settings.get(selected));
    rememberSelected(); render(); controls();
    status(timeline.error || '');
  };
  function render() {
    stopScroll();
    const record = current();
    const resumeAt = record?.id === renderedId && record?.chordpro === renderedSource ? clock.position() : 0;
    activeLine?.classList.remove('score-current'); activeLine = null;
    if (!record) {
      timeline = { entries: [], duration: 0, estimated: false }; clock.load(0); positions = [];
      $('scoreContent').replaceChildren(); $('scoreTitle').textContent = ''; $('scoreMeta').textContent = ''; playbackControls(); return;
    }
    const song = parseChordPro(record.chordpro);
    timeline = scoreTimeline(song); clock.load(timeline.duration, resumeAt);
    renderedId = record.id; renderedSource = record.chordpro;
    $('scoreTitle').textContent = song.title;
    $('scoreMeta').textContent = [song.artist, song.key ? '調性 ' + transposeChord(song.key, prefs.shift) : '',
      song.capo ? 'Capo ' + song.capo : '', song.tempo ? song.tempo + ' BPM' : '', song.time ? song.time + ' 拍' : '',
      prefs.shift ? '移調 ' + (prefs.shift > 0 ? '+' : '') + prefs.shift : '原譜'].filter(Boolean).join(' · ');
    $('scoreContent').replaceChildren(...song.blocks.map((block, blockIndex) => {
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
      if (timelineEntryAtBlock(timeline, blockIndex)) {
        el.dataset.blockIndex = blockIndex;
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
        const lyric = block.tokens?.map(token => token.lyric).join('').replaceAll('|', '').trim();
        el.setAttribute('aria-label', lyric ? '跳到：' + lyric.slice(0, 80) : '跳到這段樂譜');
      }
      return el;
    }));
    $('scoreTransposeValue').textContent = prefs.shift > 0 ? '+' + prefs.shift : String(prefs.shift);
    $('scoreLower').disabled = prefs.shift <= -12; $('scoreHigher').disabled = prefs.shift >= 12;
    $('scoreFont').value = prefs.font; $('scoreFontValue').value = prefs.font + ' px';
    $('scoreContent').style.fontSize = prefs.font + 'px';
    viewport.scrollTop = 0;
    measurePositions();
    if (resumeAt > 0) applyPosition();
    else lastAppliedTop = 0;
    playbackControls();
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
  function measurePositions() {
    const top = viewport.getBoundingClientRect().top;
    const max = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    positions = timeline.entries.map(entry => {
      const row = $('scoreContent').children[entry.blockIndex];
      return Math.max(0, Math.min(max, row.getBoundingClientRect().top - top + viewport.scrollTop - viewport.clientHeight * .25));
    });
    if (positions.length) positions.push(max);
  }
  function applyPosition(move = true) {
    const at = timelinePosition(timeline, positions, clock.position());
    if (move) { viewport.scrollTop = at.top; lastAppliedTop = viewport.scrollTop; }
    const row = at.index >= 0 ? $('scoreContent').children[timeline.entries[at.index].blockIndex] : null;
    if (activeLine !== row) { activeLine?.classList.remove('score-current'); row?.classList.add('score-current'); activeLine = row; }
    playbackControls();
  }
  function scroll() {
    if (!clock.playing) return;
    const interacting = gesture !== null || performance.now() < manualUntil;
    applyPosition(!interacting);
    if (!interacting && clock.position() >= timeline.duration) { stopScroll(); return; }
    frame = requestAnimationFrame(scroll);
  }
  $('scorePlay').onclick = () => {
    if (busy || !timeline.entries.length || clock.playing) return;
    measurePositions();
    if (Math.abs(viewport.scrollTop - lastAppliedTop) > 1) clock.seek(timelineTimeAt(timeline, positions, viewport.scrollTop));
    gesture = null; manualUntil = 0; clock.play(); applyPosition(); frame = requestAnimationFrame(scroll);
  };
  $('scorePause').onclick = stopScroll;
  // Native wheel/touch/scrollbar movement seeks without pausing the musical clock.
  // Defer automatic pixel writes until the gesture and its momentum settle.
  viewport.addEventListener('wheel', () => { manualUntil = performance.now() + 180; }, { passive: true });
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    suppressClick = false;
  }, { passive: true });
  window.addEventListener('pointermove', event => {
    if (gesture?.id === event.pointerId && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6) gesture.moved = true;
  }, { passive: true });
  function finishGesture(event) {
    if (gesture?.id !== event.pointerId) return;
    suppressClick = gesture.moved || event.type === 'pointercancel';
    gesture = null; manualUntil = performance.now() + 180;
  }
  window.addEventListener('pointerup', finishGesture, { passive: true });
  window.addEventListener('pointercancel', finishGesture, { passive: true });
  window.addEventListener('blur', () => { if (gesture) { gesture = null; suppressClick = true; manualUntil = performance.now() + 180; } });
  viewport.addEventListener('scroll', () => {
    // A scroll event from our own animation must not seek the clock back.
    if (!timeline.entries.length || Math.abs(viewport.scrollTop - lastAppliedTop) <= 1) return;
    clock.seek(timelineTimeAt(timeline, positions, viewport.scrollTop));
    lastAppliedTop = viewport.scrollTop; manualUntil = performance.now() + 180;
    applyPosition(false);
  }, { passive: true });
  function seekRow(row) {
    if (busy || !row || row.parentElement !== $('scoreContent')) return;
    const entry = timelineEntryAtBlock(timeline, Number(row.dataset.blockIndex));
    if (!entry) return;
    gesture = null; manualUntil = 0;
    clock.seek(entry.start); applyPosition();
  }
  viewport.addEventListener('click', event => {
    if (suppressClick) { suppressClick = false; return; }
    seekRow(event.target.closest('[data-block-index]'));
  });
  viewport.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    const row = event.target.closest('[data-block-index]');
    if (!row) return;
    event.preventDefault(); seekRow(row);
  });
  new ResizeObserver(() => {
    measurePositions();
    if (!gesture && performance.now() >= manualUntil && (clock.playing || clock.position() > 0)) applyPosition();
  }).observe(viewport);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopScroll(); });
  window.addEventListener('pagehide', stopScroll);
  controls();
  return { setBattle(active) {
    if (battle !== active && dialog.open) close();
    battle = active; $('scoreSettings').open = false; controls(); syncBattleLayout();
  } };
}
