import { FOE, span, eases, smooth, clamp, recoil, heldClock, rand, polygon, glow, spark, stroke } from './spell-fx.js';

// 熔心天墜 (赤爐重鎚): one blow on the ground wakes the furnace under the battlefield. Lava veins
// race across the floor and vents erupt along the ridges. Their streams pour into the hero's
// hammer until it becomes a mountain-sized maul. The hero shoulders it and swings it over the
// top in one arc. The maul lands at the foe's feet and leaves a burning crater that stays.
//
// Momentum always runs hand → haft → head → ground: the hero's pose drives the maul, the head
// leaves a hot wake along its real path, and every blast starts where the face meets the floor.
const SLAM = 1800, VEINS = 2300, FEAR = 4400, CALL = 5500, GROW = 5900, QUENCH = 7300;
const HEAVE = 8200, CHARGE = 9200, DREAD = 10100, SWING = 10600, HOLD = 11080, HIT = 11450;
const AFTER = 12400, CRUMBLE = 12900, BACK = 13700, FINALE = 13900, END = 15600;
const clock = heldClock(HOLD, HIT);
const contact = clock(HIT);
const HOT = '#fff1c2', GOLD = '#ffd27a', EMBER = '#ff8a3a', LAVA = '#d8462a', CRUST = '#7a2a22';
const IRON = '#3b3440', INK = '#140f14';
const SOURCE = [181, 185];           // where the first tap lands
const CRATER = [283, 186];           // where the face drives into the ground
const pivot = hero => [159 + hero.dx, 164 + hero.dy];
const alpha = (c, a) => { c.globalAlpha = clamp(a); };

// ---- Actors -------------------------------------------------------------------------------

// [time, dx, dy, weapon angle, lean, ease into this key]
const keys = [
  [0, 0, 0, .46, 0],
  [1200, 0, 0, .46, 0],
  [1650, -3, -2, -.75, -.14, 'out'],
  [SLAM, 4, 3, 2.2, .24, 'in'],
  [VEINS, 4, 3, 2.2, .22],
  [CALL, 3, 3, 2.1, .18],
  [6050, 0, -1, .04, -.06, 'out'],
  [QUENCH, 0, 0, .02, -.04],
  [8000, 0, 3, .02, 0],
  [8750, -6, 5, -1.12, -.32, 'out'],
  [CHARGE, -6, 5, -.95, -.28],
  [SWING, -8, 6, -1, -.34],
  [HOLD, 14, 0, 1.333, .36, 'in'],
  [HIT - 1, 14, 0, 1.333, .36],
  [HIT, 15, 1, 1.397, .4, 'out'],
  [HIT + 120, 16, 3, 1.434, .42, 'out'],
  [CRUMBLE, 16, 3, 1.434, .42],
  [BACK, 8, 2, 1.1, .18],
  [END, 3, 0, .46, 0]
];

function heroPose(t) {
  const i = keys.findLastIndex(key => key[0] <= t), a = keys[i], b = keys[i + 1] ?? a;
  const k = a === b ? 0 : eases[b[5] ?? 'smooth'](span(t, a[0], b[0]));
  const hero = { dx: a[1] + (b[1] - a[1]) * k, dy: a[2] + (b[2] - a[2]) * k,
    angle: a[3] + (b[3] - a[3]) * k, lean: a[4] + (b[4] - a[4]) * k,
    weaponOpacity: t >= GROW && t < BACK ? 0 : 1 };
  // The weight makes the hero tremble while the maul is cocked, and rise onto the toes mid-swing.
  if (t >= CHARGE && t < SWING) {
    const strain = span(t, CHARGE, SWING);
    hero.angle += Math.sin(t * .09) * .03 * strain;
    hero.dx += Math.sin(t * .13) * .6 * strain;
  }
  if (t >= SWING && t < HOLD) hero.dy -= 7 * Math.sin(Math.PI * span(t, SWING, HOLD));
  return hero;
}

function foePose(t, w, reduced) {
  const fear = .6 * smooth(t, FEAR, FEAR + 800) + .4 * smooth(t, DREAD, DREAD + 300);
  const r = recoil(w - contact, fear, 46, 30, reduced);
  // Trembling dies out as the swing comes down, so the hold is perfectly still.
  const tremble = t < HOLD ? Math.sin(w * .21) * (.4 + fear) * (1 - span(t, SWING, HOLD)) : 0;
  return { dx: r.dx + tremble, dy: r.dy + fear, tilt: r.tilt };
}

const pose = (t, w, reduced) => ({ hero: heroPose(t), foe: foePose(t, w, reduced) });

// ---- The maul -----------------------------------------------------------------------------

