import { FOE, span, eases, rand, spark, glow, warp } from './spell-fx.js';

// 森冠裁決 (銀角王劍): the hero drives the king's blade into the earth, an ancient forest
// erupts, a colossal silver-antlered stag steps out, its antlers become a sky-sized sword,
// and one swing cleaves the foe and the forest behind it.
//
// The finale follows the grammar of a giant-scale finishing move: the hero hoists the sky
// sword in an extreme low angle, wind and light pour into it, the foe looks up at it, a
// tracking swing stops dead a hair above the target, and then one enormous cut lands.
const RAISE = 9600;    // hoist the sky sword overhead
const CHARGE = 10400;  // wind pressure and light gather in the blade
const DREAD = 11300;   // the foe looks up at what is coming
const STRIKE = 11800;  // the swing
const FREEZE = 12200;  // the frame stops with the edge just above the foe
const IMPACT = 12550;
const DURATION = IMPACT + 3700;
const SWING = 1.5;
const COCK = -.62;
const CUT = .16;
const PLANT = [163, 182];
const SILVER = '#eef6ee', WHITE = '#fbfff6';
const S = 6;

// Time nearly stops during the pre-hit freeze, then the usual hit-stop follows the impact.
const forestWarp = (t) => t < FREEZE ? t
  : t < IMPACT ? FREEZE + (t - FREEZE) * .05
  : warp(t, IMPACT) - (IMPACT - FREEZE) * .95;
const W_IMPACT = forestWarp(IMPACT);

const smoothOut = (k) => 1 - (1 - k) ** 3;
const back = (k) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;

// ---- Actor choreography ------------------------------------------------------------

// Swing progress: accelerates, holds just short of contact through the freeze, then lands.
function swingAt(t) {
  if (t < STRIKE) return 0;
  if (t < FREEZE) return .9 * eases.in(span(t, STRIKE, FREEZE));
  if (t < IMPACT) return .9 + .015 * span(t, FREEZE, IMPACT);
  return 1;
}

function heroPose(t) {
  let dx = 0, dy = 0, angle = 0;
  if (t < 1400) angle = 0;
  else if (t < 1900) { const k = smoothOut(span(t, 1400, 1900)); angle = -.55 * k; dy = -2 * k; }
  else if (t < 2050) { const k = eases.in(span(t, 1900, 2050)); angle = -.55 + (Math.PI + .55) * k; dy = -2 + 5 * k; }
  else if (t < 6500) { angle = Math.PI; dy = 3; }
  else if (t < 6900) { const k = smoothOut(span(t, 6500, 6900)); angle = Math.PI - (Math.PI - .25) * k; dy = 3 - 3 * k; }
  else if (t < 8700) angle = .25;
  else if (t < RAISE) { const k = eases.inOut(span(t, 8700, 9300)); angle = .25 - .4 * k; dy = -k; }
  else if (t < CHARGE) {
    // Hoisting a sky-sized blade: it overshoots back over the shoulder and wavers under its weight.
    const k = back(span(t, RAISE, CHARGE)), strain = span(t, RAISE, CHARGE) * (1 - span(t, CHARGE - 200, CHARGE));
    angle = -.15 + (COCK + .15) * k + Math.sin(t / 45) * .02 * strain; dx = -k; dy = -1 - 2 * k;
  } else if (t < STRIKE) {
    // Feet planted, blade cocked back and trembling with gathered power.
    const crouch = smoothOut(span(t, CHARGE, CHARGE + 300));
    angle = COCK + Math.sin(t * .09) * .025 * span(t, CHARGE, DREAD); dx = -1 - crouch; dy = -3 + 4 * crouch;
  } else if (t < IMPACT) { const s = swingAt(t); angle = COCK + (SWING - COCK) * s; dx = -2 + 10 * s; dy = 1 + s; }
  else if (t < IMPACT + 2100) { angle = SWING + .55 * smoothOut(span(t, IMPACT, IMPACT + 500)); dx = 8; dy = 2; }
  else { const k = eases.inOut(span(t, IMPACT + 2100, IMPACT + 2800)); angle = SWING + .55 + (Math.PI - SWING - .55) * k; dx = 8; dy = 2 + k; }
  return { dx, dy, angle };
}

function foePose(t, w) {
  let dx = 0, dy = 0, tilt = 0;
  if (t >= 2050 && t < 4300) dx = Math.sin(w * .11) * (1.4 - span(t, 2050, 4300));
  if (t >= 4300 && t < IMPACT) {
    // Under the raised sky sword it shakes harder, shrinks back and looks up.
    const dread = span(t, DREAD, DREAD + 300);
    dx = Math.sin(w * .21) * (1 - span(t, 5400, 6000) * .6 + dread * 1.2) + 6 * smoothOut(span(t, 4300, 5400)) + 3 * dread;
    tilt = -.08 * dread; dy = dread;
  }
  if (t >= IMPACT) {
    // Knockback runs on warped time so it respects the hit-stop.
    const k = span(w, W_IMPACT, W_IMPACT + 800);
    dx = 9 + 28 * smoothOut(k) - 12 * eases.inOut(span(t, IMPACT + 1300, IMPACT + 2600));
    tilt = .34 * Math.sin(Math.min(1, k * 1.2) * Math.PI);
    dy = -12 * Math.sin(Math.min(1, k * 1.5) * Math.PI);
  }
  return { dx, dy, tilt };
}

const hand = (pose) => [159 + pose.dx, 164 + pose.dy];

