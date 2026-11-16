import { HAND, FOE, duration, clamp, span, eases, rand, spark, glow, sigil } from './spell-fx.js';

// 星弦落雨: seven strings run from the hero's hand to a lyre constellation that rains stars.
const SKY = [240, -150];
const STRING_BASE = -80, STRING_TOP = -207;
const stringX = j => SKY[0] - 30 + j * 10;
const IMPACT = 7700;

function lyre(c, w, color, alpha, pluck) {
  if (alpha <= 0) return;
  const arm = side => Array.from({ length: 13 }, (_, k) => {
    const a = k / 12;
    return [SKY[0] + side * (30 + 30 * Math.sin(a * Math.PI) + (a > .85 ? (a - .85) * 120 : 0)),
      STRING_BASE - 150 * a];
  });
  c.lineCap = 'round';
  for (const pass of [[5, .18], [1.3, 1]]) {
    c.lineWidth = pass[0]; c.strokeStyle = color; c.globalAlpha = alpha * pass[1];
    for (const side of [-1, 1]) {
      const points = arm(side);
      c.beginPath();
      points.forEach(([x, y], k) => c[k ? 'lineTo' : 'moveTo'](x, y));
      c.stroke();
    }
    c.beginPath();
    c.moveTo(SKY[0] - 38, STRING_BASE); c.lineTo(SKY[0] + 38, STRING_BASE);
    c.moveTo(SKY[0] - 50, STRING_TOP); c.lineTo(SKY[0] + 50, STRING_TOP);
    c.stroke();
    for (let j = 0; j < 7; j++) {
      c.beginPath();
      for (let k = 0; k <= 12; k++) {
        const s = k / 12, wobble = Math.sin(s * Math.PI) * pluck * Math.sin(w / 26 + j * 1.7);
        c[k ? 'lineTo' : 'moveTo'](stringX(j) + wobble, STRING_BASE + (STRING_TOP - STRING_BASE) * s);
      }
      c.stroke();
    }
  }
  // Constellation nodes along the frame.
  for (const side of [-1, 1]) arm(side).forEach(([x, y], k) => {
    if (k % 2 === 0) spark(c, x, y, 1.6 + Math.sin(w / 180 + k) * .6, color, alpha);
  });
}

function drawBack(c, t, w, ctx) {
  const { color, reduced } = ctx;
  // Night thickens around the actors so the starlight reads stronger.
  const veil = .14 + .42 * span(t, 1300, 3400) - .2 * span(t, 9000, 11000);
  c.globalAlpha = veil; c.fillStyle = '#030819';
  c.fillRect(-600, -900, 1700, 1400);
  // Upper sky: deepen into space for the crane shot.
  const sky = c.createLinearGradient(0, -420, 0, 40);
  sky.addColorStop(0, '#02040c'); sky.addColorStop(.7, '#07112acc'); sky.addColorStop(1, '#07112a00');
  c.globalAlpha = 1; c.fillStyle = sky; c.fillRect(-600, -900, 1700, 940);
  c.globalCompositeOperation = 'lighter';
  const starPower = .35 + .65 * span(t, 3400, 5600);
  for (let i = 0; i < (reduced ? 50 : 160); i++) {
    const x = -80 + rand(i) * 640, y = -440 + rand(i, 1) * 520;
    const twinkle = .45 + .55 * Math.sin(w / (260 + rand(i, 2) * 500) + i);
    c.globalAlpha = starPower * twinkle * (y < 60 ? 1 : .3);
    c.fillStyle = i % 9 ? '#cfd8ff' : color;
    const size = rand(i, 3) > .9 ? 2 : 1;
    c.fillRect(x, y, size, size);
  }
  if (t >= 3400 && t < 7000) {
    const grow = eases.out(span(t, 3400, 4300)), fade = 1 - span(t, 6400, 7000);
    sigil(c, 150, 179, 22 + 24 * grow, w / 900, color, .85 * fade);
    glow(c, 150, 176, 46 * grow, color, .35 * fade);
  }
  if (t >= 6000 && t < 9400) {
    const grow = eases.out(span(t, 6000, 6800)), fade = 1 - span(t, 8600, 9400);
    sigil(c, FOE[0], 180, 30 + 34 * grow, -w / 700, color, .8 * fade);
  }
  // Seven strings run from the hero's hand to the constellation lyre.
  if (t >= 1500 && t < 7800) {
    const grow = eases.out(span(t, 1500, 2300)), fade = 1 - span(t, 6800, 7800);
    let amp = .6;
    if (t >= 1800) amp += 7 * Math.exp(-(t - 1800) / 450);
    amp += 2.4 * span(t, 3400, 5100);
    c.lineCap = 'round';
    for (let j = 0; j < 7; j++) {
      const ex = stringX(j), ey = STRING_BASE, dx = ex - HAND[0], dy = ey - HAND[1];
      const len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
      for (const pass of [[3.2, .16], [.8, .95]]) {
        c.lineWidth = pass[0]; c.strokeStyle = color; c.globalAlpha = pass[1] * fade;
        c.beginPath();
        for (let k = 0; k <= 24; k++) {
          const s = k / 24 * grow;
          const off = Math.sin(s * Math.PI) * amp * Math.sin(w / 22 + j * 1.3)
            + Math.sin(s * Math.PI * 3) * amp * .3 * Math.cos(w / 15 + j);
          c[k ? 'lineTo' : 'moveTo'](HAND[0] + dx * s + nx * off, HAND[1] + dy * s + ny * off);
        }
        c.stroke();
      }
      // A bead of light races up each string after the pluck.
      const bead = ((t - 1800) / 900 + j * .13) % 1;
      if (t > 1800) spark(c, HAND[0] + dx * bead * grow, HAND[1] + dy * bead * grow, 1.4, color, .9 * fade);
    }
  }
  if (t >= 4600 && t < 9200) {
    const appear = span(t, 4600, 5600), fade = 1 - span(t, 8400, 9200);
    const pluck = t >= 6400 ? 2.6 * (1 - span(t, 7400, 8400)) : .4;
    lyre(c, w, color, appear * fade, pluck);
    glow(c, SKY[0], (STRING_BASE + STRING_TOP) / 2, 120, color, .22 * appear * fade);
  }
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
}


