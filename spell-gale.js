import { span, smooth, eases, rand, polygon, stroke, skyWash, heldClock, heroKeys, recoil } from './spell-fx.js';

const DIVE=8200, HOLD=8900, HIT=9250;
const warp=heldClock(HOLD,HIT), contact=warp(HIT);
const keys=[[0,0,0,.25],[1100,0,0,.25],[1650,-3,4,-.3],[2700,-5,-39,-.35],
  [4450,-8,-60,-.28],[5750,-8,-60,.42],[7050,-12,-64,.65],[DIVE,-13,-63,1.98],
  [HOLD,117,-15,1.94],[HIT-1,117,-15,1.94],[HIT,130,-12,1.94],
  [HIT+100,138,-9,1.94],[10100,151,-6,1.94],[11900,127,0,.46]];
function flyer(t,reduced) {
  const p=heroKeys(keys,t);
  if(reduced)p.dy*=.72+ .28*smooth(t,DIVE,HOLD);
  const glide = smooth(t, 2200, 4200) * (1 - smooth(t, 7050, DIVE));
  if (!reduced) p.dy += 2 * glide * Math.sin(t / 490);
  p.lean = (reduced ? .45 : 1) * (.16 * glide + .87 * smooth(t, 7050, HOLD) * (1 - smooth(t, HIT + 380, 11400)));
  p.weaponOpacity = 1 - smooth(t, 90, 430) + smooth(t, HIT + 750, 11700);
  return p;
}

function feather(c,x,y,length,width,angle,opacity=1) {
  c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=opacity;
  const vane = c.createLinearGradient(0, -width, length * .2, width * .5);
  vane.addColorStop(0, '#cbd8c1'); vane.addColorStop(.48, '#e2e5cd');
  vane.addColorStop(.55, '#94afa6'); vane.addColorStop(1, '#536f77');
  c.fillStyle = vane; c.beginPath(); c.moveTo(0, 0);
  c.quadraticCurveTo(length * .33, -width * 1.25, length, -width * .48);
  c.quadraticCurveTo(length * .7, width * .54, length * .21, width * .3);
  c.closePath(); c.fill();
  stroke(c, '#c7b995', width * .09, [0,0,length*.53,-width*.22,length*.94,-width*.45]);
  for (const u of [.45,.68,.79]) {
    stroke(c, '#728e88', .5, [length*u,-width*.24,length*(u+.1),-width*.57]);
  }
  c.restore();
}

// Long flights build the silhouette. Short coverts overlap the quills at the shoulder.
function wing(c, fold, shade) {
  const palettes = shade
    ? ['#253e53','#496477','#79949a','#c3ccc0']
    : ['#26384c','#537282','#91aaa8','#e7debf'];
  for (let i = 10; i >= 0; i--) {
    const baseX = 5 + i * 5, baseY = -i * 1.45;
    const tipX = 15 + i * 6.9 + 4 * rand(i, 36), tipY = 21 - i * 1.4 - i*i*.25 - i * fold;
    const taper = 3 + rand(i, 37) * 5;
    polygon(c, palettes[0], [baseX-6,baseY-6, baseX+7,baseY-10, tipX-taper,tipY-6,
      tipX+7,tipY-2, tipX,tipY+3, tipX-11,tipY+4, baseX-2,baseY+4]);
    polygon(c, palettes[i%3 ? 1 : 2], [baseX-3,baseY-4, baseX+7,baseY-8,
      tipX-5,tipY-5, tipX+5,tipY-2, tipX-9,tipY+1, baseX,baseY+2]);
    if (i % 3 !== 1) stroke(c, palettes[3], .65, [baseX+2,baseY-3, tipX-8,tipY-3, tipX+2,tipY-2]);
  }
  polygon(c, palettes[1], [-3,2, 9,-9, 25,-16, 45,-21, 61,-25, 50,-15, 26,-8, 16,3, 6,8]);
  polygon(c, palettes[3], [2,-2, 11,-9, 25,-16, 45,-21, 61,-25, 48,-18, 23,-11, 11,-3]);
  for (let i = 0; i < 6; i++) {
    const x = 8 + i * 7, y = -4 - i * 2.3;
    polygon(c, palettes[2], [x-4,y, x+4,y-5, x+15,y-4, x+8,y+4, x+2,y+5]);
  }
}

