import { HAND, HERO, FOE, duration, span, eases, rand, spark, glow } from './spell-fx.js';

// 花火旋舞: a single petal lands in the hero's hand, a whirlwind of petals rises,
// fireworks bloom in the sky, and the storm sweeps onto the foe in one great flower.
const IMPACT = 7900;
const WARM = '#ffd6a5', CREAM = '#fff4f7';

function petal(c, x, y, size, angle, color, alpha) {
  if (alpha <= 0) return;
  c.save();
  c.translate(x, y); c.rotate(angle);
  c.globalAlpha = alpha; c.fillStyle = color;
  c.beginPath(); c.ellipse(0, 0, size, size * .48, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = CREAM; c.globalAlpha = alpha * .6;
  c.beginPath(); c.ellipse(-size * .25, 0, size * .4, size * .16, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

// Whirlwind centre slides from the hero to the foe during the charge.
function vortex(t) {
  return HERO[0] + (FOE[0] - HERO[0]) * eases.in(span(t, 6800, IMPACT));
}

// Helix of petals; `side` selects the half behind (-1) or in front (1) of the actors.
function tornado(c, t, w, ctx, side) {
  const active = t >= 2400 && t < IMPACT + 100;
  if (!active) return;
  const power = eases.out(span(t, 2400, 3200)) * (t < 4300 ? 1 : t < 6800 ? .45 : 1);
  const cx = vortex(t), count = (ctx.reduced ? 40 : 130);
  for (let i = 0; i < count; i++) {
    const a = rand(i) * Math.PI * 2 + w / (240 + rand(i, 1) * 160);
    const depth = Math.sin(a);
    if (Math.sign(depth || 1) !== side) continue;
    const h = ((w / 1800 + rand(i, 2)) % 1) * 80;
    const r = (8 + h * .5 + 4 * Math.sin(w / 400 + i)) * (.6 + .4 * power);
    const x = cx + Math.cos(a) * r, y = 179 - h + depth * r * .25;
    petal(c, x, y, 1.6 + depth * .5, a * 2, i % 4 ? ctx.color : WARM, power * (.6 + .4 * depth) * (1 - h / 110));
  }
}

const rockets = Array.from({ length: 7 }, (_, k) => ({
  launch: 4400 + k * 210,
  x: 170 + rand(k, 30) * 170,
  y: -30 - rand(k, 31) * 110,
  size: 30 + rand(k, 32) * 26,
  tint: k % 3
}));

function fireworks(c, t, w, ctx) {
  const { color } = ctx;
  const tints = [color, WARM, CREAM];
  for (const rocket of rockets) {
    const p = span(t, rocket.launch, rocket.launch + 600);
    if (t < rocket.launch || t > rocket.launch + 2200) continue;
    if (p < 1) {
      const k = eases.out(p), x = HAND[0] + (rocket.x - HAND[0]) * k, y = HAND[1] + (rocket.y - HAND[1]) * k;
      c.strokeStyle = WARM; c.lineWidth = 1; c.globalAlpha = .7;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - (rocket.x - HAND[0]) * .06, y + 14); c.stroke();
      spark(c, x, y, 1.4, WARM, 1);
      continue;
    }
    const age = (t - rocket.launch - 600) / 1600;
    glow(c, rocket.x, rocket.y, rocket.size * 1.6, tints[rocket.tint], .5 * (1 - age) ** 2);
    // Five-lobed chrysanthemum: petal-shaped embers with a gentle droop.
    for (let i = 0; i < (ctx.reduced ? 18 : 48); i++) {
      const a = i / 48 * Math.PI * 2 + rocket.tint, lobe = .72 + .28 * Math.cos(a * 5);
      const r = rocket.size * lobe * eases.out(Math.min(1, age * 2.4));
      const x = rocket.x + Math.cos(a) * r, y = rocket.y + Math.sin(a) * r + 30 * age * age;
      petal(c, x, y, 1.8 * (1 - age * .5), a, tints[(rocket.tint + i) % 3], 1 - age);
    }
  }
}

function drawBack(c, t, w, ctx) {
  const { color, reduced } = ctx;
  const veil = .1 + .32 * span(t, 2400, 4300) - .2 * span(t, 9000, 11000);
  c.globalAlpha = veil; c.fillStyle = '#10051a';
  c.fillRect(-600, -900, 1700, 1400);
  const sky = c.createLinearGradient(0, -420, 0, 40);
  sky.addColorStop(0, '#05020c'); sky.addColorStop(.7, '#12082acc'); sky.addColorStop(1, '#12082a00');
  c.globalAlpha = 1; c.fillStyle = sky; c.fillRect(-600, -900, 1700, 940);
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (reduced ? 30 : 100); i++) {
    c.globalAlpha = (.35 + .4 * Math.sin(w / (280 + rand(i, 2) * 400) + i)) * .6;
    c.fillStyle = '#f3e3ff';
    c.fillRect(-60 + rand(i) * 600, -400 + rand(i, 1) * 480, 1, 1);
  }
  // Swirling ground mark under the whirlwind.
  if (t >= 2400 && t < IMPACT + 200) {
    const cx = vortex(t), alpha = .7 * span(t, 2400, 3000);
    c.strokeStyle = color; c.lineWidth = 1.2;
    for (let k = 0; k < 4; k++) {
      c.globalAlpha = alpha * (1 - k * .2);
      const start = w / 250 + k * Math.PI / 2;
      c.beginPath(); c.ellipse(cx, 179, 16 + k * 9, (16 + k * 9) * .28, 0, start, start + 2.2); c.stroke();
    }
  }
  if (t >= 4300 && t < 7400) fireworks(c, t, w, ctx);
  c.globalCompositeOperation = 'source-over';
  tornado(c, t, w, ctx, -1);
  c.globalAlpha = 1;
}

function drawFront(c, t, w, ctx) {
  const { color, reduced, foeY } = ctx;
  const dense = reduced ? .3 : 1;
  // Ambient blossoms drifting through the opening and the sky shots.
  const drift = 1 - span(t, 6600, 7200);
  if (drift > 0) for (let i = 0; i < 40 * dense; i++) {
    const fall = ((w / 5200 + rand(i, 3)) % 1);
    const x = rand(i, 4) * 520 - 20 + Math.sin(w / 700 + i) * 12 - fall * 30, y = -160 + fall * 340;
    petal(c, x, y, 1.6, w / 500 + i, i % 3 ? color : WARM, .75 * drift);
  }
  // One petal settles into the open hand and lights up.
  if (t >= 1100 && t < 2700) {
    const k = span(t, 1100, 2100);
    const x = HAND[0] + 18 * (1 - k) + Math.sin(k * 9) * 5 * (1 - k), y = HAND[1] - 40 * (1 - eases.out(k));
    petal(c, x, y, 3.2, Math.sin(k * 7) * .8, color, 1 - span(t, 2400, 2700));
    if (t >= 2100) {
      c.globalCompositeOperation = 'lighter';
      glow(c, HAND[0], HAND[1], 8 + 26 * span(t, 2100, 2600), color, .8 * (1 - span(t, 2100, 2700)));
      c.globalCompositeOperation = 'source-over';
    }
  }
  tornado(c, t, w, ctx, 1);
  c.globalCompositeOperation = 'lighter';
  // Firework light flickers over the watching foe.
  if (t >= 5800 && t < 6800) {
    const flicker = .25 + .2 * Math.sin(w / 37) * Math.sin(w / 91);
    glow(c, FOE[0], foeY - 10, 40, color, flicker);
  }
  // Petal blades spiral in from the sky onto the foe.
  if (t >= 6800 && t < IMPACT + 200) {
    for (let i = 0; i < 80 * dense; i++) {
      const start = 6800 + rand(i, 5) * 900, p = span(t, start, start + 520);
      if (p <= 0 || p >= 1) continue;
      for (let echo = 2; echo >= 0; echo--) {
        const q = Math.max(0, p - echo * .05), a = rand(i, 6) * 6.28 + q * 5, r = (1 - eases.in(q)) * (80 + rand(i, 7) * 60);
        const x = FOE[0] + Math.cos(a) * r, y = foeY + Math.sin(a) * r * .55 - (1 - q) * 60;
        petal(c, x, y, 1.8, a + Math.PI / 2, i % 3 ? color : WARM, echo ? .3 / echo : 1);
      }
    }
  }
  // Impact: a giant five-petal bloom opens over the foe.
  if (t >= IMPACT && t < 10000) {
    const k = (w - IMPACT) / 1000;
    glow(c, FOE[0], foeY, 30 + 150 * k, color, Math.max(0, .95 - k * .9));
    const bloom = eases.out(Math.min(1, k * 1.8)), fade = Math.max(0, 1 - k * .9);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 + k * .6 - Math.PI / 2;
      petal(c, FOE[0] + Math.cos(a) * 26 * bloom, foeY + Math.sin(a) * 26 * bloom, 26 * bloom, a, color, fade * .55);
    }
    for (let n = 0; n < 3; n++) {
      const r = Math.min(1, k * 1.3 - n * .12) * (100 + n * 70);
      if (r <= 0 || r >= 100 + n * 70) continue;
      c.save(); c.translate(FOE[0], 179); c.scale(1, .27);
      c.globalAlpha = 1 - r / (100 + n * 70); c.strokeStyle = n ? color : CREAM; c.lineWidth = 3 - n;
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); c.restore();
    }
    for (let i = 0; i < 90 * dense; i++) {
      const a = rand(i, 8) * Math.PI * 2, v = 50 + rand(i, 9) * 140;
      const x = FOE[0] + Math.cos(a) * v * k, y = foeY + Math.sin(a) * v * k * .7 + 70 * k * k;
      if (y < 182) petal(c, x, y, 2, a + w / 200, i % 3 ? color : WARM, Math.max(0, 1 - k * .75));
    }
  }
  // Aftermath: a slow rain of petals over the whole field.
  if (t >= 8800) {
    const fade = span(t, 8800, 9400) * (1 - span(t, 10800, duration));
    c.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 70 * dense; i++) {
      const fall = ((t - 8800) / 3400 + rand(i, 10)) % 1;
      const x = rand(i, 11) * 480 + Math.sin(w / 600 + i) * 10, y = fall * 182;
      petal(c, x, y, 1.6, w / 400 + i, i % 3 ? color : WARM, fade * (1 - fall * .4) * .85);
    }
  }
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
}