function drawFront(c, t, w, ctx) {
  const { color, reduced, foeY } = ctx;
  const dense = reduced ? .3 : 1;
  c.globalCompositeOperation = 'lighter';
  // Pluck: a bright bloom at the fingertips.
  if (t >= 1700 && t < 2600) {
    const k = span(t, 1800, 2600);
    glow(c, HAND[0], HAND[1], 6 + 26 * k, color, (1 - k) * .9);
    spark(c, HAND[0], HAND[1], 2 + 3 * (1 - k), color, 1 - k);
  }
  // The foe's eye catches a glint of starlight.
  if (t >= 2650 && t < 3400) {
    const k = span(t, 2650, 3400);
    spark(c, FOE[0] - 8, foeY - 10, 1 + 3 * Math.sin(k * Math.PI), '#fff3c4', Math.sin(k * Math.PI));
  }
  // Charge: motes spiral in from all sides to the caster's hand.
  if (t >= 3400 && t < 5300) {
    const fade = 1 - span(t, 5000, 5300);
    for (let i = 0; i < 110 * dense; i++) {
      const life = ((w - 3400) / 1000 + rand(i, 4)) % 1;
      const r = (1 - eases.in(life)) * (40 + rand(i, 5) * 80), a = rand(i, 6) * 7 + life * 5;
      const x = HAND[0] + Math.cos(a) * r, y = HAND[1] + Math.sin(a) * r * .7;
      spark(c, x, y, .6 + life * 1.1, color, life * fade);
    }
    // Pillar of rising light behind the hero.
    const power = span(t, 3400, 5100);
    for (let i = 0; i < 18 * dense; i++) {
      const rise = ((w / 700) + rand(i, 7)) % 1;
      c.globalAlpha = power * (1 - rise) * .7 * fade; c.fillStyle = color;
      c.fillRect(150 - 18 + rand(i, 8) * 36, 178 - rise * 90, .8, 10 + rand(i) * 14);
    }
    glow(c, HAND[0], HAND[1], 10 + 22 * power, color, .5 * power * fade);
  }
  // Meteor rain from the lyre strings onto the foe.
  if (t >= 6100 && t < IMPACT + 900) {
    const count = Math.round(80 * dense);
    for (let i = 0; i < count; i++) {
      const last = i >= count - 4;
      const start = last ? 7280 + (i - count + 4) * 70 : 6100 + rand(i, 9) * 1300;
      const life = last ? 420 : 380 + rand(i, 10) * 260;
      const p = (t - start) / life;
      if (p < 0 || p > 1.6) continue;
      const sx = stringX(i % 7), sy = STRING_BASE - rand(i, 11) * 127;
      const ex = last ? FOE[0] : FOE[0] + (rand(i, 12) - .5) * 150;
      const ey = last ? foeY : 178 - rand(i, 13) * 34;
      if (p <= 1) {
        const k = eases.in(p), x = sx + (ex - sx) * k, y = sy + (ey - sy) * k;
        const tail = .22 + .18 * p, tx = x - (ex - sx) * tail, ty = y - (ey - sy) * tail;
        const g = c.createLinearGradient(tx, ty, x, y);
        g.addColorStop(0, '#00000000'); g.addColorStop(.75, color); g.addColorStop(1, '#fff8e6');
        c.globalAlpha = .9; c.strokeStyle = g; c.lineWidth = last ? 3 : 1 + rand(i, 14) * 1.2;
        c.beginPath(); c.moveTo(tx, ty); c.lineTo(x, y); c.stroke();
        spark(c, x, y, last ? 3 : 1.4, color, 1);
      } else {
        // Landing burst.
        const k = (p - 1) / .6;
        c.save(); c.translate(ex, ey); c.scale(1, .35);
        c.globalAlpha = 1 - k; c.strokeStyle = color; c.lineWidth = 1.5;
        c.beginPath(); c.arc(0, 0, 3 + k * (last ? 40 : 14), 0, Math.PI * 2); c.stroke();
        c.restore();
        spark(c, ex, ey - k * 6, 2 * (1 - k), color, 1 - k);
      }
    }
  }
  // Impact: a column of starlight, shockwaves and debris.
  if (t >= IMPACT && t < 10000) {
    const k = (w - IMPACT) / 1000;
    const pillar = Math.max(0, 1 - k / .7);
    if (pillar > 0) {
      const width = 34 * pillar + 4;
      const g = c.createLinearGradient(FOE[0] - width, 0, FOE[0] + width, 0);
      g.addColorStop(0, '#00000000'); g.addColorStop(.5, '#fff8e6'); g.addColorStop(.62, color); g.addColorStop(1, '#00000000');
      c.globalAlpha = pillar; c.fillStyle = g;
      c.fillRect(FOE[0] - width, -600, width * 2, 780);
    }
    glow(c, FOE[0], foeY, 30 + 140 * k, color, Math.max(0, .9 - k * .9));
    for (let ring = 0; ring < 3; ring++) {
      const r = clamp(k * 1.4 - ring * .14) * (90 + ring * 70);
      if (r <= 0 || r >= 90 + ring * 70) continue;
      c.save(); c.translate(FOE[0], 179); c.scale(1, .28);
      c.globalAlpha = 1 - r / (90 + ring * 70); c.strokeStyle = ring ? color : '#fff8e6'; c.lineWidth = 3 - ring;
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); c.restore();
    }
    for (let i = 0; i < 60 * dense; i++) {
      const a = -Math.PI * rand(i, 15), v = 60 + rand(i, 16) * 140;
      const x = FOE[0] + Math.cos(a) * v * k, y = foeY + Math.sin(a) * v * k + 160 * k * k;
      if (y < 182) spark(c, x, y, 1.2 * (1 - k * .6), color, Math.max(0, 1 - k * .8));
    }
  }
  // Aftermath: light dust drifting back up to the sky.
  if (t >= 8600) {
    const fade = span(t, 8600, 9200) * (1 - span(t, 10800, duration));
    for (let i = 0; i < 70 * dense; i++) {
      const rise = ((t - 8600) / 2600 + rand(i, 17)) % 1;
      const x = 40 + rand(i, 18) * 400 + Math.sin(w / 600 + i) * 6, y = 182 - rise * 200;
      spark(c, x, y, .5 + rand(i, 19), color, fade * Math.sin(rise * Math.PI) * .9);
    }
  }
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
}