function maulSize(t) {
  const g = eases.out(span(t, GROW, QUENCH - 200));
  return { len: 22.5 + 87.5 * g, scale: 1 + 3 * g };
}
const molten = t => t < QUENCH ? 1 : 1 - span(t, QUENCH, QUENCH + 800);
function seamHeat(t) {
  if (t < QUENCH + 800) return 1;
  if (t < CHARGE) return .35;
  if (t < HIT) return .35 + .65 * span(t, CHARGE, SWING);
  return 1 - smooth(t, HIT + 600, BACK);
}
function headAt(hero, len) {
  const [x, y] = pivot(hero);
  return [x + Math.sin(hero.angle) * len, y - Math.cos(hero.angle) * len];
}

// Short, irregular hairline cracks (long even strokes read as UI glyphs at giant scale).
const cracks = [[8.3, -4.1, 8.9, -3.2, 8.6, -2.5, 9.1, -1.6], [-9.1, -2.8, -8.6, -2.3, -8.9, -1.1, -8.4, -.4],
  [-3.9, 1.9, -3.1, 1.6, -2.7, 2.3, -1.9, 2]]
// Sledge profile: flared striking face (+x), narrow waist at the socket, smaller rear peen.
const SILHOUETTE = [-10.4, -5.4, -7.4, -5.4, -5.6, -4, 5.8, -4, 7.6, -6, 10.8, -6, 10.8, 6, 7.6, 6, 5.8, 4,
  -5.6, 4, -7.4, 5.4, -10.4, 5.4];

// Drawn in grip space. The head is the hero's own hammer head scaled up: the leading face (+x)
// carries a bright plate, the rear peen is narrower, and the forge brand sits in the socket.
function maul(c, hero, t, show) {
  if (show <= 0) return;
  const { len, scale } = maulSize(t), melt = molten(t), seam = seamHeat(t);
  const [x, y] = pivot(hero);
  c.save();
  c.translate(x, y); c.rotate(hero.angle);
  alpha(c, show);
  const half = .5 + .65 * scale;
  polygon(c, INK, [-half - 1, 10, -half - 1, -len, half + 1, -len, half + 1, 10]);
  c.fillStyle = '#4a3a3c'; c.fillRect(-half, -len, half * 2, len + 9);
  c.fillStyle = '#86604a'; c.fillRect(-half, -len, Math.max(1, half * .6), len + 9);
  c.fillStyle = '#a5744f';
  for (let gy = 6; gy > -Math.min(len * .22, 30); gy -= 4) c.fillRect(-half, gy, half * 2, 1.5);
  for (let i = 1; i <= 3; i++) {
    const cy = -len * (.18 + .2 * i);
    c.fillStyle = '#231d22'; c.fillRect(-half - 1, cy, half * 2 + 2, Math.max(2, scale * 1.2));
    alpha(c, show * seam * .9); c.fillStyle = EMBER; c.fillRect(-half, cy + .5, half * 2, Math.max(.6, scale * .3));
    alpha(c, show);
  }
  c.translate(0, -len); c.scale(scale, scale);
  c.globalCompositeOperation = 'lighter';
  glow(c, 0, 4, 16, EMBER, show * (.25 * seam + .4 * melt));
  c.globalCompositeOperation = 'source-over';
  alpha(c, show);
  polygon(c, INK, SILHOUETTE);
  polygon(c, IRON, [-9.8, -4.8, -7.6, -4.8, -5.8, -3.4, 6, -3.4, 7.8, -5.3, 10.2, -5.3, 10.2, 5.3, 7.8, 5.3, 6, 3.4, -5.8, 3.4, -7.6, 4.8, -9.8, 4.8]);
  c.fillStyle = '#6e6470'; c.fillRect(-5.8, -3.4, 11.8, 1); c.fillRect(-9.8, -4.8, 2.2, 1);
  c.fillStyle = '#8a828c'; c.fillRect(7.8, -5.3, 2.4, 1.2);
  c.fillStyle = '#282228'; c.fillRect(-5.8, 2.4, 11.8, 1); c.fillRect(7.8, 4.2, 2.4, 1.1);
  c.fillStyle = '#5a525c'; c.fillRect(7.8, -5.3, 1, 10.6); c.fillRect(-10.4, -3.8, 1.2, 7.6);
  c.fillStyle = '#c9c2c4'; c.fillRect(9.7, -5.3, 1.1, 10.6);
  c.fillStyle = '#231d22'; c.fillRect(-2.2, 3.4, 4.4, 1.8); c.fillRect(-5.8, -3.4, .8, 6.8); c.fillRect(5.2, -3.4, .8, 6.8);
  polygon(c, '#5a2026', [0, -3, 2.4, 0, 0, 3, -2.4, 0]);
  alpha(c, show * (.3 + .7 * seam));
  polygon(c, seam > .7 ? GOLD : EMBER, [0, -1.9, 1.4, 0, 0, 1.9, -1.4, 0]);
  alpha(c, show * seam);
  for (const line of cracks) stroke(c, seam > .8 ? GOLD : EMBER, .45, line);
  // Molten iron cools from the edges toward the socket.
  if (melt > 0) {
    alpha(c, show * Math.min(1, melt * 1.4));
    polygon(c, LAVA, SILHOUETTE);
    c.fillStyle = EMBER; c.fillRect(-9 * melt, -4.4 * melt, 18 * melt, 8.8 * melt);
    c.fillStyle = GOLD; c.fillRect(-6.5 * melt, -2.8 * melt, 13 * melt, 5.6 * melt);
    c.fillStyle = HOT; c.fillRect(-3.5 * melt, -1.4 * melt, 7 * melt, 2.8 * melt);
    alpha(c, show);
    c.fillStyle = '#c9c2c4'; c.fillRect(9.7, -5.3, 1.1, 10.6);
    c.fillStyle = '#5a525c'; c.fillRect(-10.4, -3.8, 1.2, 7.6);
    stroke(c, INK, .6, [...SILHOUETTE, SILHOUETTE[0], SILHOUETTE[1]]);
  }
  c.restore();
}

