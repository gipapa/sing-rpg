import { HAND, FOE, span, clamp, mix, eases, rand, spark, glow, sigil } from './spell-fx.js';

// 滄海王令: a retreating sea crowns its bearer, becomes a three-pronged lance,
// then opens a bright passage through the waves with one decisive thrust.
const CALL = 1100, SURGE = 2200, CROWN = 5500, FORM = 7000, RAISE = 8000;
const CHARGE = 9000, DREAD = 10200, STRIKE = 10800, FREEZE = 11250, IMPACT = 11650;
const DURATION = IMPACT + 3700, WHITE = '#f1ffff', PEARL = '#cceff2';
const AIM = 1.51;

// Both the pre-contact pause and the hit-stop are continuous, including sub-ms samples.
const tideWarp = t => t < FREEZE ? t : t < IMPACT ? FREEZE + (t - FREEZE) * .05
  : FREEZE + (IMPACT - FREEZE) * .05 + Math.min(t - IMPACT, 280) * .1 + Math.max(0, t - IMPACT - 280);
const W_IMPACT = tideWarp(IMPACT);
const overshoot = k => 1 + 2.4 * (k - 1) ** 3 + 1.4 * (k - 1) ** 2;

// Continuous anticipation → lift → draw-back → thrust → recover. Angle zero points up.
const poses = [
  [0, [0, 0, 0]], [CALL, [0, 0, 0]], [1400, [-2, 3, -.12]],
  [1900, [0, -2, .08]], [SURGE, [0, 0, 0]], [4400, [0, 0, 0]],
  [5000, [-3, 3, -.15]], [CROWN, [-3, 3, -.15]], [FORM, [0, 0, -.12]],
  [RAISE, [0, 0, -.12]], [CHARGE, [-4, 1, -.28]], [DREAD, [-16, 3, AIM]],
  [STRIKE, [-16, 3, AIM]], [FREEZE, [28, -2, AIM]], [IMPACT, [28, -2, AIM]],
  [IMPACT + 150, [48, -2, AIM]], [IMPACT + 800, [40, 0, AIM]],
  [IMPACT + 2200, [4, 0, .18]], [DURATION, [4, 0, .18]]
];
function heroPose(t) {
  const i = poses.findLastIndex(([at]) => t >= at), a = poses[i], b = poses[i + 1] ?? a;
  let k = b === a ? 1 : span(t, a[0], b[0]);
  k = a[0] === STRIKE ? eases.in(k) : a[0] === RAISE ? overshoot(k) : eases.smooth(k);
  const [dx, dy, angle] = mix(a[1], b[1], k);
  return { dx, dy, angle };
}
function foePose(t, w, reduced) {
  const fear = span(t, 3600, 4300), dread = span(t, DREAD, STRIKE);
  const clock = Math.min(w, tideWarp(FREEZE));
  const before = { dx: 5 * fear + 3 * dread + (reduced ? 0 : Math.sin(clock / 45) * .6 * fear), dy: 0, tilt: -.05 * fear - .12 * dread };
  if (t < IMPACT) return before;
  const k = span(w, W_IMPACT, W_IMPACT + 850), settle = span(w, W_IMPACT + 850, W_IMPACT + 2000);
  const force = reduced ? .3 : 1;
  // Start from the exact held pose; knockback obeys the same slowed clock as the spray.
  return { dx: before.dx + force * (42 * eases.out(k) - 12 * eases.smooth(settle)),
    dy: -force * 24 * Math.sin(k * Math.PI), tilt: before.tilt + force * (.65 * eases.out(k) - .3 * settle) };
}
function lengthAt(t) {
  const grown = 260 * eases.out(span(t, FORM, RAISE + 300));
  return grown - 128 * eases.smooth(span(t, CHARGE, DREAD));
}
const handAt = pose => [HAND[0] + pose.dx, HAND[1] + pose.dy];

