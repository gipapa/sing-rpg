import { span, smooth, eases, rand, polygon, oval, stroke, spark, skyWash, heldClock, heroKeys, recoil } from './spell-fx.js';

const MOON=[246,80], CUT=8800, HOLD=9500, HIT=9900;
const warp=heldClock(HOLD,HIT,270),contact=warp(HIT);
const keys=[[0,0,0,.3],[1300,0,0,.3],[1640,-3,3,.6],[2230,-1,-2,-.54],[4350,0,0,-.31],
  [6200,-3,1,-.42],[7450,-7,2,-.85],[CUT,-9,3,-1.1],[HOLD,13,-1,1.81],[HIT,13,-1,1.81],
  [10400,16,1,2.18],[12150,1,0,.25]];

function moon(c,t) {
  const [x,y]=MOON, enter=smooth(t,1100,2650), eclipse=smooth(t,2750,5200);
  if(!enter)return;
  c.save();c.translate(x,y);c.globalAlpha=enter;
  const halo=c.createRadialGradient(0,0,36,0,0,72);
  halo.addColorStop(0,'#bca2e4');halo.addColorStop(.36,'#8879c877');halo.addColorStop(1,'#776bcc00');
  c.fillStyle=halo;c.fillRect(-72,-72,144,144);
  const stone = c.createRadialGradient(-15,-18,3,4,5,48);
  stone.addColorStop(0,'#dfdbe4'); stone.addColorStop(.68,'#b5acc8'); stone.addColorStop(1,'#766c91');
  oval(c,0,0,43,43,stone);
  c.save();c.beginPath();c.arc(0,0,43,0,Math.PI*2);c.clip();
  for(let i=0;i<12;i++){
    oval(c,(rand(i,4)-.5)*79,(rand(i,5)-.5)*79,1+rand(i,6)*4,1+rand(i,7)*3,'#9a90ae70');
  }
  oval(c,-86+85*eclipse,-2,42,42,'#29263e');
  // Crater rims disappear under the shadow; a narrow violet horizon survives totality.
  if(eclipse>.65){
    c.strokeStyle='#79648c';c.lineWidth=1.35;
    c.beginPath();c.arc(-86+85*eclipse,-2,39,-1.15,.97);c.stroke();
  }
  if(t>=HIT){
    const k=eases.out(span(t,HIT,HIT+750));
    polygon(c,'#17192e',[-43,-35,-43,-29,44,35+4*k,44,23]);
    stroke(c,'#e6cafa',.4+1.3*k,[-43,-35,44,23]);
  }
  c.restore();c.restore();
}

