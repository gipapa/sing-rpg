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

// Stepped foam edges keep the large water shapes in the game's pixel vocabulary.
function waves(c, t, w, color) {
  const rise = eases.out(span(t, SURGE, 3500)), drain = span(t, IMPACT + 800, DURATION);
  if (!rise) return;
  const split = 42 * eases.out(span(w, W_IMPACT, W_IMPACT + 1100)) * (t >= IMPACT ? 1 : 0);
  for (let layer = 0; layer < 2; layer++) {
    for (let x = -640; x < 1120; x += 8) {
      const l = Math.exp(-(((x + 40) / (125 + layer * 28)) ** 2));
      const r = Math.exp(-(((x - 465) / (125 + layer * 28)) ** 2));
      const ripple = Math.sin(x / 25 + w / 450) * 7 + Math.sin(x / 51 - w / 700) * 9;
      const h = Math.max(1, Math.round((30 + (l + r) * (290 - layer * 60) + ripple) * rise * (1 - drain * .65)));
      const y = 188 - h;
      c.globalAlpha = layer ? .87 : .75;
      c.fillStyle = layer ? '#15546b' : '#0b2a43'; c.fillRect(x, y, 8, h + 350);
      c.globalAlpha = .75; c.fillStyle = layer ? color : '#6fbbc8'; c.fillRect(x, y, 8, layer ? 3 : 2);
      if (x % 24 === 0) {
        c.globalAlpha = .24; c.fillStyle = PEARL;
        c.fillRect(x, y + 12 + Math.round(Math.sin(x) * 5), 5, Math.max(2, h * .3));
      }
    }
  }
  // A dry central approach is visible before the release; the puncture opens a second,
  // horizontal channel through both water walls after contact.
  c.globalAlpha = .9; c.fillStyle = '#122b38';
  c.beginPath(); c.moveTo(118, 178); c.lineTo(355, 178); c.lineTo(420, 260); c.lineTo(40, 260); c.fill();
  c.globalAlpha = .7; c.strokeStyle = color; c.lineWidth = 1;
  for (const side of [-1, 1]) {
    c.beginPath(); c.moveTo(235 + side * 110, 181); c.lineTo(235 + side * 195, 260); c.stroke();
  }
  if (split > 0) {
    c.globalAlpha = .9 * (1 - drain * .45); c.fillStyle = '#092437';
    c.fillRect(-640, 153 - split, 1760, split * 2);
    c.globalAlpha = .8 * (1 - drain); c.fillStyle = color;
    c.fillRect(-640, 151 - split, 1760, 2); c.fillRect(-640, 153 + split, 1760, 2);
  }
}

// An original sea-crown apparition: five surf peaks and three pearls, without a character.
function seaCrown(c, t, w, color, reduced) {
  let alpha = span(t, CROWN, CROWN + 600) * (1 - span(t, FORM, RAISE));
  alpha += .18 * span(t, IMPACT + 2100, IMPACT + 2800);
  if (alpha <= 0) return;
  const rise = eases.out(span(t, CROWN, FORM));
  // Keep the crown readable in the fixed reduced-motion view and the closing medium.
  const small = reduced || t >= IMPACT + 2100;
  c.save(); c.translate(155, small ? 145 - 20 * rise : 122 - 125 * rise);
  c.scale(small ? 1.1 : 3.4, small ? 1.1 : 3.4);
  const shape = () => {
    c.beginPath(); c.moveTo(-44, 0); c.lineTo(-51, -43); c.lineTo(-31, -28);
    c.lineTo(-26, -64); c.lineTo(-12, -36); c.lineTo(0, -82);
    c.lineTo(12, -36); c.lineTo(26, -64); c.lineTo(31, -28);
    c.lineTo(51, -43); c.lineTo(44, 0); c.closePath();
  };
  c.globalAlpha = alpha * .8; c.fillStyle = '#16475d'; shape(); c.fill();
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = alpha * .85;
  c.strokeStyle = color; c.lineWidth = 1; shape(); c.stroke();
  c.fillStyle = PEARL; c.fillRect(-43, -3, 86, 3); c.fillRect(-38, 3, 76, 2);
  for (const [x, y] of [[-26, -64], [0, -82], [26, -64]]) {
    spark(c, x, y, 1.1, WHITE, alpha);
    glow(c, x, y, 7, color, alpha * .6);
  }
  for (let i = 0; i < 14; i++) {
    const q = (w / 1400 + i / 14) % 1;
    c.globalAlpha = alpha * (1 - q) * .45; c.fillStyle = color;
    c.fillRect(-43 + i * 6, 8 + q * 45, 1, 4 + q * 10);
  }
  c.restore();
}

