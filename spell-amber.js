import { span, smooth, eases, rand, polygon, oval, stroke, skyWash, spark, heldClock, heroKeys, recoil } from './spell-fx.js';

const SWEEP=8350, HOLD=9080, HIT=9450;
const warp=heldClock(HOLD,HIT),contact=warp(HIT);
const keys=[[0,0,0,.4],[1250,0,0,.4],[1570,-2,3,.85],[2050,2,-3,-.34],[2850,0,0,-.09],
  [6000,0,0,.21],[7250,-5,2,-.6],[SWEEP,-8,3,-.85],[HOLD,12,-1,1.89],[HIT,12,-1,1.89],
  [10050,16,1,2.08],[11500,4,0,.4]];

function saberPose(t) {
  const pose = heroKeys(keys, t);
  pose.lean = -.18 * smooth(t,6000,SWEEP) + .46 * smooth(t,SWEEP,HOLD)
    - .28 * smooth(t,HIT+250,11500);
  return pose;
}

function jewel(c,x,y,r) {
  c.save();c.translate(x,y);c.scale(r,r);
  const amber = c.createRadialGradient(-.24,-.3,.07,.08,.04,1);
  amber.addColorStop(0,'#ffe7a5'); amber.addColorStop(.32,'#e6a349');
  amber.addColorStop(.7,'#a65b31'); amber.addColorStop(1,'#64383a');
  polygon(c,amber,[-.96,-.2,-.47,-.87,.34,-1,.95,-.28,.81,.56,.05,1,-.75,.58]);
  polygon(c,'#ffe19b88',[-.96,-.2,-.47,-.87,.34,-1,.02,-.37]);
  polygon(c,'#78433168',[.02,-.37,.34,-1,.95,-.28,.81,.56,.2,.46]);
  polygon(c,'#ffdfa6aa',[-.56,.28,-.2,.04,.42,-.07,.08,.16]);
  stroke(c,'#e5a252',.023,[-.59,.68,-.25,.26,.08,.18,.42,-.07,.66,-.53]);
  stroke(c,'#fff0b9',.034,[-.85,-.25,-.45,-.78,.1,-.87]); c.restore();
}

function lionPose(t, w, reduced) {
  const birth = smooth(t, 4200, 5540), fade = 1 - smooth(t, 10350, 11550);
  const inhale = smooth(t, 6000, SWEEP), roar = eases.out(span(t, SWEEP, HOLD));
  const breath = reduced ? 0 : Math.sin(w / 620) * 1.2 * (1 - roar);
  return { x: 201 - 4 * inhale + 13 * roar, y: 94 - 6 * birth + breath + 3 * roar,
    angle: -.07 * inhale + .15 * roar, size: .57 + .43 * birth, birth, fade, inhale, roar };
}

function lion(c, t, w, reduced) {
  const { x, y, angle, size, birth, fade, inhale, roar } = lionPose(t, w, reduced);
  if (!birth || !fade) return;
  c.save();
  c.translate(x, y); c.rotate(angle); c.scale(size, size);
  c.globalAlpha = birth * fade;
  // Amber facets point back from the cheek, with the sunlight on the upper ridges.
  const mane = smooth(t, 4420, 5830);
  for (let i = 0; i < 24; i++) {
    const a = 1.04 + i / 23 * 3.99, dx = Math.cos(a), dy = Math.sin(a);
    const radius = (27 + rand(i, 90) * 15) * mane;
    const tipX = -14 + dx * radius - rand(i, 91) * 22;
    const tipY = dy * radius * (1.1 + .11 * inhale) + 2 * Math.sin(w / 510 + i);
    polygon(c, '#4d2929', [8,-12, tipX+8,tipY-7, tipX-7,tipY, tipX+10,tipY+6, 10,18]);
    polygon(c, dy < 0 ? '#b97436' : '#78452e',
      [4,-10, tipX+8,tipY-5, tipX-5,tipY, tipX+17,tipY+1, 9,13]);
    if (dy < .4) stroke(c, '#dfa259', .85, [tipX-3,tipY, tipX+12,tipY-1, -7,dy*16]);
  }
  // Nose and brow stay fixed while the lower jaw rotates around the cheek.
  polygon(c, '#3c2328', [-18,-12, 0,-26, 13,-22, 25,-20, 31,-13, 40,-10, 45,-5, 43,10,
    30,15, 19,26, -6,28, -17,15]);
  c.save(); c.translate(12, 8); c.rotate(.11 * inhale + .59 * roar);
  polygon(c,'#45272b',[0,-3,31,-4,34,3,29,11,14,15,5,9]);
  polygon(c,'#946037',[3,3,15,7,30,3,27,9,14,13,6,8]);
  polygon(c,'#e7be7b',[20,3,23,-3,25,3]);
  c.restore();
  polygon(c,'#bb773d',[-15,-13,-4,-23,10,-21,18,-22,28,-16,33,-10,42,-8,45,-4,39,3,24,3,15,11,0,16,-10,9]);
  polygon(c,'#edb56c',[-11,-15,-4,-23,11,-19,18,-22,28,-16,30,-12,19,-11,9,-16,-3,-14]);
  polygon(c,'#8b5031',[-9,-8,4,-14,13,-8,19,0,13,11,0,16,-11,9]);
  polygon(c,'#e5ad64',[17,-4,25,-5,31,-10,42,-8,45,-4,39,3,24,3]);
  polygon(c,'#362128',[12,-11,22,-12,26,-9,19,-6,13,-7]);
  polygon(c,'#f9dd93',[15,-10,23,-10,19,-7,15,-8]);
  c.fillStyle='#2d2025'; c.fillRect(18,-10,2,3);
  polygon(c,'#46292a',[37,-9,44,-8,46,-5,42,-2,39,-3]);
  polygon(c,'#f3cf91',[33,2,38,2,35,8]);
  for (let i = 0; i < (reduced ? 8 : 24); i++) {
    const drift = (w / 1650 + rand(i, 23)) % 1;
    c.globalAlpha = birth * fade * .63 * Math.sin(Math.PI * drift);
    c.fillStyle = i % 3 ? '#c69559' : '#ffe1a0';
    c.fillRect(-37 - 37 * drift - rand(i, 21) * 17, (rand(i, 22) - .48) * 59 - 9 * drift, 1 + drift, 1);
  }
  c.restore();
}

