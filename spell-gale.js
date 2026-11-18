import { span, smooth, eases, rand, polygon, stroke, skyWash, heldClock, heroKeys, recoil } from './spell-fx.js';

const DIVE=8200, HOLD=8900, HIT=9250;
const warp=heldClock(HOLD,HIT), contact=warp(HIT);
const keys=[[0,0,0,.25],[1100,0,0,.25],[1650,-3,4,-.3],[2700,-5,-39,-.35],
  [4450,-8,-60,-.28],[5750,-8,-60,.42],[7050,-12,-64,.65],[DIVE,-13,-63,1.98],
  [HOLD,117,-15,1.94],[HIT,117,-15,1.94],[HIT+100,138,-9,1.94],[10100,151,-6,1.94],[11900,127,0,.46]];
function flyer(t,reduced) {
  const p=heroKeys(keys,t);
  if(reduced)p.dy*=.72+ .28*smooth(t,DIVE,HOLD);
  return p;
}

function feather(c,x,y,length,width,angle,opacity=1) {
  c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=opacity;
  polygon(c,'#426b76',[0,1,length*.24,-width*.53,length*.67,-width,length,-width*.45,length*.71,width*.32,length*.36,width*.48]);
  polygon(c,'#e6f4d1',[1,0,length*.3,-width*.63,length*.68,-width*.9,length,-width*.45,length*.54,0]);
  polygon(c,'#a9d5c3',[length*.3,1,length*.71,-width*.21,length*.91,-width*.33,length*.66,width*.24]);
  stroke(c,'#f5d793',Math.max(.65,width*.11),[0,0,length*.46,-width*.03,length*.89,-width*.39]);
  c.restore();
}

function wings(c,t,reduced) {
  const p=flyer(t,reduced), spread=smooth(t,1300,4500), fold=smooth(t,7050,DIVE);
  const opacity=1-smooth(t,HIT+250,11200);
  c.save();c.translate(150+p.dx,158+p.dy);
  for(const side of [-1,1]){
    c.save();c.scale(side,1);
    // A swept upper spar holds a fan of overlapping flight feathers.
    const lift=(reduced?13:21)*spread, width=67*spread*(1-.64*fold);
    c.rotate(-.75*fold);
    polygon(c,'#52847f',[0,0,width*.43,-lift-3,width,-lift-9,width*.63,-lift+9,width*.28,0]);
    // Long secondary quills hang below the spar, with gaps between their dark tips.
    for(let i=0;i<5;i++){
      const u=(i+1)/6;
      feather(c,width*u*.79,-lift*Math.sin(u*1.6)+1,spread*(12+26*u),4+2*u,
        .83-u*.66-.36*fold,opacity);
    }
    for(let i=6;i>=0;i--){
      const u=i/7;
      feather(c,width*u*.9,-lift*Math.sin(u*1.7),9+spread*(25+u*23),3+spread*(5+u*2),
        -.83+u*.82-.38*fold,opacity);
    }
    stroke(c,'#efd198',1.4,[0,0,width*.42,-lift,width*.9,-lift-7]);c.restore();
  }
  c.restore();
}

function airGate(c,x,y,radius,split) {
  c.save();c.translate(x,y);c.rotate(.37);
  for(const side of [-1,1]){
    c.save();c.translate(side*split*19,-split*11);c.scale(side*.36,1);
    for(const [r,w,col] of [[radius,4,'#5e9294'],[radius-1,2,'#f9d59a'],[radius-4,1,'#e2ffdc']]){
      c.beginPath();c.strokeStyle=col;c.lineWidth=w;
      c.arc(0,0,r,-1.48,1.48);c.stroke();
    }
    c.restore();
  }
  c.restore();
}

