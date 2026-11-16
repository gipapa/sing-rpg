import { HAND, HERO, FOE, duration, span, eases, rand, spark, glow } from './spell-fx.js';

// 月輪和鳴: moonlight fills the blade, three moon rings orbit the hero, fly edge-on
// across the field, bind the foe like an armillary sphere and shatter into falling shards.
const MOON = [384, 34];
const IMPACT = 7800;
const PALE = '#f2fbff';

// A tilted ring seen in perspective; nodes on the far side are dimmer.
function ring(c, x, y, rx, ry, angle, spin, color, alpha, nodes = 6) {
  if (alpha <= 0 || rx <= 0 || ry <= 0) return;
  c.save();
  c.translate(x, y); c.rotate(angle);
  c.strokeStyle = color;
  for (const [width, a] of [[4, .2], [1.2, 1]]) {
    c.lineWidth = width; c.globalAlpha = alpha * a;
    c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.stroke();
  }
  for (let i = 0; i < nodes; i++) {
    const a = spin + i * Math.PI * 2 / nodes, depth = Math.sin(a);
    spark(c, Math.cos(a) * rx, depth * ry, 1.2 + depth * .5, color, alpha * (.55 + .45 * depth));
  }
  c.restore();
}

function ripples(c, x, y, period, reach, color, alpha, phase = 0) {
  if (alpha <= 0) return;
  c.lineWidth = 1;
  c.strokeStyle = color;
  for (let k = 0; k < 3; k++) {
    const life = (phase / period + k / 3) % 1;
    c.globalAlpha = alpha * (1 - life);
    c.beginPath(); c.ellipse(x, y, 6 + life * reach, (6 + life * reach) * .26, 0, 0, Math.PI * 2); c.stroke();
  }
}

function moon(c, w, color, power) {
  glow(c, MOON[0], MOON[1], 40 + 30 * power, color, .35 + .4 * power);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  c.fillStyle = '#e9f6ff';
  c.beginPath(); c.arc(MOON[0], MOON[1], 15, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#bfd8e8';
  for (const [dx, dy, r] of [[-5, -3, 3.5], [4, 5, 2.5], [6, -6, 1.6], [-2, 7, 1.4]]) {
    c.beginPath(); c.arc(MOON[0] + dx, MOON[1] + dy, r, 0, Math.PI * 2); c.fill();
  }
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = color; c.lineWidth = 1;
  c.globalAlpha = .4 + .4 * power;
  c.beginPath(); c.arc(MOON[0], MOON[1], 22 + Math.sin(w / 300) * 1.5, 0, Math.PI * 2); c.stroke();
}

function beam(c, x, y, width, color, alpha) {
  if (alpha <= 0) return;
  const g = c.createLinearGradient(0, MOON[1], 0, y);
  g.addColorStop(0, PALE); g.addColorStop(1, color);
  c.globalAlpha = alpha; c.fillStyle = g;
  c.beginPath();
  c.moveTo(MOON[0] - 4, MOON[1]); c.lineTo(MOON[0] + 4, MOON[1]);
  c.lineTo(x + width, y); c.lineTo(x - width, y);
  c.closePath(); c.fill();
}

// Where ring k is at time t during the flight: hero → foe.
function flight(k, t) {
  const start = 5600 + k * 260, p = span(t, start, start + 950);
  return { p, x: HERO[0] + (FOE[0] - HERO[0]) * eases.inOut(p), y: 150 - Math.sin(p * Math.PI) * 26 + k * 6 };
}

function drawBack(c, t, w, ctx) {
  const { color, reduced } = ctx;
  const veil = .12 + .36 * span(t, 1500, 2700) - .2 * span(t, 9000, 11000);
  c.globalAlpha = veil; c.fillStyle = '#020b1a';
  c.fillRect(-600, -900, 1700, 1400);
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (reduced ? 30 : 90); i++) {
    c.globalAlpha = (.3 + .5 * Math.sin(w / (300 + rand(i, 2) * 400) + i)) * .6;
    c.fillStyle = i % 7 ? '#d6ecff' : color;
    c.fillRect(rand(i) * 480, rand(i, 1) * 110, 1, 1);
  }
  moon(c, w, color, span(t, 1500, 2700) * .6 + span(t, 6800, IMPACT) * .4 - .5 * span(t, 9000, 10500));
  // Moonbeam falls on the hero, later on the bound foe.
  const onHero = t >= 1500 && t < 3200 ? Math.sin(span(t, 1500, 3200) * Math.PI) : 0;
  beam(c, HERO[0], HERO[1], 18, color, .32 * onHero);
  const onFoe = t >= 7000 && t < IMPACT + 400 ? span(t, 7000, IMPACT) * (1 - span(t, IMPACT, IMPACT + 400)) : 0;
  beam(c, FOE[0], FOE[1], 10 + 24 * onFoe, color, .5 * onFoe);
  // Tidal ripples spread from whoever holds the moon's attention.
  if (t >= 2200 && t < 5600) ripples(c, HERO[0], 179, 900, 60, color, .7 * (1 - span(t, 5000, 5600)), w - 2200);
  if (t >= 4500 && t < 7000) ripples(c, FOE[0], 179, 700, 70, color, .6 * span(t, 4500, 5000), w - 4500);
  if (t >= 8600) ripples(c, FOE[0], 179, 1400, 150, color, .7 * (1 - span(t, 10600, duration)), t - 8600);
  // Behind-the-actor half of the orbiting rings (drawn whole, dimmed).
  if (t >= 2700 && t < 5600) orbit(c, t, w, color, .35);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
}

