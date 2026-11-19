import { FOE, span, eases, smooth, heroKeys, recoil, heldClock, rand, polygon, glow } from './spell-fx.js';

const KINDLE = 1450,
  POUR = 3450,
  WELD = 5350,
  HOIST = 7000,
  SWING = 9440;
const HOLD = 10080,
  HIT = 10450,
  END = 14000;
const clock = heldClock(HOLD, HIT);
const contact = clock(HIT);
const ember = '#ff9b41',
  core = '#ffdd91',
  iron = '#242734';
const keys = [
  [0, 0, 0, 0.46],
  [950, -2, 0, -0.55],
  [KINDLE, 3, 3, 2.12],
  [2450, 3, 3, 2.12],
  [POUR, -1, 1, 0.76],
  [WELD, -3, 2, 0.88],
  [HOIST, -5, 4, 0.94],
  [8340, -9, 1, -0.53],
  [8980, -7, 3, -0.65],
  [SWING, -7, 4, -0.68],
  [HOLD, 19, 1, 1.26],
  [HIT - 1, 19, 1, 1.26],
  [HIT, 21, 3, 1.4],
  [HIT + 160, 22, 4, 1.49],
  [11500, 22, 4, 1.49],
  [12800, 8, 2, 1.03],
  [END, 4, 0, 0.48]
];

function pose(t, w, reduced) {
  const hero = heroKeys(keys, t);
  // Accelerate out of the backswing, with the leading face still clear at the hold.
  if (t >= SWING && t < HOLD) {
    const k = eases.in(span(t, SWING, HOLD));
    hero.angle = -0.68 + 1.94 * k;
    hero.dx = -7 + 26 * k;
    hero.dy = 4 - 3 * k;
  }
  hero.lean =
    0.18 * smooth(t, 850, KINDLE) -
    0.34 * smooth(t, HOIST, 8340) +
    0.47 * smooth(t, SWING, HOLD) -
    0.31 * smooth(t, 11500, 12800);
  hero.weaponOpacity = 1 - smooth(t, 2600, POUR) + smooth(t, 11900, 12900);
  return { hero, foe: recoil(w - contact, smooth(t, WELD, HOIST), 42, 24, reduced) };
}

