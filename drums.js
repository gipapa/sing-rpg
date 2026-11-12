import { drumStyle } from './drum-spells.js';

export function drumVolume(game) {
  return typeof game.drumVolume === 'number' && Number.isFinite(game.drumVolume)
    ? Math.max(0, Math.min(100, game.drumVolume))
    : 85;
}
export function drumCharge(random = Math.random) {
  let charge = 0;
  return {
    get charge() { return charge; },
    tap() {
      const added = 1 + Math.floor(random() * 5);
      charge = Math.min(100, charge + added);
      return { added, cast: charge === 100 };
    },
    reset() { charge = 0; }
  };
}

function soundDrum(context, volume) {
  if (volume === 0) return;
  const tone = context.createOscillator();
  const gain = context.createGain();
  const t = context.currentTime;
  tone.frequency.setValueAtTime(128, t);
  tone.frequency.exponentialRampToValueAtTime(63, t + .12);
  gain.gain.setValueAtTime(.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume / 100, t + .009);
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
  meter.setAttribute('aria-valuemax', '100');
  let active = false, mic = null, speaker = null, style, rhythm;
  let castAt = -Infinity, feedbackUntil = 0;
  let rippleAnimation;
  function renderMeter() {
    label.textContent = style.spell.name;
    meter.setAttribute('aria-valuenow', rhythm.charge);
    meter.style.setProperty('--charge', rhythm.charge + '%');
    hud.classList.toggle('charged', rhythm.charge === 100);
  }
  function feedback(result, now) {
    if (result.cast) {
      castAt = now;
      feedbackUntil = castAt + style.spell.duration;
    }
    renderMeter();
  }
  function setMic(input) {
    mic = input;
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
    rhythm = drumCharge();
    hud.hidden = false;
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
    if (rhythm.charge === 100) rhythm.reset();
    feedback(rhythm.tap(), now);
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
    soundDrum(context, drumVolume(game));
  });
  // Some touch browsers grant user activation on release.
  field.addEventListener('pointerup', (event) => {
    const context = mic?.context ?? speaker;
    if (drumSurface(event) && context && context.state !== 'running') context.resume().catch(() => {});
  });

  function sample(now) {
    if (feedbackUntil && now >= feedbackUntil) {
      feedbackUntil = 0;
      if (rhythm.charge === 100) rhythm.reset();
      renderMeter();
    }
  }
  function effect(now) {
    const progress = (now - castAt) / style.spell.duration;
    if (progress < 0 || progress >= 1) return null;
    return { style, progress: motion.matches ? .56 : progress };
  }
  return { start, stop, setMic, sample, effect };
}
