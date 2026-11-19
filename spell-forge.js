import { FOE, span, eases, rand, glow, spark, polygon, oval } from './spell-fx.js';

const TAP = 1450, RIVER = 2100, CAST = 4550, LIFT = 6200, COMMAND = 7600;
const RELEASE = 8850, DROP = 9450, HOLD = 10080, HIT = 10450, END = 14000;
const AXIS = 305, GROUND = FOE[1], GOLD = '#ffce78', HOT = '#fff1ab';
const smooth = (t, a, b) => eases.smooth(span(t, a, b));
const out = (t, a, b) => eases.out(span(t, a, b));

// Hold just before contact. Keep the post-contact clock continuous as it returns to full speed.
function forgeTime(t) {
  return Math.min(t, HOLD) + .025 * Math.max(0, Math.min(t, HIT) - HOLD)
    + .12 * Math.max(0, Math.min(t - HIT, 240)) + Math.max(0, t - HIT - 240);
}
const contactTime = forgeTime(HIT);

function pose(t, w, reduced) {
  const wind = smooth(t, 1100, 1300), tap = smooth(t, 1300, TAP);
  const rest = smooth(t, TAP + 100, RIVER), lift = smooth(t, COMMAND, RELEASE);
  const command = smooth(t, RELEASE, DROP), recover = smooth(t, HIT + 650, END - 1200);
  const fear = smooth(t, 3450, 4250);
  const knock = span(w, contactTime, contactTime + 720);
  const recoil = (reduced ? .35 : 1) * eases.out(knock);
  return {
    hero: { dx: -3 * wind + 6 * tap - 3 * rest - 4 * lift + 10 * command - 6 * recover,
      dy: -2 * wind + 4 * tap - 2 * rest - 4 * lift + 7 * command - 3 * recover,
      angle: .24 - .8 * wind + 2.04 * tap - .95 * rest - 1.18 * lift + 2.35 * command - 1.46 * recover },
    foe: { dx: 4 * fear + recoil * (42 - 10 * smooth(w, contactTime + 730, contactTime + 1800)),
      dy: -(reduced ? 6 : 26) * Math.sin(Math.PI * knock),
      tilt: -.13 * fear + recoil * (.56 - .32 * smooth(w, contactTime + 730, contactTime + 1600)) }
  };
}

// The same split diamond is engraved on the seal, the hanging die and the ground.
function brand(c, x, y, scale, flat = 1) {
  c.save(); c.translate(x, y); c.scale(scale, scale * flat);
  polygon(c, '#612528', [0,-9, 9,0, 0,10, -9,0]);
  polygon(c, HOT, [-6,0, 0,-7, 6,0, 3,0, 0,-3, -3,0]);
  polygon(c, '#ff8b42', [-5,2, -2,2, 0,5, 2,2, 5,2, 0,8]);
  c.restore();
}

// Static basalt ridges leave a valley below the furnace. Reuse the vertices on each frame.
const basalt = [0, 1].map(layer => {
  const ridge = [];
  for (let i = 0; i <= 50; i++) {
    const x = -380 + i * 26;
    const valley = 28 * Math.exp(-((x - AXIS) ** 2) / 6200);
    const y = 108 + layer * 26 + valley + rand(i, layer + 90) * 21 + 10 * Math.sin(i * .75);
    ridge.push(x, y, x + 10, y + 2);
  }
  return [...ridge, 940, 181, -380, 181];
});