export const petalsPlan = {
  impact: IMPACT,
  attack: [2400, IMPACT + 600],
  shots: [
    [0, '序幕 · 花落無聲', [205, 124, 1.05, 0], [255, 130, 1.2, 0], 'smooth'],
    [1300, '特寫 · 一瓣落掌', [166, 144, 4.4, .08], [156, 156, 3.8, .02], 'out'],
    [2400, '旋舞 · 花風起', [150, 150, 3.2, -.16], [152, 140, 1.8, .16], 'inOut'],
    [4300, '升空 · 花火綻放', [160, 132, 2.0, 0], [250, -80, 1.1, 0], 'inOut'],
    [5800, '敵影 · 仰望花海', [326, 138, 3.0, -.06], [330, 150, 3.3, 0], 'out', 220],
    [6800, '急襲 · 花嵐貫陣', [250, 124, 1.35, .04], [322, 148, 2.0, -.03], 'in'],
    [IMPACT, '命中 · 千花盛放', [330, 148, 3.0, 0], [330, 152, 3.4, 0], 'out'],
    [9000, '餘韻 · 花雨', [300, 140, 2.2, 0], [240, 118, 1.06, 0], 'inOut'],
    [10300, '終幕 · 花火旋舞', [240, 122, 1.1, 0], [240, 127, 1.17, 0], 'smooth']
  ],
  close: [[1300, 2400], [IMPACT, 9000]],
  lines: [['spin', 2600, 4300], ['v', 4400, 5400], ['zoom', 6800, IMPACT]],
  flashes: [[5000, 200, .16, 'color'], [5420, 200, .16, 'color'], [5840, 200, .16, 'color'], [IMPACT, 520, .9, CREAM]],
  shake(t) {
    if (t >= IMPACT) return 5.5 * Math.exp(-(t - IMPACT) / 300);
    if (t >= 6800) return .5 + span(t, 6800, IMPACT) * 1.5;
    if (t >= 2400 && t < 4300) return .3 + span(t, 2400, 4300) * .8;
    return 0;
  },
  subtitle: '— 千 花 迴 旋 ・ 一 夜 綻 放 —',
  back: drawBack,
  front: drawFront
};
