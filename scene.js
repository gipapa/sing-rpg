import {equipment, realms, elements} from './catalog.js';
const world = document.querySelector('#world');
const ctx = world.getContext('2d');
const backdrop = document.createElement('canvas');
backdrop.width = world.width;
backdrop.height = world.height;
const bg = backdrop.getContext('2d');
const W = world.width, H = world.height;
let seed = 83;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
function rect(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}
function disk(c, x, y, r, color) {
  for (let dy = -r; dy <= r; dy++) {
    const width = Math.floor(Math.sqrt(r*r - dy*dy));
    rect(c, x-width, y+dy, width*2+1, 1, color);
  }
}
function pine(c, x, y, h, color) {
  rect(c,x-1,y-h,3,h,color);
  for(let tier=0;tier<4;tier++){
    const start = y-h+tier*h*.16, tall = Math.ceil(h*(.31+tier*.035));
    for(let i=0;i<tall;i++){
      const side = Math.floor(i*.49/2)*2;
      rect(c,x-side,start+i,side*2+1,1,color);
    }
  }
}
function ridge(base, amplitude, color, frequency) {
  for(let x=0;x<W;x++){
    const h = Math.floor((base+Math.sin(x*frequency)*amplitude+Math.cos(x*.044)*amplitude*.31)/2)*2;
    rect(bg,x,h,1,H-h,color);
  }
}
function castle(x,y){
  const stone='#354354', dark='#222e40', light='#57606a';
  for(const [dx,dy,w,h] of [[0,4,12,22],[13,11,32,15],[40,0,11,26],[24,-3,10,27]]){
    rect(bg,x+dx,y+dy,w,h,stone);
    rect(bg,x+dx+w-3,y+dy,3,h,dark);
    for(let k=0;k<w;k+=5) rect(bg,x+dx+k,y+dy-3,3,4,stone);
    rect(bg,x+dx+3,y+dy+5,2,4,'#e5b770');
    rect(bg,x+dx+1,y+dy+12,3,1,light);
  }
  rect(bg,x+29,y-20,1,16,stone);rect(bg,x+30,y-20,9,3,'#aa806a');
}
const sky=bg.createLinearGradient(0,0,0,165);
sky.addColorStop(0,'#17233d');sky.addColorStop(.52,'#526177');sky.addColorStop(.83,'#e3aa89');sky.addColorStop(1,'#e8c69a');
bg.fillStyle=sky;bg.fillRect(0,0,W,H);
for(let i=0;i<115;i++){
  const x=random()*W,y=random()*98;
  rect(bg,x,y,1,1,random()>.65?'#d6cbb5':'#778392');
}
const moonX=302,moonY=48;
disk(bg,moonX,moonY,25,'#cab89d');disk(bg,moonX,moonY,23,'#f8deb0');
for(const [x,y,r] of [[-8,6,4],[2,-12,3],[10,8,3],[-13,-5,2],[7,14,2]])disk(bg,moonX+x,moonY+y,r,'#ead0a7');
for(let i=0;i<38;i++)rect(bg,random()*W,67+random()*37,7+Math.floor(random()*38),1,'#b6a4a4');
ridge(112,14,'#86828a',.019);ridge(123,10,'#646d79',.029);
castle(340,91);ridge(131,9,'#495b68',.025);
for(let x=-4;x<W;x+=4+random()*5)pine(bg,x,149+random()*6,20+random()*15,'#465d64');
ridge(151,4,'#586f71',.027);
for(let x=-3;x<W;x+=5+random()*8)pine(bg,x,166+random()*4,18+random()*23,'#314a50');
ridge(171,3,'#263d42',.02);
for (const x of [4,20,42,451,468,485])pine(bg,x,177,60+random()*36,'#20353b');
rect(bg,0,175,W,33,'#273938');
for(let x=0;x<W;x+=2){
  const top=177+Math.sin(x*.022)*2;
  rect(bg,x,top,2,6,'#8c8269');rect(bg,x,top-1,2,2,'#aea082');
}
for(let i=0;i<850;i++){const x=random()*W,y=181+random()*28;rect(bg,x,y,1+Math.floor(random()*3),1,y<185?'#6c6e5a':'#3e5042');}
for(let i=0;i<46;i++){
  const x=random()*W,y=187+random()*21,h=3+random()*6;
  rect(bg,x,y-h,1,Math.ceil(h),'#617252');rect(bg,x-2,y-h+2,2,2,'#86916b');
  if(i%4===0)rect(bg,x-1,y-h-1,2,2,'#d8b476');
}
const fireflies=Array.from({length:24},()=>[random()*W,128+random()*56,random()*6]);
function buildVista(ice) {
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const c=canvas.getContext('2d');
  const wash=c.createLinearGradient(0,0,0,H);
  wash.addColorStop(0,ice?'#17264e':'#302237');wash.addColorStop(.69,ice?'#77aaa9':'#d98959');wash.addColorStop(1,ice?'#c3e1db':'#e0a779');
  c.fillStyle=wash;c.fillRect(0,0,W,H);
  disk(c,325,63,ice?16:30,ice?'#e5f4df':'#ffca85');
  for(let x=0;x<W;x++){
    if(ice){
      const y=30+Math.round(Math.sin(x*.024)*7+Math.sin(x*.04)*8);
      rect(c,x,y,1,12+Math.floor(8*Math.sin(x*.06)),'#71b7aa');
    }
    const ridge=102+Math.abs((x+20)%85-42)*.65+Math.sin(x*.06)*4;
    rect(c,x,ridge,1,H,'#'+(ice?'658897':'76545a'));
    if(ice)rect(c,x,ridge,1,3,'#d1e6df');
  }
  if(ice){
    rect(c,0,138,W,41,'#598d99');
    for(let i=0;i<120;i++)rect(c,random()*W,139+random()*36,3+random()*16,1,'#a5d8d5');
    rect(c,354,89,11,50,'#d6d8c7');rect(c,351,86,17,4,'#465560');
    rect(c,354,79,11,7,'#efd297');rect(c,352,77,15,3,'#39465a');
    for(let i=0;i<22;i++){const x=random()*W,y=153+random()*20;rect(c,x,y,17,2,'#e2f1e7');rect(c,x+2,y+2,13,3,'#9dc7c9');}
  }else{
    for(let i=0;i<26;i++){
      const x=Math.floor(random()*W),y=98+random()*40,w=8+Math.floor(random()*16);
      rect(c,x,y,w,72,'#493b46');rect(c,x+2,y-4,4,5,'#493b46');
      rect(c,x+3,y+9,3,7,'#d88454');rect(c,x+w-4,y+19,2,5,'#d88454');
    }
    for(let i=0;i<8;i++)rect(c,i*70,162,40,5,'#ba634c');
  }
  rect(c,0,176,W,32,ice?'#718e98':'#514343');rect(c,0,175,W,5,ice?'#d9ece6':'#a98163');
  for(let i=0;i<380;i++)rect(c,random()*W,183+random()*25,2+random()*4,1,ice?'#94b2b6':'#786056');
  return canvas;
}
const vistas={forest:backdrop,ice:buildVista(true),ember:buildVista(false)};
const characterColors = ['#ba805c', '#75909a', ...realms.map((r) => r.color)];
function hero(c, x, y, gear, person, attack, step) {
  const [body, head, weapon] = gear.map((id) => equipment[id]);
  const cloak = body?.color || characterColors[person];
  const trim = body ? realms[body.country].color : '#a8b8ab';
  c.save();
  c.translate(Math.round(x), Math.round(y));
  rect(c, -8, -23, 10, 15, cloak);
  rect(c, -10, -12, 11, 5, cloak);
  rect(c, -12, -9, 9, 3, trim);
  rect(c, -5, -10, 4, 9, '#28323f');
  rect(c, 2, -9, 4, 8, '#28323f');
  rect(c, -6, -2 - step, 5, 2, '#121e29');
  rect(c, 2, -2 + step, 6, 2, '#121e29');
  rect(c, -4, -23, 9, 14, body?.base === 1 ? cloak : '#4a5966');
  rect(c, -4, -21, 8, 4, trim);
  if (body?.base === 1) {
    rect(c, -8, -24, 6, 5, cloak);
    rect(c, 3, -24, 5, 4, cloak);
  }
  if (body) rect(c, -1, -20, 2, 3, elements[body.element][0]);
  rect(c, -5, -12, 11, 3, '#91694d');
  rect(c, -1, -12, 3, 2, '#ebce88');
  rect(c, -4, -30, 11, 8, '#43434a');
  rect(c, -2, -29, 9, 7, '#dca780');
  rect(c, 5, -27, 2, 2, '#283446');
  const cap = head?.color || characterColors[person];
  rect(c, -5, -32, 11, 4, cap);
  rect(c, -6, -29, 14, 2, cap);
  if (head?.base === 2 || (!head && person === 9)) {
    for (const dx of [-5, 0, 5]) rect(c, dx, -36, 2, 5, cap);
  } else if (head) {
    rect(c, -5, -29, 3, 7, cap);
    rect(c, -2, -35, 7, 3, cap);
  }
  if (head) {
    rect(c, -6, -30, 13, 1, realms[head.country].color);
    rect(c, 0, -31, 2, 2, elements[head.element][0]);
  } else if (person > 0) {
    const ornament = [
      '#e5be79',
      '#abc690',
      '#99cdd5',
      '#d0926b',
      '#dce6e8',
      '#b9d3a8',
      '#ddb879',
      '#bda2cd',
      '#efcf88'
    ][person - 1];
    rect(c, -6, -32, 2 + (person % 3), 3, ornament);
    if (person % 2 === 0) rect(c, -7, -35, 2, 4, ornament);
  }
  rect(c, 4, -20, 4, 7, trim);
  rect(c, 7, -16, 4, 3, '#d6a07b');
  c.translate(9, -14);
  c.rotate(attack ? 1.14 : 0.42);
  const blade = weapon?.color || '#c3d1cc';
  if (weapon?.base === 5) {
    rect(c, 0, -24, 2, 24, '#98795e');
    rect(c, -2, -24, 5, 6, blade);
    rect(c, 0, -28, 2, 5, blade);
  } else rect(c, -1, -17, 3, 17, blade);
  rect(c, -3, -1, 7, 2, weapon ? realms[weapon.country].color : '#d9b47c');
  if (weapon) rect(c, 0, -11, 1, 6, elements[weapon.element][0]);
  c.restore();
}
// Pixel silhouettes share a small palette and scale to any viewport.
const sprites = {
  wolf: [
    '    A     A',
    '    AA   AA',
    '    ADDDDAA',
    '  DDDDLLDDD',
    'DDDDDDDDEDDA',
    ' DDDDDDD  DD',
    '  DD  DD',
    '  AA  AA'
  ],
  guard: [
    '    LLL',
    '   DLLLD',
    '   DEEED',
    '   DDDDD',
    '  ALLLLLA',
    ' AADDDDDAD',
    '   DLLLD',
    '   DD DD',
    '   AA AA'
  ],
  stag: [
    'A A     A A',
    ' AA     AA',
    '  AA   AA',
    '   DLLLD',
    '   DEDED',
    '   LLLLL',
    '  DLLLLLD',
    '  ADLLLDA',
    '   DDDDD',
    '   LL LL',
    '   AA AA'
  ],
  owl: [' A     A', ' DA   AD', ' DDLLLDD', ' DELLLED', ' DDLALDD', 'ADDDLLDDA', ' ADDDDDA', '   A A'],
  crab: ['AA       AA', 'AAD     DAA', ' DD DLL DDD', '  DLELED D', ' AADLLLDAA', 'A AADDDDA A', ' A A   A A'],
  queen: [
    '  L  L  L',
    '  LLLLLLL',
    '   LDDDL',
    '   DEDED',
    '   DLLLD',
    '  DLLLLLD',
    '  LDDDDDL',
    ' DDLDDDLDD',
    'DDLLLLLLLDD'
  ],
  lizard: ['      A A', '    DDDDDDA', '   DDLLLEDD', 'A DDDLLL  D', ' ADDLLLDD', '  DA   DA'],
  golem: [
    '    DLD',
    '   DDEDD',
    ' DDDLLLDDD',
    'DDDLLLLLDDD',
    'AADDDEDDAAA',
    ' ADLLLLDA',
    '  DD   DD',
    ' AAA   AAA'
  ],
  dragon: [
    ' A      A  A',
    ' DA     ADDA',
    ' DDA   DDEEDA',
    ' DDLA DDDDD',
    'ADDDDLLLLD',
    ' ADDLLLLLDA',
    '  DDLLLLDD',
    ' ADDD  DD',
    'AADAA  AAA'
  ]
};
Object.assign(sprites, {
  hart: ['A A   A A', ' AAA AAA', '  ALDLA', '   EDE', '  DLLLD', ' DDLLLDDDD', '  DD LLLD', '  AA   AA'],
  griffin: ['A         A', 'DA  LLL  AD', 'DDA LEELADD', ' DLADLLLAD', '  DDLLLDD', '   DDLLD', '   AA  AA'],
  lion: ['   LLLLL', '  LDDDDLL', '  LDEEDLL', '  LDDLDLL  A', '   DDLLDDDA', '  DDDLLLDD', '  AA   AA'],
  general: ['   ALA', '  DLLLD', '  DEEED', ' ALLLLLA', 'ADLLLLLDA', ' ADDDDDA', '   LLL', '  DD DD', '  AA AA']
});
const markings = [
  ['A A A', 'AAAAA'],
  ['  A', ' AA', 'A A'],
  [' AAA ', 'A   A', ' AAA '],
  ['   AA', ' AAA', 'AA'],
  [' A A', 'AAAA', ' A A'],
  ['  A', ' AAA', '  A'],
  ['A   A', 'AA AA', ' AAA '],
  ['  A', ' AAA', 'AAAAA', ' AAA', '  A']
];
function monster(c, x, y, foe, scale, time = 0, hit = false) {
  const rows = sprites[foe.kind],
    ink = elements[foe.element][0];
  const colors = { A: '#34414c', D: hit ? '#ffe1b3' : realms[foe.country].color, L: ink, E: '#ffe396' };
  const left = x - Math.floor((Math.max(...rows.map((row) => row.length)) * scale) / 2);
  const top = y - rows.length * scale + Math.round(Math.sin(time * 2));
  rows.forEach((row, iy) => {
    for (let ix = 0; ix < row.length; ix++) {
      if (colors[row[ix]]) rect(c, left + ix * scale, top + iy * scale, scale, scale, colors[row[ix]]);
    }
  });
  const markSize = Math.max(1, Math.floor(scale / 2));
  markings[foe.form].forEach((row, iy) => {
    for (let ix = 0; ix < row.length; ix++) {
      if (row[ix] === 'A')
        rect(c, x - 2 * markSize + ix * markSize, top + (iy - 1) * markSize, markSize, markSize, '#fff1bc');
    }
  });
}