function wings(c, t, w, reduced) {
  const p = flyer(t, reduced);
  const spread = smooth(t, 1100, 4300), fold = smooth(t, 7050, DIVE);
  const settle = smooth(t, HIT + 250, 11200);
  const beat = reduced ? 0 : Math.sin(w / 490) * .14 * spread * (1 - fold);
  // Rotate the root with the shoulder, so the driver and the wings bank together.
  c.save(); c.translate(159 + Math.round(p.dx), 164 + Math.round(p.dy)); c.rotate(p.lean); c.translate(-10, -8);
  for (const side of [-1, 1]) {
    c.save(); c.scale(side,1); c.globalAlpha = spread * (1 - settle);
    c.rotate(-.12 + beat + (side > 0 ? -2.57 : .32) * fold + .16 * settle);
    c.scale(spread * (1 - .29 * fold), spread * (1 - .39 * fold));
    wing(c, fold, side > 0);
    c.restore();
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

const lanceLength = t => 23 + 24 * smooth(t,4450,7050);
function lanceTip(t, reduced) {
  const p = flyer(t,reduced), length = lanceLength(t);
  return [159 + Math.round(p.dx) + length * Math.sin(p.angle),
    164 + Math.round(p.dy) - length * Math.cos(p.angle)];
}

function windscape(c,t,w,{reduced}) {
  const sky=smooth(t,800,2700);
  skyWash(c,'#1d516c','#82b7ac',.84*sky);c.save();c.globalAlpha=sky;
  for(let i=0;i<12;i++){
    const x=-105+rand(i,13)*690+(reduced?0:Math.sin(w/3000+i)*6), y=18+rand(i,14)*109;
    const size=21+rand(i,15)*28;
    // Flattened leeward edges give the cloud shelf a consistent wind direction.
    const mist = c.createLinearGradient(0,y-11,0,y+4);
    mist.addColorStop(0, '#d0e2ce6b'); mist.addColorStop(1, '#8baeb100');
    c.fillStyle=mist;c.beginPath();c.moveTo(x-size,y+3);
    c.quadraticCurveTo(x-size*.5,y-1,x-size*.24,y-5);
    c.bezierCurveTo(x-size*.1,y-14,x+size*.2,y-14,x+size*.32,y-4);
    c.quadraticCurveTo(x+size*.64,y-4,x+size,y+2);c.fill();
  }
  const open=smooth(t,4750,6000);
  if(open) for(const [i, pass] of [8510,8730,HIT].entries()){
    c.globalAlpha=open*(1-smooth(t,HIT+550,11400));
    const [x, y] = lanceTip(pass, reduced);
    const split = i < 2 ? smooth(lanceTip(t, reduced)[0],x,x+17) : eases.out(span(w-contact,0,590));
    airGate(c,x,y,(19+i*3)*open+5,split);
  }
  const swept = eases.out(span(w-contact,0,540));
  if (swept) {
    c.globalAlpha = swept * (1 - .32 * smooth(t,10900,12650));
    polygon(c,'#3e6162',[147,181,230,177,304,175,330+125*swept,171,327+147*swept,185,266,185]);
    stroke(c,'#b3d1b6',1.2,[152,181,243,178,301,176,330+125*swept,171]);
  }
  c.restore();
  if (t > 1100 && t < 11200) wings(c,t,w,reduced);
}

function front(c,t,w,{reduced}) {
  const p=flyer(t,reduced),x=159+Math.round(p.dx),y=164+Math.round(p.dy);
  c.save();c.translate(x,y);c.rotate(p.angle);c.globalAlpha=1-p.weaponOpacity;
  const length=lanceLength(t);
  stroke(c,'#3c3c43',3.4,[0,5,0,-length+6]);
  stroke(c,'#a48964',.9,[-.6,4,-.6,-length+7]);
  polygon(c,'#566775',[0,-length,-3,-length+9,-3,-length+12,0,-length+10,3,-length+12,3,-length+9]);
  polygon(c,'#e7dec0',[0,-length,-3,-length+9,0,-length+10]);
  feather(c,0,-length+13,11,3,-2.45,1-p.weaponOpacity);c.restore();
  if(t>DIVE && t<HIT+650) {
    c.save();const k=smooth(t,DIVE,HOLD)*(1-smooth(w-contact,0,430));
    c.globalAlpha=k*.76;
    for (let i=0;i<3;i++) stroke(c,i===1?'#fae4a5':'#b5f5e4',1.2,[x-60-i*8,y-31+i*4,x-28,y-14+i*2,x-5,y-3+i]);
    c.restore();
  }
  if(w<contact)return;
  const [impactX, impactY] = lanceTip(HIT, reduced);
  for(let i=0;i<(reduced?7:19);i++){
    const k=span(w-contact,0,1100+rand(i,32)*600),side=i%2?1:-1;
    feather(c,impactX+side*k*(15+rand(i,33)*69),impactY-Math.sin(k*Math.PI)*(14+rand(i,34)*63)+19*k,
      5+rand(i,35)*5,2,i+side*k*2,1-k);
  }
}

export const galePlan={
  duration:12650,impact:HIT,titleAt:11150,attack:[1100,10100],warp,subtitle:'— 白羽借風 · 一槍破陣 —',
  shots:[
    [0,'羽銘 · 槍側流金',[160,146,5,-.04],[163,149,5.8,.025],'smooth'],
    [1100,'拔地 · 長風托舉',[153,153,2.9,-.09],[149,110,1.8,-.04],'out'],
    [2700,'展翼 · 雙帆向天',[161,109,1.55,-.05],[174,93,1.48,.025],'smooth'],
    [4450,'掠羽 · 金脈相連',[152,111,2.5,.02],[190,105,2.45,.055],'smooth'],
    [5750,'雲門 · 三陣一線',[223,103,1.2,-.02],[244,115,1.28,0],'smooth'],
    [7050,'折翼 · 順風俯身',[148,104,2.55,-.08],[163,103,2.13,-.04],'out'],
    [DIVE,'破空 · 逐門疾降',[161,108,1.85,-.05],[301,150,2.1,.02],'smooth'],
    [HOLD,'斂風 · 關前寸鋒',[311,157,3.1,0],[314,158,3.18,0],'out'],
    [HIT,'破陣 · 羽貫雲關',[328,157,2.5,.045],[351,149,2.18,-.015],'out'],
    [10100,'落羽 · 風歸長野',[351,149,2.18,-.015],[260,121,1.12,0],'out'],
    [11150,'終幕 · 蒼穹破陣',[260,121,1.12,0],[254,119,1.18,0],'smooth']],
  close:[[0,1100],[4450,5750],[HOLD,10100]],lines:[['v',1500,2650],['h',DIVE,HOLD]],flashes:[[HIT,180,.30,'#e2ffda']],
  shake:t=>t>=HIT?6.5*Math.exp(-(t-HIT)/200):0,
  pose:(t,w,reduced)=>({hero:flyer(t,reduced),foe:recoil(w-contact,smooth(t,5800,7050),46,18,reduced)}),
  back:windscape,front
};