function dunes(c,t,w,{reduced}) {
  const sun=smooth(t,1000,3550);
  skyWash(c,'#653b4e','#db9760',sun*.98);
  c.save();c.globalAlpha=sun;
  const sunDisk = c.createLinearGradient(0, 25, 0, 117);
  sunDisk.addColorStop(0, '#ffe3a1'); sunDisk.addColorStop(.58, '#e6ad71'); sunDisk.addColorStop(1, '#ab6659');
  oval(c,212,68,46,46,sunDisk);
  for(let i=0;i<3;i++){
    const ridge=[];
    for(let x=-100;x<=620;x+=8){
      const y=129+i*17+13*Math.sin(x/55+i*1.9)+7*Math.sin(x/95+.6);
      ridge.push(x,y);
    }
    const lee = c.createLinearGradient(0, 116 + i * 16, 10, 170 + i * 16);
    lee.addColorStop(0, ['#cf976d','#c18861','#aa7358'][i]); lee.addColorStop(1, ['#91615a','#835450','#71494a'][i]);
    polygon(c,lee,[...ridge,620,185,-100,185]);
  }
  for(let i=0;i<(reduced?9:26);i++){
    const k=(rand(i,41)+w/3200)%1;
    c.fillStyle='#edbd75';c.fillRect(100+rand(i,42)*230+32*k,148-36*k+6*Math.sin(i+k*4),2,1);
  }
  c.restore();
  const rise=smooth(t,1400,2850),r=4+7*rise+25*smooth(t,2500,4200);
  const hero = saberPose(Math.min(t, 1570));
  const originX = 159 + Math.round(hero.dx) + 19 * Math.sin(hero.angle);
  const originY = 164 + Math.round(hero.dy) - 19 * Math.cos(hero.angle);
  const x=originX+(204-originX)*rise, y=originY+(93-originY)*rise-22*Math.sin(Math.PI*rise);
  const crack=smooth(t,4200,5800);
  if(crack<1) {
    c.save();c.globalAlpha=1-crack;
    if(crack===0) jewel(c,x,y,r);
    else for(const side of [-1,1]) {
      c.save();c.translate(x+side*29*crack,y-10*crack);c.beginPath();c.rect(side<0?-r:0,-r,r,2*r);c.clip();jewel(c,0,0,r);c.restore();
    }
    c.restore();
  }
  lion(c,t,w,reduced);
}