// ---- Pixel helpers -------------------------------------------------------------------

function pdisk(c, x, y, r, color) {
  c.fillStyle = color;
  for (let dy = -r; dy <= r; dy += 2) {
    const half = Math.sqrt(Math.max(0, r * r - dy * dy));
    c.fillRect(Math.round(x - half), Math.round(y + dy), Math.round(half * 2), 2);
  }
}

function leaf(c, x, y, size, angle, color, alpha) {
  if (alpha <= 0) return;
  c.save();
  c.translate(x, y); c.rotate(angle);
  c.globalAlpha = alpha; c.fillStyle = color;
  c.fillRect(-size, -size * .35, size * 2, size * .7);
  c.fillStyle = '#e8ffd8'; c.globalAlpha = alpha * .5;
  c.fillRect(-size, -.3, size * 2, .6);
  c.restore();
}

// ---- The ancient forest --------------------------------------------------------------

const trees = Array.from({ length: 19 }, (_, i) => {
  const far = i % 3 === 0;
  const x = -70 + i * 35 + (rand(i, 40) - .5) * 18;
  return {
    i, x, far,
    h: far ? 150 + rand(i, 41) * 90 : 210 + rand(i, 42) * 140,
    w: far ? 6 + rand(i, 43) * 5 : 11 + rand(i, 44) * 10,
    delay: 2150 + Math.abs(x - PLANT[0]) * 3.2 + rand(i, 45) * 220
  };
}).sort((a, b) => Number(b.far) - Number(a.far));

function tree(c, tr, rise, w, color) {
  if (rise <= 0) return;
  const base = 184, h = tr.h;
  const dark = tr.far ? '#141c16' : '#20281d', bark = tr.far ? '#1d271f' : '#36402c';
  const sway = Math.sin(w / 900 + tr.x) * 1.5 * (h / 200);
  c.save();
  c.translate(tr.x, h * (1 - Math.min(1, rise)) - (rise > 1 ? (rise - 1) * 20 : 0));
  for (let y = base - h; y < base; y += 4) {
    const k = (y - (base - h)) / h;
    const half = tr.w * (.35 + .65 * k) + (k > .88 ? (k - .88) * 70 : 0);
    const off = sway * (1 - k);
    c.fillStyle = dark; c.fillRect(Math.round(-half + off), y, Math.round(half * 2), 4);
    c.fillStyle = bark; c.fillRect(Math.round(-half * .3 + off), y, 2, 4);
    if (!tr.far) {
      c.globalAlpha = .35; c.fillStyle = color; c.fillRect(Math.round(-half + off), y, 1, 4); c.globalAlpha = 1;
    }
  }
  for (let b = 0; b < 3; b++) {
    const by = base - h * (.5 + b * .14), dir = (b + tr.i) % 2 ? 1 : -1, len = tr.w * (2.4 - b * .5);
    c.fillStyle = dark;
    for (let k = 0; k < len; k += 2) c.fillRect(Math.round(dir * (tr.w * .3 + k) + sway * .6), Math.round(by - k * .6), 3, 3);
  }
  const cy = base - h, cr = tr.w * 2.7;
  const greens = tr.far ? ['#10200f', '#162a17'] : ['#183320', '#24492a'];
  for (let k = 0; k < 6; k++) {
    pdisk(c, sway + (rand(tr.i, k) - .5) * cr * 1.7, cy + (rand(tr.i, k + 6) - .5) * cr * .9,
      Math.round(cr * (.45 + rand(tr.i, k + 12) * .4)), greens[k % 2]);
  }
  if (!tr.far) {
    c.globalAlpha = .25; pdisk(c, sway - cr * .3, cy - cr * .3, Math.round(cr * .35), color); c.globalAlpha = 1;
  }
  c.restore();
}

// Trees rise out of the earth, then the judgment cuts the forest along one line.
function forest(c, t, w, color) {
  c.save();
  c.beginPath(); c.rect(-1200, -2000, 3000, 2186); c.clip();
  const draw = () => {
    for (const tr of trees) tree(c, tr, back(span(t, tr.delay, tr.delay + 950)) * (t >= tr.delay ? 1 : 0), w, color);
  };
  if (t < IMPACT) draw();
  else {
    const slide = 24 * smoothOut(span(t, IMPACT + 120, IMPACT + 1700));
    const cx = Math.cos(CUT), cy = Math.sin(CUT), [ox, oy] = [FOE[0], 152];
    const half = (sign) => {
      c.save();
      c.beginPath();
      c.moveTo(ox - cx * 1400, oy - cy * 1400); c.lineTo(ox + cx * 1400, oy + cy * 1400);
      c.lineTo(ox + cx * 1400, oy + cy * 1400 + sign * 3000); c.lineTo(ox - cx * 1400, oy - cy * 1400 + sign * 3000);
      c.closePath(); c.clip();
      if (sign < 0) c.translate(cx * slide, cy * slide - slide * .15);
      draw();
      c.restore();
    };
    half(1); half(-1);
  }
  c.restore();
}

// ---- The silver-antlered stag --------------------------------------------------------

