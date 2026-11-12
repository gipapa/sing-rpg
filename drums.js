import { drumStyle } from './drum-spells.js';

const beatsPerSpell = 4;
const windowMs = 150;
export function drumRhythm() {
  let tapAt = -Infinity, beatAt = -Infinity, charge = 0;
  function clearTiming() {
    tapAt = beatAt = -Infinity;
  }
  function match() {
    if (Math.abs(tapAt - beatAt) > windowMs) return null;
    clearTiming();
    charge = (charge + 1) % beatsPerSpell;
    return charge === 0 ? 'cast' : 'match';
  }
  return {
    get charge() { return charge; },
    tap(at) { tapAt = at; return match(); },
    beat(at) { beatAt = at; return match(); },
    clearTiming
  };
}

function soundDrum(context) {
  const tone = context.createOscillator();
  const gain = context.createGain();
  const t = context.currentTime;
  tone.frequency.setValueAtTime(128, t);
  tone.frequency.exponentialRampToValueAtTime(63, t + .12);
  gain.gain.setValueAtTime(.0001, t);
  gain.gain.exponentialRampToValueAtTime(.48, t + .009);
  gain.gain.exponentialRampToValueAtTime(.0001, t + .25);
  tone.connect(gain).connect(context.destination);
  tone.onended = () => { tone.disconnect(); gain.disconnect(); };
  tone.start(t);
  tone.stop(t + .26);
}

export function battleDrums(field, game) {
  const hud = field.querySelector('#drumHud');
  const label = field.querySelector('#drumLabel');
  const meter = field.querySelector('#drumMeter');
  const ripple = field.querySelector('#drumRipple');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pips = Array.from({ length: beatsPerSpell }, () => document.createElement('i'));
  meter.setAttribute('aria-valuemax', beatsPerSpell);
  meter.replaceChildren(...pips);
  let active = false, mic = null, speaker = null, style, rhythm;
  let lastSample = -Infinity, castAt = -Infinity, feedbackUntil = 0, sampling = false;
  let rippleAnimation;
  function renderMeter(text = '合拍集氣') {
    label.textContent = text;
    meter.setAttribute('aria-valuenow', rhythm.charge);
    pips.forEach((pip, i) => pip.classList.toggle('lit', i < rhythm.charge));
  }
  function feedback(result, now) {
    if (!result) return;
    if (result === 'cast') castAt = now;
    const casting = now - castAt < style.spell.duration;
    feedbackUntil = casting ? castAt + style.spell.duration : now + 500;
    renderMeter(casting ? style.spell.name : '合拍！');
  }
  function receiving() {
    return mic?.context.state === 'running' && !mic.track.muted && mic.track.readyState === 'live';
  }
  function clearTiming() {
    rhythm?.clearTiming();
    mic?.resetBeats();
    lastSample = -Infinity;
    sampling = false;
  }
  function setMic(input) {
    clearTiming();
    mic = input;
    hud.hidden = !mic;
  }
  function stop() {
    active = false;
    setMic(null);
    if (speaker) speaker.close().catch(() => {});
    speaker = null;
    rippleAnimation?.cancel();
  }
  function start(input) {
    style = drumStyle(game);
    rhythm = drumRhythm();
    active = true;
    castAt = -Infinity;
    feedbackUntil = 0;
    setMic(input);
    hud.style.setProperty('--spell-color', style.color);
    renderMeter();
  }
  function drumSurface(event) {
    return active && !document.hidden && game.story === null && event.button === 0 &&
      !event.target.closest('button, a, input, select, textarea, label, summary, [role="button"], [contenteditable]');
  }
  field.addEventListener('pointerdown', (event) => {
    if (!drumSurface(event)) return;
    const now = performance.now();
    if (receiving()) feedback(rhythm.tap(now), now);
    ripple.style.left = event.clientX + 'px';
    ripple.style.top = event.clientY + 'px';
    rippleAnimation?.cancel();
    rippleAnimation = ripple.animate([
      { opacity: .85, scale: motion.matches ? 1 : .55 },
      { opacity: 0, scale: motion.matches ? 1 : 1.6 }
    ], { duration: 230 });
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    const context = mic?.context ?? (speaker ??= new Audio());
    if (context.state !== 'running') context.resume().catch(() => {});
    soundDrum(context);
  });
  // Some touch browsers grant user activation on release.
  field.addEventListener('pointerup', (event) => {
    const context = mic?.context ?? speaker;
    if (drumSurface(event) && context && context.state !== 'running') context.resume().catch(() => {});
  });

  function sample(now) {
    if (!receiving() || game.story !== null || document.hidden) {
      if (sampling) clearTiming();
      return;
    }
    sampling = true;
    if (now - lastSample < 24) return;
    lastSample = now;
    const beat = mic.sampleBeat(now);
    if (beat !== null) feedback(rhythm.beat(beat), now);
    if (feedbackUntil && now >= feedbackUntil) {
      feedbackUntil = 0;
      renderMeter();
    }
  }
  function effect(now) {
    const progress = (now - castAt) / style.spell.duration;
    if (progress < 0 || progress >= 1) return null;
    return { style, progress: motion.matches ? .56 : progress };
  }
  return { start, stop, setMic, sample, effect, clearTiming };
}