// Two towering water walls with steep inner faces. Each column is a vertical gradient with a
// stepped foam crest, so the mass reads as water at any zoom while staying pixel-shaped.
const wallAt = (x, far) => {
  const half = far ? 185 : 165, l = Math.exp(-(((x + 70) / half) ** 4)), r = Math.exp(-(((x - 545) / half) ** 4));
  return l + r;
};
function wallHeight(x, far, t, w) {
  const rise = eases.out(span(t, SURGE, 3500)), drain = span(t, IMPACT + 800, DURATION);
  const ripple = Math.sin(x / 23 + w / 380 + (far ? 2 : 0)) * 6 + Math.sin(x / 57 - w / 610) * 8;
  const p = wallAt(x, far);
  return Math.max(0, (22 + p * (far ? 330 : 285) + ripple * (.35 + p)) * rise * (1 - drain * .6));
}
// The thrust bores a horizontal tunnel through the right wall after contact.
const boreAt = (t, w) => t < IMPACT ? 0 : 24 * eases.out(span(w, W_IMPACT, W_IMPACT + 700)) * (1 - .5 * span(t, IMPACT + 1500, DURATION));

function waves(c, t, w, color, reduced) {
  if (t < SURGE) return;
  const rise = eases.out(span(t, SURGE, 3500));
  // Wet, reflective sea floor of the opened path.
  const floor = c.createLinearGradient(0, 176, 0, 260);
  floor.addColorStop(0, '#1c4a5c'); floor.addColorStop(1, '#061522');
  c.globalAlpha = .92 * rise; c.fillStyle = floor; c.fillRect(-640, 177, 1760, 120);
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    c.globalAlpha = .25 * rise * (.5 + .5 * Math.sin(w / 500 + i)); c.fillStyle = PEARL;
    c.fillRect(Math.round(20 + rand(i, 20) * 440), 179 + (i % 4) * 2, 6 + Math.round(rand(i, 21) * 14), 1);
  }
  c.globalCompositeOperation = 'source-over';
  for (const far of [true, false]) {
    const body = c.createLinearGradient(0, -330, 0, 186);
    // Lighter than the darkened sky at every height, so the walls read as lit water, not outlines.
    body.addColorStop(0, far ? '#6fbccb' : '#a6eef2'); body.addColorStop(.35, far ? '#2f7f98' : '#4fb4c8');
    body.addColorStop(.7, far ? '#1b5c78' : '#2a8aa3'); body.addColorStop(1, far ? '#0e3d57' : '#155a75');
    for (let x = -640; x < 1120; x += 6) {
      const h = Math.round(wallHeight(x, far, t, w));
      if (h < 1) continue;
      const y = 186 - h;
      c.globalAlpha = far ? .78 : .95; c.fillStyle = body; c.fillRect(x, y, 6, h + 300);
      // Stepped foam crest with ragged drips below it.
      c.globalAlpha = far ? .6 : .95; c.fillStyle = far ? '#a8dde3' : WHITE; c.fillRect(x, y, 6, far ? 2 : 3);
      c.globalAlpha = far ? .3 : .6; c.fillStyle = PEARL;
      c.fillRect(x + (rand(x, 22) < .5 ? 0 : 3), y + 3, 3, 2 + Math.round(rand(x, 23) * (far ? 4 : 9)));
    }
  }
  // Light bands climbing inside the near walls, like sun through moving water.
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (reduced ? 24 : 70); i++) {
    const x = rand(i, 24) < .5 ? -120 + rand(i, 25) * 200 : 400 + rand(i, 25) * 240;
    const top = 186 - wallHeight(x, false, t, w), q = (w / 2600 + rand(i, 26)) % 1, y = 186 - q * (186 - top);
    if (y < top + 6) continue;
    c.globalAlpha = .28 * rise * Math.sin(q * Math.PI); c.fillStyle = i % 3 ? PEARL : color;
    c.fillRect(Math.round(x), Math.round(y), 8 + Math.round(rand(i, 27) * 18), 1);
  }
  // Spray flung inward off the inner crests.
  for (let i = 0; i < (reduced ? 16 : 50); i++) {
    const side = i % 2 ? 1 : -1, x0 = side < 0 ? 70 + rand(i, 28) * 40 : 380 + rand(i, 28) * 40;
    const life = ((w - SURGE) / (700 + rand(i, 29) * 500) + rand(i, 30)) % 1;
    const y0 = 186 - wallHeight(x0, false, t, w);
    c.globalAlpha = .8 * rise * (1 - life); c.fillStyle = i % 4 ? PEARL : WHITE;
    c.fillRect(Math.round(x0 - side * life * 40), Math.round(y0 - 18 * life + 70 * life * life), 2, 2);
  }
  // The bored tunnel: a light-filled passage through the right wall.
  const bore = boreAt(t, w);
  if (bore > 0) {
    const fade = 1 - .6 * span(t, IMPACT + 1500, DURATION);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = .95; c.fillStyle = '#0a2c3e'; c.fillRect(392, 153 - bore, 728, bore * 2);
    c.globalCompositeOperation = 'lighter';
    const core = c.createLinearGradient(0, 153 - bore, 0, 153 + bore);
    core.addColorStop(0, '#00000000'); core.addColorStop(.5, color); core.addColorStop(1, '#00000000');
    c.globalAlpha = .55 * fade; c.fillStyle = core; c.fillRect(392, 153 - bore, 728, bore * 2);
    c.globalAlpha = .9 * fade; c.fillStyle = WHITE;
    c.fillRect(392, 152 - bore, 728, 2); c.fillRect(392, 152 + bore, 728, 2);
    // The horizon line of the parted sea.
    c.globalAlpha = .5 * fade * (1 - span(t, IMPACT + 2400, DURATION)); c.fillRect(-640, 152.5, 1760, 1);
  }
  c.globalCompositeOperation = 'source-over';
}