const stagBody = [
  [-13, -25, 24, 10], [-15, -24, 3, 8], [10, -27, 4, 11], [-11, -15, 20, 2],
  [9, -33, 5, 7], [11, -37, 4, 5], [12, -40, 7, 4], [18, -39, 3, 3], [13, -36, 6, 1],
  [10, -42, 2, 2], [-17, -25, 2, 3]
];
const antlerBlocks = (() => {
  const blocks = [];
  const grow = (x, y, angle, length, depth) => {
    let px = x, py = y;
    for (let k = 0; k < length; k++) {
      px = x + Math.sin(angle) * k; py = y - Math.cos(angle) * k;
      blocks.push([Math.round(px), Math.round(py)]);
    }
    if (depth <= 0) return;
    const mid = length * .55;
    grow(x + Math.sin(angle) * mid, y - Math.cos(angle) * mid, angle + .7, length * .55, depth - 1);
    grow(px, py, angle - .35, length * .62, depth - 1);
    grow(px, py, angle + .45, length * .5, depth - 1);
  };
  grow(14, -41, -.45, 10, 3);
  grow(17, -41, .25, 10, 3);
  return [...new Map(blocks.map((b) => [b.join(), b])).values()];
})();
const stagX = (t) => 40 + 60 * eases.inOut(span(t, 6900, 7900));
const antlerWorld = (t, [ux, uy]) => [stagX(t) + ux * S + S / 2, 182 + uy * S + S / 2];

function stag(c, t, w, color, alpha, antler) {
  if (alpha <= 0) return;
  const x0 = stagX(t), y0 = 182;
  const step = t < 7900 ? Math.round(Math.sin(span(t, 6900, 7900) * Math.PI * 2)) : 0;
  const block = (x, y, bw, bh) => c.fillRect(Math.round(x0 + x * S), Math.round(y0 + y * S), bw * S, bh * S);
  glow(c, x0 + 40, y0 - 150, 230, color, .25 * alpha);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = alpha * .55; c.fillStyle = '#cfe6d0';
  for (const [x, y, bw, bh] of stagBody) block(x, y, bw, bh);
  for (const [lx, front] of [[-12, 0], [-8, 0], [7, 1], [10, 1]]) {
    const off = (front ? step : -step) * .6;
    block(lx + off, -15, 2, 14); c.fillStyle = '#7d9a84'; block(lx + off, -1, 2, 1); c.fillStyle = '#cfe6d0';
  }
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = alpha * .35; c.fillStyle = color;
  for (const [x, y, bw, bh] of stagBody) block(x + .5, y + .5, Math.max(1, bw - 1), Math.max(1, bh - 1));
  // Leaf-rune markings along the flank.
  c.globalAlpha = alpha * .8; c.fillStyle = WHITE;
  for (let i = 0; i < 9; i++) block(-11 + i * 2.4, -22 + (i % 3) * 2, .5, .5);
  // Antlers of pure light.
  if (antler > 0) {
    for (const [x, y] of antlerBlocks) {
      c.globalAlpha = alpha * antler * (.75 + .25 * Math.sin(w / 140 + x + y));
      c.fillStyle = (x + y) % 4 ? SILVER : color;
      block(x, y, 1, 1);
    }
    glow(c, x0 + 15 * S, y0 - 55 * S, 140, color, .3 * alpha * antler);
  }
  // Eyes ignite when it lifts its head.
  const eye = span(t, 7600, 7900) * (1 - span(t, 9400, 9900));
  if (eye > 0) {
    spark(c, x0 + 17 * S + 3, y0 - 39 * S + 3, 3 + 3 * eye, WHITE, eye * alpha);
    glow(c, x0 + 17 * S + 3, y0 - 39 * S + 3, 26, color, .8 * eye);
  }
  // Breath mist from the muzzle.
  for (let i = 0; i < 8; i++) {
    const life = ((w / 900) + i / 8) % 1;
    c.globalAlpha = alpha * .3 * (1 - life); c.fillStyle = SILVER;
    c.fillRect(x0 + 21 * S + life * 30, y0 - 38 * S - life * 8 + Math.sin(i) * 4, 4 + life * 8, 3);
  }
}

// ---- The sky sword ------------------------------------------------------------------

function giantSword(c, x, y, angle, length, alpha, color) {
  if (alpha <= 0 || length <= 2) return;
  c.save();
  c.translate(x, y); c.rotate(angle);
  const wide = 11, start = -14;
  const shape = (pad) => {
    c.beginPath();
    c.moveTo(-wide - pad, start); c.lineTo(wide + pad, start);
    c.lineTo((wide + pad) * .75, start - length + 46); c.lineTo(0, start - length - pad);
    c.lineTo(-(wide + pad) * .75, start - length + 46); c.closePath();
  };
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = alpha * .3; c.fillStyle = color; shape(10); c.fill();
  c.globalAlpha = alpha * .9;
  const g = c.createLinearGradient(-wide, 0, wide, 0);
  g.addColorStop(0, color); g.addColorStop(.45, SILVER); g.addColorStop(.55, WHITE); g.addColorStop(1, color);
  c.fillStyle = g; shape(0); c.fill();
  c.globalAlpha = alpha; c.fillStyle = WHITE;
  c.fillRect(-1, start - length + 30, 2, length - 40);
  // Runes and antler crossguard.
  c.fillStyle = color;
  for (let k = 40; k < length - 50; k += 26) c.fillRect(-3, start - k, 6, 3);
  c.strokeStyle = SILVER; c.lineWidth = 3; c.lineCap = 'round';
  for (const side of [-1, 1]) {
    c.beginPath(); c.moveTo(0, start); c.lineTo(side * 30, start - 6); c.lineTo(side * 44, start - 26);
    c.moveTo(side * 22, start - 4); c.lineTo(side * 28, start - 22);
    c.moveTo(side * 36, start - 14); c.lineTo(side * 52, start - 18);
    c.stroke();
  }
  c.restore();
}