// The hot face leaves a tapered ribbon along its actual path.
function wake(c, t) {
  if (t <= SWING || t > HIT + 120) return;
  const end = Math.min(t, HOLD), fade = 1 - span(t, HOLD, HIT + 120);
  const { len, scale } = maulSize(t);
  for (const [width, color, a] of [[10, EMBER, .45], [4, HOT, .7]]) {
    const outer = [], inner = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14, sample = Math.max(SWING, end - (1 - u) * 170);
      const hero = heroPose(sample), [x, y] = pivot(hero), r = len + scale * 4, s = Math.sin(hero.angle), co = Math.cos(hero.angle);
      const w = width * scale * .5 * u;
      outer.push(x + s * (r + w), y - co * (r + w));
      inner.unshift(x + s * (r - w), y - co * (r - w));
    }
    alpha(c, a * fade * span(t, SWING, SWING + 120));
    polygon(c, color, [...outer, ...inner]);
  }
  c.globalAlpha = 1;
}

// ---- The battlefield ------------------------------------------------------------------------

const ridges = [0, 1].map(layer => {
  const points = [];
  for (let i = 0; i <= 62; i++) {
    const x = -540 + i * 26;
    const y = (layer ? 148 : 116) + rand(i, layer + 70) * (layer ? 20 : 34) + 7 * Math.sin(i * .6 + layer * 2);
    points.push(x, y, x + 13, y + (rand(i, layer + 80) - .5) * 9);
  }
  return [...points, 1080, 186, -540, 186];
});
const vents = [[-110, 132], [-30, 142], [62, 136], [246, 140], [414, 132], [486, 142], [566, 128]]
  .map(([x, y], i) => ({ x, y, i, delay: VEINS + 200 + Math.abs(x - SOURCE[0]) * 3.2 + rand(i, 5) * 150 }));

function grow(points, source, dir, seed, steps) {
  let [x, y] = source;
  points.push(x, y);
  for (let k = 0; k < steps; k++) {
    x += dir * (9 + rand(seed, k) * 15);
    y = source[1] + Math.abs(Math.sin(k * .7 + seed)) * 3 + (rand(seed, k + 30) - .3) * 7 + k * .25;
    points.push(x, Math.max(185, y));
  }
  return points;
}
const veins = Array.from({ length: 12 }, (_, i) => grow([], SOURCE, i % 2 ? 1 : -1, i + 3, 14 + Math.floor(rand(i, 4) * 12)));
const craterVeins = Array.from({ length: 8 }, (_, i) => grow([], CRATER, i % 2 ? 1 : -1, i + 40, 9 + Math.floor(rand(i, 6) * 8)));

function drawVein(c, points, reach, a) {
  const n = points.length / 2 - 1, p = reach * n;
  if (p <= 0) return;
  const part = [points[0], points[1]];
  for (let i = 1; i <= n && i - 1 < p; i++) {
    const k = Math.min(1, p - i + 1), x0 = points[i * 2 - 2], y0 = points[i * 2 - 1];
    part.push(x0 + (points[i * 2] - x0) * k, y0 + (points[i * 2 + 1] - y0) * k);
  }
  for (const [width, color, o] of [[4, '#2b0f0e', .9], [2.2, LAVA, 1], [.9, GOLD, 1]]) {
    alpha(c, a * o); stroke(c, color, width, part);
  }
}

function brand(c, x, y, size, flat, heat, a) {
  if (a <= 0) return;
  c.save(); c.translate(x, y); c.scale(size, size * flat);
  alpha(c, a);
  polygon(c, '#2b0f0e', [0, -10, 10, 0, 0, 11, -10, 0]);
  polygon(c, heat > .6 ? GOLD : EMBER, [-6.5, 0, 0, -7, 6.5, 0, 3, 0, 0, -3.5, -3, 0]);
  polygon(c, LAVA, [-5.5, 2, -2, 2, 0, 5.5, 2, 2, 5.5, 2, 0, 8.5]);
  c.restore();
}

