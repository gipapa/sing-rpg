import { span, smooth, eases, rand, spark, polygon, stroke, skyWash, heldClock, heroKeys, recoil } from './spell-fx.js';

const RELEASE = 8250, HOLD = 8880, HIT = 9250;
const warp = heldClock(HOLD, HIT), hitTime = warp(HIT);
const keys = [[0,0,0,.18],[1150,0,0,.18],[2200,1,-2,-.2],[4150,1,0,.1],
  [5800,0,0,.24],[7250,-7,3,.12],[RELEASE,-7,3,.12],[8550,3,-1,.32],[10150,3,-1,.32],[11500,0,0,.15]];

function crystal(c, x, y, h, width, slant) {
  c.save(); c.translate(x,y);
  const ice = c.createLinearGradient(0, 0, slant, -Math.max(1, h));
  ice.addColorStop(0, '#244256'); ice.addColorStop(.57, '#458a9e'); ice.addColorStop(1, '#c8f1ee');
  polygon(c, ice, [-width,0, -width*.8,-h*.55, slant,-h, width,-h*.4, width*.8,0]);
  polygon(c, '#477992', [slant,-h, width,-h*.4, width*.8,0, 1,-h*.23]);
  polygon(c, '#9ac7d2', [-width*.8,-h*.55, slant,-h, 1,-h*.23]);
  stroke(c, '#d9f8f5', .6, [-width*.8,-h*.55,slant,-h,slant*.76,-h*.76]);
  if (h > 10) stroke(c,'#82b5be',.6,[-width*.7,-h*.22,-width*.1,-h*.31,width*.45,-h*.32]);
  c.restore();
}

function iceField(c,t,w,{reduced}) {
  const night = smooth(t,400,2600), rise = smooth(t,2400,4800);
  skyWash(c,'#101831','#27485e',.82*night);
  c.save(); c.globalAlpha=night;
  for(let i=0;i<(reduced?18:42);i++) {
    const x=rand(i,32)*540-30, y=rand(i,31)*130-13;
    c.fillStyle=i%4?'#a0c1d8':'#f5f7cd'; c.fillRect(x,y,1,i%4?1:2);
  }
  // Translucent auroral curtains taper to a sharp folded lower hem.
  for(let band=0;band<2;band++){
    const points=[];
    for(let x=-160;x<=670;x+=10){
      const y=48+band*25+24*Math.sin(x/75+band+w*.00012)+11*Math.sin(x/35+band);
      points.push(x,y);
    }
    const g=c.createLinearGradient(0,-10,0,104);
    g.addColorStop(0,'#3ccfbd00');g.addColorStop(.6,band?'#86aef154':'#72edbd6b');g.addColorStop(1,'#a7eace00');
    polygon(c,g,[...points,670,-55,-160,-65]); stroke(c,band?'#87aad6':'#75cfb4',.8,points);
  }
  for(let i=0;i<18;i++){
    const x=i<9?34+i*10:391+(i-9)*12;
    crystal(c,x,184+rand(i,44)*7,(24+rand(i,42)*63)*rise,5+rand(i,43)*9,(rand(i,45)-.5)*28);
  }
  c.restore();
}

function archer(t) {
  const p = heroKeys(keys, t);
  p.lean = -.17 * smooth(t, 4600, 7480) + .24 * smooth(t, RELEASE, RELEASE + 170)
    - .07 * smooth(t, RELEASE + 170, HIT);
  p.weaponOpacity = 1 - smooth(t, 90, 430) + smooth(t, HIT + 500, HIT + 1600);
  return p;
}