function trident(c, hx, hy, angle, len, color, alpha) {
  if (len <= 0 || alpha <= 0) return;
  c.save(); c.translate(hx, hy); c.rotate(angle);
  c.globalCompositeOperation = 'lighter';
  const wide = 8 + len * .045, head = Math.min(48, len * .28);
  c.globalAlpha = .2 * alpha; c.fillStyle = color; c.fillRect(-wide * 1.4, -len, wide * 2.8, len);
  c.globalAlpha = alpha; c.fillStyle = PEARL;
  c.fillRect(-2, -len + head, 4, len - head + 12);
  c.fillRect(-wide, -len + head, wide * 2, 4);
  for (const side of [-1, 0, 1]) {
    const x = side * wide, tip = -len + (side ? 10 : 0);
    c.fillStyle = color; c.fillRect(x - 2, tip + 9, 4, -len + head - tip - 5);
    c.fillStyle = WHITE;
    c.beginPath(); c.moveTo(x, tip); c.lineTo(x + 3, tip + 12); c.lineTo(x - 3, tip + 12); c.fill();
    c.fillRect(x - .6, tip + 11, 1.2, Math.max(1, head - 14));
  }
  for (let y = 18; y < len - head; y += 22) {
    c.globalAlpha = alpha * .75; c.fillStyle = color; c.fillRect(-4, -y, 8, 2);
  }
  c.restore();
}

function drawBack(c, t, w, { color, reduced }) {
  c.save();
  c.globalAlpha = .18 + .58 * span(t, SURGE, 3500); c.fillStyle = '#021827';
  c.fillRect(-1200, -2000, 3000, 3000);
  waves(c, t, w, color);
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
    trident(c, hx, hy, pose.angle, len, color, fade);
    if (t >= FREEZE && t < IMPACT) {
      const x = hx + dx * len, y = hy + dy * len;
      spark(c, x, y, 3.5, WHITE, 1); glow(c, x, y, 22, color, .75);
      c.globalAlpha = .65; c.fillStyle = WHITE; c.fillRect(x - 22, y, 45, .6);
    }
  }
  if (t >= IMPACT && t < IMPACT + 2400) {
    const k = Math.max(0, (w - W_IMPACT) / 1000), fade = 1 - span(k, .25, 1.8);
    // Three prongs, one release. All fronts start at the actual warped contact time.
    for (const n of [-1, 0, 1]) {
      const y = 153 + n * 12, width = (n ? 8 : 16) * (1 - span(k, 0, .8));
      const reach = 160 + eases.out(span(k, 0, .24)) * 700;
      c.globalAlpha = fade * (n ? .65 : 1); c.fillStyle = n ? color : WHITE;
      c.beginPath(); c.moveTo(150, y); c.lineTo(FOE[0], y - width);
      c.lineTo(FOE[0] + reach, y); c.lineTo(FOE[0], y + width); c.closePath(); c.fill();
    }
    for (let n = 0; n < 3; n++) {
      const q = span(k, n * .09, .9 + n * .09);
      c.globalAlpha = (1 - q) * fade; c.strokeStyle = n ? color : WHITE; c.lineWidth = 3 - n * .7;
      c.beginPath(); c.ellipse(FOE[0] + q * 65, 153, 3 + q * 38, 4 + q * (140 + n * 35), 0, 0, Math.PI * 2); c.stroke();
    }
    glow(c, FOE[0], 153, 35 + k * 140, color, fade * .7);
    for (let i = 0; i < 100 * dense; i++) {
      const a = rand(i, 9) * Math.PI * 2, speed = 45 + rand(i, 10) * 230;
      const x = FOE[0] + k * (80 + Math.cos(a) * speed);
      const y = 153 + Math.sin(a) * speed * k * .65 + 45 * k * k;
      spark(c, Math.round(x), Math.round(y), .6 + rand(i, 11), i % 4 ? color : WHITE, clamp(1 - k * .65));
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
    [CROWN, '海冠 · 萬潮俯首', [150, 130, 2, 0], [155, -110, .84, .02], 'inOut'],
    [FORM, '化戟 · 三鋒擎海', [185, 55, .8, -.04], [165, 50, .74, .02], 'out'],
    [RAISE, '擎潮 · 戟舉天門', [150, 160, 4.6, -.14], [148, 120, .96, -.04], 'out'],
    [CHARGE, '蓄壓 · 滄海歸鋒', [143, 149, 3.2, .08], [137, 151, 4.4, .13], 'inOut'],
    [DREAD, '威壓 · 三鋒鎖命', [336, 163, 4.2, -.09], [338, 164, 4.8, -.04], 'out'],
    [STRIKE, '突進 · 王令破浪', [150, 150, 1.6, -.08], [299, 151, 2.5, .03], 'in', 90],
    [FREEZE, '靜海 · 鋒前一瞬', [321, 153, 3.1, .03], [323, 153, 3.3, .015], 'out'],
    [IMPACT, '貫穿 · 白潮天決', [340, 153, 4.5, -.05], [358, 151, 3.1, .02], 'out'],
    [IMPACT + 800, '餘潮 · 海天一線', [320, 120, 1.6, .02], [250, 68, .94, 0], 'inOut'],
    [IMPACT + 2100, '終幕 · 滄海王令', [230, 122, 1.35, 0], [225, 127, 1.5, 0], 'smooth']
  ],
  close: [[0, SURGE], [3600, CROWN], [CHARGE, STRIKE], [FREEZE, IMPACT + 800]],
  lines: [['v', SURGE, 3500], ['spin', 4400, CROWN], ['v', RAISE, CHARGE], ['h', CHARGE, STRIKE], ['zoom', STRIKE, FREEZE]],
  flashes: [[1400, 250, .42, 'color'], [7450, 200, .3, 'color'], [IMPACT, 650, 1, WHITE]],
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
