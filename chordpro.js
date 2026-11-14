// A small text-only ChordPro reader. Unsupported directives are ignored.
// All content is rendered with textContent by songbook.js.
export function parseChordPro(source) {
  const song = { title: '未命名歌曲', artist: '', key: '', capo: '', tempo: '', time: '', blocks: [] };
  let tab = false, currentTempo = '';
  const metadata = { title: 'title', t: 'title', artist: 'artist', a: 'artist', key: 'key', k: 'key', capo: 'capo', time: 'time' };
  const sectionNames = { verse: '主歌', chorus: '副歌', bridge: '橋段', intro: '前奏', outro: '尾奏' };
  for (const line of source.replace(/^\uFEFF/, '').replaceAll('\r', '').split('\n')) {
    if (line.trimStart().startsWith('#')) continue;
    const directive = /^\s*\{([a-z_]+)(?::\s*(.*?))?\}\s*$/i.exec(line);
    if (directive) {
      const name = directive[1].toLowerCase(), value = directive[2] || '';
      if (Object.hasOwn(metadata, name)) song[metadata[name]] = value;
      else if (name === 'tempo' || (name === 'meta' && /^tempo\s+/i.test(value))) {
        const tempo = Number(name === 'meta' ? value.replace(/^tempo\s+/i, '') : value);
        if (Number.isFinite(tempo) && tempo > 0) {
          if (!song.tempo) song.tempo = String(tempo);
          else if (currentTempo !== String(tempo)) song.blocks.push({ type: 'comment', text: '速度變更：' + tempo + ' BPM' });
          currentTempo = String(tempo);
        }
      }
      else if (['comment', 'c', 'comment_italic', 'ci', 'subtitle', 'st'].includes(name)) song.blocks.push({ type: 'comment', text: value });
      else if (name === 'start_of_tab' || name === 'sot') tab = true;
      else if (name === 'end_of_tab' || name === 'eot') tab = false;
      else if (name.startsWith('start_of_') || name === 'soc') {
        const section = name === 'soc' ? 'chorus' : name.slice(9);
        song.blocks.push({ type: 'section', text: value || sectionNames[section] || section });
      }
      continue;
    }
    if (!line.trim()) {
      if (song.blocks.length && song.blocks.at(-1).type !== 'space') song.blocks.push({ type: 'space' });
      continue;
    }
    if (tab) { song.blocks.push({ type: 'tab', text: line }); continue; }
    const tokens = [];
    let offset = 0, chord = '';
    for (const match of line.matchAll(/\[([^\]\n]+)\]/g)) {
      if (match.index > offset || chord) tokens.push({ chord, lyric: line.slice(offset, match.index) });
      chord = match[1];
      offset = match.index + match[0].length;
    }
    if (offset < line.length || chord) tokens.push({ chord, lyric: line.slice(offset) });
    song.blocks.push({ type: 'line', tokens });
  }
  if (song.blocks.at(-1)?.type === 'space') song.blocks.pop();
  return song;
}

const notes = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const sharps = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const flats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export function transposeChord(chord, semitones) {
  if (!semitones || !/^[A-G](?:#|b|♯|♭)?[^\s]*$/.test(chord)) return chord;
  return chord.replace(/(^|\/)([A-G])([#b♯♭]?)/g, (_, lead, root, accidental) => {
    const index = notes[root] + (['#', '♯'].includes(accidental) ? 1 : ['b', '♭'].includes(accidental) ? -1 : 0);
    const names = semitones < 0 || ['b', '♭'].includes(accidental) ? flats : sharps;
    return lead + names[((index + semitones) % 12 + 12) % 12];
  });
}