// Layered columns flank the furnace throat. The blow shears its two banks apart.
const cliffs = Array.from({ length: 52 }, (_, i) => {
  const x = i * 15 - 160;
  const distance = Math.abs(x - 333);
  return { x, height: 34 + Math.min(130, distance * 0.72) + 45 * rand(i, 2), width: 13 + Math.floor(rand(i, 3) * 12) };
});
function foundry(c, t, w, reduced) {
  const lit = smooth(t, KINDLE, POUR + 700);
  if (!lit) return;
  const fault = eases.out(span(w - contact, 0, 1050));
  c.save();
  const sky = c.createLinearGradient(0, -130, 0, 195);
  sky.addColorStop(0, '#101420');
  sky.addColorStop(0.46, '#292432');
  sky.addColorStop(0.77, '#6b3331');
  sky.addColorStop(1, '#d77539');
  c.globalAlpha = lit;
  c.fillStyle = sky;
  c.fillRect(-850, -850, 2100, 1040);
  glow(c, 332, 113, 114, '#ff782e', 0.44 * lit);
  c.globalAlpha = lit;
  for (let i = 0; i < cliffs.length; i++) {
    const { x, height, width } = cliffs[i],
      side = x < 333 ? -1 : 1;
    const distance = Math.abs(x - 333);
    const split = Math.max(0, 1 - distance / 200) * fault;
    const edge = Math.round(x + side * 23 * split),
      top = Math.round(183 - height + 34 * split);
    const bevel = Math.round(width * 0.32);
    polygon(c, '#41303a', [edge, top + 6, edge + bevel, top, edge + width, top - 2, edge + width, 184, edge, 184]);
    polygon(c, i % 3 ? '#272732' : '#302932', [
      edge + bevel,
      top + 4,
      edge + width,
      top - 2,
      edge + width,
      184,
      edge + bevel,
      184
    ]);
    // Horizontal joints and sloping fracture planes break up the column faces.
    const shoulder = top + 19 + 37 * rand(i, 9);
    polygon(c, i % 3 ? '#3c323d' : '#473641', [
      edge + bevel,
      shoulder,
      edge + width,
      shoulder - 9,
      edge + width,
      shoulder + 5,
      edge + bevel + 2,
      shoulder + 17
    ]);
    c.fillStyle = side > 0 ? '#a96346' : '#674440';
    c.fillRect(edge + (side > 0 ? 0 : width - 2), top + 7, 2, Math.min(height * 0.47, 36));
    // Broken faces catch the same amber light as the weapon.
    for (let j = 0; j < 4; j++) {
      c.fillStyle = j === 0 ? '#56404a' : '#332c38';
      c.fillRect(edge + bevel + 2, top + 11 + j * 18, Math.max(2, width - bevel - j - 4), 1 + (j % 2));
    }
  }
  // Low banks cross the vertical basalt and break into tilted slabs at impact.
  for (let i = 0; i < 30; i++) {
    const x = i * 24 - 100,
      side = x < 333 ? -1 : 1;
    const falloff = Math.min(1, Math.abs(x - 333) / 130);
    const shift = side * fault * (1 - falloff) * 29;
    const top = 183 - (18 + rand(i, 13) * 27) * falloff;
    c.save();
    c.translate(x + shift, top + fault * (1 - falloff) * 14);
    c.rotate(side * fault * (1 - falloff) * 0.2);
    polygon(c, '#23232e', [-4, 11, 2, 1, 17, -4, 32, -1, 29, 41, -4, 41]);
    polygon(c, '#574049', [-4, 11, 2, 1, 17, -4, 32, -1, 20, 2, 7, 4]);
    polygon(c, '#35303c', [7, 4, 20, 2, 13, 7, 9, 19, 6, 21]);
    c.restore();
  }
  const mouth = 5 + 13 * fault;
  polygon(c, '#7c3835', [332 - mouth, 119, 331, 105, 335 + mouth, 101, 333 + mouth, 142, 331 + mouth, 177, 323 - mouth, 186]);
  polygon(c, '#d36332', [331 - mouth * 0.55, 121, 334 + mouth * 0.5, 108, 331 + mouth * 0.46, 180, 327 - mouth * 0.8, 185]);
  for (let i = 0; i < (reduced ? 7 : 20); i++) {
    const y = 120 + ((w / (9 + (i % 5)) + rand(i, 17) * 63) % 62);
    c.fillStyle = i % 4 ? ember : core;
    c.fillRect(331 + (rand(i, 16) - 0.5) * mouth - (2 * (y - 95)) / 87, y, 1 + (i % 2), 4 + (i % 6));
  }
  const floor = c.createLinearGradient(0, 178, 0, 225);
  floor.addColorStop(0, '#352d34');
  floor.addColorStop(1, '#171a26');
  c.fillStyle = floor;
  c.fillRect(-850, 182, 2100, 850);
  for (let i = 0; i < 85; i++) {
    const x = rand(i, 30) * 640 - 72,
      y = 184 + rand(i, 31) * 44;
    c.fillStyle = i % 5 ? '#302932' : '#5e4542';
    c.fillRect(x, y, 2 + rand(i, 32) * 11, 1);
  }
  const bed = 2 + 17 * fault;
  polygon(c, '#793a36', [
    333,
    178,
    348 + bed,
    181,
    334 + bed,
    187,
    347 + bed,
    193,
    317,
    209 + bed,
    328,
    196,
    311 - bed,
    189,
    329,
    184
  ]);
  polygon(c, ember, [
    333,
    179,
    339 + bed,
    181,
    330 + bed,
    187,
    338 + bed,
    193,
    319,
    201 + bed,
    333,
    194,
    319 - bed * 0.4,
    188,
    333,
    184
  ]);
  c.restore();
}