function orbit(c, t, w, color, alpha) {
  const appear = eases.out(span(t, 2700, 3400)), leave = 1 - span(t, 5400, 5700);
  for (let k = 0; k < 3; k++) {
    const r = (16 + k * 7) * appear, tilt = .22 + .18 * Math.sin(w / 600 + k * 2.1);
    const y = 176 - k * 13 - appear * 6;
    ring(c, HERO[0], y, r, r * tilt, Math.sin(w / 900 + k) * .25, w / (260 - k * 50) * (k % 2 ? -1 : 1), color, alpha * leave);
  }
}

function drawFront(c, t, w, ctx) {
  const { color, reduced, foeY } = ctx;
  const dense = reduced ? .3 : 1;
  c.globalCompositeOperation = 'lighter';
  // Moonlight runs up the blade.
  if (t >= 1700 && t < 2900) {
    const k = span(t, 1700, 2600);
    spark(c, HAND[0] + 2 + k * 8, HAND[1] - 4 - k * 14, 1.5 + 2 * Math.sin(k * Math.PI), PALE, 1 - span(t, 2600, 2900));
    glow(c, HAND[0] + 6, HAND[1] - 10, 14 + 10 * k, color, .5 * (1 - span(t, 2500, 2900)));
  }
  if (t >= 2700 && t < 5600) orbit(c, t, w, color, 1);
  // Target lock: a ring shadow closes in around the foe.
  if (t >= 4500 && t < 5600) {
    const k = span(t, 4500, 5500);
    ring(c, FOE[0], 180, 70 - 40 * k, (70 - 40 * k) * .26, 0, -w / 300, color, .7 * Math.sin(k * Math.PI), 8);
  }
  // Edge-on flight across the field with ghost echoes.
  if (t >= 5500 && t < 6900) {
    for (let k = 0; k < 3; k++) {
      const { p, x, y } = flight(k, t);
      if (p <= 0 || p >= 1) continue;
      for (let echo = 3; echo >= 0; echo--) {
        const back = flight(k, t - echo * 45);
        const r = 16 + k * 6 + p * 8;
        ring(c, back.x, back.y, r * .3, r, 0, w / 90, color, (1 - echo / 4) * (echo ? .35 : 1), echo ? 0 : 6);
      }
      for (let i = 0; i < 6 * dense; i++) spark(c, x - 8 - rand(i, k) * 40 * p, y + (rand(i, 3) - .5) * 30, .8, color, (1 - rand(i, 4)) * .7);
    }
  }
  // Binding: three rings lock into an armillary sphere and tighten.
  if (t >= 6400 && t < IMPACT) {
    const k = span(t, 6400, IMPACT), r = 46 - 26 * eases.in(k), speed = 1 + k * 6;
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI / 3 + w / 1200 * speed;
      ring(c, FOE[0], foeY, r, r * (.3 + .1 * i), angle, w / 120 * speed, i ? color : PALE, Math.min(1, k * 3), 8);
    }
    glow(c, FOE[0], foeY, 20 + 30 * k, color, .4 * k);
  }
  if (t >= IMPACT && t < 10000) {
    const k = (w - IMPACT) / 1000;
    glow(c, FOE[0], foeY, 30 + 150 * k, color, Math.max(0, .95 - k * .9));
    for (let n = 0; n < 3; n++) {
      const r = Math.min(1, k * 1.3 - n * .12) * (100 + n * 70);
      if (r > 0 && r < 100 + n * 70) ring(c, FOE[0], 179, r, r * .27, 0, 0, n ? color : PALE, 1 - r / (100 + n * 70), 0);
    }
    // Ring shards burst outward then fall.
    for (let i = 0; i < 70 * dense; i++) {
      const a = rand(i, 5) * Math.PI * 2, v = 50 + rand(i, 6) * 120, spin = w / 80 + i;
      const x = FOE[0] + Math.cos(a) * v * k, y = foeY + Math.sin(a) * v * k * .7 + 90 * k * k;
      if (y > 182) continue;
      c.save(); c.translate(x, y); c.rotate(spin);
      c.globalAlpha = Math.max(0, 1 - k * .7); c.fillStyle = i % 3 ? color : PALE;
      c.fillRect(-2.5, -.6, 5, 1.2);
      c.restore();
    }
  }
  // Aftermath: moon-dust flakes drift down like snow.
  if (t >= 8700) {
    const fade = span(t, 8700, 9300) * (1 - span(t, 10800, duration));
    for (let i = 0; i < 60 * dense; i++) {
      const fall = ((t - 8700) / 3200 + rand(i, 7)) % 1;
      const x = 30 + rand(i, 8) * 420 + Math.sin(w / 500 + i) * 8, y = 10 + fall * 172;
      spark(c, x, y, .5 + rand(i, 9) * .8, color, fade * Math.sin(fall * Math.PI) * .8);
    }
  }
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
}