// A tapered serpentine body travels around the moon. The head follows the path tangent,
// so its horns, jaws and trailing whiskers remain part of the same silhouette as the neck.
function lunarDragon(c,t,w,art) {
  const climb=smooth(t,4220,6350),fade=1-smooth(t,HIT,HIT+1250);
  if(!climb || !fade)return;
  const [mx,my]=MOON;
  const pull = smooth(t,7450,CUT), strike = smooth(t,CUT,HOLD);
  const last=1.67+4.50*climb - .17*pull + .24*strike,outer=[],inner=[];
  const coord=(a,r)=>[mx+Math.cos(a)*r,my+Math.sin(a)*r*.94];
  c.save();c.globalAlpha=fade * smooth(t,4220,4750);
  for(let i=0;i<=40;i++){
    const u=i/40,a=1.67+(last-1.67)*u;
    const r=47+3*Math.sin(a*3+w*.0007),thick=(1+6.1*u)*climb;
    outer.push(...coord(a,r+thick));inner.unshift(...coord(a,r-thick));
    if(i%3===0 && i>3){
      polygon(c,'#a68bc1',[...coord(a-.09,r+thick-1),...coord(a-.13,r+thick+3+u*7),...coord(a+.08,r+thick-1)]);
    }
  }
  const scales = c.createLinearGradient(mx-47,my-48,mx+32,my+32);
  scales.addColorStop(0,'#a798b1'); scales.addColorStop(.31,'#554762');
  scales.addColorStop(.66,'#312a43'); scales.addColorStop(1,'#807086');
  polygon(c,scales,[...outer,...inner]);stroke(c,'#bcaac4',.85,outer);
  for(let i=3;i<38;i+=2){
    const a=1.67+(last-1.67)*i/40,r=47+3*Math.sin(a*3+w*.0007);
    const breadth = (1 + 4.6*i/40)*climb;
    polygon(c,i%4===1?'#917b96':'#72617e',[...coord(a-.09,r+breadth),
      ...coord(a+.015,r+breadth*.8),...coord(a+.08,r-1),...coord(a-.02,r+1)]);
    stroke(c,'#ac99ad',.48,[...coord(a-.075,r+breadth),...coord(a+.015,r+breadth*.8),...coord(a+.08,r-1)]);
  }
  const [hx,hy]=coord(last,47+3*Math.sin(last*3+w*.0007));
  c.translate(hx,hy);c.rotate(last + Math.PI/2 - .96*smooth(t,5800,6400));c.scale(.6+.4*climb,.6+.4*climb);
  const width = 54, height = width * art.height / art.width;
  // The short neck at the left edge seats on the last body segment.
  c.translate(12, 0);
  c.drawImage(art, -20, -height * .75, width, height);
  const drift = Math.sin(w / 540) * 2 - 5 * pull + 4 * strike;
  c.strokeStyle='#bcaec8';c.lineWidth=.58;
  c.beginPath();c.moveTo(29,-2);c.bezierCurveTo(43,-7,40,13+drift,52,6+drift);c.stroke();
  c.beginPath();c.moveTo(27,0);c.bezierCurveTo(35,3,30,18+drift,45,14+drift);c.stroke();
  c.restore();
}

function night(c,t,w,{reduced,art}){
  const dark=smooth(t,0,2700);
  skyWash(c,'#14152b','#423952',.96*dark);c.save();c.globalAlpha=dark;
  for(let i=0;i<(reduced?30:65);i++){
    const x=rand(i,18)*600-60, y=rand(i,19)*170-20;
    c.fillStyle=i%5?'#9a92b1':'#d4c6c4';c.fillRect(x,y,1,i%5?1:2);
  }
  c.restore();moon(c,t);lunarDragon(c,t,w,art);
}

function moonblade(c,x,y,size,angle,opacity) {
  c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);c.globalAlpha=opacity;
  const g=c.createLinearGradient(-12,0,11,0);
  g.addColorStop(0,'#51425e');g.addColorStop(.42,'#746480');g.addColorStop(.66,'#afa3b9');
  g.addColorStop(.8,'#665b78');g.addColorStop(.96,'#ddd8d9');g.addColorStop(1,'#fff3dc');
  c.fillStyle=g;c.beginPath();c.moveTo(-12,-32);
  c.bezierCurveTo(15,-18,19,15,-14,34);c.bezierCurveTo(5,12,4,-14,-12,-32);c.fill();
  c.beginPath();c.moveTo(-12,-32);c.bezierCurveTo(15,-18,19,15,-14,34);
  c.strokeStyle='#f8e6f7';c.lineWidth=1;c.stroke();c.restore();
}

function reaper(t) {
  const p = heroKeys(keys,t);
  p.weaponOpacity = 1 - smooth(t,90,430) + smooth(t,HIT+650,11500);
  p.lean = -.16 * smooth(t,6200,CUT) + .36 * smooth(t,CUT,HOLD) - .2 * smooth(t,HIT+200,11500);
  return p;
}