// The sword forms from the antlers, then swells further while it gathers power.
const swordLength = (t) => 330 * smoothOut(span(t, 8900, 9500)) + 60 * smoothOut(span(t, CHARGE, DREAD));

// ---- Layers -------------------------------------------------------------------------

function drawBack(c, t, w, ctx) {
  const { color, reduced } = ctx;
  const veil = .08 + .4 * span(t, 2200, 3400) - .12 * span(t, IMPACT + 800, IMPACT + 2100);
  c.globalAlpha = veil; c.fillStyle = '#03100a';
  c.fillRect(-1200, -900, 3000, 1400);
  const sky = c.createLinearGradient(0, -420, 0, 40);
  sky.addColorStop(0, '#020805'); sky.addColorStop(.7, '#0a1d14cc'); sky.addColorStop(1, '#0a1d1400');
  c.globalAlpha = 1; c.fillStyle = sky; c.fillRect(-1200, -900, 3000, 940);
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (reduced ? 30 : 90); i++) {
    c.globalAlpha = Math.max(0, .3 + .4 * Math.sin(w / (300 + rand(i, 2) * 500) + i)) * .7;
    c.fillStyle = i % 6 ? '#e6f5e8' : color;
    c.fillRect(-200 + rand(i) * 880, -420 + rand(i, 1) * 440, 1, 1);
  }
  c.globalCompositeOperation = 'source-over';
  // The stag stands behind the forest's front rank but in front of the far trees.
  // Its spirit looms larger again behind the hero while the sky sword is hoisted and charged.
  const ghost = .9 * span(t, 6900, 7700) * (1 - .7 * span(t, 9000, 9700)) + .35 * span(t, RAISE + 100, CHARGE) * (1 - span(t, STRIKE - 100, FREEZE));
  const stagAlpha = ghost * (t < IMPACT + 900 ? 1 : 1 - span(t, IMPACT + 900, IMPACT + 1500))
    + (t >= IMPACT + 2000 ? .35 * span(t, IMPACT + 2000, IMPACT + 2800) : 0);
  const antler = 1 - span(t, 8800, 9400) + (t >= IMPACT + 2000 ? span(t, IMPACT + 2000, IMPACT + 2800) : 0);
  if (t >= 2150) forest(c, t, w, color);
  stag(c, t, w, color, stagAlpha, Math.min(1, antler));
  c.globalCompositeOperation = 'lighter';
  // God rays through the canopy.
  const rays = span(t, 3000, 4000) * (1 - .5 * span(t, 9000, 10000));
  for (let i = 0; i < 6 && rays > 0; i++) {
    const x0 = -80 + i * 110 + Math.sin(w / 2000 + i) * 10;
    c.globalAlpha = rays * (.06 + .04 * Math.sin(w / 700 + i)); c.fillStyle = color;
    c.beginPath(); c.moveTo(x0, -400); c.lineTo(x0 + 22, -400); c.lineTo(x0 + 190, 184); c.lineTo(x0 + 130, 184); c.fill();
  }
  // Glowing root cracks spread from the blade.
  if (t >= 2050) {
    const grow = smoothOut(span(t, 2050, 2900)), fade = Math.min(1, 1 - .6 * span(t, 4800, 6000) + .5 * span(t, 6400, 6900) + .4 * span(t, CHARGE, STRIKE) - .9 * span(t, IMPACT + 500, IMPACT + 1500));
    c.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const dir = i % 2 ? 1 : -1;
      for (const [width, a] of [[3, .25], [1, 1]]) {
        c.lineWidth = width; c.strokeStyle = i % 3 ? color : WHITE; c.globalAlpha = a * fade;
        c.beginPath(); c.moveTo(PLANT[0], PLANT[1]);
        let x = PLANT[0];
        for (let k = 0; k < 9 * grow; k++) {
          x += dir * (8 + rand(i, k) * 16);
          c.lineTo(x, PLANT[1] - 1 + (rand(i, k + 20) - .5) * 5 + (i % 3));
        }
        c.stroke();
      }
    }
  }
  // Ground fissure left by the judgment.
  if (t >= IMPACT) {
    const k = span(t, IMPACT, IMPACT + 400), fade = 1 - span(t, IMPACT + 1500, DURATION);
    c.lineWidth = 3; c.strokeStyle = color; c.globalAlpha = .8 * fade;
    c.beginPath(); c.moveTo(170, 183); c.lineTo(170 + 320 * k, 183 + 4 * k); c.stroke();
  }
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
}