// An original sea-crown apparition made of luminous water: a bright rim and hollow centre,
// a pearl band, three glowing peak pearls and curtains of water pouring from its base.
function seaCrown(c, t, w, color, reduced) {
  let alpha = span(t, CROWN, CROWN + 600) * (1 - span(t, FORM + 500, RAISE));
  alpha += .22 * span(t, IMPACT + 2100, IMPACT + 2800);
  if (alpha <= 0) return;
  const rise = eases.out(span(t, CROWN, CROWN + 900));
  // Keep the crown readable in the fixed reduced-motion view and the closing medium.
  const small = reduced || t >= IMPACT + 2100;
  // During the forming beat the whole crown shrinks down onto the trident's head, so it is
  // never left as a half-framed slab: the crown visibly becomes the weapon.
  const pose = heroPose(t), [hx, hy] = handAt(pose), len = lengthAt(t), sink = eases.inOut(span(t, FORM, FORM + 800));
  const headX = hx + Math.sin(pose.angle) * len * .85, headY = hy - Math.cos(pose.angle) * len * .85 + 10;
  const size = small ? 1.1 : 3.2 + (.35 - 3.2) * sink;
  c.save();
  c.translate(small ? 155 : 155 + (headX - 155) * sink, small ? 145 - 20 * rise : 150 - 150 * rise + (headY - 0) * sink);
  c.scale(size, size);
  const shape = () => {
    c.beginPath(); c.moveTo(-44, 0); c.lineTo(-51, -43); c.lineTo(-31, -28);
    c.lineTo(-26, -64); c.lineTo(-12, -36); c.lineTo(0, -82);
    c.lineTo(12, -36); c.lineTo(26, -64); c.lineTo(31, -28);
    c.lineTo(51, -43); c.lineTo(44, 0); c.closePath();
  };
  const body = c.createLinearGradient(0, -82, 0, 4);
  body.addColorStop(0, WHITE); body.addColorStop(.3, PEARL); body.addColorStop(.7, color); body.addColorStop(1, '#2a7f96');
  c.globalAlpha = alpha * .9; c.fillStyle = body; shape(); c.fill();
  // Hollow centre gives the rim thickness and depth.
  c.save(); c.translate(0, -4); c.scale(.74, .7);
  c.globalAlpha = alpha * .45; c.fillStyle = '#1f6f88'; shape(); c.fill();
  c.restore();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = alpha; c.strokeStyle = WHITE; c.lineWidth = .8; shape(); c.stroke();
  // Rising shimmer inside the crown.
  for (let i = 0; i < 12; i++) {
    const q = (w / 1600 + i / 12) % 1;
    c.globalAlpha = alpha * .35 * Math.sin(q * Math.PI); c.fillStyle = PEARL;
    c.fillRect(-28 + rand(i, 31) * 50, -6 - q * 40, 6 + rand(i, 32) * 8, .6);
  }
  // Pearl band.
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = alpha; c.fillStyle = color; c.fillRect(-46, -3, 92, 5);
  for (let x = -42; x <= 42; x += 4) {
    c.fillStyle = PEARL; c.fillRect(x - 1.5, -2.5, 3.4, 4);
    c.fillStyle = WHITE; c.fillRect(x - 1, -2, 1.2, 1.2);
  }
  c.globalCompositeOperation = 'lighter';
  for (const [x, y] of [[-26, -64], [0, -82], [26, -64]]) {
    glow(c, x, y, 12, color, alpha * .9);
    spark(c, x, y, 1.6, WHITE, alpha);
  }
  // Water curtains pour from the base and fall away.
  for (let i = 0; i < (reduced ? 8 : 22); i++) {
    const q = (w / 1100 + rand(i, 33)) % 1;
    c.globalAlpha = alpha * (1 - q) * .6; c.fillStyle = i % 3 ? color : PEARL;
    c.fillRect(-42 + i * 4, 3 + q * 50, 1.4, 5 + q * 14);
  }
  c.restore();
  c.globalCompositeOperation = 'source-over';
}

