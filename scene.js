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
export const gearNames=['旅人斗篷','苔光披肩','霜刃短劍','銀角戰盔','星焰長劍','暮金鎧甲'];
const cloaks=['#bc694c','#64a28c','#568d90','#717297','#856797','#c09b56'];
function hero(c,x,y,gear,attack,step){
  c.save();c.translate(Math.round(x),Math.round(y));const cloak=cloaks[gear];
  rect(c,-8,-23,10,14,cloak);rect(c,-10,-12,11,5,cloak);rect(c,-12,-9,9,3,cloak);
  rect(c,-5,-10,4,9,'#28323f');rect(c,2,-9,4,8,'#28323f');
  rect(c,-6,-2-step,5,2,'#121e29');rect(c,2,-2+step,6,2,'#121e29');
  rect(c,-4,-23,9,14,'#4a5966');rect(c,-4,-21,8,5,gear===5?'#d7b575':'#91acac');
  rect(c,-5,-12,11,3,'#9e7050');rect(c,-1,-12,3,2,'#ebce88');
  rect(c,-5,-31,11,8,'#374051');rect(c,-2,-29,9,7,'#dca780');rect(c,5,-27,2,2,'#283446');
  rect(c,-5,-32,11,4,'#748b94');rect(c,-6,-29,14,2,'#aac1bc');rect(c,-6,-30,3,7,'#627480');
  if(gear>=3){for(const s of [-1,1]){rect(c,s*5,-35,2,6,'#e7d8ad');rect(c,s*7,-37,2,4,'#e7d8ad');}}
  rect(c,4,-20,4,7,'#a3aeb2');rect(c,7,-16,4,3,'#d6a07b');
  c.translate(9,-14);c.rotate(attack?1.14:.42);
  rect(c,-1,-(gear>=4?21:16),3,16+(gear>=4?5:0),gear>=4?'#ffcb78':gear>=2?'#b4edf2':'#cad0c0');
  rect(c,-3,-1,7,2,'#d9b47c');rect(c,0,1,2,3,'#82644d');c.restore();
}
function monster(x,y,boss,t,hit){
  const lift=Math.round(Math.sin(t*2)*1.5);
  ctx.save();ctx.translate(Math.round(x),y+lift);
  if(boss)ctx.scale(1.55,1.55);
  const shadow=hit?'#d79582':'#485865',steel=hit?'#f4c9a6':'#879a99';
  rect(ctx,-9,-22,18,16,shadow);rect(ctx,-12,-18,24,9,shadow);
  rect(ctx,-7,-8,5,8,'#27313b');rect(ctx,4,-8,5,8,'#27313b');
  rect(ctx,-9,-29,17,12,steel);rect(ctx,-11,-24,21,3,'#485461');
  rect(ctx,-6,-23,3,2,'#ffd890');rect(ctx,3,-23,3,2,'#ffd890');
  for(const s of [-1,1]){rect(ctx,s*7,-33,3,7,'#c9b799');rect(ctx,s*10,-36,3,6,'#c9b799');if(boss)rect(ctx,s*13,-40,3,7,'#c9b799');}
  rect(ctx,-6,-16,11,4,steel);rect(ctx,-4,-15,3,3,'#e9ba75');ctx.restore();
}
export function draw({time,gear,stage,boss,strike}){
  ctx.drawImage(backdrop,0,0);
  for(const [x,y,phase] of fireflies)if(Math.sin(time+phase)>.15)rect(ctx,x+Math.sin(time*.55+phase)*3,y+Math.cos(time*.6+phase)*2,1,1,'#ffe29c');
  const fighting=stage==='battle', walking=stage==='travel';
  const hx=fighting?210:172+(walking?Math.sin(time*1.4)*3:0);
  const reach=strike>0?Math.sin(Math.min(1,strike/.45)*Math.PI):0;
  rect(ctx,hx-11,177,26,2,'#39443e');
  hero(ctx,hx+reach*22,178,gear,reach>.2,walking?Math.round(Math.sin(time*8)):0);
  if(fighting){monster(255+reach*2,178,boss,time,reach>.5);if(reach>.3){rect(ctx,239,154,11,2,'#f8e5ac');rect(ctx,246,150,3,3,'#f8e5ac');}}
  if(stage==='loot'){disk(ctx,245,163+Math.round(Math.sin(time*2)),8,'#b48c4f');rect(ctx,243,157,4,11,'#ffe5a4');}
}
export function portrait(gear){
  const c=document.querySelector('#portrait').getContext('2d');c.clearRect(0,0,40,44);hero(c,17,42,gear,false,0);
}