function drawFront(c, t, w, ctx) {
  const { color, reduced, foeY } = ctx;
  const dense = reduced ? .35 : 1;
  const pose = heroPose(t), [hx, hy] = hand(pose);
  const foeX = FOE[0] + foePose(t, w).dx;
  c.globalCompositeOperation = 'lighter';
  // A glint travels hilt to tip in the opening close-up.
  if (t >= 200 && t < 1500) {
    const k = eases.inOut(span(t, 250, 1300));
    spark(c, 160, 162 - 26 * k, 1 + 1.6 * Math.sin(k * Math.PI), WHITE, 1 - span(t, 1300, 1500));
    glow(c, 160, 162 - 26 * k, 8, color, .5);
  }
  // Plunge: shockwave, dust and a pillar of light from the hilt.
  if (t >= 2050 && t < 3400) {
    const k = span(t, 2050, 3000);
    for (let n = 0; n < 3; n++) {
      const r = Math.max(0, k * 1.3 - n * .15) * (60 + n * 60);
      if (r <= 0 || r >= 60 + n * 60) continue;
      c.save(); c.translate(PLANT[0], PLANT[1]); c.scale(1, .26);
      c.globalAlpha = 1 - r / (60 + n * 60); c.strokeStyle = n ? color : WHITE; c.lineWidth = 3 - n;
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); c.restore();
    }
    const pillar = 1 - span(t, 2050, 2700);
    if (pillar > 0) {
      const g = c.createLinearGradient(PLANT[0] - 10, 0, PLANT[0] + 10, 0);
      g.addColorStop(0, '#00000000'); g.addColorStop(.5, WHITE); g.addColorStop(1, '#00000000');
      c.globalAlpha = pillar; c.fillStyle = g; c.fillRect(PLANT[0] - 10, -500, 20, 682);
    }
    c.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 40 * dense; i++) {
      const a = -Math.PI * rand(i, 50), v = 30 + rand(i, 51) * 70, q = span(t, 2050, 2050 + 600 + rand(i, 52) * 500);
      const x = PLANT[0] + Math.cos(a) * v * q, y = PLANT[1] + Math.sin(a) * v * q * .6 + 60 * q * q;
      c.globalAlpha = 1 - q; c.fillStyle = i % 2 ? '#5a4a36' : '#7b6a4c';
      if (y < 184) c.fillRect(x, y, 2, 2);
    }
    c.globalCompositeOperation = 'lighter';
  }
  // Earth bursts at the roots of each rising tree.
  if (t >= 2150 && t < 4500) {
    c.globalCompositeOperation = 'source-over';
    for (const tr of trees) {
      const q = span(t, tr.delay, tr.delay + 700);
      if (q <= 0 || q >= 1 || tr.far) continue;
      for (let i = 0; i < 6 * dense; i++) {
        const a = -Math.PI * (.15 + rand(tr.i, i) * .7), v = 25 + rand(tr.i, i + 9) * 40;
        c.globalAlpha = 1 - q; c.fillStyle = i % 2 ? '#4b3d2c' : '#6d5d43';
        c.fillRect(tr.x + Math.cos(a) * v * q, 183 + Math.sin(a) * v * q + 50 * q * q, 3, 3);
      }
    }
    c.globalCompositeOperation = 'lighter';
  }
  // Pressure on the foe: creeping roots and the forest's shadow.
  if (t >= 4300 && t < IMPACT) {
    const grow = smoothOut(span(t, 4300, 5300)), fade = 1 - span(t, 5400, 6000) * .5;
    c.strokeStyle = color; c.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      c.globalAlpha = .7 * fade;
      c.beginPath(); c.moveTo(foeX - 70 - i * 6, 183);
      for (let k = 1; k <= 10 * grow; k++) c.lineTo(foeX - 70 - i * 6 + k * 7, 183 - Math.abs(Math.sin(k + i)) * 4 - (k > 7 ? (k - 7) * 6 : 0));
      c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = .3 * span(t, 4300, 4800) * (1 - span(t, 9900, IMPACT));
    c.fillStyle = '#020905'; c.fillRect(foeX - 60, foeY - 70, 120, 140);
    c.globalCompositeOperation = 'lighter';
  }
  // Gathering: aura and the hero's eye catching the light.
  if (t >= 5400 && t < 7000) {
    const power = span(t, 5400, 6600), fade = 1 - span(t, 6800, 7000);
    for (let i = 0; i < 70 * dense; i++) {
      const life = ((w - 5400) / 900 + rand(i, 60)) % 1;
      const a = rand(i, 61) * 6.28 + life * 4, r = 26 * (1 - life) + 4;
      spark(c, 152 + Math.cos(a) * r, 178 - life * 50 + Math.sin(a) * r * .3, .6 + life, color, power * fade * (1 - life));
    }
    glow(c, hx, hy, 12 + 20 * power, color, .5 * power * fade);
    const eye = span(t, 5550, 5800) * (1 - span(t, 6100, 6400));
    if (eye > 0) spark(c, 156, 152 + pose.dy, 1.2 + 1.5 * eye, WHITE, eye);
  }
  // Antler light streams into the sky sword.
  if (t >= 8700 && t < 9700) {
    const n = Math.round(antlerBlocks.length * dense);
    for (let i = 0; i < n; i += 2) {
      const q = span(t, 8750 + (i / n) * 500, 9250 + (i / n) * 500);
      if (q <= 0 || q >= 1) continue;
      const [sx, sy] = antlerWorld(t, antlerBlocks[i]);
      const f = 30 + (i / n) * 300, a = pose.angle;
      const ex = hx + Math.sin(a) * f, ey = hy - Math.cos(a) * f;
      const k = eases.inOut(q);
      spark(c, sx + (ex - sx) * k, sy + (ey - sy) * k - Math.sin(k * Math.PI) * 30, 1.6, i % 3 ? SILVER : color, 1 - q * .3);
    }
  }
  const len = swordLength(t), dirX = Math.sin(pose.angle), dirY = -Math.cos(pose.angle);
  // Hoist and charge: wind pressure rushes into the blade, debris lifts, light climbs the sword.
  if (t >= RAISE && t < STRIKE) {
    const power = span(t, 10000, DREAD), fade = 1 - span(t, STRIKE - 120, STRIKE);
    // A stomp ring when the hero plants their feet under the weight.
    const stomp = span(t, CHARGE + 40, CHARGE + 520);
    if (stomp > 0 && stomp < 1) {
      c.save(); c.translate(150, 184); c.scale(1, .22);
      c.globalAlpha = 1 - stomp; c.strokeStyle = WHITE; c.lineWidth = 2;
      c.beginPath(); c.arc(0, 0, 10 + stomp * 120, 0, Math.PI * 2); c.stroke(); c.restore();
    }
    // Wind streaks converge from both sides onto points along the blade.
    for (let i = 0; i < 70 * dense; i++) {
      const life = ((w - RAISE) / (420 + rand(i, 90) * 380) + rand(i, 91)) % 1;
      const side = i % 2 ? 1 : -1, f = 20 + rand(i, 92) * len * .85;
      const d = (1 - life) ** 1.6 * (140 + rand(i, 93) * 240), streak = 10 + 40 * (1 - life);
      const x = hx + dirX * f + side * d, y = hy + dirY * f + (rand(i, 94) - .5) * 50 * (1 - life);
      c.globalAlpha = power * fade * .55 * Math.sin(life * Math.PI);
      c.fillStyle = i % 3 ? SILVER : color;
      c.fillRect(side > 0 ? x : x - streak, y, streak, 1);
    }
    if (t >= CHARGE) {
      // Rings of light climb from the hilt to the tip.
      c.save(); c.translate(hx, hy); c.rotate(pose.angle);
      for (let n = 0; n < 6; n++) {
        const q = ((w - CHARGE) / 650 + n / 6) % 1, f = 24 + q * (len - 40);
        c.globalAlpha = power * fade * (1 - q) * .85; c.strokeStyle = n % 2 ? WHITE : color; c.lineWidth = 1.5;
        c.beginPath(); c.ellipse(0, -f, 8 + 26 * (1 - q * .6), 4 + 2 * (1 - q), 0, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
      // Crackling arcs leap off the blade.
      const beat = Math.floor(w / 70);
      if (beat % 3) for (let i = 0; i < 3 * dense + 1; i++) {
        const seed = beat * 7 + i, f = 40 + rand(seed, 99) * (len - 60);
        let x = hx + dirX * f, y = hy + dirY * f;
        c.globalAlpha = power * fade * .9; c.strokeStyle = i % 2 ? WHITE : color; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (rand(seed, k) - .5) * 28; y += (rand(seed, k + 9) - .5) * 28; c.lineTo(x, y); }
        c.stroke();
      }
      // Aura licks upward around the hero.
      for (let i = 0; i < 44 * dense; i++) {
        const life = ((w - CHARGE) / 620 + rand(i, 100)) % 1;
        spark(c, 150 + (rand(i, 101) - .5) * 30 + Math.sin(life * 6 + i) * 3, 183 - life * 52, .5 + .7 * (1 - life), i % 3 ? color : WHITE, power * fade * (1 - life) * .85);
      }
      // Pebbles and dust lift off the ground against gravity.
      c.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 34 * dense; i++) {
        const life = ((w - CHARGE) / (1300 + rand(i, 95) * 900) + rand(i, 96)) % 1, size = 1 + (i % 3);
        c.globalAlpha = power * fade * (1 - life); c.fillStyle = i % 2 ? '#5a4a36' : '#8a7a5a';
        c.fillRect(150 + (rand(i, 97) - .5) * 140 + Math.sin(w / 300 + i) * 3, 184 - life * 100 * (.4 + rand(i, 98)), size, size);
      }
      c.globalCompositeOperation = 'lighter';
    }
    glow(c, hx, hy, 30 + 50 * power, color, .6 * power * fade);
  }
  // The foe looks up: the blade's light spills over it from above.
  if (t >= DREAD && t < STRIKE) {
    const k = span(t, DREAD, DREAD + 300) * (1 - span(t, STRIKE - 100, STRIKE));
    glow(c, foeX - 70, foeY - 90, 150, color, .55 * k);
    glow(c, foeX - 6, foeY - 12, 26, WHITE, .25 * k * (.7 + .3 * Math.sin(w / 60)));
  }
  // The pre-hit freeze: the world drops to near-black and only the blade stays lit.
  if (t >= FREEZE && t < IMPACT) {
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = .64 * span(t, FREEZE, FREEZE + 50); c.fillStyle = '#01040a';
    c.fillRect(-1200, -2000, 3000, 2600);
    c.globalCompositeOperation = 'lighter';
  }
  // The sword: forms over the raised blade, swings with it, then breaks into light.
  if (t >= 8900 && t < IMPACT + 1100) {
    const fade = 1 - span(t, IMPACT + 400, IMPACT + 1100), formed = smoothOut(span(t, 8900, 9500));
    if (t >= STRIKE && t < IMPACT + 400) {
      const prev = Math.max(COCK, pose.angle - 1.1), trail = 1 - span(t, IMPACT, IMPACT + 400);
      for (let k = 0; k < 6; k++) {
        const a0 = prev + (pose.angle - prev) * (k / 6), a1 = prev + (pose.angle - prev) * ((k + 1) / 6);
        c.globalAlpha = (.08 + .08 * k) * trail; c.fillStyle = k > 3 ? WHITE : color;
        c.beginPath(); c.moveTo(hx, hy);
        c.arc(hx, hy, len + 10, a0 - Math.PI / 2, a1 - Math.PI / 2); c.closePath(); c.fill();
      }
      // Speed arcs ride the swing.
      c.lineWidth = 1;
      for (let i = 0; i < 18 * dense; i++) {
        const r = 50 + rand(i, 110) * (len - 30), a0 = Math.min(pose.angle, prev + rand(i, 111) * .4);
        c.globalAlpha = .55 * trail; c.strokeStyle = i % 2 ? WHITE : color;
        c.beginPath(); c.arc(hx, hy, r, a0 - Math.PI / 2, pose.angle - Math.PI / 2); c.stroke();
      }
    }
    const charged = span(t, CHARGE, STRIKE) + (t >= FREEZE && t < IMPACT ? 1 : 0);
    giantSword(c, hx, hy, pose.angle, len, fade, color);
    glow(c, hx, hy, 40 + 30 * formed + 40 * span(t, CHARGE, DREAD), color, Math.min(1, (.45 + .3 * charged) * formed * fade));
  }
  // The freeze glint: a star on the edge a hair above the foe, and a hairline across the frame.
  if (t >= FREEZE && t < IMPACT) {
    const k = span(t, FREEZE, IMPACT), f = Math.max(40, (foeX - hx) / Math.max(.2, dirX));
    const x = hx + dirX * f, y = hy + dirY * f;
    c.globalAlpha = .7; c.fillStyle = WHITE; c.fillRect(-1200, y - .5, 3000, 1);
    c.globalAlpha = .35; c.fillStyle = color; c.fillRect(x - .5, -2000, 1, 2600);
    spark(c, x, y, 2.5 + 4 * eases.out(k), WHITE, 1);
    glow(c, x, y, 20 + 30 * k, color, .8);
  }
  // Impact: a colossal tapered slash, afterimage lines, a radial burst and a storm of leaves.
  if (t >= IMPACT && t < IMPACT + 2300) {
    const k = Math.max(0, (w - W_IMPACT) / 1000);
    const cx = Math.cos(CUT), cy = Math.sin(CUT), nx = -cy, ny = cx, [ox, oy] = [FOE[0], 152];
    const reach = smoothOut(span(t, IMPACT, IMPACT + 90));
    const width = Math.max(0, 44 * (1 - k * 1.5)) + 1.5 * (1 - span(t, IMPACT + 1300, IMPACT + 2300));
    const ax = ox - cx * 700, ay = oy - cy * 700, bx = ax + cx * 1400 * reach, by = ay + cy * 1400 * reach;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    for (const [half, tint, a] of [[width * 1.3, color, .45], [width * .5, WHITE, 1]]) {
      c.globalAlpha = a; c.fillStyle = tint;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(mx + nx * half, my + ny * half);
      c.lineTo(bx, by); c.lineTo(mx - nx * half, my - ny * half); c.closePath(); c.fill();
    }
    c.lineWidth = 1;
    for (const [off, a] of [[-16, .6], [13, .5], [28, .3]]) {
      c.globalAlpha = a * Math.max(0, 1 - k * 1.2); c.strokeStyle = off < 0 ? WHITE : color;
      c.beginPath(); c.moveTo(ax + nx * off, ay + ny * off); c.lineTo(bx + nx * off, by + ny * off); c.stroke();
    }
    glow(c, foeX, foeY, 40 + 200 * k, color, Math.max(0, 1 - k * .8));
    for (let i = 0; i < 40 * dense; i++) {
      const a = rand(i, 120) * Math.PI * 2, r0 = 24 + k * 420 + rand(i, 121) * 160, r1 = r0 + 30 + rand(i, 122) * 70;
      c.globalAlpha = Math.max(0, 1 - k * 1.6) * .6; c.strokeStyle = i % 2 ? WHITE : color; c.lineWidth = 1 + (i % 2);
      c.beginPath(); c.moveTo(foeX + Math.cos(a) * r0, foeY + Math.sin(a) * r0 * .7);
      c.lineTo(foeX + Math.cos(a) * r1, foeY + Math.sin(a) * r1 * .7); c.stroke();
    }
    for (let n = 0; n < 3; n++) {
      const r = Math.min(1, k * 1.2 - n * .12) * (150 + n * 110);
      if (r <= 0 || r >= 150 + n * 110) continue;
      c.save(); c.translate(foeX, 183); c.scale(1, .26);
      c.globalAlpha = 1 - r / (150 + n * 110); c.strokeStyle = n ? color : WHITE; c.lineWidth = 3 - n;
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); c.restore();
    }
    for (let i = 0; i < 40 * dense; i++) {
      const along = (rand(i, 70) - .5) * 500;
      spark(c, ox + cx * along, oy + cy * along + k * 20 * rand(i, 71), 1.2, i % 2 ? WHITE : color, Math.max(0, 1 - k));
    }
    // Afterglow: silver motes rise slowly off the cut long after the blow.
    for (let i = 0; i < 30 * dense; i++) {
      const along = (rand(i, 123) - .5) * 600, life = (k * .6 + rand(i, 124)) % 1;
      spark(c, ox + cx * along, oy + cy * along - life * 40, .6, i % 2 ? SILVER : color, .7 * span(k, .3, .8) * (1 - life) * (1 - span(t, IMPACT + 1800, IMPACT + 2300)));
    }
    c.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 120 * dense; i++) {
      const a = rand(i, 72) * Math.PI * 2, v = 60 + rand(i, 73) * 220;
      const x = foeX + Math.cos(a) * v * k + Math.sin(w / 300 + i) * 6 * k, y = foeY + Math.sin(a) * v * k * .6 + 50 * k * k;
      if (y < 184) leaf(c, x, y, 1.8, a + w / 150, i % 3 ? '#4f8a3f' : color, Math.max(0, 1 - k * .55));
    }
    c.globalCompositeOperation = 'lighter';
  }
  // Leaves drift through every shot once the forest stands, and fall in the finale.
  c.globalCompositeOperation = 'source-over';
  const drift = (t < 2400 ? .4 : 1) * (1 - .4 * span(t, 6900, 8000));
  for (let i = 0; i < 46 * dense; i++) {
    const fall = ((w / 4800) + rand(i, 80)) % 1;
    const x = -40 + rand(i, 81) * 560 + Math.sin(w / 800 + i) * 14 - fall * 40, y = -120 + fall * 304;
    leaf(c, x, y, 1.4 + rand(i, 82), w / 400 + i, i % 4 ? '#3f7a39' : color, .8 * drift);
  }
  c.globalAlpha = 1;
}