function embers(c, t, w, reduced) {
  const heat = smooth(t, KINDLE, POUR);
  if (!heat) return;
  c.save();
  for (let i = 0; i < (reduced ? 12 : 42); i++) {
    const k = (w / (1300 + rand(i, 40) * 2200) + rand(i, 41)) % 1;
    const x = 95 + rand(i, 42) * 335 + 8 * Math.sin(i + k * 5);
    c.globalAlpha = heat * Math.sin(Math.PI * k) * 0.8;
    c.fillStyle = i % 4 ? ember : core;
    c.fillRect(Math.round(x), Math.round(180 - k * (50 + rand(i, 43) * 140)), 1, 1 + (i % 3));
  }
  c.restore();
}

// All geometry is in grip space. The rear peen, wedged socket and heavy striking
// face have distinct profiles even when the hot seams cool to black.
function hammer(c, t, hero, reduced) {
  const alpha = 1 - hero.weaponOpacity;
  if (alpha <= 0) return;
  const lift = smooth(t, WELD, HOIST) * (1 - smooth(hero.angle, 0.72, 1.24));
  const length = 20 + 132 * smooth(t, POUR, HOIST) - (reduced ? 55 * lift : 0);
  const mass = 0.28 + 0.72 * smooth(t, POUR, HOIST);
  const loose = 1 - smooth(t, POUR + 260, WELD + 840);
  c.save();
  c.globalAlpha = alpha;
  c.translate(159 + Math.round(hero.dx), 164 + Math.round(hero.dy));
  c.rotate(hero.angle);
  // Tapered haft, leather grip, iron lugs and a light picked up along one edge.
  polygon(c, '#171b27', [
    -3,
    7,
    -4,
    -length * 0.42,
    -5,
    -length + 6,
    -7,
    -length - 1,
    6,
    -length - 1,
    4,
    -length * 0.42,
    3,
    7,
    1,
    10,
    -2,
    10
  ]);
  polygon(c, '#625257', [-1, 3, -2, -length, 1, -length, 1, 4]);
  c.fillStyle = '#ad7652';
  c.fillRect(1, -length + 6, 1, Math.max(2, length - 23));
  for (let y = 5; y > -19; y -= 4) {
    polygon(c, '#91654f', [-3, y, 3, y - 2, 3, y, -3, y + 2]);
  }
  for (let j = 0; j < 3; j++) {
    const y = -length + 11 + 5 * j;
    c.fillStyle = j % 2 ? '#94654b' : '#4c4248';
    c.fillRect(-4, y, 8, 3);
  }
  for (let i = 1; i <= 3; i++) {
    const y = -length * (0.22 + i * 0.14);
    polygon(c, '#37343c', [-4, y, 3, y - 2, 3, y + 2, -4, y + 4]);
    c.fillStyle = '#a08873';
    c.fillRect(-3, y, 2, 2);
  }
  c.translate(0, -length);
  c.scale(mass, mass);
  // Each cheek seats on the same growing haft. The nose is a stepped wedge.
  c.save();
  c.translate(-21 * loose, -12 * loose);
  polygon(c, '#171d29', [-42, -11, -24, -14, -9, -13, -4, -8, -4, 8, -16, 10, -22, 4, -32, 1, -42, 2, -46, 6]);
  polygon(c, '#55505a', [-42, -11, -24, -14, -9, -13, -8, -9, -27, -9, -42, -4, -46, 6]);
  polygon(c, '#353744', [-41, -4, -25, -9, -10, -9, -9, 4, -19, 5, -26, -1, -41, 0]);
  polygon(c, '#b27a58', [-40, -10, -25, -13, -15, -12, -27, -10, -40, -7]);
  c.restore();
  c.save();
  c.translate(24 * loose, -7 * loose);
  polygon(c, '#171b26', [4, -11, 11, -16, 24, -15, 28, -21, 34, -20, 38, -12, 38, 9, 32, 15, 22, 14, 17, 11, 6, 10]);
  polygon(c, '#767078', [5, -10, 12, -15, 25, -14, 28, -19, 33, -18, 35, -13, 24, -9, 16, -10, 8, -6]);
  polygon(c, '#3d3d49', [8, -6, 17, -10, 24, -9, 35, -13, 33, 7, 24, 11, 16, 7, 8, 8]);
  polygon(c, '#282e3b', [14, -3, 21, -7, 30, -7, 28, -4, 21, -3, 19, 4, 15, 5]);
  polygon(c, '#aca095', [33, -17, 38, -12, 38, 8, 33, 13, 31, 10, 33, 4, 34, -6, 31, -7]);
  polygon(c, '#615963', [34, -9, 38, -12, 38, 8, 34, 10]);
  c.fillStyle = core;
  c.fillRect(35, -11, 2, 3);
  c.restore();
  polygon(c, iron, [-11, -13, -6, -18, 2, -19, 10, -13, 9, 9, 4, 15, -4, 15, -9, 9]);
  polygon(c, '#57505a', [-10, -12, -5, -16, 1, -17, 6, -13, -3, -10, -6, 8, -9, 7]);
  polygon(c, '#914b37', [-4, -11, 3, -15, 6, -8, 2, -1, 4, 3, -2, 12, -1, 3, -4, 0, -1, -6]);
  polygon(c, ember, [-2, -10, 2, -13, 2, -7, 0, -2, 2, 1, -1, 6, 0, 1, -2, -1, 0, -7]);
  c.fillStyle = '#ab8371';
  c.fillRect(-7, -8, 2, 2);
  c.fillRect(5, 6, 2, 2);
  if (!reduced && loose > 0) {
    for (let i = 0; i < 12; i++) {
      const k = (t / 430 + rand(i, 64)) % 1;
      c.fillStyle = i % 2 ? ember : core;
      c.fillRect((i % 2 ? 1 : -1) * (16 + loose * 49 * (1 - k)), -8 - 26 * (1 - k) + rand(i, 65) * 15, 2, 1);
    }
  }
  c.restore();
}