// A pixel-stacked lava fountain: crust edge, orange body, hot core, droplets off the top.
function fountain(c, x, y, height, width, lean, w, seed, dense) {
  if (height <= 1) return;
  c.save(); c.translate(x, y); c.rotate(lean);
  for (let yy = 0; yy < height; yy += 4) {
    const k = yy / height, wob = Math.sin(w / 90 + yy * .2 + seed) * 1.5;
    const half = width * (1.25 - .75 * Math.sqrt(k)) + wob;
    c.fillStyle = CRUST; c.fillRect(-half, -yy - 4, half * 2, 4);
    c.fillStyle = EMBER; c.fillRect(-half * .62, -yy - 4, half * 1.24, 4);
    c.fillStyle = k > .6 ? HOT : GOLD; c.fillRect(-half * .22, -yy - 4, half * .44, 4);
  }
  c.fillStyle = GOLD; c.fillRect(-width * .5, -height - 4, width, 3);
  c.fillStyle = EMBER; c.fillRect(-width * .9, -height - 2, width * 1.8, 2);
  for (let i = 0; i < 8 * dense; i++) {
    const life = (w / (500 + rand(i, seed) * 400) + rand(i, seed + 1)) % 1, side = rand(i, seed + 2) - .5;
    alpha(c, 1 - life);
    c.fillStyle = i % 2 ? GOLD : EMBER;
    c.fillRect(side * width * 3 * life, -height - 12 * Math.sin(Math.PI * life) + 40 * life * life, 2, 2);
  }
  c.restore();
  c.globalAlpha = 1;
}

function battlefield(c, t, w, reduced) {
  const dense = reduced ? .4 : 1;
  const dark = .3 + .62 * smooth(t, SLAM, VEINS + 900);
  const surge = Math.sin(Math.PI * span(t, HIT, HIT + 1700));
  c.save();
  const sky = c.createLinearGradient(0, -200, 0, 186);
  sky.addColorStop(0, '#060509'); sky.addColorStop(.62, '#170b10'); sky.addColorStop(1, '#43170f');
  alpha(c, dark); c.fillStyle = sky; c.fillRect(-900, -900, 2200, 1086);
  const lit = smooth(t, VEINS, VEINS + 1200);
  alpha(c, dark); polygon(c, '#120c12', ridges[0]);
  c.globalCompositeOperation = 'lighter';
  for (const v of vents) {
    const on = smooth(t, v.delay, v.delay + 300);
    glow(c, v.x, v.y - 10, 70 + 40 * surge, LAVA, on * (.28 + .3 * surge));
  }
  c.globalCompositeOperation = 'source-over';
  alpha(c, dark); polygon(c, '#1c1318', ridges[1]);
  alpha(c, lit * .8); c.strokeStyle = '#6a2a20'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(ridges[1][0], ridges[1][1]);
  for (let i = 2; i < ridges[1].length - 4; i += 2) c.lineTo(ridges[1][i], ridges[1][i + 1]);
  c.stroke();
  for (const v of vents) {
    const age = t - v.delay;
    alpha(c, dark);
    polygon(c, '#1f151a', [v.x - 30, 186, v.x - 6, v.y, v.x + 6, v.y, v.x + 30, 186]);
    polygon(c, '#33222a', [v.x - 6, v.y, v.x + 6, v.y, v.x + 14, v.y + 22, v.x - 2, v.y + 10]);
    if (age < 0) continue;
    alpha(c, 1); c.fillStyle = EMBER; c.fillRect(v.x - 6, v.y - 1, 12, 2);
    const rest = t >= BACK ? 10 : 22;
    const height = 96 * eases.out(span(age, 0, 450)) * (1 - .55 * smooth(age, 900, 1800))
      + 70 * surge - (54 - rest) * smooth(t, AFTER, BACK);
    fountain(c, v.x, v.y, Math.max(0, height), 8, 0, w, v.i * 7 + 11, dense);
  }
  // Ground: the original lit floor goes dark so only lava and the actors carry light.
  alpha(c, dark * .92); c.fillStyle = '#150d0f'; c.fillRect(-900, 184, 2200, 700);
  alpha(c, dark * .6); c.fillStyle = '#2a1a1c';
  for (let i = 0; i < 70; i++) c.fillRect(rand(i, 30) * 700 - 120, 186 + rand(i, 31) * 40, 3 + rand(i, 32) * 10, 1);
  // Veins race out from the tap and stay for the rest of the move.
  if (t >= SLAM) {
    const reach = eases.out(span(t, SLAM + 80, VEINS + 1500));
    const pulse = .78 + .22 * Math.sin(w / 160) - .3 * smooth(t, AFTER, END);
    veins.forEach((v, i) => drawVein(c, v, reach * (.7 + .3 * rand(i, 9)), pulse));
    brand(c, SOURCE[0], SOURCE[1], 1.5, .3, seamHeat(t), smooth(t, SLAM, SLAM + 120));
  }
  if (t >= HIT) crater(c, t, w, dense);
  c.restore();
}

