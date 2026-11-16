import { spellScene } from './scene.js';

const shots = [
  [0, '對峙 · 星光沉落之前', 240, 132, 1.12],
  [1400, '主角特寫 · 撥動命運之弦', 155, 150, 3.1],
  [2400, '敵方反打 · 察覺星芒', 330, 150, 3.1],
  [3300, '蓄力 · 千星共鳴', 165, 132, 1.75],
  [4500, '俯視 · 星弦落雨', 285, 130, 1.3],
  [6100, '終幕 · 星光消散', 270, 145, 1.6]
];
const duration = 7200;

export function spellCinematic(dialog) {
  const canvas = dialog.querySelector('canvas'), c = canvas.getContext('2d');
  const label = dialog.querySelector('#spellShot');
  const progress = dialog.querySelector('#spellProgress');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let playback = null, frame = 0;
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
    const t = state.elapsed, p = t / duration;
    const shot = shots.findLast(item => t >= item[0]);
    const local = (t - shot[0]) / 1000;
    const camera = reduced.matches ? { x: 240, y: 132, zoom: 1.12 }
      : { x: shot[2], y: shot[3], zoom: shot[4] + Math.min(.12, local * .05) };
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
    // Orbiting notes gather around the caster, then shower toward the enemy.
    // Other spells share the camera sequence but retain their own particle motif.
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
      c.globalAlpha = Math.min(1, p * 5) * Math.max(0, (duration - t) / 800);
      c.fillStyle = color; c.shadowColor = color; c.shadowBlur = reduced.matches ? 0 : 13;
      c.fillRect(x - size * 2, y, size * 4, size);
      c.fillRect(x, y - size * 2, size, size * 4);
    }
    if (stars && t >= 3300 && t < 6100) {
      c.globalAlpha = .6;
      c.strokeStyle = color; c.lineWidth = 2;
      c.beginPath(); c.ellipse(t < 4500 ? 350 : 635, 355, 60 + local * 45, 18 + local * 8, 0, 0, Math.PI * 2); c.stroke();
      // Radiant strings bridge the sky and the casting hand.
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
    // Letterbox and scene captions stay stable through camera cuts.
    c.fillStyle = '#050a12'; c.fillRect(0, 0, canvas.width, 22); c.fillRect(0, canvas.height - 22, canvas.width, 22);
    label.textContent = state.style.spell.id === 'stars' ? shot[1] : state.style.spell.name + ' · ' + shot[1].split(' · ')[0];
    progress.style.width = Math.min(100, p * 100) + '%';
    if (t >= duration) finish(true);
    else frame = requestAnimationFrame(paint);
  }
  return {
    play(style, scene, name) {
      finish(false);
      dialog.querySelector('#spellTitle').textContent = style.spell.name;
      dialog.querySelector('#spellCaster').textContent = name + '　對　' + (scene.foe?.name ?? '星空');
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