// The hot face leaves a tapered arc along its actual path through the wide shot.
function wake(c, t) {
  if (t <= SWING || t > HIT) return;
  const end = Math.min(t, HOLD);
  const fade = 1 - smooth(t, HOLD, HIT);
  const outer = [],
    inner = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const sample = Math.max(SWING, end - (1 - u) * 135);
    const { hero } = pose(sample, clock(sample), false);
    const a = hero.angle,
      x = 159 + hero.dx,
      y = 164 + hero.dy;
    const radius = 151,
      edge = 34;
    outer.push(x + Math.sin(a) * radius + Math.cos(a) * edge, y - Math.cos(a) * radius + Math.sin(a) * edge);
    inner.unshift(
      x + Math.sin(a) * (radius - 9 * u) + Math.cos(a) * edge,
      y - Math.cos(a) * (radius - 9 * u) + Math.sin(a) * edge
    );
  }
  c.save();
  c.globalAlpha = 0.52 * fade * span(t, SWING, HOLD);
  polygon(c, ember, [...outer, ...inner]);
  c.restore();
}

function strike(c, t, w, reduced) {
  if (t < HIT) return;
  const age = w - contact,
    k = eases.out(span(age, 0, 430)),
    x = FOE[0] + 4,
    y = 181;
  c.save();
  for (const side of [-1, 1]) {
    c.save();
    c.translate(x, y);
    c.scale(side, 1);
    polygon(c, '#151822', [0, -2, 35 * k, 1, 63 * k, -4, 90 * k, -3, 130 * k, -9, 92 * k, 0, 63 * k, -1, 35 * k, 6, 0, 5]);
    polygon(c, ember, [0, 0, 35 * k, 2, 63 * k, -3, 89 * k, -2, 130 * k, -9, 90 * k, -1, 63 * k, -2, 35 * k, 4, 0, 3]);
    c.restore();
  }
  for (let i = 0; i < (reduced ? 15 : 55); i++) {
    const p = span(age, 0, 480 + rand(i, 50) * 860);
    if (p >= 1) continue;
    const side = i % 2 ? 1 : -1,
      size = 1 + rand(i, 51) * 4;
    c.save();
    c.translate(x + side * (6 + p * (16 + rand(i, 52) * 134)), y - (24 + rand(i, 53) * 83) * 4 * p * (1 - p));
    c.rotate(side * (i + p * 4));
    c.globalAlpha = 1 - p * p;
    c.fillStyle = iron;
    c.fillRect(-size, -size, size * 2, size * 1.6);
    c.fillStyle = i % 3 ? ember : core;
    c.fillRect(-size, -size, size * 1.6, 1);
    c.restore();
  }
  c.restore();
}