function reap(c,t,w,{foeY,reduced}) {
  const hero=reaper(t),handX=159+hero.dx,handY=164+hero.dy;
  c.save();c.translate(handX,handY);c.rotate(hero.angle);c.globalAlpha=1-hero.weaponOpacity;
  stroke(c,'#61485e',2.4,[0,3,0,-22]);stroke(c,'#d1a9c7',.65,[-.6,2,-.6,-22]);
  moonblade(c,-4,-22,.26,-1.1,1-hero.weaponOpacity);c.restore();
  const unhook=smooth(t,7350,CUT),fly=eases.in(span(t,CUT,HOLD)),age=w-contact;
  const x=286+26*fly+(t>=HIT?17+85*eases.out(span(age,0,540)):0);
  const y=78+12*unhook+(foeY-90)*fly+ (age>0?26*eases.out(span(age,0,540)):0);
  if(t>=7350 && t<CUT){
    c.save();c.globalAlpha=.72*Math.sin(unhook*Math.PI);
    c.strokeStyle='#cfb7de';c.lineWidth=.9;c.beginPath();c.moveTo(handX-7,handY-17);
    c.quadraticCurveTo(219,151-31*unhook,x,y);c.stroke();c.restore();
  }
  if (!reduced && fly > 0 && age < 220) {
    for (const lag of [2, 1]) {
      moonblade(c,x-3*lag*fly,y-7*lag*fly,.97,.15-.4*fly+.085*lag,
        .13 * fly * (1-smooth(age,0,220)) / lag);
    }
  }
  if(unhook && age<700)moonblade(c,x,y,.5+.52*unhook,.15-.4*fly,unhook*(1-smooth(age,370,700)));
  if(age<0)return;
  const k=eases.out(span(age,0,720));
  c.save();c.globalAlpha=1-smooth(age,200,970);
  polygon(c,'#b19ac8',[335-41*k,foeY-46*k,335,foeY-2,335+34*k,foeY+39*k,335,foeY+1]);
  for(let i=0;i<(reduced?7:24);i++){
    const p=span(age,0,700+rand(i,29)*790),a=rand(i,28)*Math.PI*2;
    spark(c,333+Math.cos(a)*p*61,foeY+Math.sin(a)*p*43+p*p*24,1.1,'#dac2e4',1-p);
  }
  c.restore();
}

export const eclipsePlan={
  art: new URL('./assets/spells/moon-dragon.webp', import.meta.url).href,
  duration:13900,impact:HIT,titleAt:12150,attack:[1300,10950],warp,subtitle:'— 龍銜月缺 · 一鐮裁夜 —',
  shots:[
    [0,'銀鉤 · 刃照新月',[155,145,5.3,-.03],[155,141,6.2,.02],'smooth'],
    [1300,'牽月 · 揚鐮向天',[151,146,2.85,-.08],[226,94,1.5,-.035],'out'],
    [2800,'入蝕 · 天光成環',[237,86,1.45,0],[246,81,1.85,.025],'smooth'],
    [4350,'遊龍 · 鱗循月脊',[238,90,1.2,-.04],[244,87,1.39,.015],'out'],
    [6200,'銜光 · 龍鬚捧月',[280,71,2.45,-.045],[302,78,3.05,.02],'out'],
    [7450,'收鉤 · 銀弧離輪',[208,115,1.48,-.06],[233,114,1.68,-.02],'smooth'],
    [CUT,'裁夜 · 缺月斜墜',[280,89,1.95,-.05],[314,153,2.25,.025],'in'],
    [HOLD,'無聲 · 月牙臨界',[319,157,3.1,0],[321,157,3.18,0],'out'],
    [HIT,'斷蝕 · 一鐮分夜',[334,155,2.85,-.04],[352,150,2.12,.02],'out'],
    [10950,'月塵 · 暗鱗歸天',[352,150,2.12,.02],[248,114,1.08,0],'out'],
    [12150,'終幕 · 終夜月蝕',[248,114,1.08,0],[248,120,1.15,0],'smooth']],
  close:[[0,1300],[6200,7450],[HOLD,10950]],lines:[['zoom',CUT,HOLD]],flashes:[[HIT,200,.26,'#e2cce7']],
  shake:t=>t>=HIT?7*Math.exp(-(t-HIT)/210):0,
  pose:(t,w,reduced)=>({hero:reaper(t),foe:recoil(w-contact,smooth(t,4350,6200),37,19,reduced)}),
  back:night,front:reap
};
