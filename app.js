import {draw,portrait} from './scene.js';
import {advance,newTrip} from './adventure.js';
import {listen} from './mic.js';
import {encounter,items,routes,slots,restore} from './catalog.js';
const $=id=>document.getElementById(id);
const defaultList='https://music.apple.com/tw/playlist/華語流行樂-重溫熱播/pl.6d8228f57b864a4296dc02d9761a0d9b';
function playlistURL(input){
  const url=new URL(input.trim());
  if(url.protocol!=='https:'||!['music.apple.com','embed.music.apple.com'].includes(url.hostname)
     ||!/^\/(?:[a-z]{2}\/)?playlist\/(?:[^/]+\/)?pl\.[\w-]+\/?$/i.test(url.pathname))throw Error('請貼上 Apple Music 的歌單分享連結。');
  return 'https://music.apple.com'+url.pathname;
}
function read(key){try{return JSON.parse(localStorage.getItem('sing-rpg.'+key));}catch{return null;}}
function save(key,value){try{localStorage.setItem('sing-rpg.'+key,JSON.stringify(value));}catch{/* Private browsing can limit storage. */}}
function loadList(raw){
  const link=playlistURL(raw);
  $('player').src=link.replace('music.apple.com','embed.music.apple.com')+'?theme=dark';
  $('appleLink').href=link;$('playlist').value=link;
  save('playlist',link);
}
try{loadList(read('playlist')||defaultList);}catch{loadList(defaultList);}
$('playlistForm').onsubmit=event=>{
  event.preventDefault();
  try{loadList($('playlist').value);$('formError').textContent='';$('editor').open=false;}
  catch{$('formError').textContent='請在 Apple Music 的歌單選擇「分享播放列表」，複製完整的 music.apple.com 連結。';}
};
const data=restore(read('save')||{});
let trip=data.current||newTrip(data.route), mic=null, pending=false, timer=0, frame=0, voice=false;
const clock=s=>[Math.floor(s/60),Math.floor(s%60)].map(n=>String(n).padStart(2,'0')).join(':');
function persist(){save('save',data);}
for(const route of routes)$('route').add(new Option(route.name,route.id));
$('route').value=data.current?.route||data.route;
$('route').onchange=()=>{
  data.route=$('route').value;trip=newTrip(data.route);persist();render();
};
function wardrobe(){
  $('loadout').replaceChildren();
  for(const [slot,title] of Object.entries(slots)){
    const label=document.createElement('label'), select=document.createElement('select');
    label.textContent=title;
    for(const id of data.owned.filter(id=>items[id].slot===slot))
      select.add(new Option(items[id].name,id));
    select.value=data.equipped[slot];
    select.onchange=()=>{data.equipped[slot]=select.value;persist();showGear();};
    label.append(select);$('loadout').append(label);
  }
  showGear();
}
function showGear(){
  portrait(data.equipped);
  $('gearName').textContent=items[data.equipped.body].name+' · '+items[data.equipped.weapon].name;
  $('collection').textContent='已收藏 '+(data.owned.length-4)+' / 9 件遠征寶物';
}
function showAtlas(){
  $('atlas').replaceChildren();
  for(const route of routes){
    const section=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('ol');
    heading.textContent=route.name;
    for(const [place,name,,id] of route.stops){
      const li=document.createElement('li'), title=document.createElement('strong'), detail=document.createElement('small');
      title.textContent=place+' · '+name+(list.children.length===2?'（王）':'');
      detail.textContent=items[id].name+' ／ '+slots[items[id].slot]+(data.owned.includes(id)?'　已收藏':'');
      li.append(title,detail);list.append(li);
    }
    section.append(heading,list);$('atlas').append(section);
  }
}
function focusBattle(on){
  document.body.classList.toggle('on-quest',on);
  for(const el of document.querySelectorAll('body > header, main > :not(.field)'))el.inert=on;
  if(on)$('returnCamp').focus({preventScroll:true});
  else $('action').focus({preventScroll:true});
}
function render(){
  const active=!!mic||!!data.current;
  const view=active?trip:data.last||trip;
  const stage=active?trip.stage:'camp', foe=encounter(active?trip:newTrip(data.route));
  $('routeName').textContent=foe.route.name;
  $('location').textContent=foe.place;
  $('phase').textContent=({camp:'營地待命',travel:'探索中',battle:foe.boss?'首領戰':'交戰中',loot:'取得寶物'})[stage];
  $('enemy').textContent=stage==='battle'?foe.name:stage==='loot'?items[foe.relic].name:stage==='travel'?'前往'+foe.place:'等待出發';
  $('hp').max=trip.maxHp||1;$('hp').value=stage==='battle'?trip.hp:0;
  $('hpText').textContent=stage==='battle'?trip.hp+' / '+trip.maxHp:'—';
  $('time').textContent=clock(view.elapsed);$('kills').textContent=view.kills;$('drops').textContent=view.drops;
  $('level').textContent='Lv. '+String(1+Math.floor(data.total/3)).padStart(2,'0');
  $('action').textContent=pending?'正在開啟麥克風…':data.current?'繼續戰鬥 →':'開始戰鬥 →';
  $('action').disabled=pending;$('route').disabled=active||pending;
  if(data.last)$('history').textContent='上次回營　'+clock(data.last.elapsed)+'　·　擊敗 '+data.last.kills+' 隻魔物　·　取得 '+data.last.drops+' 件戰利品';
}
function tick(){
  if(!mic)return;
  const now=performance.now(), dt=Math.min(.25,(now-lastTick)/1000);
  lastTick=now;voice=mic.sample(dt);
  if(advance(trip,dt,voice)){
    data.total++;
    const drop=encounter(trip).relic;
    if(!data.owned.includes(drop)){data.owned.push(drop);wardrobe();showAtlas();}
    persist();
  }
  if(Math.floor(trip.elapsed)!==lastSecond){
    lastSecond=Math.floor(trip.elapsed);
    if(lastSecond%5===0)persist();
  }
  const suspended=mic.context.state!=='running'||mic.track.muted;
  const state=suspended?'收音已暫停，請停車後回到網頁。':trip.stage==='loot'?'戰利品已收入背包。':trip.stage==='battle'?(voice?'歌聲集氣中，自動出招。':'等待跟唱，攻擊進度已保留。'):'旅人正在山徑上前進。';
  $('battleHint').textContent=state;
  render();
}
let lastTick=0,lastSecond=-1;
function detach(){
  clearInterval(timer);
  const old=mic;mic=null;
  if(old){old.track.onended=null;old.close();}
  voice=false;
}
function pause(){
  if(!mic)return;
  detach();persist();render();focusBattle(false);
  $('status').textContent='冒險進度已保存，停好車後可繼續。';
}
$('returnCamp').onclick=()=>{
  if(!mic)return;
  detach();data.last={...trip};data.current=null;persist();render();focusBattle(false);
  $('status').textContent='已回到營地，可以在旅人裝備裡換上戰利品。';
};
$('action').onclick=async()=>{
  if(pending)return;
  if(mic)return;
  pending=true;render();
  try{
    mic=await listen();
    trip=data.current||newTrip(data.route);data.current=trip;persist();
    focusBattle(true);
    mic.track.onended=pause;lastTick=performance.now();timer=setInterval(tick,100);
  }catch(error){
    $('status').textContent=error.name==='NotAllowedError'?'麥克風權限尚未開啟。請在瀏覽器網站設定允許麥克風，再按開始。':error.name==='NotFoundError'?'找不到麥克風。接上收音裝置後可再試一次。':'無法開始收音。請確認麥克風可用，再重新開始。';
  }finally{pending=false;render();}
};
const lessMotion=matchMedia('(prefers-reduced-motion: reduce)');
let lastPaint=-100;
function animate(ms){
  if(ms-lastPaint>(lessMotion.matches?200:45)){
    draw({time:lessMotion.matches?0:ms/1000,gear:data.equipped,stage:mic?trip.stage:'camp',foe:encounter(mic||data.current?trip:newTrip(data.route)),strike:mic?trip.strike:0});
    lastPaint=ms;
  }
  frame=requestAnimationFrame(animate);
}
window.addEventListener('pagehide',()=>{pause();cancelAnimationFrame(frame);});
window.addEventListener('pageshow',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(animate);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&data.current)persist();});
wardrobe();showAtlas();render();frame=requestAnimationFrame(animate);
if(data.current)$('status').textContent='上次離開時已存檔，可以從這裡繼續。';