function ignition(c, t, reduced) {
  if (t < KINDLE || t > POUR) return;
  const k = span(t, KINDLE, POUR);
  c.save();
  c.translate(176, 175);
  for (let i = 0; i < (reduced ? 8 : 22); i++) {
    const age = Math.min(1, k * (2 + rand(i, 77)));
    c.globalAlpha = 1 - age;
    c.fillStyle = i % 3 ? ember : core;
    c.fillRect((rand(i, 79) - 0.5) * 50 * age, -(5 + rand(i, 78) * 28) * 4 * age * (1 - age), 1, 2);
  }
  c.restore();
}

const wide = [214, 85, 1.07, 0];
export const forgePlan = {
  duration: END,
  impact: HIT,
  titleAt: 12650,
  subtitle: '— 鑄百嶺為鎚 · 一擊開山 —',
  warp: clock,
  pose,
  attack: [950, 11900],
  shots: [
    [0, '起火 · 一鎚叩地', [161, 149, 3.3, -0.03], [164, 154, 3.65, 0], 'smooth'],
    [KINDLE, '回聲 · 山腹開爐', [164, 154, 3.65, 0], [245, 122, 1.25, 0], 'out'],
    [POUR, '引鐵 · 火沿柄走', [163, 147, 2.4, 0], [185, 128, 1.9, -0.025], 'smooth'],
    [WELD, '合鍛 · 鎚頰咬合', [207, 113, 1.8, -0.025], [222, 107, 1.5, 0], 'smooth'],
    [HOIST, '扛山 · 沉鐵過肩', [220, 102, 1.3, 0], [144, 72, 1.05, -0.035], 'smooth'],
    [8340, '蓄勢 · 山門一線', [144, 72, 1.05, -0.035], wide, 'smooth'],
    [SWING, '掄擊 · 一弧越頂', wide, [218, 86, 1.08, 0], 'smooth'],
    [HOLD, '懸息 · 鎚下留隙', [249, 132, 1.93, 0], [249, 132, 1.95, 0], 'smooth'],
    [HIT, '落砧 · 山脊錯斷', [249, 132, 1.95, 0], [267, 140, 1.58, 0.015], 'out'],
    [11450, '餘火 · 斷層見金', [267, 140, 1.58, 0.015], [258, 124, 1.24, 0], 'smooth'],
    [12650, '終幕 · 熔心天墜', [258, 124, 1.24, 0], [254, 123, 1.19, 0], 'smooth']
  ],
  close: [
    [0, KINDLE],
    [POUR, WELD],
    [HOLD, HIT + 480]
  ],
  lines: [],
  flashes: [
    [KINDLE, 130, 0.18, '#ffc174'],
    [HIT, 155, 0.59, '#ffcf88']
  ],
  shake(t) {
    if (t >= HIT) return 7 * Math.exp(-(t - HIT) / 205);
    if (t >= HOLD) return 0;
    if (t >= HOIST) return 1.4 * Math.exp(-(t - HOIST) / 190);
    return t < KINDLE ? 0 : 2.5 * Math.exp(-(t - KINDLE) / 210);
  },
  back(c, t, w, ctx) {
    const { reduced } = ctx;
    foundry(c, t, w, reduced);
    embers(c, t, w, reduced);
    if (!reduced) wake(c, t);
    hammer(c, t, (ctx.pose ?? pose(t, w, reduced)).hero, reduced);
  },
  front(c, t, w, { reduced }) {
    ignition(c, t, reduced);
    strike(c, t, w, reduced);
  }
};