// [start ms, caption, from camera, to camera, easing, whip-pan blend ms]
// Camera tuples are [x, y, zoom, roll] in world space.
export const starsPlan = {
  impact: IMPACT,
  attack: [3400, IMPACT + 600],
  shots: [
    [0, '序幕 · 星夜對峙', [240, 110, 1.0, 0], [240, 130, 1.18, 0], 'smooth'],
    [1300, '特寫 · 指尖撥弦', [146, 156, 3.8, -.07], [153, 148, 4.2, -.02], 'out'],
    [2500, '敵影 · 察覺星芒', [340, 152, 3.2, .06], [331, 147, 3.6, .02], 'out', 240],
    [3400, '蓄力 · 千星共鳴', [140, 152, 1.7, .1], [158, 136, 2.6, -.08], 'smooth', 160],
    [5100, '仰望 · 星弦成琴', [158, 140, 2.4, 0], [240, -134, 1.1, 0], 'inOut'],
    [6400, '俯衝 · 星弦落雨', [250, -90, 1.2, .05], [318, 142, 1.9, -.03], 'in'],
    [7700, '命中 · 群星貫穿', [330, 150, 3.0, 0], [330, 154, 3.4, 0], 'out'],
    [8800, '餘韻 · 光塵歸天', [310, 144, 2.4, 0], [240, 118, 1.06, 0], 'inOut'],
    [10200, '終幕 · 星弦落雨', [240, 122, 1.1, 0], [240, 127, 1.17, 0], 'smooth']
  ],
  close: [[1300, 3400], [IMPACT, 8800]],
  lines: [['v', 5300, 6300], ['zoom', 6400, IMPACT]],
  flashes: [[1800, 300, .28, 'color'], [IMPACT, 500, .92, '#fffaf0']],
  shake(t) {
    if (t >= IMPACT) return 6 * Math.exp(-(t - IMPACT) / 280);
    if (t >= 6400) return .5 + span(t, 6400, IMPACT) * 1.6;
    if (t >= 3400 && t < 5100) return span(t, 3400, 5100) * 1.4;
    return 0;
  },
  subtitle: '— 星 弦 一 響 ・ 萬 光 歸 塵 —',
  back: drawBack,
  front: drawFront
};
