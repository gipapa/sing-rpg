import { realms } from './catalog.js';
import { drumStyle } from './drum-spells.js';

// Legendary weapons live outside the regular equipment list and collection counts.
// Loadouts store them as LEGEND_BASE + index so regular ids stay untouched.
export const LEGEND_BASE = 10000;
export const LEGEND_DROP_RATE = 0.2;
export const LEGEND_DAMAGE = 10;

const defs = [
  ['銀角王劍', 'sword', '森冠裁決', '#c6f0b4', '#e9f1f2'],
  ['白潮三叉戟', 'trident', '滄海王令', '#9fe3ea', '#e4f3f2'],
  ['赤爐重鎚', 'hammer', '熔心天墜', '#ffae78', '#8a7b72'],
  ['霜冠長弓', 'bow', '永冬穿星', '#cbe9ff', '#e6f3fb'],
  ['天帆翼槍', 'lance', '蒼穹破陣', '#bfe8c4', '#eef2e6'],
  ['琥珀王刃', 'saber', '砂皇獅吼', '#ffd37a', '#f0dca6'],
  ['伏雷戰鼓', 'drum', '九霄雷奏', '#d8b8ff', '#b98a5e'],
  ['蝕月龍鐮', 'scythe', '終夜月蝕', '#c3a8f0', '#5a4f74']
];

// Field motif shown briefly after a legendary cast: a rising blade of light with sparks.
function legendMotif(c, p, count, color) {
  const rise = Math.min(1, p * 1.6);
  c.fillStyle = color;
  c.fillRect(-1, -12 - rise * 70, 3, rise * 70);
  for (let i = 0; i < count; i++) {
    const t = p * 1.4 - (i % 6) * .08;
    if (t < 0 || t > 1) continue;
    const a = i * 2.39996, r = 10 + t * 50;
    c.fillRect(Math.round(Math.cos(a) * r), Math.round(-40 + Math.sin(a) * r * .5 - t * 20), 2, 2);
  }
}

export const legends = defs.map(([name, shape, spellName, color, metal], index) => ({
  id: LEGEND_BASE + index,
  index,
  name,
  shape,
  color,
  metal,
  country: index,
  boss: realms[index].boss,
  slot: 2,
  type: '傳說武器',
  spell: { id: 'legend-' + index, name: spellName, damage: LEGEND_DAMAGE, duration: 1600, color, count: 24, draw: legendMotif, legend: index }
}));

export const isLegendId = (id) => Number.isInteger(id) && id >= LEGEND_BASE && id < LEGEND_BASE + legends.length;
export const legendOf = (id) => (isLegendId(id) ? legends[id - LEGEND_BASE] : null);

// The hero's legendary weapon, only while it is owned and equipped in the weapon slot.
export function equippedLegend(game) {
  const legend = legendOf(game.loadouts?.[0]?.[2]);
  return legend && game.legends?.[legend.index] ? legend : null;
}

// A legendary weapon replaces the chosen drum spell; unequipping restores the setting.
export function battleStyle(game) {
  const legend = equippedLegend(game);
  return legend ? { spell: legend.spell, tint: null, color: legend.color } : drumStyle(game);
}

export function equipLegend(game, index) {
  if (!game.legends?.[index]) return false;
  const gear = game.loadouts[0];
  if (!isLegendId(gear[2])) game.weaponBeforeLegend = gear[2];
  gear[2] = LEGEND_BASE + index;
  return true;
}

export function unequipLegend(game) {
  const gear = game.loadouts[0];
  if (!isLegendId(gear[2])) return;
  const previous = game.weaponBeforeLegend;
  gear[2] = Number.isInteger(previous) && previous >= 0 && game.owned[previous] ? previous : -1;
  delete game.weaponBeforeLegend;
}

// A sovereign victory may also yield that realm's legendary weapon.
export function rollLegend(game, country, random = Math.random) {
  if (!legends[country] || random() >= LEGEND_DROP_RATE) return null;
  game.legends ??= {};
  game.legends[country] = (game.legends[country] || 0) + 1;
  return country;
}

