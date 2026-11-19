import { span, smooth, eases, rand, oval, stroke, skyWash, heldClock, heroKeys, recoil } from './spell-fx.js';

const FIRST=2350, BEAT=450, CALL=5950, BOLT=8350, HOLD=9050, HIT=9400;
const warp=heldClock(HOLD,HIT),contact=warp(HIT);
const keys=[[0,0,0,-.3],[1150,-2,-2,-.6],[1490,1,2,.95],[FIRST,0,0,1.12],[CALL,0,0,1.12],
  [7250,-1,0,.05],[BOLT,-4,-4,-.73],[HOLD,-4,-4,.68],[HIT-1,-4,-4,.68],[HIT,-4,-4,1.12],[HIT+100,3,2,1.24],[10800,2,1,.9],[11850,0,0,.12]];
function drummer(t){
  const p=heroKeys(keys,t);
  if(t>=FIRST && t<CALL){
    const beat=(t-FIRST)%BEAT/BEAT;
    const lift = beat < .7 ? smooth(beat, 0, .7) : 1 - eases.in(span(beat, .7, 1));
    p.angle -= 1.46 * lift;
    p.dy -= 1.8 * lift;
  }
  p.weaponOpacity = 1 - smooth(t, 90, 430) + smooth(t, 10800, 11900);
  return p;
}
const chorus=Array.from({length:8},(_,i)=>[123+i*25,117-74*Math.sin((i+.15)*Math.PI/8)]);
function drum(c, art, x, y, radius, pulse, opacity) {
  const width = radius * 2, height = width * art.height / art.width;
  c.save(); c.translate(x, y);
  c.globalAlpha = opacity;
  c.scale(1 + .032 * pulse, 1 - .065 * pulse);
  c.drawImage(art, -radius, -height * .58, width, height);
  if (pulse > 0) {
    c.translate(0, -height * .29);
    c.scale(1, .46);
    const radiusNow = radius * (.3 + .69 * (1 - pulse));
    const echo = c.createRadialGradient(0, 0, 0, 0, 0, radiusNow);
    echo.addColorStop(0, '#c8b7fe00'); echo.addColorStop(.78, '#c8b7fe11');
    echo.addColorStop(.92, '#eee2ffbb'); echo.addColorStop(1, '#c8b7fe00');
    c.globalAlpha = opacity * pulse;
    oval(c, 0, 0, radiusNow, radiusNow, echo);
  }
  c.restore();
}
function lightning(c,points,scale=1) {
  stroke(c,'#836db8',4.6*scale,points);
  stroke(c,'#c9bafd',2.1*scale,points);
  stroke(c,'#fff7d7',.8*scale,points);
}
function storm(c,t,w,{reduced,art}) {
  const cloud=smooth(t,620,2450);
  skyWash(c,'#171a37','#4f4865',cloud*.9);
  c.save();c.globalAlpha=cloud;
  for(let i=0;i<15;i++){
    const x=i*43-70+Math.sin(w*.00019+i)*2,y=10+13*Math.sin(i*.87);
    oval(c,x,y,42+rand(i,5)*23,16+rand(i,6)*16,i%2?'#393950':'#303449');
  }
  c.restore();
  for(let i=0;i<8;i++){
    const start=FIRST+i*BEAT, lit=smooth(t,start,start+190);
    const fade=1-smooth(t,10400+i*100,11100+i*100);
    const [x,y]=chorus[i], pulse=1-span(t,start,start+420);
    if(!lit)continue;
    if(i>0){
      const [px,py]=chorus[i-1];
      c.save();c.globalAlpha=lit*fade*(.23+.65*pulse);
      lightning(c,[px,py,(px+x)/2,py-5,x-10,y+5,x,y],.58);c.restore();
    }
    drum(c,art,x,y+(1-lit)*11,7+i*.45,reduced?0:pulse,lit*fade);
  }
  if(t>=CALL){
    const k=eases.out(span(t,CALL,7100)), last=1-smooth(t,HIT+650,11550);
    const pulse=t<HIT?.4*smooth(t,7250,HOLD):1-span(w-contact,0,580);
    c.save();c.globalAlpha=k*last;
    const drumY = 77 - (1 - k) * 45;
    lightning(c, [...chorus[7], 309, 92, 317, 94, 327, drumY - 2, 334, drumY], .38);
    drum(c,art,334,drumY,7+24*k,reduced?0:pulse,k*last);c.restore();
  }
}