export const forestPlan = {
  impact: IMPACT,
  duration: DURATION,
  titleAt: IMPACT + 2200,
  attack: [1400, IMPACT + 600],
  warp: forestWarp,
  shots: [
    [0, '王劍 · 銀角低鳴', [159, 166, 7.2, -.05], [159, 143, 6.6, .03], 'inOut'],
    [1400, '插地 · 王劍入土', [168, 172, 3.2, .08], [160, 166, 3.9, .02], 'out', 160],
    [2500, '異變 · 古森拔地', [240, 150, 1.15, 0], [240, 92, .82, 0], 'out'],
    [4300, '敵懼 · 樹海壓境', [338, 162, 4.0, -.07], [336, 150, 3.4, 0], 'out', 200],
    [5400, '蓄勢 · 鹿王之息', [154, 152, 7.5, .04], [152, 162, 3.0, -.07], 'inOut'],
    [6900, '異象 · 銀角神鹿', [150, 150, 2.4, 0], [150, -110, .95, 0], 'inOut'],
    [8700, '天劍 · 鹿角成刃', [205, 68, .78, -.05], [190, 42, .72, .02], 'out'],
    // Extreme low angle at the hero's feet, craning up and out as the sky sword is hoisted.
    [RAISE, '高舉 · 天劍指天', [160, 152, 4.6, -.16], [130, 72, 1.0, -.05], 'out'],
    // Tight Dutch-angle push-in on the hero and the cocked blade while wind pours in.
    [CHARGE, '蓄勢 · 風壓萬鈞', [166, 150, 3.4, .12], [158, 150, 4.8, .17], 'inOut', 140],
    [DREAD, '威壓 · 天劍臨頭', [340, 160, 4.2, -.1], [334, 152, 4.8, -.05], 'out', 120],
    // The camera tracks the blade from the raised sword down onto the foe.
    [STRIKE, '裁決 · 一刀兩斷', [125, 35, .95, -.12], [300, 134, 2.1, .08], 'in', 90],
    [FREEZE, '停格 · 刃落一瞬', [312, 138, 2.5, .07], [318, 140, 2.9, .04], 'out'],
    [IMPACT, '命中 · 森冠斷海', [338, 150, 4.6, -.06], [358, 150, 3.3, .02], 'out'],
    [IMPACT + 800, '殘光 · 樹海兩分', [320, 120, 1.6, 0], [250, 108, .95, 0], 'inOut'],
    [IMPACT + 2100, '終幕 · 森冠裁決', [215, 122, 1.55, 0], [215, 128, 1.7, 0], 'smooth']
  ],
  close: [[0, 2500], [4300, 6900], [CHARGE, STRIKE], [FREEZE, IMPACT + 800]],
  lines: [['v', 2400, 3900], ['spin', 5700, 6900], ['h', CHARGE, STRIKE], ['zoom', STRIKE, FREEZE]],
  flashes: [
    [2050, 280, .55, 'color'], [7880, 200, .3, '#ffffff'], [9500, 180, .35, 'color'],
    [CHARGE + 40, 160, .25, 'color'], [FREEZE, 110, .85, '#ffffff'], [IMPACT, 750, 1, '#f6fff0']
  ],
  shake(t) {
    let s = 0;
    if (t >= 2050) s += 7 * Math.exp(-(t - 2050) / 220);
    if (t >= 2300 && t < 4300) s += 1.6 * (1 - span(t, 3600, 4300));
    for (const stepAt of [7350, 7850]) if (t >= stepAt) s += 3.5 * Math.exp(-(t - stepAt) / 180);
    if (t >= 8700 && t < CHARGE) s += span(t, 8700, CHARGE) * 1.6;
    if (t >= CHARGE && t < STRIKE) s += 1.6 + 3.4 * span(t, CHARGE, STRIKE) + 4 * Math.exp(-Math.max(0, t - CHARGE - 40) / 160);
    if (t >= STRIKE && t < FREEZE) s += 3.5;
    // Dead still during the freeze, so the impact lands with the heaviest shake of the spell.
    if (t >= FREEZE && t < IMPACT) s = 0;
    if (t >= IMPACT) s += 15 * Math.exp(-(t - IMPACT) / 420);
    return s;
  },
  pose: (t, w) => ({ hero: heroPose(t), foe: foePose(t, w) }),
  subtitle: '— 銀 角 為 證 ・ 樹 海 俱 斷 —',
  back: drawBack,
  front: drawFront
};