// Pixel sprite with the grip at the origin, pointing up (-y), like regular weapons.
export function drawLegendWeapon(c, legend, silhouette = false) {
  const { shape, metal, color } = legend;
  const ink = (value) => (silhouette ? '#0b0f17' : value);
  const r = (x, y, w, h, value) => {
    c.fillStyle = ink(value);
    c.fillRect(x, y, w, h);
  };
  const gold = '#d8c27e', dark = '#3a3d48', wood = '#7a5a40';
  if (shape === 'sword') {
    r(-1, 0, 3, 4, dark); r(-1, 4, 3, 1, gold);
    r(-1, -26, 3, 25, metal); r(1, -26, 1, 25, '#ffffff'); r(0, -22, 1, 18, color); r(0, -28, 1, 2, metal);
    // Antler crossguard.
    r(-5, -2, 11, 2, gold); r(-6, -5, 2, 3, gold); r(5, -5, 2, 3, gold);
    r(-8, -7, 2, 3, gold); r(7, -7, 2, 3, gold); r(-4, -6, 1, 2, gold); r(4, -6, 1, 2, gold);
    r(0, -1, 1, 1, '#7fe0a0');
  } else if (shape === 'trident') {
    r(0, -24, 2, 30, '#c8d6d6'); r(-4, -26, 10, 2, metal);
    r(-4, -32, 2, 6, metal); r(0, -35, 2, 9, metal); r(4, -32, 2, 6, metal);
    r(0, -20, 2, 3, color); r(-4, -33, 1, 1, '#fff'); r(4, -33, 1, 1, '#fff');
  } else if (shape === 'hammer') {
    r(-1, -21, 3, 27, '#514447'); r(0, -16, 1, 21, wood);
    for (const y of [-12, -8, -4, 3]) r(-1, y, 3, 1, '#aa8569');
    r(-7, -27, 15, 9, dark); r(-9, -26, 4, 7, '#434754'); r(7, -26, 3, 7, '#242832');
    r(-7, -28, 4, 2, '#c2c9c3'); r(-8, -26, 2, 4, '#82919a');
    r(-5, -26, 10, 2, metal); r(4, -27, 4, 1, '#a9a5a2');
    r(-6, -20, 13, 1, '#855747'); r(-2, -27, 4, 9, '#846343');
    r(-1, -25, 2, 4, '#c27444'); r(-1, -24, 2, 2, color); r(0, -23, 1, 1, '#ffdc8c');
  } else if (shape === 'bow') {
    for (let k = -14; k <= 14; k++) r(-3 + Math.round((k * k) / 40), k - 10, 2, 1, metal);
    r(3, -24, 1, 28, '#f6f6f6'); r(-3, -12, 3, 4, dark); r(-5, -25, 2, 2, color); r(-5, 3, 2, 2, color);
  } else if (shape === 'lance') {
    r(0, -26, 2, 32, '#e0d6c0'); r(-1, -34, 4, 8, metal); r(0, -38, 2, 4, metal);
    r(-5, -24, 4, 2, color); r(3, -24, 4, 2, color); r(-6, -22, 2, 2, color); r(6, -22, 2, 2, color);
  } else if (shape === 'saber') {
    r(-1, 0, 3, 4, dark); r(-4, -1, 9, 2, gold);
    for (let k = 0; k < 24; k++) r(Math.round(k * k / 70), -2 - k, 3, 1, metal);
    for (let k = 4; k < 22; k++) r(Math.round(k * k / 70) + 1, -2 - k, 1, 1, color);
  } else if (shape === 'drum') {
    r(-6, -10, 13, 9, wood); r(-6, -11, 13, 2, metal); r(-6, -2, 13, 2, metal);
    r(-2, -8, 5, 5, color); r(5, -19, 1, 10, '#e8dcc0'); r(4, -20, 3, 2, color);
  } else {
    r(0, -28, 2, 34, dark);
    for (let k = 0; k < 16; k++) r(-k, -30 + Math.round((k * k) / 18), 2, 2, metal);
    for (let k = 2; k < 14; k++) r(-k, -29 + Math.round((k * k) / 18), 1, 1, color);
  }
}

export function legendIcon(canvas, legend, owned) {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.save();
  const scale = Math.max(1, Math.floor(canvas.width / 44));
  c.translate(canvas.width / 2, canvas.height * .82);
  c.scale(scale, scale);
  c.rotate(.6);
  drawLegendWeapon(c, legend, !owned);
  c.restore();
}