// The impact leaves a crater, tilted slabs, a V of lava and fresh veins that remain.
const slabs = Array.from({ length: 10 }, (_, i) => ({
  side: i % 2 ? 1 : -1, x: 44 + (i >> 1) * 15 + rand(i, 60) * 8, w: 11 + rand(i, 61) * 9, h: 10 + rand(i, 62) * 10
}));
function crater(c, t, w, dense) {
  const age = w - contact, open = eases.out(span(age, 0, 300)), [x, y] = CRATER;
  const cool = 1 - .45 * smooth(t, AFTER, END);
  craterVeins.forEach((v, i) => drawVein(c, v, eases.out(span(age, 40, 700 + rand(i, 7) * 300)), cool));
  alpha(c, 1);
  c.fillStyle = '#0d080a'; c.beginPath(); c.ellipse(x, y + 1, 62 * open, 9 * open, 0, 0, Math.PI * 2); c.fill();
  alpha(c, cool); c.strokeStyle = LAVA; c.lineWidth = 2;
  c.beginPath(); c.ellipse(x, y + 1, 62 * open, 9 * open, 0, Math.PI, Math.PI * 2); c.stroke();
  brand(c, x, y + 2, 3.4 * open, .26, seamHeat(t) + .4, cool * open);
  for (const s of slabs) {
    c.save();
    c.translate(x + s.side * s.x * (.6 + .4 * open), y + 1);
    c.rotate(s.side * .55 * open);
    alpha(c, 1);
    polygon(c, '#22171b', [-s.w / 2, 0, -s.w / 2 + 2, -s.h * open, s.w / 2, -s.h * open - 2, s.w / 2, 0]);
    alpha(c, cool); c.fillStyle = EMBER; c.fillRect(-s.w / 2, -1, s.w, 1.5);
    c.fillStyle = '#4a3036'; c.fillRect(-s.w / 2 + 2, -s.h * open, s.w - 2, 1.5);
    c.restore();
  }
  const rise = Math.sin(Math.PI * span(age, 0, 1700)), stay = 22 * span(age, 900, 1700) * (1 - .6 * smooth(t, AFTER, END));
  for (const side of [-1, 1]) fountain(c, x + side * 34, y, Math.max(stay, 140 * rise), 11, side * .38, w, side + 50, dense);
}

// Streams arc from every vent into the head while it grows.
function streams(c, t, w, reduced) {
  if (t < CALL || t >= QUENCH + 200) return;
  const hero = heroPose(t), { len } = maulSize(t), [hx, hy] = headAt(hero, len);
  const fade = 1 - span(t, QUENCH - 300, QUENCH + 200);
  for (const v of vents) {
    const start = CALL + 80 + v.i * 110, reach = eases.out(span(t, start, start + 650));
    if (reach <= 0) continue;
    const x0 = v.x, y0 = v.y - 40, cx = (x0 + hx) / 2, cy = Math.min(y0, hy) - 110;
    const at = u => [(1 - u) ** 2 * x0 + 2 * u * (1 - u) * cx + u * u * hx, (1 - u) ** 2 * y0 + 2 * u * (1 - u) * cy + u * u * hy];
    const line = [];
    for (let k = 0; k <= 16; k++) line.push(...at(k / 16 * reach));
    for (const [width, color, a] of [[5, CRUST, .8], [2.6, EMBER, 1], [1, HOT, 1]]) {
      alpha(c, a * fade); stroke(c, color, width, line);
    }
    for (let k = 0; k < (reduced ? 3 : 7); k++) {
      const u = ((w - start) / 520 + k / 7) % 1;
      if (u > reach) continue;
      const [px, py] = at(u);
      alpha(c, fade); c.fillStyle = k % 2 ? HOT : GOLD; c.fillRect(px - 2, py - 2, 4, 4);
    }
  }
  c.globalAlpha = 1;
}

// ---- Front-layer effects -------------------------------------------------------------------

