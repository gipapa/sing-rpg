import { span, smooth, eases, rand, polygon, oval, stroke, skyWash, spark, heldClock, heroKeys, recoil } from './spell-fx.js';

const SWEEP=8350, HOLD=9080, HIT=9450;
const warp=heldClock(HOLD,HIT),contact=warp(HIT);
const keys=[[0,0,0,.4],[1250,0,0,.4],[1570,-2,3,.85],[2050,2,-3,-.34],[2850,0,0,-.09],
  [6000,0,0,.21],[7250,-5,2,-.6],[SWEEP,-8,3,-.85],[HOLD,12,-1,1.89],[HIT,12,-1,1.89],
  [10050,16,1,2.08],[11500,4,0,.4]];

function jewel(c,x,y,r) {
  c.save();c.translate(x,y);c.scale(r,r);
  polygon(c,'#794334',[-.96,-.2,-.47,-.87,.34,-1,.95,-.28,.81,.56,.05,1,-.75,.58]);
  polygon(c,'#ffdc85',[-.96,-.2,-.47,-.87,.34,-1,.02,-.27]);
  polygon(c,'#e39343',[.02,-.27,.34,-1,.95,-.28,.81,.56,.2,.46]);
  polygon(c,'#ffb84e',[-.96,-.2,.02,-.27,.2,.46,.05,1,-.75,.58]);
  stroke(c,'#fff0a8',.035,[-.75,-.24,-.45,-.73,.10,-.84]);c.restore();
}

function lion(c,t) {
  const birth=smooth(t,4200,5540), fade=1-smooth(t,10350,11550);
  if(!birth || !fade)return;
  const voice=smooth(t,6200,8200), thrust=smooth(t,SWEEP,HOLD);
  c.save();c.translate(204+13*thrust,94-4*birth+3*thrust);
  c.scale(.66+.34*birth,.66+.34*birth);c.globalAlpha=birth*fade;
  // Overlapping amber blades fan out behind a right-facing muzzle.
  for(let i=0;i<14;i++){
    const a=(58+i*18)*Math.PI/180, len=43+14*rand(i,18)+5*thrust;
    c.save();c.rotate(a);c.translate((1-fade)*(12+16*rand(i,22)),0);
    polygon(c,i%2?'#925032':'#ac622e',[8,-11,28,-14,len,-7,len+4,0,len-14,7,13,9]);
    polygon(c,i%3?'#edac50':'#f6c96b',[14,-8,30,-11,len,-7,len+4,0,29,-1]);
    polygon(c,'#cb813c',[13,4,29,-1,len+4,0,len-14,7,18,8]);
    c.restore();
  }
  polygon(c,'#b86d36',[-24,-17,-26,-35,-15,-34,-7,-23,11,-25,21,-17,19,-7,33,0,26,12,7,20,-15,16]);
  polygon(c,'#edb866',[-21,-20,-22,-32,-14,-30,-9,-20]);
  polygon(c,'#f6c86b',[-12,-19,8,-24,19,-16,14,-9,19,-5,33,0,29,6,15,9,5,5,-9,10,-18,0]);
  polygon(c,'#bd7840',[-15,0,1,-5,14,-9,8,4,-4,11,-16,10]);
  const jaw=voice*9+thrust*3;
  polygon(c,'#44272c',[4,7,28,5,22,12+jaw,7,14+jaw,-2,9]);
  polygon(c,'#eca555',[-5,8,8,12+jaw,24,8+jaw,19,16+jaw,4,19+jaw,-9,12]);
  polygon(c,'#ffe5a1',[3,0,16,-5,32,0,31,5,21,9,9,8]);
  polygon(c,'#482e32',[24,-2,35,-1,31,4,26,5]);
  polygon(c,'#fff6c2',[17,8,21,8,17,14+voice*2]);
  polygon(c,'#452e32',[1,-12,16,-14,11,-9,5,-8]);
  c.fillStyle='#fff3ae';c.fillRect(8,-12,4,2);
  for(let i=0;i<3;i++) stroke(c,'#a25b38',.65,[18,3+i,35+i*2,4+i*2]);
  if(t>6000 && t<SWEEP) spark(c,9,-11,1.6,'#ffec8b',birth*fade);
  c.restore();
}

