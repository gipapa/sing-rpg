import { spellScene } from './scene.js';
import { FOE, duration, span, eases, rand, warp, cameraAt } from './spell-fx.js';
import { spellPlans } from './spell-plans.js';
import { starsPlan } from './spell-stars.js';
export { spellPlans, hasCinematic } from './spell-plans.js';

// Screen-space finishing in a 960×480 frame: lines, flashes, vignette and the title card.
function drawOverlay(c, t, ctx, plan, whip) {
  const { color, reduced, spell } = ctx;
  if (!reduced) {
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = color; c.strokeStyle = color;
    if (whip > 0) for (let i = 0; i < 26; i++) {
      c.globalAlpha = whip * (.2 + rand(i, 20) * .4);
      c.fillRect((rand(i, 21) * 1400 - 200 + t * 3) % 1200 - 120, rand(i, 22) * 480, 140 + rand(i) * 200, 1 + (i % 3));
    }
    for (const [kind, from, to] of plan.lines) {
      if (t < from || t >= to) continue;
      const k = span(t, from, to), power = kind === 'zoom' ? k : Math.sin(k * Math.PI);
      if (kind === 'v') for (let i = 0; i < 30; i++) {
        c.globalAlpha = power * (.15 + rand(i, 23) * .35);
        c.fillRect(rand(i, 24) * 960, (rand(i, 25) * 600 + t * 2.2) % 600 - 120, 1 + i % 2, 60 + rand(i) * 120);
      } else if (kind === 'h') for (let i = 0; i < 30; i++) {
        c.globalAlpha = power * (.15 + rand(i, 28) * .3);
        c.fillRect((rand(i, 29) * 1300 + t * 2.4) % 1300 - 200, rand(i, 30) * 480, 80 + rand(i) * 160, 1 + i % 2);
      } else {
        // 'zoom' radial lines, 'spin' swirling arcs.
        c.lineWidth = 1.5;
        for (let i = 0; i < 40; i++) {
          const a = rand(i, 26) * Math.PI * 2 + (kind === 'spin' ? t / 400 : 0);
          const r0 = 160 + ((rand(i, 27) * 400 + t * .9) % 400);
          c.globalAlpha = power * .45;
          c.beginPath();
          if (kind === 'spin') c.ellipse(480, 240, r0, r0 * .6, 0, a, a + .35);
          else {
            c.moveTo(480 + Math.cos(a) * r0, 240 + Math.sin(a) * r0 * .6);
            c.lineTo(480 + Math.cos(a) * (r0 + 70), 240 + Math.sin(a) * (r0 + 70) * .6);
          }
          c.stroke();
        }
      }
    }
    c.globalCompositeOperation = 'source-over';
    for (const [at, length, alpha, tint] of plan.flashes) {
      if (t < at || t >= at + length) continue;
      c.globalAlpha = (1 - (t - at) / length) * alpha;
      c.fillStyle = tint === 'color' ? color : tint;
      c.fillRect(0, 0, 960, 480);
    }
  }
  const v = c.createRadialGradient(480, 240, 160, 480, 240, 560);
  v.addColorStop(0, '#00000000'); v.addColorStop(1, '#000000c0');
  c.globalAlpha = 1; c.fillStyle = v; c.fillRect(0, 0, 960, 480);
  const end = plan.duration ?? duration, titleAt = plan.titleAt ?? 10000;
  if (t >= titleAt) {
    const k = span(t, titleAt, titleAt + 700), out = 1 - span(t, end - 400, end), scale = 1.12 - .12 * eases.out(k);
    c.save();
    c.translate(480, 236); c.scale(scale, scale);
    c.globalAlpha = k * out;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 72px Georgia, "Songti TC", serif';
    c.shadowColor = color; c.shadowBlur = 28;
    c.lineWidth = 6; c.strokeStyle = '#050a12'; c.strokeText(spell.name, 0, 0);
    c.fillStyle = '#fff6dc'; c.fillText(spell.name, 0, 0);
    c.shadowBlur = 0;
    c.fillStyle = color; c.fillRect(-180 * k, 50, 360 * k, 2);
    c.font = '18px Georgia, "Songti TC", serif';
    c.fillText(plan.subtitle, 0, 78);
    c.restore();
  }
}

export function spellCinematic(dialog) {
  const canvas = dialog.querySelector('canvas'), c = canvas.getContext('2d');
  const label = dialog.querySelector('#spellShot');
  const progress = dialog.querySelector('#spellProgress');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let playback = null, frame = 0, bars = 22;
  function finish(completed) {
    if (!playback) return;
    const { resolve } = playback;
    playback = null;
    cancelAnimationFrame(frame);
    dialog.close();
    resolve(completed);
  }
  dialog.querySelector('#skipSpell').onclick = () => finish(true);
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(true); });
  dialog.addEventListener('close', () => finish(false));
  function paint(now) {
    if (!playback) return;
    const state = playback;
    // Hidden time does not skip the cinematic or settle damage in the background.
    if (!document.hidden) state.elapsed += Math.max(0, Math.min(100, now - state.last));
    state.last = now;
    const spell = state.style.spell, foe = state.scene.foe;
    const plan = spellPlans[spell.id] ?? starsPlan;
    const end = plan.duration ?? duration;
    const t = Math.min(state.elapsed, end), w = warp(t, plan.impact);
    const pose = plan.pose?.(t, w, reduced.matches);
    const { shot, cam, whip } = cameraAt(plan, t, reduced.matches);
    const ctx = {
      color: state.style.color, reduced: reduced.matches, spell,
      foeY: FOE[1] - (foe?.base === 5 ? 5 : 3) * 5, pose
    };
    spellScene(canvas, { ...state.scene, time: w / 1000,
      camera: { x: cam[0], y: cam[1], zoom: cam[2], roll: cam[3] },
      attack: t >= plan.attack[0] && t < plan.attack[1],
      hit: t >= plan.impact && t < plan.impact + 1300 && Math.floor(t / 70) % 2 === 0,
      heroPose: pose?.hero, foePose: pose?.foe,
      back: g => plan.back(g, t, w, ctx), front: g => plan.front(g, t, w, ctx) });
    c.save();
    c.scale(canvas.width / 960, canvas.height / 480);
    drawOverlay(c, t, ctx, plan, whip);
    c.restore();
    // Bars widen to cinemascope on close-ups and the impact.
    const wide = plan.close.some(([a, b]) => t >= a && t < b);
    bars += ((wide && !reduced.matches ? 48 : 22) - bars) * .12;
    const bar = Math.round(bars * canvas.height / 480);
    c.fillStyle = '#050a12'; c.fillRect(0, 0, canvas.width, bar); c.fillRect(0, canvas.height - bar, canvas.width, bar);
    label.textContent = shot[1];
    progress.style.width = Math.min(100, t / end * 100) + '%';
    if (state.elapsed >= end) finish(true);
    else frame = requestAnimationFrame(paint);
  }
  return {
    play(style, scene, name) {
      finish(false);
      bars = 22;
      dialog.querySelector('#spellTitle').textContent = style.spell.name;
      dialog.querySelector('#spellCaster').textContent = name + '　對　' + (scene.foeName ?? scene.foe?.name ?? '星空');
      dialog.style.setProperty('--spell-color', style.color);
      return new Promise(resolve => {
        playback = { style, scene, resolve, elapsed: 0, last: performance.now() };
        dialog.showModal();
        frame = requestAnimationFrame(paint);
      });
    },
    cancel() { finish(false); }
  };
}