function opening(c, t, w, dense) {
  if (t < 1300) {
    const k = span(t, 150, 1150);
    c.globalCompositeOperation = 'lighter';
    glow(c, 169, 144, 9 + 6 * k, EMBER, .25 + .45 * k);
    spark(c, 164 + 10 * eases.inOut(k), 143 - 2 * Math.sin(k * 6), .7 + .6 * Math.sin(Math.PI * k), GOLD, 1 - span(t, 1100, 1300));
    c.globalCompositeOperation = 'source-over';
  }
  if (t < SLAM || t > SLAM + 1100) return;
  const age = t - SLAM, [x, y] = SOURCE;
  c.globalCompositeOperation = 'lighter';
  const pillar = 1 - span(age, 0, 450);
  if (pillar > 0) {
    const g = c.createLinearGradient(x - 9, 0, x + 9, 0);
    g.addColorStop(0, '#00000000'); g.addColorStop(.5, GOLD); g.addColorStop(1, '#00000000');
    alpha(c, pillar * .8); c.fillStyle = g; c.fillRect(x - 9, y - 300, 18, 300);
  }
  for (let n = 0; n < 3; n++) {
    const r = Math.max(0, span(age, 0, 700) * 1.3 - n * .15) * (50 + n * 50);
    if (r <= 0 || r >= 50 + n * 50) continue;
    c.save(); c.translate(x, y); c.scale(1, .25);
    alpha(c, 1 - r / (50 + n * 50)); c.strokeStyle = n ? EMBER : HOT; c.lineWidth = 3 - n;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); c.restore();
  }
  glow(c, x, y - 4, 40, EMBER, .7 * (1 - span(age, 0, 600)));
  c.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 34 * dense; i++) {
    const q = span(age, 0, 500 + rand(i, 20) * 500), a = -Math.PI * (.1 + .8 * rand(i, 21)), v = 25 + rand(i, 22) * 55;
    if (q >= 1) continue;
    alpha(c, 1 - q); c.fillStyle = i % 3 ? EMBER : HOT;
    c.fillRect(x + Math.cos(a) * v * q, y + Math.sin(a) * v * q + 55 * q * q, 1.5, 1.5);
  }
  c.globalAlpha = 1;
}

function pressure(c, t, w, dense, foeX, foeY) {
  // Heat wells up under the foe as the veins arrive.
  if (t >= FEAR && t < HOLD) {
    const k = smooth(t, FEAR, FEAR + 500) * (1 - span(t, SWING, HOLD));
    c.globalCompositeOperation = 'lighter';
    glow(c, foeX, 184, 46, LAVA, .55 * k);
    for (let i = 0; i < 22 * dense; i++) {
      const life = (w / (700 + rand(i, 33) * 500) + rand(i, 34)) % 1;
      spark(c, foeX - 30 + rand(i, 35) * 60 + Math.sin(life * 7 + i) * 3, 184 - life * 60, .5, i % 3 ? EMBER : GOLD, k * (1 - life));
    }
    c.globalCompositeOperation = 'source-over';
  }
  // While the maul is cocked, sparks and grit are sucked into the head.
  if (t >= CHARGE && t < SWING) {
    const hero = heroPose(t), { len } = maulSize(t), [hx, hy] = headAt(hero, len), [px] = pivot(hero);
    const power = span(t, CHARGE, DREAD), fade = 1 - span(t, SWING - 120, SWING);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 60 * dense; i++) {
      const life = ((w - CHARGE) / (420 + rand(i, 40) * 380) + rand(i, 41)) % 1, a = rand(i, 42) * Math.PI * 2;
      const r = (1 - life) ** 1.5 * (90 + rand(i, 43) * 140), streak = 2 + 10 * (1 - life);
      alpha(c, power * fade * Math.sin(Math.PI * life));
      c.fillStyle = i % 3 ? EMBER : HOT;
      c.fillRect(hx + Math.cos(a) * r, hy + Math.sin(a) * r, streak, 1);
    }
    glow(c, hx, hy, 40 + 40 * power, EMBER, .5 * power * fade);
    const stomp = span(t, CHARGE + 40, CHARGE + 520);
    if (stomp > 0 && stomp < 1) {
      c.save(); c.translate(px - 9, 185); c.scale(1, .22);
      alpha(c, 1 - stomp); c.strokeStyle = HOT; c.lineWidth = 2;
      c.beginPath(); c.arc(0, 0, 10 + stomp * 110, 0, Math.PI * 2); c.stroke(); c.restore();
    }
    c.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 26 * dense; i++) {
      const life = ((w - CHARGE) / (1100 + rand(i, 44) * 800) + rand(i, 45)) % 1;
      alpha(c, power * fade * (1 - life)); c.fillStyle = i % 2 ? '#4a3036' : '#6e4a44';
      c.fillRect(px - 70 + rand(i, 46) * 140, 185 - life * 70 * (.4 + rand(i, 47)), 1 + (i % 3), 1 + (i % 3));
    }
  }
  // The head's red light and shadow fall over the foe from above.
  if (t >= DREAD && t < SWING) {
    const k = span(t, DREAD, DREAD + 300) * (1 - span(t, SWING - 100, SWING));
    alpha(c, .3 * k); c.fillStyle = '#05020a'; c.fillRect(foeX - 40, foeY - 60, 80, 90);
    c.globalCompositeOperation = 'lighter';
    glow(c, foeX - 70, foeY - 80, 130, LAVA, .5 * k);
    c.globalCompositeOperation = 'source-over';
  }
  c.globalAlpha = 1;
}

