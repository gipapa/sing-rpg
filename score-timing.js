// BPM is measured in quarter-note beats. Layout determines pixel positions,
// while musical durations stay independent of font size and line wrapping.
function meterBeats(time) {
  const match = /^\s*(\d{1,2})\s*\/\s*(1|2|4|8|16|32|64)\s*$/.exec(time || '');
  return match && Number(match[1]) > 0 ? Number(match[1]) * 4 / Number(match[2]) : null;
}
function barCount(raw, tab) {
  if (!/[|｜║]/.test(raw)) return null;
  if (tab) raw = raw.replace(/^[^|｜║]*/, '');
  return raw.split(/[|｜║]+/).filter(part => part.replace(/[:\s]/g, '').length).length || null;
}
export function scoreTimeline(song) {
  const entries = [];
  let seconds = 0, totalBeats = 0, estimated = false;
  for (let i = 0; i < song.blocks.length; i++) {
    const block = song.blocks[i];
    if (!['line', 'tab'].includes(block.type)) continue;
    const blockIndex = i;
    let endBlockIndex = i;
    if (block.type === 'tab') {
      while (song.blocks[endBlockIndex + 1]?.type === 'tab') endBlockIndex++;
      i = endBlockIndex;
    }
    const raw = block.raw ?? block.text;
    if (!raw.replace(/[|｜║:\s]/g, '')) continue;
    const bpm = block.timing?.tempo || Number(song.tempo);
    if (!Number.isFinite(bpm) || bpm <= 0) return { entries: [], duration: 0, totalBeats: 0, estimated: false, error: '請在營區的歌譜加入 {tempo: 90}，才能依 BPM 捲譜。' };
    const explicitBeats = block.timing?.beats;
    const specifiedMeter = meterBeats(block.timing?.time || song.time);
    const beatsPerBar = specifiedMeter || 4;
    const bars = barCount(raw, block.type === 'tab');
    const chordCount = block.tokens?.filter(token => token.chord && !token.chord.startsWith('*')).length || 1;
    const beats = explicitBeats || (bars || chordCount) * beatsPerBar;
    // Unmarked charts have no note durations; use one bar per chord as an estimate.
    const guessed = !explicitBeats && (!bars || !specifiedMeter || /:\s*[|║]|[|║]\s*:/.test(raw));
    const duration = beats * 60 / bpm;
    if (!Number.isFinite(seconds + duration) || duration <= 0) return { entries: [], duration: 0, totalBeats: 0, estimated: false, error: 'BPM 或拍數設定無效，請在營區修改歌譜。' };
    entries.push({ blockIndex, endBlockIndex, start: seconds, end: seconds + duration, beats, bpm, estimated: guessed });
    seconds += duration; totalBeats += beats; estimated ||= guessed;
  }
  return { entries, duration: seconds, totalBeats, estimated,
    error: entries.length ? '' : '這首譜還沒有可播放的歌詞或和弦。' };
}
export function timelinePosition(timeline, positions, seconds) {
  if (!timeline.entries.length || positions.length !== timeline.entries.length + 1) return { top: 0, index: -1 };
  const time = Math.max(0, Math.min(timeline.duration, seconds));
  let low = 0, high = timeline.entries.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (timeline.entries[mid].end <= time) low = mid + 1;
    else high = mid;
  }
  const entry = timeline.entries[low], progress = Math.max(0, Math.min(1, (time - entry.start) / (entry.end - entry.start)));
  return { top: positions[low] + (positions[low + 1] - positions[low]) * progress, index: low };
}
export function timelineTimeAt(timeline, positions, top) {
  if (!timeline.entries.length || top <= positions[0]) return 0;
  for (let i = 0; i < timeline.entries.length; i++) {
    const distance = positions[i + 1] - positions[i];
    if (distance > 0 && top < positions[i + 1]) {
      const fraction = Math.max(0, Math.min(1, (top - positions[i]) / distance));
      const entry = timeline.entries[i];
      return entry.start + fraction * (entry.end - entry.start);
    }
  }
  return timeline.entries.at(-1).start;
}
export function timelineEntryAtBlock(timeline, blockIndex) {
  if (!Number.isInteger(blockIndex)) return null;
  let low = 0, high = timeline.entries.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2), entry = timeline.entries[mid];
    if (blockIndex < entry.blockIndex) high = mid - 1;
    else if (blockIndex > entry.endBlockIndex) low = mid + 1;
    else return entry;
  }
  return null;
}
export function scoreClock(now = () => performance.now()) {
  let duration = 0, elapsed = 0, startedAt = null;
  const position = () => Math.min(duration, elapsed + (startedAt === null ? 0 : Math.max(0, now() - startedAt) / 1000));
  return {
    position,
    get playing() { return startedAt !== null; },
    load(seconds, at = 0) { duration = seconds; elapsed = Math.max(0, Math.min(seconds, at)); startedAt = null; },
    play() { if (!duration || startedAt !== null) return; if (elapsed >= duration) elapsed = 0; startedAt = now(); },
    pause() { elapsed = position(); startedAt = null; },
    seek(seconds) { elapsed = Math.max(0, Math.min(duration, seconds)); if (startedAt !== null) startedAt = now(); }
  };
}
