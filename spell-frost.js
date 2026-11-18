import { span, smooth, eases, rand, spark, polygon, stroke, skyWash, heldClock, heroKeys, recoil } from './spell-fx.js';

const RELEASE = 8250, HOLD = 8880, HIT = 9250;
const warp = heldClock(HOLD, HIT), hitTime = warp(HIT);
const keys = [[0,0,0,.18],[1150,0,0,.18],[2200,1,-2,-.2],[4150,1,0,.1],
  [5800,0,0,.24],[7250,-7,3,.12],[RELEASE,-7,3,.12],[8550,3,-1,.32],[10150,3,-1,.32],[11500,0,0,.15]];

function crystal(c, x, y, h, width, slant) {
  c.save(); c.translate(x,y);
  polygon(c,'#245272',[-width,0, -width*.8,-h*.55, slant,-h, width,-h*.4, width*.8,0]);
  polygon(c,'#86d8e7',[-width*.8,-h*.55, slant,-h, 1,-h*.23, -width*.5,0]);
  polygon(c,'#defbff',[slant,-h, width,-h*.4, 1,-h*.23]);
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

function frostBow(c,t,w,{reduced,foeY}) {
  const hero=heroKeys(keys,t), draw=smooth(t,4600,7480)*(1-smooth(t,RELEASE,RELEASE+160));
  const form=smooth(t,1200,4200), fade=1-smooth(t,HIT+500,HIT+1600);
  const x=164+hero.dx, y=foeY+hero.dy*.5, h=11+(reduced?44:55)*form;
  c.save(); c.globalAlpha=fade;
  // The limbs curve away from the archer at the grip, then recurve at the notches.
  const notch=x-4-5*form-19*draw, stringX=notch-2-24*draw;
  for(const side of [-1,1]){
    c.save();c.translate(x,y);c.scale(.55+.45*form,side===1?.58:side);
    const tip=notch-x;
    polygon(c,'#4795ae',[-2,0, 5,2, 10,h*.36, 5,h*.63, tip,h*.89, tip-4,h, tip-6,h*.92, -2,h*.57, 4,h*.33]);
    stroke(c,'#dcfcff',1.6,[3,2, 8,h*.33, 3,h*.60, tip-2,h*.91, tip-4,h]);
    c.restore();
  }
  stroke(c,'#bde8fb',.9,[notch-4,y-h,stringX,y,notch-4,y+h*.58]);
  const star=smooth(t,2700,5520);
  if(t<1150) crystal(c,x-4,y-h,3.5,1.8,1);
  if(t<5800) spark(c,x+55*(1-star),y-95*(1-star),2+star*2,'#c9efff',fade);
  c.restore();

  const fly=eases.in(span(t,RELEASE,HOLD)), age=w-hitTime;
  const launchX=164+heroKeys(keys,RELEASE).dx-9-19-2-24+59;
  const tip=t<RELEASE?stringX+59:launchX+(321-launchX)*fly+(t>=HIT?14+124*eases.out(span(age,0,420)):0);
  if(t>=4150 && age<500){
    c.save();c.globalAlpha=smooth(t,4150,5300)*(1-smooth(age,260,500));
    stroke(c,'#67a7c1',2.8,[tip-57,y,tip-5,y]);stroke(c,'#fff8da',.9,[tip-57,y-.6,tip-3,y-.6]);
    polygon(c,'#b5f5fb',[tip,y,tip-13,y-4,tip-10,y,tip-13,y+4]);
    polygon(c,'#519cbf',[tip,y,tip-10,y,tip-13,y+4]);
    polygon(c,'#a7c9ea',[tip-52,y,tip-58,y-4,tip-48,y-3,tip-44,y]);c.restore();
  }
  if(t>=7250 && t<HIT) {
    const aim=smooth(t,7250,RELEASE), dim=1-smooth(t,RELEASE,HOLD);
    c.save();
    for(let i=0;i<3;i++) spark(c,291+i*14,foeY-(1-aim)*(i-1)*13,1+i*.3,'#cbf7ff',aim*dim);
    c.restore();
  }
  if(age<0)return;
  const grow=eases.out(span(age,0,760));
  for(let i=0;i<15;i++) {
    const k=span(grow*15,i,i+1);
    if(k) crystal(c,174+i*13,183,(5+rand(i,3)*23)*k,4,4+rand(i,4)*7);
  }
  c.save();
  for(let i=0;i<(reduced?6:21);i++){
    const k=span(age,0,480+rand(i,13)*510);
    c.globalAlpha=1-k;
    crystal(c,332+k*(22+rand(i,12)*75),foeY+(rand(i,14)-.65)*85*k+24*k*k,2+rand(i,15)*6,1.5,2);
  }
  c.restore();
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
    [RELEASE,'穿星 · 一線疾馳',[175,153,2.3,0],[309,157,2.6,.02],'in'],
    [HOLD,'止息 · 矢前寸雪',[318,158,3.4,0],[321,158,3.48,0],'out'],
    [HIT,'貫霜 · 冰華迸裂',[337,156,2.9,-.025],[358,151,2.4,0],'out'],
    [10150,'冰徑 · 萬星垂地',[325,154,1.9,0],[246,124,1.15,0],'out'],
    [11200,'終幕 · 永冬穿星',[239,123,1.15,0],[239,119,1.2,0],'smooth']],
  close:[[0,1150],[5800,RELEASE],[HOLD,10150]],lines:[['h',RELEASE,HOLD]],flashes:[[HIT,180,.29,'#e5fdff']],
  shake:t=>t>=HIT?6*Math.exp(-(t-HIT)/175):0,
  pose:(t,w,reduced)=>({hero:heroKeys(keys,t),foe:recoil(w-hitTime,smooth(t,6300,7900),33,12,reduced)}),
  back:iceField,front:frostBow
};