function windscape(c,t,w,{reduced}) {
  const sky=smooth(t,800,2700);
  skyWash(c,'#1d516c','#82b7ac',.84*sky);c.save();c.globalAlpha=sky;
  for(let i=0;i<12;i++){
    const x=-105+rand(i,13)*690+(reduced?0:Math.sin(w/3000+i)*6), y=18+rand(i,14)*109;
    const size=21+rand(i,15)*28;
    // Flattened leeward edges give the cloud shelf a consistent wind direction.
    c.fillStyle=i%2?'#b6d4c6':'#8fb9b9';c.beginPath();c.moveTo(x-size,y+3);
    c.quadraticCurveTo(x-size*.5,y-1,x-size*.24,y-5);
    c.bezierCurveTo(x-size*.1,y-14,x+size*.2,y-14,x+size*.32,y-4);
    c.quadraticCurveTo(x+size*.64,y-4,x+size,y+2);c.fill();
  }
  const open=smooth(t,4750,6000);
  if(open) for(let i=0;i<3;i++){
    c.globalAlpha=open*(1-smooth(t,HIT+550,11400));
    airGate(c,217+i*54,109+i*26,(19+i*3)*open+5,eases.out(span(w-contact,0,590)));
  }
  c.restore();
  if(t>1100 && t<11200){c.save();c.globalAlpha=1-smooth(t,HIT+250,11200);wings(c,t,reduced);c.restore();}
}

function front(c,t,w,{reduced}) {
  const p=flyer(t,reduced),x=159+p.dx,y=164+p.dy;
  c.save();c.translate(x,y);c.rotate(p.angle);
  const length=23+24*smooth(t,4450,7050);
  stroke(c,'#8e704f',2.3,[0,3,0,-length+6]);
  polygon(c,'#ffdb94',[0,-length,-3,-length+10,0,-length+8,3,-length+10]);
  polygon(c,'#fff9d8',[0,-length,0,-length+8,3,-length+10]);
  feather(c,0,-length+13,11,3,-2.45);c.restore();
  if(t>DIVE && t<HIT+650) {
    c.save();const k=smooth(t,DIVE,HOLD)*(1-smooth(w-contact,0,430));
    c.globalAlpha=k*.76;
    for (let i=0;i<3;i++) stroke(c,i===1?'#fae4a5':'#b5f5e4',1.2,[x-60-i*8,y-31+i*4,x-28,y-14+i*2,x-5,y-3+i]);
    c.restore();
  }
  if(w<contact)return;
  for(let i=0;i<(reduced?7:19);i++){
    const k=span(w-contact,0,1100+rand(i,32)*600),side=i%2?1:-1;
    feather(c,331+side*k*(15+rand(i,33)*69),161-Math.sin(k*Math.PI)*(14+rand(i,34)*63)+19*k,
      5+rand(i,35)*5,2,i+side*k*2,1-k);
  }
}

export const galePlan={
  duration:12650,impact:HIT,titleAt:11150,attack:[1100,10100],warp,subtitle:'— 白羽借風 · 一槍破陣 —',
  shots:[
    [0,'羽銘 · 槍側流金',[160,146,5,-.04],[163,149,5.8,.025],'smooth'],
    [1100,'拔地 · 長風托舉',[153,153,2.9,-.09],[149,110,1.8,-.04],'out'],
    [2700,'展翼 · 雙帆向天',[161,109,1.55,-.05],[174,93,1.48,.025],'smooth'],
    [4450,'掠羽 · 金脈相連',[146,89,2.8,.02],[211,65,2.65,.055],'smooth'],
    [5750,'雲門 · 三陣一線',[223,103,1.2,-.02],[244,115,1.28,0],'smooth'],
    [7050,'折翼 · 順風俯身',[148,100,3.3,-.08],[159,101,2.7,-.04],'out'],
    [DIVE,'破空 · 逐門疾降',[161,108,1.85,-.05],[301,150,2.1,.02],'smooth'],
    [HOLD,'斂風 · 關前寸鋒',[311,157,3.1,0],[314,158,3.18,0],'out'],
    [HIT,'破陣 · 羽貫雲關',[328,157,2.5,.045],[351,149,2.18,-.015],'out'],
    [10100,'落羽 · 風歸長野',[313,144,1.7,.02],[260,121,1.12,0],'out'],
    [11150,'終幕 · 蒼穹破陣',[257,122,1.12,0],[254,119,1.18,0],'smooth']],
  close:[[0,1100],[4450,5750],[HOLD,10100]],lines:[['v',1500,2650],['h',DIVE,HOLD]],flashes:[[HIT,180,.30,'#e2ffda']],
  shake:t=>t>=HIT?6.5*Math.exp(-(t-HIT)/200):0,
  pose:(t,w,reduced)=>({hero:flyer(t,reduced),foe:recoil(w-contact,smooth(t,5800,7050),46,18,reduced)}),
  back:windscape,front
};
