import {items} from './catalog.js';
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
function hero(c,x,y,gear,attack,step){
  c.save();c.translate(Math.round(x),Math.round(y));const cloak=items[gear.body].color;
  rect(c,-8,-23,10,14,cloak);rect(c,-10,-12,11,5,cloak);rect(c,-12,-9,9,3,cloak);
  rect(c,-5,-10,4,9,'#28323f');rect(c,2,-9,4,8,'#28323f');
  rect(c,-6,-2-step,5,2,'#121e29');rect(c,2,-2+step,6,2,'#121e29');
  rect(c,-4,-23,9,14,'#4a5966');rect(c,-4,-21,8,5,gear.body==='gold'?'#d7b575':'#91acac');
  rect(c,-5,-12,11,3,'#9e7050');rect(c,-1,-12,3,2,'#ebce88');
  rect(c,-5,-31,11,8,'#374051');rect(c,-2,-29,9,7,'#dca780');rect(c,5,-27,2,2,'#283446');
  if(gear.head==='bare'){rect(c,-5,-32,10,4,'#845743');rect(c,-5,-29,3,5,'#714c41');}
  else{rect(c,-5,-32,11,4,'#748b94');rect(c,-6,-29,14,2,'#aac1bc');rect(c,-6,-30,3,7,'#627480');}
  if(gear.head==='antlers'){for(const s of [-1,1]){rect(c,s*5,-35,2,6,'#e7d8ad');rect(c,s*7,-37,2,4,'#e7d8ad');}}
  if(gear.head==='feather'){for(let i=0;i<4;i++)rect(c,-8+i,-38+i,2,8-i,'#a2dcf7');}
  if(gear.head==='crown'){rect(c,-6,-33,14,3,'#c3eff9');for(const dx of [-6,0,6])rect(c,dx,-36,2,5,'#c3eff9');}
  if(gear.body==='gold'){rect(c,-7,-23,6,5,'#f6d290');rect(c,-4,-15,9,2,'#ac8249');}
  if(gear.body==='ash')rect(c,-10,-11,7,2,'#ffbd74');
  rect(c,4,-20,4,7,'#a3aeb2');rect(c,7,-16,4,3,'#d6a07b');
  c.translate(9,-14);c.rotate(attack?1.14:.42);
  const length={sword:16,frost:18,star:22,tide:24}[gear.weapon];
  if(gear.weapon==='tide'){
    rect(c,0,-length,2,length,'#9c805e');rect(c,-2,-length,5,7,items.tide.color);rect(c,0,-length-3,2,4,'#c7f7e9');
  }else{
    rect(c,-1,-length,gear.weapon==='star'?4:3,length,items[gear.weapon].color);
    if(gear.weapon==='frost')rect(c,-3,-9,2,4,'#72cbd9');
  }
  rect(c,-3,-1,7,2,'#d9b47c');rect(c,0,1,2,3,'#82644d');c.restore();
}
// Pixel silhouettes share a small palette and scale to any viewport.
const sprites={
  wolf:['    A     A','    AA   AA','    ADDDDAA','  DDDDLLDDD','DDDDDDDDEDDA',' DDDDDDD  DD','  DD  DD','  AA  AA'],
  guard:['    LLL','   DLLLD','   DEEED','   DDDDD','  ALLLLLA',' AADDDDDAD','   DLLLD','   DD DD','   AA AA'],
  stag:['A A     A A',' AA     AA','  AA   AA','   DLLLD','   DEDED','   LLLLL','  DLLLLLD','  ADLLLDA','   DDDDD','   LL LL','   AA AA'],
  owl:[' A     A',' DA   AD',' DDLLLDD',' DELLLED',' DDLALDD','ADDDLLDDA',' ADDDDDA','   A A'],
  crab:['AA       AA','AAD     DAA',' DD DLL DDD','  DLELED D',' AADLLLDAA','A AADDDDA A',' A A   A A'],
  queen:['  L  L  L','  LLLLLLL','   LDDDL','   DEDED','   DLLLD','  DLLLLLD','  LDDDDDL',' DDLDDDLDD','DDLLLLLLLDD'],
  lizard:['      A A','    DDDDDDA','   DDLLLEDD','A DDDLLL  D',' ADDLLLDD','  DA   DA'],
  golem:['    DLD','   DDEDD',' DDDLLLDDD','DDDLLLLLDDD','AADDDEDDAAA',' ADLLLLDA','  DD   DD',' AAA   AAA'],
  dragon:[' A      A  A',' DA     ADDA',' DDA   DDEEDA',' DDLA DDDDD','ADDDDLLLLD',' ADDLLLLLDA','  DDLLLLDD',' ADDD  DD','AADAA  AAA']
};
const skins={wolf:['#445d59','#90a678'],guard:['#485865','#879a99'],stag:['#505864','#c7b69a'],owl:['#707eaa','#d3e9f4'],crab:['#347891','#77d6d9'],queen:['#719ab7','#d1f4ee'],lizard:['#985747','#ed995f'],golem:['#725554','#e1a067'],dragon:['#8a5149','#ecc37b']};
function monster(x,y,foe,t,hit){
  const rows=sprites[foe.kind];
  const [shade,lit]=skins[foe.kind];
  const colors={A:'#34414c',D:hit?'#eeb79e':shade,L:hit?'#ffe1b3':lit,E:'#ffe396'};
  const scale=foe.boss?5:3;
  const offset=Math.floor(Math.max(...rows.map(row=>row.length))*scale/2);
  const top=y-rows.length*scale+Math.round(Math.sin(t*2));
  rows.forEach((row,iy)=>{for(let ix=0;ix<row.length;ix++){
    if(colors[row[ix]])rect(ctx,x-offset+ix*scale,top+iy*scale,scale,scale,colors[row[ix]]);
  }});
}
export function draw({time,gear,stage,foe,strike}){
  ctx.drawImage(vistas[foe.route.id],0,0);
  for(const [x,y,phase] of fireflies)if(Math.sin(time+phase)>.15)rect(ctx,x+Math.sin(time*.55+phase)*3,y+Math.cos(time*.6+phase)*2,1,1,'#ffe29c');
  const fighting=stage==='battle', walking=stage==='travel';
  const hx=fighting?214:217+(walking?Math.sin(time*1.4)*3:0);
  const reach=strike>0?Math.sin(Math.min(1,strike/.45)*Math.PI):0;
  rect(ctx,hx-11,177,26,2,'#39443e');
  hero(ctx,hx+reach*22,178,gear,reach>.2,walking?Math.round(Math.sin(time*8)):0);
  if(fighting){monster(259+reach*2,178,foe,time,reach>.5);if(reach>.3){rect(ctx,239,154,11,2,'#f8e5ac');rect(ctx,246,150,3,3,'#f8e5ac');}}
  if(stage==='loot'){disk(ctx,245,163+Math.round(Math.sin(time*2)),8,'#b48c4f');rect(ctx,243,157,4,11,'#ffe5a4');}
}
export function portrait(gear){
  const c=document.querySelector('#portrait').getContext('2d');c.clearRect(0,0,40,44);hero(c,17,42,gear,false,0);
}