function discharge(c,t,w,{reduced,foeY,art}) {
  const p=drummer(t);
  const beat=t>=FIRST && t<CALL ? ((t-FIRST)%BEAT)/BEAT : 0;
  drum(c,art,169+p.dx,161+p.dy,6,.7*Math.max(0,1-beat*3)*(t>=FIRST && t<CALL),1-p.weaponOpacity);
  // A spectral beater keeps the conducting hand legible in unowned-weapon previews.
  c.save();c.translate(159+p.dx,164+p.dy);c.rotate(p.angle+.05);c.globalAlpha=1-p.weaponOpacity;
  stroke(c,'#e9bc82',1.8,[0,1,0,-13]);oval(c,0,-14,2.4,3.1,'#dacaff');
  c.restore();
  if(t<BOLT)return;
  const age=w-contact, build=span(t,BOLT,HOLD);
  const points = [[334,90],[329,97],[331,99],[324,109],[327,108],[323,119],
    [330,116],[328,124],[331,122],[327,134],[332,131],[330,140],[334,foeY-9]];
  const path=[...points[0]];
  for(let i=1;i<points.length;i++){
    const k=span(build*(points.length-1),i-1,i);
    const [x,y]=points[i-1];path.push(x+(points[i][0]-x)*k,y+(points[i][1]-y)*k);
  }
  if(t>=HIT)path.push(333,foeY,337,177);
  c.save();c.globalAlpha=1-smooth(age,270,690);
  lightning(c,path,t<HIT?.66:1.24);
  if(build>.62){
    c.globalAlpha*=smooth(build,.62,1);
    lightning(c,[327,134,322,131,320,126,315,124,311,117],.38);
    lightning(c,[330,116,340,111,339,107,348,103],.27);
  }
  c.restore();
  if(age<0)return;
  c.save();
  const travel=eases.out(span(age,0,640));c.globalAlpha=1-smooth(age,690,1300);
  for(const side of [-1,1]){
    c.save();c.translate(336,180);c.scale(side*travel,1);
    lightning(c,[0,0,14,-3,20,1,31,-4,38,-2,53,-7,67,-6],.72);
    c.restore();
  }
  for(let i=0;i<(reduced?5:16);i++){
    const k=span(age,0,550+480*rand(i,8)),x=335+(rand(i,9)-.5)*97*k,y=177-45*Math.sin(k*Math.PI)*rand(i,10);
    c.fillStyle='#f8dea5';c.fillRect(x,y,1.7,2.4);
  }
  c.restore();
}

export const thunderPlan={
  art: new URL('./assets/spells/storm-drum.webp', import.meta.url).href,
  duration:13100,impact:HIT,titleAt:11600,attack:[1150,10400],warp,subtitle:'— 八方傳響 · 一鼓落雷 —',
  shots:[
    [0,'銅釘 · 掌中雷紋',[160,152,4.9,-.03],[164,157,6,.025],'smooth'],
    [1150,'試鼓 · 雲底初鳴',[158,154,3.25,-.075],[146,136,2,-.03],'out'],
    [FIRST,'傳拍 · 四鼓登霄',[128,116,2.25,-.015],[193,60,2,.035],'smooth'],
    [4150,'應律 · 八方成陣',[216,95,1.22,0],[228,91,1.36,-.025],'smooth'],
    [CALL,'主鼓 · 雷庭降座',[309,60,1.7,-.035],[331,74,2.3,.02],'out'],
    [7250,'舉槌 · 萬籟齊收',[153,151,3.35,-.07],[151,149,4,-.035],'smooth'],
    [BOLT,'引電 · 紫脈下行',[331,85,2.45,.045],[333,144,2.55,.015],'smooth'],
    [HOLD,'止拍 · 雷懸一線',[332,149,3.35,0],[332,151,3.45,0],'out'],
    [HIT,'天奏 · 第九聲雷',[335,152,2.85,-.035],[348,148,2.15,.015],'out'],
    [10400,'餘震 · 雲鼓歇響',[348,148,2.15,.015],[239,115,1.12,0],'out'],
    [11600,'終幕 · 九霄雷奏',[239,115,1.12,0],[242,121,1.2,0],'smooth']],
  close:[[0,1150],[7250,BOLT],[HOLD,10400]],lines:[['v',BOLT,HOLD]],flashes:[[HIT,155,.29,'#ddd0fc']],
  shake:t=>t>=HIT?8*Math.exp(-(t-HIT)/235):t>=FIRST&&t<CALL?.85*Math.exp(-((t-FIRST)%BEAT)/115):0,
  pose:(t,w,reduced)=>({hero:drummer(t),foe:recoil(w-contact,smooth(t,FIRST,CALL),24,31,reduced)}),
  back:storm,front:discharge
};