function furnace(c, t, w, reduced) {
  const night = smooth(t, 300, RIVER + 800);
  const heat = smooth(t, RIVER, CAST + 650);
  c.save();
  c.globalAlpha = .82 * night;
  const sky = c.createLinearGradient(0, -130, 0, 182);
  sky.addColorStop(0, '#161525'); sky.addColorStop(.62, '#4a2434'); sky.addColorStop(1, '#b95139');
  c.fillStyle = sky; c.fillRect(-900, -1000, 2200, 2000);
  c.restore();
  if (heat === 0) return;
  const sunY = reduced ? 69 : 45;
  c.save();
  glow(c, AXIS, sunY, 154, '#ff803e', .42 * heat);
  c.globalAlpha = heat;
  const disc = c.createLinearGradient(0, sunY - 62, 0, sunY + 62);
  disc.addColorStop(0, '#ffecaa'); disc.addColorStop(.56, '#ee935d'); disc.addColorStop(1, '#aa4844');
  oval(c, AXIS, sunY, 62, 62, disc);
  // Convection curls follow the rim of the open furnace. Break the arcs into unequal lengths.
  c.save(); c.translate(AXIS, sunY);
  for (let i = 0; i < 7; i++) {
    const r = 64 + (i % 3) * 2.5, a = i * .98 + (reduced ? 0 : w * .00007);
    c.beginPath(); c.strokeStyle = i % 2 ? '#de7950' : '#ffb66b';
    c.lineWidth = .6 + rand(i, 12) * 1.4;
    c.arc(0, 0, r, a, a + .19 + .63 * rand(i, 13)); c.stroke();
  }
  c.restore();
  basalt.forEach((ridge, layer) => polygon(c, layer ? '#482b38' : '#884d4b', ridge));
  c.restore();

  c.save();
  for (let i = 0; i < (reduced ? 9 : 34); i++) {
    const p = (rand(i, 8) + w / (2300 + 1900 * rand(i, 9))) % 1;
    const x = 62 + rand(i, 10) * 424 + 6 * Math.sin(i + p * 6);
    c.globalAlpha = heat * .8 * Math.sin(Math.PI * p);
    c.fillStyle = i % 3 ? GOLD : '#ffe399';
    c.fillRect(x, GROUND - p * (88 + 98 * rand(i, 11)), 1.2, 1.8);
  }
  c.restore();
}

const river = [[165,181],[182,179],[201,183],[211,181],[228,186],[243,180],[266,184],[282,177],[307,180],[323,178],[335,179]];
function ironRiver(c, t) {
  if (t < RIVER) return;
  const p = span(t, RIVER, 3620) * (river.length - 1);
  c.save(); c.lineJoin = 'bevel';
  for (const [width, color] of [[5, '#7e3231'], [2.5, '#ff823a'], [.8, HOT]]) {
    c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(...river[0]);
    for (let i = 1; i < river.length && i - 1 < p; i++) {
      const k = Math.min(1, p - i + 1), [x, y] = river[i - 1];
      c.lineTo(x + (river[i][0] - x) * k, y + (river[i][1] - y) * k);
    }
    c.stroke();
  }
  // Fractures branch off the channel; the travelling lip lights up as fresh ground opens.
  for (let i = 2; i < river.length - 1; i += 2) {
    const k = span(p, i - 1, i + .4);
    if (!k) continue;
    const [x, y] = river[i], side = i % 4 ? -1 : 1;
    polygon(c, '#ca613e', [x-3,y, x+5*k,y+side*4*k, x+14*k,y+side*6*k, x+6*k,y+side*2*k]);
  }
  const mark = smooth(t, 3350, CAST);
  if (mark) {
    c.globalAlpha = mark;
    oval(c, 333, GROUND + 2, 27, 4, '#a74f35');
    oval(c, 333, GROUND + 1, 23, 2.6, '#613237');
    brand(c, 333, GROUND + 1, .9, .29);
  }
  c.restore();
}

function hammerHeight(t, w, reduced, foeY) {
  const high = reduced ? 67 : -10;
  const lift = smooth(t, CAST, LIFT) * 25 + smooth(t, LIFT, COMMAND) * (76 - high);
  const fall = eases.in(span(t, DROP, HOLD));
  // The bottom bevel is 22 px below the origin. Leave a sliver of light at the
  // hold, meet the foe on the flash frame, then drive the die into the floor.
  const atContact = foeY - 22, held = atContact - 8;
  const press = out(w, contactTime, contactTime + 27);
  return 101 - lift + (held - high) * fall + (t >= HIT ? 8 : 0) + (GROUND - 22 - atContact) * press;
}