function dunes(c,t,w,{reduced}) {
  const sun=smooth(t,1000,3550);
  skyWash(c,'#653b4e','#db9760',sun*.98);
  c.save();c.globalAlpha=sun;
  oval(c,212,68,46,46,'#ffce82');
  for(let i=0;i<3;i++){
    const ridge=[];
    for(let x=-100;x<=620;x+=8){
      const y=129+i*17+13*Math.sin(x/55+i*1.9)+7*Math.sin(x/95+.6);
      ridge.push(x,y);
    }
    polygon(c,['#b57859','#ab684c','#915747'][i],[...ridge,620,190,-100,190]);
    stroke(c,'#edb777',1,ridge);
  }
  for(let i=0;i<(reduced?9:26);i++){
    const k=(rand(i,41)+w/3200)%1;
    c.fillStyle='#edbd75';c.fillRect(100+rand(i,42)*230+32*k,148-36*k+6*Math.sin(i+k*4),2,1);
  }
  c.restore();
  const rise=smooth(t,1400,2850),r=4+7*rise+25*smooth(t,2500,4200);
  const x=169+35*rise,y=146-53*rise-22*Math.sin(Math.PI*rise);
  const crack=smooth(t,4200,5800);
  if(crack<1) {
    c.save();c.globalAlpha=1-crack;
    if(crack===0) jewel(c,x,y,r);
    else for(const side of [-1,1]) {
      c.save();c.translate(x+side*29*crack,y-10*crack);c.beginPath();c.rect(side<0?-r:0,-r,r,2*r);c.clip();jewel(c,0,0,r);c.restore();
    }
    c.restore();
  }
  lion(c,t);
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
  const age=w-contact,flight=eases.out(span(t,SWEEP,HOLD));
  const x=251+70*flight+(t>=HIT?14+109*eases.out(span(age,0,750)):0);
  const y=98+(foeY-98)*flight, fade=1-smooth(age,380,930);
  c.save();c.globalAlpha=fade;
  for(let i=2;i>=0;i--){
    const r=(6+flight*25)*(1-i*.18);
    c.save();c.translate(x-i*11,y);c.rotate(.52);
    const ribbon=c.createLinearGradient(-r,0,0,0);
    ribbon.addColorStop(0,'#d9894100');ribbon.addColorStop(1,'#ffde8a');
    c.fillStyle=ribbon;c.beginPath();c.moveTo(-r,-r);
    c.quadraticCurveTo(r*.82,0,-r,r);c.quadraticCurveTo(r*.48,0,-r,-r);c.fill();c.restore();
  }
  c.restore();
  if(age<0)return;
  c.save();const k=eases.out(span(age,0,710));c.globalAlpha=1-.68*smooth(age,700,1700);
  for(let i=0;i<(reduced?7:18);i++){
    const xx=324+k*(i*4+rand(i,44)*12),h=k*(15+rand(i,46)*27);
    polygon(c,'#b27345',[xx-3,181,xx+6,181-h*.54,xx+16,181-h,xx+11,181]);
    stroke(c,'#ffd986',.9,[xx-3,181,xx+6,181-h*.54,xx+16,181-h]);
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
    [6000,'睜瞳 · 獅王噙光',[211,84,2.5,-.03],[222,88,3.7,.015],'smooth'],
    [7250,'伏沙 · 暴風欲來',[314,156,2.35,.04],[334,162,3.7,.02],'out'],
    [SWEEP,'放吼 · 推沙成壁',[246,101,1.9,-.04],[311,151,2.15,.02],'out'],
    [HOLD,'屏息 · 砂刃臨身',[321,156,3.1,0],[323,157,3.18,0],'out'],
    [HIT,'震野 · 獅吼裂陣',[333,157,2.68,-.04],[358,152,2.15,.01],'out'],
    [10350,'落金 · 鬃歸沙海',[308,131,1.6,0],[251,121,1.1,0],'out'],
    [11450,'終幕 · 砂皇獅吼',[245,121,1.1,0],[247,120,1.18,0],'smooth']],
  close:[[0,1250],[6000,SWEEP],[HOLD,10350]],lines:[['h',SWEEP,HOLD]],flashes:[[HIT,190,.28,'#ffda8e']],
  shake:t=>t>=HIT?8*Math.exp(-(t-HIT)/220):t>=6000&&t<SWEEP?1.1*smooth(t,6000,7250):0,
  pose:(t,w,reduced)=>({hero:heroKeys(keys,t),foe:recoil(w-contact,smooth(t,6900,8150),45,14,reduced)}),
  back:dunes,front:roar
};