const countryVistas = ['forest', 'ice', 'ember', 'ice', 'forest', 'ember', 'ember', 'forest'];
const scenery = new Map();
function landscape(country, land) {
  const key = country * 4 + land;
  if (scenery.has(key)) return scenery.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d'),
    realm = realms[country];
  c.drawImage(vistas[countryVistas[country]], 0, 0);
  c.globalAlpha = 0.16;
  c.fillStyle = realm.color;
  c.fillRect(0, 0, W, H);
  c.globalAlpha = 1;
  const stone = ['#505c51', '#587780', '#755453', '#677b8a', '#617465', '#8b7056', '#66596f', '#50495d'][
    country
  ];
  // Keep each country's horizon recognizable under all three local weather effects.
  if (country === 4) {
    for (const [x, y] of [
      [68, 92],
      [192, 113],
      [322, 83]
    ]) {
      rect(c, x, y, 31, 3, '#aab198');
      rect(c, x + 5, y + 3, 23, 4, '#879780');
      rect(c, x + 11, y + 7, 12, 3, stone);
      rect(c, x + 14, y - 12, 1, 12, '#685e49');
      rect(c, x + 15, y - 11, 8, 5, '#ebe2bb');
    }
  } else if (country === 5) {
    for (let x = 0; x < W; x++) {
      const y = 145 + Math.sin(x * 0.022 + land) * 8;
      rect(c, x, y, 1, 174 - y, '#a28a63');
      rect(c, x, y, 1, 2, '#c8ac76');
    }
  } else if (country === 6) {
    for (const x of [61, 156, 356]) {
      rect(c, x, 92, 3, 65, stone);
      rect(c, x - 6, 106, 15, 3, stone);
      for (let i = 0; i < 9; i++) rect(c, x + i * 10, 107 + Math.sin(i * 0.38) * 5, 10, 1, '#9d9285');
    }
  } else if (country === 7) {
    c.fillStyle = '#28223f60';
    c.fillRect(0, 0, W, 174);
    disk(c, 302, 48, 21, '#443b55');
    for (let i = 0; i < 13; i++) rect(c, 74 + i * 23, 28 + ((i * 13) % 45), 2, 2, '#dfc8df');
  }
  const x = 295 + ((country * 17 + land * 11) % 65);
  if (land === 0) {
    for (let i = 0; i < 4; i++) rect(c, x + i * 9, 149 - i * 2, 6, 14 + i * 2, stone);
  } else if (land === 1) {
    for (let i = 0; i < 6; i++) rect(c, x + i * 9, 143 - Math.sin(i * 0.62) * 6, 9, 4, stone);
    rect(c, x, 147, 5, 16, stone);
    rect(c, x + 49, 147, 5, 16, stone);
  } else {
    const towers = land === 3 ? 3 : 1;
    for (let i = 0; i < towers; i++) {
      const y = 116 - (i % 2) * 13,
        tx = x + i * 13;
      rect(c, tx, y, 11, 164 - y, stone);
      rect(c, tx - 2, y - 3, 15, 4, stone);
      rect(c, tx + 4, y + 6, 3, 7, '#ead599');
      rect(c, tx + 4, y - 15, 1, 12, '#363b3b');
      rect(c, tx + 5, y - 15, 8, 4, realm.color);
    }
  }
  scenery.set(key, canvas);
  return canvas;
}
function weather(c, element, time) {
  const color = elements[element][0];
  for (const [x, y, phase] of fireflies) {
    const t = time + phase,
      drift = (x + t * (element === '風' ? 23 : 4)) % W;
    const fall = (y + t * (element === '水' ? 32 : 7)) % 166;
    if (element === '水') rect(c, drift, fall, 1, 5, color);
    else if (element === '風') rect(c, drift, fall, 6, 1, color);
    else if (Math.sin(t) > 0.15) rect(c, drift, fall, element === '冰' ? 2 : 1, 2, color);
  }
}
export function draw({ time, country, area, loadouts, partner, stage, foe, strike }) {
  ctx.drawImage(landscape(country, area.land), 0, 0);
  weather(ctx, area.element, time);
  const walking = stage === 'travel',
    step = walking ? Math.round(Math.sin(time * 8)) : 0;
  // The full-height portrait crop is narrower than the original 480-pixel stage.
  const visibleWidth = (H * world.clientWidth) / Math.max(1, world.clientHeight);
  const partyScale = Math.min(1, visibleWidth / 145);
  ctx.save();
  ctx.translate(W / 2, 178);
  ctx.scale(partyScale, partyScale);
  ctx.translate(-W / 2, -178);
  const reach = strike > 0 ? Math.sin(Math.min(1, strike / 0.45) * Math.PI) : 0;
  hero(ctx, 190, 175, loadouts[partner], partner, reach > 0.6, -step);
  hero(ctx, 222 + reach * 13, 178, loadouts[0], 0, reach > 0.2, step);
  if (stage === 'battle' && foe) {
    monster(ctx, 266, 178, foe, foe.base === 5 ? 5 : 3, time, reach > 0.5);
    if (reach > 0.3) rect(ctx, 244, 153, 12, 2, '#ffe5b1');
  }
  if (stage === 'loot') {
    disk(ctx, 252, 164 + Math.round(Math.sin(time * 2)), 7, '#b48c4f');
    rect(ctx, 250, 159, 3, 8, '#ffe5a4');
  }
  ctx.restore();
}
export function portrait(canvas, gear, person) {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  hero(c, 17, 43, gear, person, false, 0);
}
export function journalIcon(canvas, entry, isMonster) {
  const c = canvas.getContext('2d');
  if (isMonster) {
    monster(c, 20, 37, entry, 2);
    return;
  }
  const ink = entry.color,
    trim = elements[entry.element][0],
    edge = realms[entry.country].color;
  c.save();
  c.translate(20, 21);
  if (entry.slot === 0) {
    rect(c, -8, -11, 16, 20, ink);
    rect(c, -11, -8, 5, entry.base === 1 ? 6 : 18, ink);
    rect(c, -8, -11, 16, 3, edge);
    rect(c, -6, 4, 12, 2, trim);
  } else if (entry.slot === 1) {
    rect(c, -10, -5, 20, 8, ink);
    rect(c, -11, 2, 22, 3, edge);
    if (entry.base === 2) {
      for (const x of [-9, -1, 7]) rect(c, x, -11, 3, 8, ink);
    } else {
      rect(c, -6, -9, 12, 5, ink);
      rect(c, -10, 3, 4, 6, ink);
    }
    rect(c, -2, -3, 4, 4, trim);
  } else {
    c.rotate(0.58);
    rect(c, -1, -13, 3, 27, edge);
    rect(c, -2, -16, 5, entry.base === 5 ? 8 : 20, ink);
    rect(c, 0, -16, 1, 7, trim);
    if (entry.base === 4) rect(c, -6, 3, 12, 3, edge);
  }
  c.restore();
}
export function storyScene(canvas, chapter, step, game) {
  const c = canvas.getContext('2d'),
    country = Math.max(0, chapter);
  c.drawImage(landscape(country, 3), 0, 0);
  for (const x of [58, 134, 332, 409]) {
    rect(c, x, 0, 14, 170, '#3c4544');
    rect(c, x + 2, 0, 3, 170, '#636b63');
    rect(c, x - 5, 166, 24, 8, '#5b635a');
    rect(c, x + 3, 18, 14, 38, realms[country].color);
  }
  hero(c, 202, 178, game.loadouts[0], 0, false, 0);
  if (chapter < 0 || step === 2 || (chapter === 7 && step === 1)) {
    const person = chapter < 0 ? 1 : chapter + 2;
    hero(c, 269, 178, game.loadouts[person], person, false, 0);
  } else if (step === 1) {
    rect(c, 259, 158, 20, 18, '#726858');
    rect(c, 255, 154, 28, 6, '#bcad88');
    rect(c, 262, 151, 13, 4, elements[realms[country].sub[0]][0]);
    rect(c, 262, 154, 4, 9, '#9ebcc4');
  }
}