function hammer(c, t, w, reduced, foeY, art) {
  if (t < CAST || t >= HIT + 1900) return;
  const born = out(t, CAST, CAST + 520), fade = 1 - smooth(t, HIT + 750, HIT + 1900);
  const gap = 39 * (1 - smooth(t, CAST + 150, LIFT));
  const y = hammerHeight(t, w, reduced, foeY);
  // Its shadow contracts and darkens as the die approaches the ground.
  const near = smooth(y, 30, GROUND - 22);
  c.save();
  c.globalAlpha = born * fade * (.12 + near * .48);
  oval(c, AXIS + 12, GROUND + 2, 69 - 24 * near, 6 - 2 * near, '#241821');
  c.restore();
  c.save(); c.translate(AXIS, y);
  const tension = Math.sin(span(t, LIFT, COMMAND) * Math.PI);
  const loose = Math.sin(span(t, RELEASE, DROP) * Math.PI);
  c.rotate(reduced ? 0 : -.055 * tension + .035 * loose);
  const linkRelease = out(t, RELEASE, DROP + 350);
  for (const side of [-1, 1]) {
    c.save(); c.translate(side * (33 + gap + 24 * linkRelease), -14 - 100 * linkRelease);
    c.rotate(side * (.21 + .34 * linkRelease));
    c.globalAlpha = born * (1 - linkRelease);
    for (let i = 0; i < 20; i++) {
      const half = i % 2 ? 1.6 : 3.5;
      c.strokeStyle = '#382b35'; c.lineWidth = 2.6; c.beginPath(); c.ellipse(0, -i * 8, half, 5, 0, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#d49773'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, -i * 8, half, 5, 0, Math.PI, Math.PI * 1.75); c.stroke();
    }
    c.restore();
  }
  // Underside radiance melts away before the metal outline, including at impact.
  glow(c, 0, 13, 54, '#ff763a', born * fade * .47);
  c.globalAlpha = born * fade;
  if (t >= DROP && t < HOLD && !reduced) {
    const trail = span(t, DROP, HOLD) ** 2;
    for (const x of [-40,-30,19,41]) {
      polygon(c, '#c5835d', [x-1,-7, x,-11-(22+Math.abs(x))*trail, x+1,-6]);
    }
  }
  // Separate at the two sockets during casting; draw as one sprite once fused.
  const width = 116, height = width * art.height / art.width;
  const top = 22 - height;
  if (gap > .02) {
    const left = Math.round(art.width * .402), right = Math.round(art.width * .598);
    for (const [a, b, offset] of [[0, left, -gap], [left, right, 0], [right, art.width, gap]]) {
      c.drawImage(art, a, 0, b - a, art.height, -width / 2 + width * a / art.width + offset,
        top, width * (b - a) / art.width, height);
    }
  } else {
    c.drawImage(art, -width / 2, top, width, height);
  }
  c.restore();
}

function groundStrike(c, t, w, reduced) {
  if (t < HIT) return;
  const age = w - contactTime, open = out(age, 0, 340);
  const x = 331, y = GROUND + 3;
  c.save();
  oval(c, x, y + 1, 62 * open, 9 * open, '#332534');
  brand(c, x, y, 3.4 * open, .24);
  for (const side of [-1, 1]) {
    c.save(); c.translate(x, y); c.scale(side, 1);
    polygon(c, '#ff8140', [12*open,0, 35*open,-3, 50*open,0, 87*open,-4, 51*open,2, 34*open,0]);
    c.restore();
  }
  for (let i = 0; i < (reduced ? 12 : 50); i++) {
    const k = span(age, 0, 530 + rand(i, 44) * 700);
    if (k === 1) continue;
    const side = i % 2 ? 1 : -1;
    const dx = (18 + rand(i, 42) * 115) * k;
    const h = (10 + rand(i, 43) * 65) * 4 * k * (1 - k);
    const size = 1.1 + rand(i, 45) * 3.5;
    c.save(); c.translate(x + side * (10 + dx), y - h);
    c.rotate(side * k * 4); c.globalAlpha = 1 - k * k;
    polygon(c, '#523441', [-size,-size, size,-size*.5, size*.5,size, -size,size*.5]);
    c.fillStyle = GOLD; c.fillRect(-size,-size,size*1.6,1);
    c.restore();
  }
  c.restore();
}

function seal(c, t, w, reduced, art) {
  const first = 1 - smooth(t, RIVER, RIVER + 450);
  const echo = smooth(t, COMMAND - 200, COMMAND + 250) * (1 - smooth(t, RELEASE, DROP));
  if (!first && !echo) return;
  const raised = smooth(t, COMMAND, RELEASE), heat = out(t, TAP, TAP + 100);
  const x = 178 - 23 * raised, y = 162 - 36 * raised;
  c.save();
  glow(c, x, y, 14 + 6 * heat, '#fb833d', .35 * (first + echo));
  c.globalAlpha = first + echo;
  c.save(); c.translate(x,y); c.rotate(Math.PI/4);
  c.beginPath(); c.rect(-6.2,-6.2,12.4,12.4); c.clip(); c.rotate(-Math.PI/4);
  // Forge the seal into the socket at the heart of the summoned die.
  c.drawImage(art, art.width*.419, art.height*.64, art.width*.162, art.height*.26, -9,-10,18,21);
  c.restore();
  if (t < TAP) spark(c, x-5+8*span(t,0,1100), y-6, 1, GOLD, .8);
  if (t >= TAP && t < RIVER) {
    for (let i = 0; i < (reduced ? 5 : 15); i++) {
      const k = span(w, TAP, RIVER), a = rand(i, 18) * Math.PI * 2;
      const r = (7 + rand(i, 19) * 23) * k;
      spark(c, x + r*Math.cos(a), y + r*Math.sin(a) + 12*k*k, .65, GOLD, 1-k);
    }
  }
  c.restore();
}

export const forgePlan = {
  art: new URL('./assets/spells/forge-hammer.webp', import.meta.url).href,
  duration: END, impact: HIT, titleAt: 12650, subtitle: '— 一印開爐 · 千鈞落地 —',
  warp: forgeTime, pose, attack: [1100, HIT + 800],
  shots: [
    [0, '爐印 · 炭中一點金', [175,155,4.7,-.05], [173,158,6,.015], 'smooth'],
    [1100, '叩爐 · 一響開山', [160,152,3.4,-.08], [167,157,3,.04], 'out'],
    [RIVER, '地脈 · 鐵河東流', [171,164,2.4,.02], [302,161,1.5,0], 'smooth'],
    [3650, '灼影 · 足下生光', [321,162,2.8,-.04], [335,165,3.6,-.07], 'out'],
    [CAST, '鑄形 · 三鐵歸膛', [266,109,1.15,0], [287,94,1.38,-.035], 'out'],
    [LIFT, '懸鎚 · 雙鏈擎天', [287,94,1.38,-.035], [301,-24,1.56,.025], 'smooth'],
    [COMMAND, '引墜 · 持印如山', [159,148,3.05,-.08], [148,138,3.6,-.11], 'smooth'],
    [RELEASE, '脫扣 · 赤鐵失重', [296,-42,1.88,.035], [305,-25,2.1,-.035], 'out'],
    [DROP, '天墜 · 鎚逐其影', [305,-25,2.1,-.035], [316,126,1.85,0], 'in'],
    [HOLD, '懸息 · 一線未合', [320,143,2.5,.015], [321,143,2.53,.01], 'smooth'],
    [HIT, '落砧 · 爐心破土', [326,148,2.35,-.025], [346,151,1.85,.02], 'out'],
    [11250, '餘燼 · 大地留印', [346,151,1.85,.02], [264,120,1.16,0], 'out'],
    [12650, '終幕 · 熔心天墜', [264,120,1.16,0], [250,122,1.2,0], 'smooth']
  ],
  close: [[0,RIVER],[3650,CAST],[COMMAND,DROP],[HOLD,HIT+700]],
  lines: [['v', DROP, HOLD]],
  flashes: [[TAP,160,.18,'color'], [HIT,180,.36,'#ffcc83']],
  shake(t) {
    if (t >= HIT) return 8 * Math.exp(-(t - HIT) / 200);
    if (t >= HOLD) return 0;
    if (t >= RELEASE) return 1.7 * Math.exp(-(t - RELEASE) / 190);
    if (t >= LIFT) return 1.35 * Math.exp(-(t - LIFT) / 220);
    return t < TAP ? 0 : 2 * Math.exp(-(t - TAP) / 160);
  },
  back(c, t, w, { reduced, foeY, art }) {
    furnace(c, t, w, reduced);
    ironRiver(c, t);
    hammer(c, t, w, reduced, foeY, art);
  },
  front(c, t, w, { reduced, art }) {
    seal(c, t, w, reduced, art);
    groundStrike(c, t, w, reduced);
  }
};