export const ringsPlan = {
  impact: IMPACT,
  attack: [2700, IMPACT + 600],
  shots: [
    [0, '序幕 · 月下靜默', [384, 40, 2.6, 0], [240, 128, 1.12, 0], 'inOut'],
    [1500, '特寫 · 月光入刃', [150, 150, 3.6, .05], [154, 145, 4.1, 0], 'out'],
    [2700, '環繞 · 三輪和鳴', [118, 152, 2.1, -.12], [182, 138, 2.5, .12], 'smooth', 180],
    [4500, '敵影 · 潮汐壓迫', [336, 152, 3.1, -.05], [328, 148, 3.5, 0], 'out', 220],
    [5500, '追跡 · 月輪飛渡', [165, 140, 1.7, 0], [305, 142, 2.0, 0], 'inOut'],
    [6800, '封鎖 · 月輪縛身', [330, 150, 2.4, 0], [330, 150, 3.1, .06], 'in'],
    [IMPACT, '命中 · 月華崩解', [330, 148, 3.0, 0], [330, 152, 3.4, 0], 'out'],
    [8900, '餘韻 · 潮聲退去', [310, 144, 2.3, 0], [240, 120, 1.06, 0], 'inOut'],
    [10200, '終幕 · 月輪和鳴', [240, 122, 1.1, 0], [240, 127, 1.17, 0], 'smooth']
  ],
  close: [[1500, 2700], [IMPACT, 8900]],
  lines: [['h', 5500, 6800], ['zoom', 6800, IMPACT]],
  flashes: [[2000, 320, .3, 'color'], [IMPACT, 520, .9, PALE]],
  shake(t) {
    if (t >= IMPACT) return 5 * Math.exp(-(t - IMPACT) / 300);
    if (t >= 6800) return .4 + span(t, 6800, IMPACT) * 1.4;
    if (t >= 2700 && t < 4500) return span(t, 2700, 4500) * .9;
    return 0;
  },
  subtitle: '— 三 輪 相 和 ・ 月 華 封 天 —',
  back: drawBack,
  front: drawFront
};
