import {draw,portrait,gearNames} from './scene.js';
import {advance,newTrip,isBoss} from './adventure.js';
import {listen} from './mic.js';
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
const initial={gear:0,total:0,last:null,current:null};
const data=Object.assign(initial,read('save'));
let trip=data.current||newTrip(), mic=null, pending=false, timer=0, frame=0, voice=false;
const clock=s=>[Math.floor(s/60),Math.floor(s%60)].map(n=>String(n).padStart(2,'0')).join(':');
function persist(){save('save',data);}
function render(){
  const active=!!mic||!!data.current;
  const view=active?trip:data.last||trip;
  const stage=active?trip.stage:'camp';
  $('phase').textContent=({camp:'營地待命',travel:'探索中',battle:'交戰中',loot:'裝備掉落'})[stage];
  $('enemy').textContent=stage==='battle'?(isBoss(trip)?'鹿角騎士 · 王':'霧林守衛'):stage==='loot'?'找到戰利品':stage==='travel'?'穿越霧林':'等待出發';
  $('hp').max=trip.maxHp||1;$('hp').value=stage==='battle'?trip.hp:0;
  $('hpText').textContent=stage==='battle'?trip.hp+' / '+trip.maxHp:'—';
  $('time').textContent=clock(view.elapsed);$('kills').textContent=view.kills;$('drops').textContent=view.drops;
  const level=1+Math.floor(data.total/3);
  $('level').textContent='Lv. '+String(level).padStart(2,'0');
  $('gearName').textContent=gearNames[data.gear];
  $('collection').textContent=data.gear?'已收藏 '+data.gear+' / '+(gearNames.length-1)+' 件外觀 · 累計擊敗 '+data.total+' 隻魔物':'打倒魔物，收集裝備與外觀。';
  portrait(data.gear);
  $('action').textContent=pending?'正在開啟麥克風…':mic?'結束冒險並回營':data.current?'繼續這趟冒險 →':'開始冒險 →';
  $('action').disabled=pending;
  if(data.last)$('history').textContent='上次回營　'+clock(data.last.elapsed)+'　·　擊敗 '+data.last.kills+' 隻魔物　·　取得 '+data.last.drops+' 件戰利品';
}
function tick(){
  if(!mic)return;
  const now=performance.now(), dt=Math.min(.25,(now-lastTick)/1000);
  lastTick=now;voice=mic.sample(dt);
  if(advance(trip,dt,voice)){
    data.total++;data.gear=Math.min(gearNames.length-1,data.total);
    persist();
  }
  if(Math.floor(trip.elapsed)!==lastSecond){
    lastSecond=Math.floor(trip.elapsed);
    if(lastSecond%5===0)persist();
  }
  const suspended=mic.context.state!=='running'||mic.track.muted;
  const state=suspended?'收音已暫停，請停車後回到網頁。':trip.stage==='loot'?'戰利品已收入背包。':trip.stage==='battle'?(voice?'歌聲集氣中，自動出招。':'等待跟唱，攻擊進度已保留。'):'旅人正在山徑上前進。';
  if($('status').textContent!==state)$('status').textContent=state;
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
  detach();persist();render();
  $('status').textContent='冒險進度已保存，停好車後可繼續。';
}
$('action').onclick=async()=>{
  if(pending)return;
  if(mic){
    detach();data.last={...trip};data.current=null;persist();render();
    $('status').textContent='已回到營地，這趟取得的裝備會帶到下次冒險。';return;
  }
  pending=true;render();
  try{
    mic=await listen();
    trip=data.current||newTrip();data.current=trip;persist();
    mic.track.onended=pause;lastTick=performance.now();timer=setInterval(tick,100);
  }catch(error){
    $('status').textContent=error.name==='NotAllowedError'?'麥克風權限尚未開啟。請在瀏覽器網站設定允許麥克風，再按開始。':error.name==='NotFoundError'?'找不到麥克風。接上收音裝置後可再試一次。':'無法開始收音。請確認麥克風可用，再重新開始。';
  }finally{pending=false;render();}
};
const lessMotion=matchMedia('(prefers-reduced-motion: reduce)');
let lastPaint=-100;
function animate(ms){
  if(ms-lastPaint>(lessMotion.matches?200:45)){
    draw({time:lessMotion.matches?0:ms/1000,gear:data.gear,stage:mic?trip.stage:'camp',boss:isBoss(trip),strike:mic?trip.strike:0});
    lastPaint=ms;
  }
  frame=requestAnimationFrame(animate);
}
window.addEventListener('pagehide',()=>{pause();cancelAnimationFrame(frame);});
window.addEventListener('pageshow',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(animate);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&data.current)persist();});
render();frame=requestAnimationFrame(animate);
if(data.current)$('status').textContent='上次離開時已存檔，可以從這裡繼續。';
