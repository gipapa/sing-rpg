// Each score can set damage (default 6). Drawing receives progress from 0 to 1.
export const drumSpells = [
  { id: 'stars', name: '星弦落雨', duration: 1500, color: '#ffd285', count: 19, draw: stars },
  { id: 'rings', name: '月輪和鳴', duration: 1650, color: '#a1dcf2', count: 3, draw: rings },
  { id: 'petals', name: '花火旋舞', duration: 1800, color: '#f5a5bd', count: 32, draw: petals }
];
export const drumColors = [
  { id: 'original', name: '招式原色' },
  { id: 'jade', name: '翡翠綠', color: '#95edbc' },
  { id: 'violet', name: '藤花紫', color: '#c9adff' },
  { id: 'amber', name: '琥珀金', color: '#ffd285' }
];
export function drumStyle(game) {
  const spell = drumSpells.find((item) => item.id === game.drumSpell) ?? drumSpells[0];
  const tint = drumColors.find((item) => item.id === game.drumColor) ?? drumColors[0];
  return { spell, tint, color: tint.color ?? spell.color };
}

function spark(c, x, y, size) {
  x = Math.round(x);
  y = Math.round(y);
  c.fillRect(x - size, y, 2 * size + 1, 1);
  c.fillRect(x, y - size, 1, 2 * size + 1);
  c.fillStyle = '#fff5dc';
  c.fillRect(x, y, 1, 1);
}
function stars(c, p, count, color) {
  for (let i = 0; i < count; i++) {
    const t = p * 1.6 - (i % 5) * 0.10;
    if (t < 0 || t > 1.18) continue;
    const fall = Math.min(1, t);
    const x = (i * 47 % 150) - 78 + 26 * (1 - fall);
    const y = -94 + (i * 13 % 26) + 59 * fall;
    c.fillStyle = color;
    for (let j = 1; j < 6 && t < 1; j++) {
      c.fillRect(Math.round(x + j), Math.round(y - j * 2), 1, 2);
    }
    spark(c, x, y, t > 0.9 ? 3 : 1 + i % 2);
  }
}
function rings(c, p, count, color) {
  for (let ring = 0; ring < count; ring++) {
    const t = p * 1.5 - ring * 0.23;
    if (t <= 0 || t >= 1) continue;
    const radius = 13 + 72 * t;
    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * 2 * Math.PI + t * 0.7;
      const x = Math.cos(angle) * radius;
      const y = -11 - t * 50 + Math.sin(angle) * radius * 0.32 + x * 0.12;
      c.fillStyle = color;
      if (i % 12 === 0) spark(c, x, y, 2);
      else c.fillRect(Math.round(x), Math.round(y), 2, 1);
    }
  }
}
function petals(c, p, count, color) {
  for (let i = 0; i < count; i++) {
    const t = (p * 1.4 - (i % 8) * 0.05);
    if (t < 0 || t > 1) continue;
    const angle = i * 2.4 + t * 2.3;
    const x = Math.cos(angle) * (9 + 66 * t);
    const y = -10 - t * (45 + i * 7 % 40) + Math.sin(angle) * 12;
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), 3, 2);
    c.fillRect(Math.round(x) + 2, Math.round(y) - 2, 2, 3);
    if (i % 4 === 0) spark(c, x - 2, y + 3, 1);
  }
}

// The origin is at the party's feet. Keep the motif inside the portrait crop.
export function drawDrumSpell(c, style, progress, x, y, width) {
  const scale = Math.min(1, width / 185);
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.globalAlpha = Math.max(0, Math.min(1, progress * 10, (1 - progress) * 6));
  style.spell.draw(c, progress, style.spell.count, style.color);
  c.restore();
}
