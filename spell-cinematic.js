import { spellScene } from './scene.js';
import { FOE, duration, span, eases, rand, warp, cameraAt } from './spell-fx.js';
import { starsPlan } from './spell-stars.js';
import { ringsPlan } from './spell-rings.js';
import { petalsPlan } from './spell-petals.js';

// Each spell owns its choreography: camera shots, impact beat, speed lines, flashes,
// shake curve and the world-space effect layers drawn behind/in front of the actors.
export const spellPlans = { stars: starsPlan, rings: ringsPlan, petals: petalsPlan };

// The original compact cut-in is kept as an explicit player-selectable mode.
const SIMPLE_SHOTS = [
  [0, '對峙 · 星光沉落之前', 240, 132, 1.12],
  [1400, '主角特寫 · 撥動命運之弦', 155, 150, 3.1],
  [2400, '敵方反打 · 察覺星芒', 330, 150, 3.1],
  [3300, '蓄力 · 千星共鳴', 165, 132, 1.75],
  [4500, '俯視 · 星弦落雨', 285, 130, 1.3],
  [6100, '終幕 · 星光消散', 270, 145, 1.6]
];
const SIMPLE_DURATION = 7200;

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
  if (t >= 10000) {
    const k = span(t, 10000, 10700), out = 1 - span(t, 11200, duration), scale = 1.12 - .12 * eases.out(k);
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
  function paintSimple(state) {
    const t = Math.min(state.elapsed, SIMPLE_DURATION), p = t / SIMPLE_DURATION;
    const shot = SIMPLE_SHOTS.findLast(item => t >= item[0]) ?? SIMPLE_SHOTS[0];
    const local = (t - shot[0]) / 1000;
    const camera = reduced.matches
      ? { x: 240, y: 132, zoom: 1.12, roll: 0 }
      : { x: shot[2], y: shot[3], zoom: shot[4] + Math.min(.12, local * .05), roll: 0 };
    if (!reduced.matches && t >= 6100 && t < 6500) {
      camera.x += Math.sin(t / 23) * (1 - (t - 6100) / 400) * 3;
    }
    spellScene(canvas, { ...state.scene, time: t / 1000, camera,
      attack: t >= 3300 && t < 6100, hit: t >= 5300 && t < 6500 });
    c.save();
    c.scale(canvas.width / 960, canvas.height / 480);
    c.fillStyle = '#061126';
    c.globalAlpha = t >= 3300 ? .36 : .16;
    c.fillRect(0, 0, 960, 480);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'lighter';
    const color = state.style.color;
    // The compact renderer intentionally keeps the original shared motif.
    const stars = state.style.spell.id === 'stars';
    if (!stars) {
      c.save(); c.translate(480, 410); c.scale(3.5, 3.5);
      state.style.spell.draw(c, Math.min(.99, p), state.style.spell.count, color);
      c.restore();
    }
    for (let i = 0; i < (stars ? reduced.matches ? 24 : 100 : 0); i++) {
      const phase = i * 2.39996;
      let x, y, size = 1 + i % 3;
      if (t < 4500) {
        const spread = t >= 3300 ? 1 - Math.min(1, local / 1.2) * .55 : 1;
        x = 350 + Math.cos(phase + t / 1400) * (55 + i % 180) * spread;
        y = 240 + Math.sin(phase + t / 1700) * (35 + i % 130) * spread;
      } else {
        const fall = ((t - 4500) / 800 + i * .071) % 1;
        x = 440 + i * 37 % 390 - fall * 95;
        y = -80 + fall * 480;
        if (t < 6200) {
          c.strokeStyle = color; c.globalAlpha = .35;
          c.lineWidth = size; c.beginPath(); c.moveTo(x + 28, y - 80); c.lineTo(x, y); c.stroke();
        }
      }
      c.globalAlpha = Math.min(1, p * 5) * Math.max(0, (SIMPLE_DURATION - t) / 800);
      c.fillStyle = color; c.shadowColor = color; c.shadowBlur = reduced.matches ? 0 : 13;
      c.fillRect(x - size * 2, y, size * 4, size);
      c.fillRect(x, y - size * 2, size, size * 4);
    }
    if (stars && t >= 3300 && t < 6100) {
      c.globalAlpha = .6;
      c.strokeStyle = color; c.lineWidth = 2;
      c.beginPath(); c.ellipse(t < 4500 ? 350 : 635, 355, 60 + local * 45, 18 + local * 8, 0, 0, Math.PI * 2); c.stroke();
      if (t < 4500) for (let i = 0; i < 7; i++) {
        c.beginPath(); c.moveTo(290 + i * 20, 350); c.quadraticCurveTo(500, 100, 280 + i * 55, 0); c.stroke();
      }
    }
    if (t >= 6100 && !reduced.matches) {
      const pulse = Math.max(0, 1 - (t - 6100) / 650);
      const glow = c.createRadialGradient(635, 300, 0, 635, 300, 300);
      glow.addColorStop(0, '#fff4cd'); glow.addColorStop(.25, color); glow.addColorStop(1, '#00000000');
      c.globalAlpha = pulse * .65; c.fillStyle = glow; c.fillRect(0, 0, 960, 480);
      c.strokeStyle = color; c.lineWidth = 2;
      c.globalAlpha = Math.max(0, 1 - local);
      for (let i = 0; i < 36; i++) {
        const angle = i * Math.PI / 18, radius = 15 + local * (160 + i % 5 * 20);
        const x = 635 + Math.cos(angle) * radius, y = 300 + Math.sin(angle) * radius * .65;
        c.beginPath(); c.moveTo(x, y);
        c.lineTo(x + Math.cos(angle) * 18, y + Math.sin(angle) * 12); c.stroke();
      }
    }
    c.restore();
    c.fillStyle = '#050a12';
    c.fillRect(0, 0, canvas.width, 22); c.fillRect(0, canvas.height - 22, canvas.width, 22);
    label.textContent = stars ? shot[1] : state.style.spell.name + ' · ' + shot[1].split(' · ')[0];
    progress.style.width = Math.min(100, p * 100) + '%';
    return state.elapsed >= SIMPLE_DURATION;
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
    if (state.simple) {
      if (paintSimple(state)) finish(true);
      else frame = requestAnimationFrame(paint);
      return;
    }
    const spell = state.style.spell, foe = state.scene.foe;
    const plan = spellPlans[spell.id] ?? starsPlan;
    const t = Math.min(state.elapsed, duration), w = warp(t, plan.impact);
    const { shot, cam, whip } = cameraAt(plan, t, reduced.matches);
    const ctx = {
      color: state.style.color, reduced: reduced.matches, spell,
      foeY: FOE[1] - (foe?.base === 5 ? 5 : 3) * 5
    };
    spellScene(canvas, { ...state.scene, time: w / 1000,
      camera: { x: cam[0], y: cam[1], zoom: cam[2], roll: cam[3] },
      attack: t >= plan.attack[0] && t < plan.attack[1],
      hit: t >= plan.impact && t < plan.impact + 1300 && Math.floor(t / 70) % 2 === 0,
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
    progress.style.width = Math.min(100, t / duration * 100) + '%';
    if (state.elapsed >= duration) finish(true);
    else frame = requestAnimationFrame(paint);
  }
  return {
    play(style, scene, name, { simple = false } = {}) {
      finish(false);
      bars = 22;
      dialog.querySelector('#spellTitle').textContent = style.spell.name;
      dialog.querySelector('#spellCaster').textContent = name + '　對　' + (scene.foe?.name ?? '星空');
      dialog.style.setProperty('--spell-color', style.color);
      return new Promise(resolve => {
        playback = { style, scene, resolve, simple, elapsed: 0, last: performance.now() };
        dialog.showModal();
        frame = requestAnimationFrame(paint);
      });
    },
    cancel() { finish(false); }
  };
}