function frostBow(c, t, w, { reduced, foeY }) {
  const hero = archer(t), x = 159 + Math.round(hero.dx), y = 164 + Math.round(hero.dy);
  const form = smooth(t, 900, 4200), draw = smooth(t, 4600, 7480);
  const release = span(t, RELEASE, RELEASE + 540);
  const bounce = reduced ? 0 : Math.sin(release * Math.PI * 4) * (1 - release) ** 2;
  const tension = draw * (1 - smooth(t, RELEASE, RELEASE + 110));
  const height = 13 + (reduced ? 38 : 49) * form - 5 * tension;
  const tipX = -4 - 9 * form - 14 * tension + 2 * bounce;
  const nock = tipX - 2 - 25 * tension + 6 * bounce;
  c.save(); c.translate(x, y); c.globalAlpha = 1 - hero.weaponOpacity;
  for (const side of [-1, 1]) {
    c.save(); c.scale(1, side === -1 ? -1 : .65);
    const limb = c.createLinearGradient(-8, 0, 7, height);
    limb.addColorStop(0, '#384754'); limb.addColorStop(.35, '#a4c0bf');
    limb.addColorStop(.58, '#577f96'); limb.addColorStop(1, '#c0e9ee');
    c.beginPath(); c.moveTo(0, 0);
    c.bezierCurveTo(13, height * .36, tipX + 16, height * .65, tipX, height);
    c.quadraticCurveTo(tipX - 4, height * .94, tipX + 3, height * .82);
    c.bezierCurveTo(tipX + 15, height * .48, 2, height * .29, -2, 1);
    c.fillStyle = limb; c.fill();
    c.strokeStyle = '#d7f3ed'; c.lineWidth = 1; c.beginPath(); c.moveTo(2, 5);
    c.bezierCurveTo(11, height * .38, tipX + 13, height * .72, tipX, height); c.stroke();
    c.restore();
  }
  stroke(c, '#d4e5eb', .7, [tipX,-height,nock,0,tipX,height*.65]);
  stroke(c, '#75614d', 3.1, [0,-5,0,4]);
  for (const band of [-5, -2, 2]) stroke(c, '#cab997', .8, [-1.5,band,1.5,band-1]);
  c.restore();

  const star = smooth(t, 2700, 5150);
  if (t < 5300) {
    const light = smooth(t, 900, 2700) * (1 - smooth(t, 4850, 5300));
    c.save();
    spark(c, x + nock + 62 * (1-star), y - 98 * (1-star) - 19 * Math.sin(Math.PI*star),
      1.7 + star * 1.7, '#d8f5ff', light);
    c.restore();
  }

  const fly = eases.in(span(t, RELEASE, HOLD)), age = w - hitTime;
  const launch = heroKeys(keys, RELEASE);
  const launchX = 159 + launch.dx - 4 - 9 - 14 - 2 - 25 + 59;
  const tip = t < RELEASE ? x + nock + 59 : launchX + (321-launchX)*fly
    + (t >= HIT ? 14 + 124*eases.out(span(age,0,420)) : 0);
  const arrowY = t < RELEASE ? y : 164 + launch.dy + (foeY - 164 - launch.dy) * fly;
  if (t >= 4150 && age < 500) {
    c.save(); c.translate(tip, arrowY);
    c.globalAlpha = smooth(t,4150,5300) * (1-smooth(age,260,500));
    stroke(c,'#4d768e',2.4,[-59,0,-5,0]); stroke(c,'#c9e4dd',.7,[-56,-.6,-3,-.6]);
    polygon(c,'#a9d3dc',[0,0,-12,-3.2,-9,0,-12,3.2]);
    polygon(c,'#588499',[0,0,-9,0,-12,3.2]);
    polygon(c,'#97b9cc',[-52,0,-59,-3.4,-50,-2.7,-45,0]);
    if (fly > 0) {
      const wake = c.createLinearGradient(-100,0,-10,0);
      wake.addColorStop(0,'#a5eef100'); wake.addColorStop(1,'#daffffa0');
      polygon(c,wake,[-100,0,-10,-1.1,-4,0,-10,1.1]);
    }
    c.restore();
  }
  if(t>=7250 && t<HIT) {
    const aim=smooth(t,7250,RELEASE), dim=1-smooth(t,RELEASE,HOLD);
    c.save();
    for(let i=0;i<3;i++) spark(c,291+i*14,foeY-(1-aim)*(i-1)*13,1+i*.3,'#cbf7ff',aim*dim);
    c.restore();
  }
  if(age<0)return;
  c.save();
  for(let i=0;i<(reduced?6:21);i++){
    const k=span(age,0,480+rand(i,13)*510);
    c.globalAlpha=1-k;
    crystal(c,332+k*(22+rand(i,12)*75),foeY+(rand(i,14)-.65)*85*k+24*k*k,2+rand(i,15)*6,1.5,2);
  }
  c.restore();
}

function battlefield(c, t, w, ctx) {
  iceField(c, t, w, ctx);
  if (t < HIT) return;
  const age = w - hitTime;
  // The arrow's contact starts the frost. It runs downrange and back along the wake.
  for (let i = 0; i < 20; i++) {
    const back = i >= 7, step = back ? i - 6 : i;
    const delay = (back ? 150 : 0) + step * 48;
    const growth = eases.out(span(age,delay,delay+220));
    if (!growth) continue;
    const x = 335 + (back ? -1 : 1) * (step * 11 + rand(i, 58) * 5);
    const h = (back ? 6 : 12) + rand(i, 3) * (back ? 16 : 25);
    crystal(c,x,181+rand(i,59)*6,h*growth,4+rand(i,61)*4,5+rand(i,4)*9);
  }
}

export const frostPlan={
  duration:12800,impact:HIT,titleAt:11200,attack:[1150,10150],subtitle:'— 北辰入弦 · 一矢凝冬 —',warp,
  shots:[
    [0,'凝晶 · 弓梢藏星',[164,150,4.6,-.04],[164,149,5.4,.02],'smooth'],
    [1150,'引光 · 北辰初現',[155,145,2.8,-.06],[190,96,1.6,-.03],'out'],
    [2600,'霜野 · 極光展幕',[238,105,1.15,0],[237,95,.97,.02],'smooth'],
    [4150,'落星 · 光結成矢',[209,94,2.1,-.04],[165,147,2.6,.02],'out'],
    [5800,'滿弦 · 晶枝低垂',[155,146,2.1,-.06],[134,152,2.9,-.035],'smooth'],
    [7250,'照準 · 霜臨眉際',[323,158,3.2,.045],[334,160,4,.02],'out'],
    [RELEASE,'穿星 · 一線疾馳',[194,150,1.83,0],[300,155,2.3,.02],'in'],
    [HOLD,'止息 · 矢前寸雪',[318,158,3.4,0],[321,158,3.48,0],'out'],
    [HIT,'貫霜 · 冰華迸裂',[337,156,2.9,-.025],[358,151,2.4,0],'out'],
    [10150,'冰徑 · 萬星垂地',[358,151,2.4,0],[246,124,1.15,0],'out'],
    [11200,'終幕 · 永冬穿星',[246,124,1.15,0],[239,119,1.2,0],'smooth']],
  close:[[0,1150],[5800,RELEASE],[HOLD,10150]],lines:[['h',RELEASE,HOLD]],flashes:[[HIT,180,.29,'#e5fdff']],
  shake:t=>t>=HIT?6*Math.exp(-(t-HIT)/175):0,
  pose:(t,w,reduced)=>({hero:archer(t),foe:recoil(w-hitTime,smooth(t,6300,7900),33,12,reduced)}),
  back:battlefield,front:frostBow
};