function roar(c,t,w,{foeY,reduced}) {
  if(t>=7250 && t<SWEEP){
    const k=smooth(t,7250,SWEEP);
    c.save();
    for(let i=0;i<(reduced?4:10);i++){
      const phase=w*.003+i*1.8;
      c.globalAlpha=.7*k;c.fillStyle='#f4cb8a';
      c.fillRect(331+Math.cos(phase)*(12+i),177-i*k+2*Math.sin(phase),2,1);
    }
    c.restore();
  }
  if(t<SWEEP)return;
  const age=w-contact,flight=eases.smooth(span(t,SWEEP,HOLD));
  const muzzle = lionPose(SWEEP, warp(SWEEP), reduced);
  const mouthX = muzzle.x + 43 * Math.cos(muzzle.angle) - 9 * Math.sin(muzzle.angle);
  const mouthY = muzzle.y + 43 * Math.sin(muzzle.angle) + 9 * Math.cos(muzzle.angle);
  const x=mouthX+(321-mouthX)*flight+(t>=HIT?14+109*eases.out(span(age,0,750)):0);
  const y=mouthY+(foeY-mouthY)*flight, fade=1-smooth(age,380,930);
  c.save();c.globalAlpha=fade * smooth(t,SWEEP,SWEEP+110);
  c.translate(x, y); c.rotate(.56);
  // A pressure front lifts a dense lip of sand, followed by finer streaming grains.
  const radius = 4 + 23 * flight, tail = 8 + 43 * flight;
  const dust = c.createLinearGradient(-tail, 0, 2, 0);
  dust.addColorStop(0, '#cc955000'); dust.addColorStop(.74, '#d3985488'); dust.addColorStop(1, '#ffe0a3');
  c.fillStyle = dust; c.beginPath(); c.moveTo(-tail, -radius);
  c.quadraticCurveTo(9, -radius * .6, 0, radius * .18);
  c.quadraticCurveTo(-2, radius * .8, -tail, radius);
  c.quadraticCurveTo(-tail * .36, 0, -tail, -radius); c.fill();
  for (let i = 0; i < (reduced ? 16 : 55); i++) {
    const q = (w / 470 + rand(i, 81)) % 1, v = rand(i, 82) * 2 - 1;
    c.fillStyle = i % 4 ? '#c79662' : '#ffdfa1';
    c.globalAlpha = fade * (1 - q) * .82;
    c.fillRect(-q * tail - v * v * 16, v * radius * (.8 + q * .8), 1 + 3 * q, 1);
  }
  c.restore();
  if(age<0)return;
  c.save();
  const surge = eases.out(span(age,0,710));
  c.globalAlpha = surge * (1 - .36 * smooth(age,700,1700));
  const cutEnd = 329 + 118 * surge;
  polygon(c,'#62403c',[323,179,359,177,cutEnd,174,cutEnd+4,183,375,189,332,187]);
  stroke(c,'#e0a66d',1,[326,178,359,177,cutEnd,174]);
  for (let i = 0; i < 7; i++) {
    const heave = smooth(surge * 8, i, i + 1);
    const x = 320 + i * 12 + 5 * rand(i,45), h = heave * (6 + 21 * rand(i,46)) * (1 - .66*smooth(age,600,1550));
    const sand = c.createLinearGradient(0,181-h,0,184);
    sand.addColorStop(0,'#dfaa6c'); sand.addColorStop(.21,'#a87550'); sand.addColorStop(1,'#775248');
    c.fillStyle = sand; c.beginPath(); c.moveTo(x-10,183);
    c.quadraticCurveTo(x+4,181-h*.25,x+11,181-h);
    c.quadraticCurveTo(x+11,181-h*.32,x+22,183); c.fill();
  }
  c.restore();
}

export const amberPlan={
  duration:13000,impact:HIT,titleAt:11450,attack:[1250,10350],warp,subtitle:'— 王刃啟封 · 沙海聞獅 —',
  shots:[
    [0,'封珀 · 刃藏金瞳',[166,147,4.8,-.035],[170,145,5.8,.02],'smooth'],
    [1250,'挑刃 · 金珀離手',[158,150,2.85,-.08],[194,100,1.85,-.03],'out'],
    [2850,'沙潮 · 浮日成珀',[227,111,1.16,0],[216,97,1.48,.02],'smooth'],
    [4200,'開封 · 晶鬃披日',[212,100,1.25,-.035],[209,96,1.62,.015],'out'],
    [6000,'睜瞳 · 獅王噙光',[210,82,2.35,-.03],[224,82,3.25,.015],'smooth'],
    [7250,'伏沙 · 暴風欲來',[314,156,2.35,.04],[334,162,3.7,.02],'out'],
    [SWEEP,'放吼 · 推沙成壁',[239,118,1.32,-.04],[305,147,2.05,.02],'smooth'],
    [HOLD,'屏息 · 砂刃臨身',[321,156,3.1,0],[323,157,3.18,0],'out'],
    [HIT,'震野 · 獅吼裂陣',[333,157,2.68,-.04],[358,152,2.15,.01],'out'],
    [10350,'落金 · 鬃歸沙海',[358,152,2.15,.01],[251,121,1.1,0],'out'],
    [11450,'終幕 · 砂皇獅吼',[251,121,1.1,0],[247,120,1.18,0],'smooth']],
  close:[[0,1250],[6000,SWEEP],[HOLD,10350]],lines:[['h',SWEEP,HOLD]],flashes:[[HIT,190,.28,'#ffda8e']],
  shake:t=>t>=HIT?8*Math.exp(-(t-HIT)/220):t>=6000&&t<SWEEP?1.1*smooth(t,6000,7250):0,
  pose:(t,w,reduced)=>({hero:saberPose(t),foe:recoil(w-contact,smooth(t,6900,8150),45,14,reduced)}),
  back:dunes,front:roar
};