// Columns of water spiral up from both walls to raise the crown.
function crownStreams(c, t, w, color, reduced) {
  const k = span(t, CROWN - 200, CROWN + 900) * (1 - span(t, CROWN + 900, CROWN + 1400));
  if (k <= 0) return;
  c.globalCompositeOperation = 'lighter';
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? 40 : 430, y0 = 186 - wallHeight(x0, false, t, w), x1 = 155 + side * 120, y1 = 40;
    for (let i = 0; i < (reduced ? 20 : 60); i++) {
      const q = ((w - CROWN) / 900 + i / 60) % 1, wob = Math.sin(q * 12 + i) * 8;
      const x = x0 + (x1 - x0) * q + wob, y = y0 + (y1 - y0) * q - Math.sin(q * Math.PI) * 60;
      c.globalAlpha = k * (1 - q * .5) * .8; c.fillStyle = i % 4 ? color : WHITE;
      c.fillRect(Math.round(x), Math.round(y), 3, 3);
    }
  }
  c.globalCompositeOperation = 'source-over';
}

// A shaded pixel trident: dark outline, pearl body, white core, barbed prongs, a soft halo
// across the weapon and (while charging) a double helix of water around the shaft.
function trident(c, hx, hy, angle, len, color, alpha, w = 0, helix = 0) {
  if (len <= 0 || alpha <= 0) return;
  c.save(); c.translate(hx, hy); c.rotate(angle);
  const wide = 8 + len * .045, head = Math.min(52, len * .3), shaft = Math.max(1.5, len * .016), base = -len + head;
  const ink = '#245a6e';
  c.globalCompositeOperation = 'lighter';
  const halo = c.createLinearGradient(-wide * 1.9, 0, wide * 1.9, 0);
  halo.addColorStop(0, '#00000000'); halo.addColorStop(.5, color); halo.addColorStop(1, '#00000000');
  c.globalAlpha = .3 * alpha; c.fillStyle = halo; c.fillRect(-wide * 1.9, -len - 8, wide * 3.8, len + 20);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = alpha;
  // Shaft.
  c.fillStyle = ink; c.fillRect(-shaft - 1, base - 2, shaft * 2 + 2, len - head + 14);
  c.fillStyle = PEARL; c.fillRect(-shaft, base - 2, shaft * 2, len - head + 14);
  c.fillStyle = WHITE; c.fillRect(-shaft * .3, base - 2, Math.max(1, shaft * .6), len - head + 14);
  c.fillStyle = color;
  for (let y = 10; y < len - head; y += 20) c.fillRect(-shaft - 1.5, -y, shaft * 2 + 3, 2);
  // Crossbar with upturned ends.
  c.fillStyle = ink; c.fillRect(-wide - 3, base - 1, wide * 2 + 6, 6);
  c.fillStyle = PEARL; c.fillRect(-wide - 2, base, wide * 2 + 4, 4);
  for (const side of [-1, 1]) { c.fillStyle = PEARL; c.fillRect(side * (wide + 1) - 1.5, base - 6, 3, 7); }
  // Prongs with points and outward barbs.
  for (const side of [-1, 0, 1]) {
    const x = side * wide, tip = -len + (side ? 12 : 0), sgn = side || 1;
    c.fillStyle = ink; c.fillRect(x - 3, tip + 9, 6, base - tip - 9);
    c.fillStyle = PEARL; c.fillRect(x - 2, tip + 9, 4, base - tip - 9);
    c.fillStyle = WHITE; c.fillRect(x - .5, tip + 10, 1, base - tip - 12);
    c.beginPath(); c.moveTo(x, tip); c.lineTo(x + 4, tip + 13); c.lineTo(x - 4, tip + 13); c.closePath(); c.fill();
    c.fillStyle = PEARL;
    c.beginPath(); c.moveTo(x + sgn * 3, tip + 11); c.lineTo(x + sgn * 8, tip + 19); c.lineTo(x + sgn * 3, tip + 18); c.closePath(); c.fill();
  }
  c.globalCompositeOperation = 'lighter';
  glow(c, 0, base + 2, 10 + wide * .5, color, alpha * .8);
  spark(c, 0, base + 2, 1.4, WHITE, alpha);
  if (helix > 0) for (let k = 4; k < len - head; k += 3) {
    for (const strand of [0, Math.PI]) {
      const phase = k / 13 - w / 90 + strand, off = Math.sin(phase) * wide * .9;
      c.globalAlpha = helix * alpha * (.35 + .4 * Math.cos(phase) ** 2); c.fillStyle = Math.cos(phase) > 0 ? WHITE : color;
      c.fillRect(off - 1, -k, 2, 2);
    }
  }
  c.restore();
}