function hold(c, t, w) {
  if (t < HOLD || t >= HIT) return;
  alpha(c, .62 * span(t, HOLD, HOLD + 50)); c.fillStyle = '#05030a'; c.fillRect(-1200, -2000, 3000, 2600);
  c.globalAlpha = 1;
}
function holdGlint(c, t) {
  if (t < HOLD || t >= HIT) return;
  const k = span(t, HOLD, HIT), [x] = CRATER;
  c.globalCompositeOperation = 'lighter';
  alpha(c, .7); c.fillStyle = HOT; c.fillRect(-1200, 184, 3000, 1);
  spark(c, x - 4, 182, 2 + 3 * eases.out(k), HOT, 1);
  glow(c, x - 4, 182, 18 + 22 * k, EMBER, .8);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
}

function impact(c, t, w, dense, foeX, foeY) {
  if (t < HIT || t > HIT + 2600) return;
  const age = w - contact, k = Math.max(0, age / 1000), [x, y] = CRATER;
  c.globalCompositeOperation = 'lighter';
  glow(c, x, y - 6, 30 + 130 * k, EMBER, Math.max(0, .9 - k));
  for (let n = 0; n < 3; n++) {
    const r = Math.min(1, k * 1.3 - n * .12) * (160 + n * 110);
    if (r <= 0 || r >= 160 + n * 110) continue;
    c.save(); c.translate(x, y); c.scale(1, .24);
    alpha(c, 1 - r / (160 + n * 110)); c.strokeStyle = n ? EMBER : HOT; c.lineWidth = 3 - n;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); c.restore();
  }
  for (let i = 0; i < 40 * dense; i++) {
    const a = -Math.PI * (.08 + .84 * rand(i, 50)), v = 80 + rand(i, 51) * 200;
    const px = x + Math.cos(a) * v * k, py = y + Math.sin(a) * v * k * .8 + 140 * k * k;
    if (py < 186) spark(c, px, py, .8, i % 3 ? EMBER : HOT, Math.max(0, 1 - k * .9));
  }
  c.globalCompositeOperation = 'source-over';
  // Rock chunks with lit tops, thrown on gravity.
  for (let i = 0; i < 60 * dense; i++) {
    const q = span(age, 0, 600 + rand(i, 52) * 900);
    if (q >= 1) continue;
    const side = i % 2 ? 1 : -1, size = 1.2 + rand(i, 53) * 3.8;
    c.save();
    c.translate(x + side * (8 + q * (20 + rand(i, 54) * 150)), y - (20 + rand(i, 55) * 110) * 4 * q * (1 - q));
    c.rotate(side * (i + q * 5));
    alpha(c, 1 - q * q);
    c.fillStyle = '#2a1d22'; c.fillRect(-size, -size, size * 2, size * 1.6);
    c.fillStyle = i % 3 ? EMBER : GOLD; c.fillRect(-size, -size, size * 1.6, 1);
    c.restore();
  }
  c.globalAlpha = 1;
}

// Cooling, then the maul crumbles into embers and the hero's own hammer is back in hand.
function crumble(c, t, w, dense) {
  if (t < CRUMBLE || t >= BACK + 900) return;
  const hero = heroPose(Math.min(t, BACK)), { len } = maulSize(t), [px, py] = pivot(hero);
  const s = Math.sin(hero.angle), co = Math.cos(hero.angle);
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70 * dense; i++) {
    const born = CRUMBLE + rand(i, 70) * (BACK - CRUMBLE), life = span(t, born, born + 900);
    if (life <= 0 || life >= 1) continue;
    const along = .35 + .65 * rand(i, 71), across = (rand(i, 72) - .5) * 70 * along ** 4;
    const x = px + s * len * along + co * across, y = py - co * len * along + s * across;
    spark(c, x + Math.sin(life * 5 + i) * 4, y - life * 50, .6 + .5 * (1 - life), i % 3 ? EMBER : GOLD, 1 - life);
  }
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
}

function atmosphere(c, t, w, dense) {
  if (t < VEINS) return;
  const heat = smooth(t, VEINS, VEINS + 900);
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 36 * dense; i++) {
    const p = (w / (2200 + rand(i, 80) * 2000) + rand(i, 81)) % 1;
    alpha(c, heat * .8 * Math.sin(Math.PI * p));
    c.fillStyle = i % 4 ? EMBER : GOLD;
    c.fillRect(-60 + rand(i, 82) * 600 + 8 * Math.sin(i + p * 6), 186 - p * (80 + 140 * rand(i, 83)), 1, 1 + (i % 2));
  }
  c.globalCompositeOperation = 'source-over';
  // Ash settles over the changed battlefield after the blow.
  const ash = smooth(t, HIT + 700, AFTER + 600);
  for (let i = 0; i < 40 * dense && ash > 0; i++) {
    const fall = (w / 5200 + rand(i, 84)) % 1;
    alpha(c, ash * .55); c.fillStyle = i % 3 ? '#8a7f80' : '#c8b8b0';
    c.fillRect(-60 + rand(i, 85) * 600 + Math.sin(w / 700 + i) * 10, -100 + fall * 290, 1.5, 1.5);
  }
  c.globalAlpha = 1;
}

