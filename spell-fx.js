// Shared drawing helpers for the spell cinematics (world-space, scene.js coordinates).
export const HAND = [159, 163];
export const FOE = [330, 178];
export const HERO = [150, 178];
export const duration = 11600;

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const span = (t, a, b) => clamp((t - a) / (b - a));
export const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
export const eases = {
  smooth: k => k * k * (3 - 2 * k),
  out: k => 1 - (1 - k) ** 3,
  in: k => k * k * k,
  inOut: k => k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2
};
export const rand = (i, s = 0) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export function spark(c, x, y, size, color, alpha = 1) {
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.fillRect(x - size * 2, y - size * .25, size * 4, size * .5);
  c.fillRect(x - size * .25, y - size * 2, size * .5, size * 4);
  c.fillStyle = '#fff8e6';
  c.fillRect(x - size * .4, y - size * .4, size * .8, size * .8);
}

export function glow(c, x, y, r, color, alpha) {
  if (alpha <= 0 || r <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, '#fff8e6'); g.addColorStop(.3, color); g.addColorStop(1, '#00000000');
  c.globalAlpha = alpha; c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

// Runic circle drawn as a flattened ellipse on the ground.
export function sigil(c, x, y, radius, turn, color, alpha) {
  if (alpha <= 0) return;
  c.save();
  c.translate(x, y); c.scale(1, .3);
  c.strokeStyle = color; c.globalAlpha = alpha;
  for (const [r, w] of [[radius, 1.4], [radius * .78, .7], [radius * .45, .9]]) {
    c.lineWidth = w; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
  }
  c.lineWidth = .8; c.beginPath();
  for (let i = 0; i <= 5; i++) {
    const a = turn + i * Math.PI * 4 / 5;
    c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * radius * .78, Math.sin(a) * radius * .78);
  }
  c.stroke();
  c.fillStyle = color;
  for (let i = 0; i < 24; i++) {
    const a = -turn * 1.6 + i * Math.PI / 12, r = radius * .89;
    c.fillRect(Math.cos(a) * r - 1, Math.sin(a) * r - (i % 3 ? 1 : 3), 2, i % 3 ? 2 : 6);
  }
  c.restore();
}


// A short hit-stop: time nearly freezes for a beat when the spell connects.
export const warp = (t, impact) => t < impact ? t : t < impact + 260 ? impact + (t - impact) * .12 : t - 229;

export function cameraAt(plan, t, reduced) {
  const { shots } = plan;
  const index = shots.findLastIndex(shot => t >= shot[0]);
  const shot = shots[index], end = shots[index + 1]?.[0] ?? plan.duration ?? duration;
  if (reduced) return { shot, cam: [240, 126, 1.1, 0], whip: 0 };
  let cam = mix(shot[2], shot[3], eases[shot[4]](span(t, shot[0], end)));
  let whip = 0;
  if (shot[5] && t - shot[0] < shot[5]) {
    const k = (t - shot[0]) / shot[5];
    cam = mix(shots[index - 1][3], cam, eases.inOut(k));
    whip = Math.sin(k * Math.PI);
  }
  // Handheld tremble that swells with the spell's power.
  const shake = plan.shake(t);
  cam[0] += (Math.sin(t * .091) + Math.sin(t * .23) * .5) * shake / cam[2];
  cam[1] += (Math.cos(t * .077) + Math.sin(t * .19) * .5) * shake / cam[2];
  return { shot, cam, whip };
}

export function polygon(c, color, points) {
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i < points.length; i += 2) {
    if (i === 0) c.moveTo(points[i], points[i + 1]);
    else c.lineTo(points[i], points[i + 1]);
  }
  c.closePath(); c.fill();
}

export function oval(c, x, y, rx, ry, color) {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

// Shared drawing and timing primitives for the legendary plans. Positions are world pixels.
export const smooth = (t, a, b) => eases.smooth(span(t, a, b));
export function stroke(c, color, width, points) {
  c.strokeStyle = color; c.lineWidth = width;
  c.beginPath(); c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.stroke();
}
export function skyWash(c, top, horizon, alpha) {
  c.save(); c.globalAlpha = alpha;
  const sky = c.createLinearGradient(0, -65, 0, 185);
  sky.addColorStop(0, top); sky.addColorStop(1, horizon);
  c.fillStyle = sky; c.fillRect(-1000, -1000, 2400, 2000); c.restore();
}

// The clock holds for the last fraction before contact and resumes continuously after hit-stop.
export function heldClock(hold, hit, stop = 240) {
  return t => Math.min(t, hold) + .025 * Math.max(0, Math.min(hit, t) - hold)
    + .12 * Math.max(0, Math.min(t - hit, stop)) + Math.max(0, t - hit - stop);
}

export function heroKeys(keys, t) {
  const i = keys.findLastIndex(key => key[0] <= t);
  const a = keys[i], b = keys[i + 1] ?? a;
  const k = a === b ? 0 : smooth(t, a[0], b[0]);
  return { dx: a[1] + (b[1] - a[1]) * k, dy: a[2] + (b[2] - a[2]) * k,
    angle: a[3] + (b[3] - a[3]) * k };
}

export function recoil(age, fear, distance, height, reduced) {
  const k = span(age, 0, 800), force = reduced ? .34 : 1;
  return { dx: 4 * fear + force * distance * (eases.out(k) - .25 * smooth(age, 820, 1600)),
    dy: -force * height * Math.sin(k * Math.PI), tilt: -.12 * fear + force * .45 * eases.out(k) };
}