function drawBack(c, t, w, { color, reduced }) {
  c.save();
  c.globalAlpha = .18 + .58 * span(t, SURGE, 3500); c.fillStyle = '#021827';
  c.fillRect(-1200, -2000, 3000, 3000);
  waves(c, t, w, color, reduced);
  crownStreams(c, t, w, color, reduced);
  seaCrown(c, t, w, color, reduced);
  c.globalCompositeOperation = 'lighter';
  const tide = span(t, CALL, SURGE) * (1 - span(t, IMPACT + 1700, DURATION));
  sigil(c, 150, 183, 24 + 75 * span(t, CALL, CROWN), w / 1800, color, tide * .65);
  for (let i = 0; i < (reduced ? 12 : 40); i++) {
    const q = (w / 3800 + rand(i, 1)) % 1;
    c.globalAlpha = .3 * tide * (1 - q); c.fillStyle = PEARL;
    c.fillRect(Math.round(-160 + rand(i, 2) * 800), Math.round(180 - q * 480), 1, 2);
  }
  c.restore(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}

function drawFront(c, t, w, { color, reduced }) {
  const dense = reduced ? .3 : 1, pose = heroPose(t), [hx, hy] = handAt(pose);
  const len = lengthAt(t), dx = Math.sin(pose.angle), dy = -Math.cos(pose.angle);
  c.save(); c.globalCompositeOperation = 'lighter';
  // The three original weapon tips are introduced in sequence, attached to the real grip.
  if (t < CALL + 300) {
    for (const [i, x, y] of [[0, -3, -32], [1, 1, -35], [2, 5, -32]]) {
      const a = span(t, 120 + i * 170, 400 + i * 170) * (1 - span(t, CALL, CALL + 300));
      spark(c, hx + x, hy + y, .8 + a, WHITE, a);
      glow(c, hx + x, hy + y, 9, color, a * .4);
    }
  }
  if (t >= 1400 && t < 2500) {
    const q = span(t, 1400, 2500);
    c.globalAlpha = 1 - q; c.strokeStyle = WHITE; c.lineWidth = 2;
    c.beginPath(); c.ellipse(150, 183, 10 + q * 150, 3 + q * 30, 0, 0, Math.PI * 2); c.stroke();
    glow(c, hx, hy, 12 + q * 30, color, .65 * (1 - q));
  }
  if (t >= 4400 && t < FORM) {
    const power = span(t, 4400, 5000) * (1 - span(t, CROWN + 800, FORM));
    for (let i = 0; i < 42 * dense; i++) {
      const q = ((w - 4400) / 1000 + rand(i, 3)) % 1, a = i * 2.4 + q * 4;
      const r = (1 - q) * 55;
      spark(c, hx + Math.cos(a) * r, hy + Math.sin(a) * r * .6, .7, color, power * q);
    }
    spark(c, 156 + pose.dx, 152 + pose.dy, 1.4, WHITE, power);
  }
  // The crown condenses into three streams and joins the hand-held weapon.
  if (t >= FORM && t < RAISE + 500) {
    for (let i = 0; i < 54 * dense; i++) {
      const q = span(t, FORM + rand(i, 4) * 500, RAISE + rand(i, 4) * 500);
      const sx = 155 + ((i % 3) - 1) * 88, sy = -260 + rand(i, 5) * 100;
      const x = hx + dx * len * rand(i, 6), y = hy + dy * len * rand(i, 6);
      spark(c, sx + (x - sx) * q + Math.sin(q * Math.PI) * 35, sy + (y - sy) * q,
        1.3, i % 3 ? color : WHITE, Math.sin(q * Math.PI));
    }
  }
  if (t >= CHARGE && t < STRIKE) {
    const pressure = span(t, CHARGE, DREAD), fade = 1 - span(t, STRIKE - 100, STRIKE);
    for (let i = 0; i < 66 * dense; i++) {
      const q = ((w - CHARGE) / 700 + rand(i, 7)) % 1;
      const along = 15 + rand(i, 8) * Math.max(0, len - 25), a = q * Math.PI * 4 + i % 3 * Math.PI * 2 / 3;
      const r = (1 - q) * (20 + pressure * 45);
      const x = hx + dx * along + Math.cos(pose.angle) * Math.cos(a) * r;
      const y = hy + dy * along + Math.sin(pose.angle) * Math.cos(a) * r;
      spark(c, x, y, .7 + q, i % 3 ? color : WHITE, fade * pressure * q * .8);
    }
    c.save(); c.translate(hx, hy); c.rotate(pose.angle);
    for (let n = 0; n < 5; n++) {
      const q = ((w - CHARGE) / 850 + n / 5) % 1;
      c.globalAlpha = .6 * pressure * fade * Math.sin(q * Math.PI); c.strokeStyle = color; c.lineWidth = 1;
      c.beginPath(); c.ellipse(0, -len * q, 28 * (1 - q) + 5, 5, 0, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
    glow(c, hx, hy, 22 + pressure * 30, color, pressure * fade * .55);
  }
  if (t >= DREAD && t < STRIKE) {
    const a = span(t, DREAD, DREAD + 200) * (1 - span(t, STRIKE - 100, STRIKE));
    glow(c, FOE[0] - 10, 152, 40, color, a * .6);
  }
  // Freeze darkness is drawn before the lit weapon. Everything moving uses warped time.
  if (t >= FREEZE && t < IMPACT) {
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = .73 * span(t, FREEZE, FREEZE + 60);
    c.fillStyle = '#010b15'; c.fillRect(-1200, -2000, 3000, 3000);
    c.globalCompositeOperation = 'lighter';
  }
  if (t >= FORM && t < IMPACT + 1100) {
    const fade = 1 - span(t, IMPACT + 350, IMPACT + 1100);
    if (t >= STRIKE && t < IMPACT) {
      const moved = span(t, STRIKE, FREEZE);
      for (let n = 1; n <= (reduced ? 1 : 4); n++) {
        trident(c, hx - moved * n * 9, hy, pose.angle, len, color, .11 * (1 - n / 5));
      }
    }
    trident(c, hx, hy, pose.angle, len, color, fade, w, span(t, CHARGE, DREAD) * (1 - span(t, STRIKE, STRIKE + 200)));
    if (t >= FREEZE && t < IMPACT) {
      const x = hx + dx * len, y = hy + dy * len;
      spark(c, x, y, 3.5, WHITE, 1); glow(c, x, y, 22, color, .75);
      c.globalAlpha = .65; c.fillStyle = WHITE; c.fillRect(x - 22, y, 45, .6);
    }
  }
  if (t >= IMPACT && t < IMPACT + 2400) {
    const k = Math.max(0, (w - W_IMPACT) / 1000), fade = 1 - span(k, .25, 1.8);
    // Three prongs, one release: coloured beams with thin white cores, so the shape stays
    // readable instead of whiting out the frame. All fronts start at the warped contact time.
    for (const n of [-1, 0, 1]) {
      const y = 153 + n * 12, reach = 160 + eases.out(span(k, 0, .24)) * 700;
      for (const [wd, tint, a] of [[(n ? 3 : 5) * (1 - span(k, 0, .9)), color, .45], [(n ? 1 : 2) * (1 - span(k, 0, .7)), WHITE, 1]]) {
        if (wd <= 0) continue;
        c.globalAlpha = fade * a * (n ? .8 : 1); c.fillStyle = tint;
        c.beginPath(); c.moveTo(150, y); c.lineTo(FOE[0], y - wd);
        c.lineTo(FOE[0] + reach, y); c.lineTo(FOE[0], y + wd); c.closePath(); c.fill();
      }
    }
    for (let n = 0; n < 3; n++) {
      const q = span(k, n * .09, .9 + n * .09);
      c.globalAlpha = (1 - q) * fade * .85; c.strokeStyle = n ? color : WHITE; c.lineWidth = 3 - n * .7;
      c.beginPath(); c.ellipse(FOE[0] + q * 65, 153, 3 + q * 38, 4 + q * (140 + n * 35), 0, 0, Math.PI * 2); c.stroke();
    }
    glow(c, FOE[0], 153, 20 + k * 80, color, fade * .3);
    // The water answers: a cone of heavy droplets bursts out behind the foe and falls.
    c.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 150 * dense; i++) {
      const a = (rand(i, 9) - .5) * 1.7, speed = 60 + rand(i, 10) * 280, size = 1 + (i % 3);
      const x = FOE[0] + 10 + Math.cos(a) * speed * k * 1.1;
      const y = 153 + Math.sin(a) * speed * k * .8 + 110 * k * k;
      if (y > 186) continue;
      c.globalAlpha = clamp(1 - k * .7); c.fillStyle = i % 4 ? PEARL : color;
      c.fillRect(Math.round(x), Math.round(y), size, size + (i % 2));
    }
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40 * dense; i++) {
      const a = rand(i, 34) * Math.PI * 2, speed = 40 + rand(i, 35) * 160;
      spark(c, FOE[0] + Math.cos(a) * speed * k, 153 + Math.sin(a) * speed * k * .6, .7, i % 3 ? color : WHITE, clamp(1 - k * 1.1));
    }
  }
  // After the blow the walls shed water: a fine rain falls across the frame.
  if (t >= IMPACT + 500) {
    const rain = span(t, IMPACT + 500, IMPACT + 1200) * (1 - span(t, IMPACT + 2600, DURATION));
    for (let i = 0; i < 50 * dense; i++) {
      const q = (w / 1300 + rand(i, 36)) % 1;
      c.globalAlpha = .55 * rain; c.fillStyle = PEARL;
      c.fillRect(Math.round(-60 + rand(i, 37) * 600), Math.round(-120 + q * 310), 1, 4);
    }
  }
  // Gentle foam in the closing shot; much sparser in reduced motion.
  if (t >= SURGE) for (let i = 0; i < 24 * dense; i++) {
    const q = ((w - SURGE) / 4000 + rand(i, 12)) % 1;
    c.globalAlpha = .45 * Math.sin(q * Math.PI); c.fillStyle = PEARL;
    c.fillRect(Math.round(-80 + rand(i, 13) * 640 + q * 15), Math.round(-150 + q * 330), 1, 3);
  }
  c.restore(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}

export const tidePlan = {
  impact: IMPACT, duration: DURATION, titleAt: IMPACT + 2200, attack: [CALL, IMPACT + 800],
  warp: tideWarp,
  shots: [
    [0, '戟銘 · 白潮甦醒', [160, 142, 6.8, -.04], [160, 133, 6.2, .03], 'inOut'],
    [CALL, '號令 · 一戟喚潮', [153, 148, 3.4, .1], [151, 136, 2.8, .04], 'out', 140],
    [SURGE, '退潮 · 海路開闢', [240, 112, 1.15, 0], [240, 65, .78, -.02], 'inOut'],
    [3600, '敵懼 · 白浪封岸', [336, 163, 4, -.08], [338, 164, 4.5, -.03], 'out'],
    [4400, '凝神 · 掌中潮眼', [154, 152, 7, .04], [150, 158, 3.2, -.06], 'inOut'],
    [CROWN, '海冠 · 萬潮俯首', [150, 130, 2, 0], [155, -118, .82, .02], 'out'],
    [FORM, '化戟 · 三鋒擎海', [185, 55, .8, -.04], [165, 50, .74, .02], 'out'],
    [RAISE, '擎潮 · 戟舉天門', [150, 160, 4.6, -.14], [148, 120, .96, -.04], 'out'],
    [CHARGE, '蓄壓 · 滄海歸鋒', [143, 149, 3.2, .08], [137, 151, 4.4, .13], 'inOut'],
    [DREAD, '威壓 · 三鋒鎖命', [336, 163, 4.2, -.09], [338, 164, 4.8, -.04], 'out'],
    [STRIKE, '突進 · 王令破浪', [150, 150, 1.6, -.08], [299, 151, 2.5, .03], 'in', 90],
    [FREEZE, '靜海 · 鋒前一瞬', [321, 153, 3.1, .03], [323, 153, 3.3, .015], 'out'],
    [IMPACT, '貫穿 · 白潮天決', [345, 151, 3.4, -.05], [362, 150, 2.5, .02], 'out'],
    [IMPACT + 800, '餘潮 · 海天一線', [320, 120, 1.6, .02], [250, 68, .94, 0], 'inOut'],
    [IMPACT + 2100, '終幕 · 滄海王令', [230, 122, 1.35, 0], [225, 127, 1.5, 0], 'smooth']
  ],
  close: [[0, SURGE], [3600, CROWN], [CHARGE, STRIKE], [FREEZE, IMPACT + 800]],
  lines: [['v', SURGE, 3500], ['spin', 4400, CROWN], ['v', RAISE, CHARGE], ['h', CHARGE, STRIKE], ['zoom', STRIKE, FREEZE]],
  flashes: [[1400, 250, .42, 'color'], [7450, 200, .3, 'color'], [IMPACT, 260, .55, WHITE]],
  shake(t) {
    if (t >= FREEZE && t < IMPACT) return 0;
    if (t >= IMPACT) return 15 * Math.exp(-(t - IMPACT) / 330);
    if (t >= STRIKE) return 3;
    if (t >= DREAD) return 2;
    if (t >= CHARGE) return 1 + 3 * span(t, CHARGE, DREAD);
    if (t >= RAISE) return 1;
    if (t >= CROWN) return 2.5 * Math.exp(-(t - CROWN) / 700);
    if (t >= 3600) return .5;
    if (t >= SURGE) return 1.2 * (1 - span(t, SURGE, 3600));
    return t >= 1400 ? 4 * Math.exp(-(t - 1400) / 240) : 0;
  },
  pose: (t, w, reduced = false) => ({ hero: heroPose(t), foe: foePose(t, w, reduced) }),
  subtitle: '— 白潮聽令 · 三鋒開海 —', back: drawBack, front: drawFront
};