// ---- Plan --------------------------------------------------------------------------------

export const forgePlan = {
  duration: END,
  impact: HIT,
  titleAt: FINALE + 100,
  subtitle: '— 一 叩 開 爐 ・ 千 鈞 落 地 —',
  warp: clock,
  pose,
  attack: [1200, HIT + 800],
  shots: [
    [0, '爐印 · 炭中一點金', [166, 150, 6.4, -.04], [167, 152, 5.2, .02], 'smooth'],
    [1200, '叩地 · 一響開爐', [168, 166, 3.4, .07], [174, 170, 3.9, .02], 'out', 140],
    [VEINS, '地脈 · 熔河四走', [190, 160, 2.2, 0], [240, 98, .86, 0], 'out'],
    [FEAR, '敵懼 · 腳下沸騰', [332, 166, 4.0, -.07], [334, 156, 3.4, 0], 'out', 160],
    [CALL, '引火 · 萬流歸鎚', [210, 96, .86, 0], [190, 66, .8, -.02], 'inOut'],
    [QUENCH, '淬鐵 · 千鈞成形', [168, 42, 2.3, .03], [166, 58, 1.5, 0], 'out'],
    [HEAVE, '扛鎚 · 沉肩過頂', [158, 170, 4.6, -.15], [128, 92, 1.05, -.04], 'out'],
    [CHARGE, '蓄勢 · 爐壓萬鈞', [108, 116, 1.55, .09], [116, 124, 2.0, .15], 'inOut', 120],
    [DREAD, '威壓 · 赤影臨頭', [334, 160, 4.2, -.09], [331, 152, 4.8, -.05], 'out', 110],
    [SWING, '掄擊 · 一弧越頂', [130, 52, .95, -.1], [282, 138, 1.85, .05], 'in', 80],
    [HOLD, '懸息 · 一線未合', [296, 150, 2.3, .03], [298, 151, 2.36, .02], 'out'],
    [HIT, '落砧 · 熔心破土', [296, 150, 2.5, -.05], [312, 138, 1.55, .02], 'out'],
    [AFTER, '餘火 · 大地留印', [292, 135, 1.5, 0], [250, 112, .95, 0], 'inOut'],
    [FINALE, '終幕 · 熔心天墜', [244, 116, 1.02, 0], [242, 121, 1.1, 0], 'smooth']
  ],
  close: [[0, VEINS], [FEAR, CALL], [CHARGE, SWING], [HOLD, HIT + 700]],
  lines: [['h', CHARGE, SWING], ['zoom', SWING, HOLD]],
  flashes: [[SLAM, 200, .45, '#ffb46a'], [QUENCH, 180, .35, '#fff4d8'], [HOLD, 90, .45, '#ffffff'], [HIT, 340, .72, '#fff0cc']],
  shake(t) {
    if (t >= HIT) return 15 * Math.exp(-(t - HIT) / 420);
    if (t >= HOLD) return 0;
    let s = 0;
    if (t >= SLAM) s += 7 * Math.exp(-(t - SLAM) / 200);
    if (t >= VEINS && t < CALL) s += 1.2 * (1 - span(t, FEAR, CALL));
    for (const v of vents) if (t >= v.delay) s += 1.6 * Math.exp(-(t - v.delay) / 150);
    if (t >= QUENCH) s += 3 * Math.exp(-(t - QUENCH) / 200);
    if (t >= 8750) s += 3.5 * Math.exp(-(t - 8750) / 180);
    if (t >= CHARGE && t < SWING) s += 1.4 + 2.6 * span(t, CHARGE, SWING);
    if (t >= SWING) s += 3;
    return s;
  },
  back(c, t, w, ctx) {
    const { reduced } = ctx, hero = (ctx.pose ?? pose(t, w, reduced)).hero;
    battlefield(c, t, w, reduced);
    streams(c, t, w, reduced);
    if (t < HOLD) {
      if (!reduced) wake(c, t);
      maul(c, hero, t, t >= GROW ? 1 : 0);
    }
    c.globalAlpha = 1;
  },
  front(c, t, w, ctx) {
    const { reduced, foeY = FOE[1] - 25 } = ctx, dense = reduced ? .35 : 1;
    const { hero, foe } = ctx.pose ?? pose(t, w, reduced), foeX = FOE[0] + foe.dx;
    opening(c, t, w, dense);
    pressure(c, t, w, dense, foeX, foeY);
    hold(c, t, w);
    if (t >= HOLD) {
      if (!reduced) wake(c, t);
      maul(c, hero, t, t < CRUMBLE ? 1 : 1 - span(t, CRUMBLE, BACK));
    }
    holdGlint(c, t);
    impact(c, t, w, dense, foeX, foeY);
    crumble(c, t, w, dense);
    atmosphere(c, t, w, dense);
    c.globalAlpha = 1;
  }
};
