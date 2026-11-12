import {draw} from './scene.js';
import {advance,newTrip,currentArea} from './adventure.js';
import {listen} from './mic.js';
import {battleScreenLock} from './screen.js';
import {realms,monsters,equipment,companions,newGame,available,travelingParty} from './catalog.js';
import {camp} from './camp.js';
import {countdown} from './countdown.js';
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
  const embed=link.replace('music.apple.com','embed.music.apple.com')+'?theme=dark';
  if($('player').src!==embed)$('player').src=embed;
  $('appleLink').href=link;$('playlist').value=link;
  save('playlist',link);
}
try{loadList(read('playlist')||defaultList);}catch{loadList(defaultList);}
$('playlistForm').onsubmit=event=>{
  event.preventDefault();
  try{loadList($('playlist').value);$('formError').textContent='';$('editor').open=false;}
  catch{$('formError').textContent='請在 Apple Music 的歌單選擇「分享播放列表」，複製完整的 music.apple.com 連結。';}
};
const saveKey = 'eight-realms-v1';
const data = read(saveKey) || newGame();
function persist() {
  save(saveKey, data);
}
const lobby = camp(data, persist);
let mic = null,
  running = false,
  pending = false,
  timer = 0,
  frame = 0,
  voice = false,
  lastTick = 0,
  lastSaved = 0,
  micPaused = 0,
  modeNotice = '',
  startAttempt = 0;
let party = travelingParty(data);
const keepScreenOn = battleScreenLock($('screenStatus'));
const modeDialog = $('modeDialog');
const modeCountdown = countdown($('modeCountdown'));

function musicDrawer(open) {
  document.body.classList.toggle('music-open', open);
  $('musicPanel').inert = !open;
  $('musicToggle').setAttribute('aria-expanded', String(open));
  (open ? $('closeMusic') : $('musicToggle')).focus({ preventScroll: true });
}
$('musicToggle').onclick = () => musicDrawer(!document.body.classList.contains('music-open'));
$('closeMusic').onclick = () => musicDrawer(false);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.classList.contains('music-open')) musicDrawer(false);
});
function focusBattle(on) {
  document.body.classList.toggle('on-quest', on);
  document.body.classList.remove('music-open');
  $('musicToggle').setAttribute('aria-expanded', 'false');
  for (const el of document.querySelectorAll('body > header, main > :not(.field)')) el.inert = on;
  keepScreenOn(on);
  if (on) $('musicToggle').focus({ preventScroll: true });
  else $('action').focus({ preventScroll: true });
}
function renderBattle() {
  const trip = data.runs[data.country],
    area = currentArea(trip),
    realm = realms[data.country];
  const foe = monsters[trip.foe],
    battle = trip.stage === 'battle';
  $('routeName').textContent =
    realm.name + ' · 第 ' + (Math.floor(trip.step / 3) + 1) + ' 區 · ' + area.element + '相';
  $('location').textContent = realm.land[area.land];
  $('teamNames').textContent = data.name + '　×　' + companions[data.partner - 1] + (party.length > 1 ? '　＋' + (party.length - 1) : '');
  $('phase').textContent = battle ? foe.type + '戰' : trip.stage === 'loot' ? '取得裝備' : '探索中';
  $('enemy').textContent = battle
    ? foe.name
    : trip.stage === 'loot'
      ? equipment[trip.drop].name
      : '前往' + realm.land[area.land];
  $('hp').max = trip.maxHp || 1;
  $('hp').value = battle ? trip.hp : 0;
  $('hpText').textContent = battle ? trip.hp + ' / ' + trip.maxHp : '—';
  const suspended = mic && (mic.context.state !== 'running' || mic.track.muted);
  $('battleHint').textContent = suspended
    ? '收音暫停，' + Math.max(1, Math.ceil(10 - micPaused)) + ' 秒後切換自動攻擊。'
    : battle
      ? (mic ? (voice ? '歌聲集氣' : '等待跟唱') : '自動攻擊') + ' · ' + trip.message
      : trip.stage === 'loot'
        ? '戰利品已收入全隊收藏，稍後自動' + (trip.step === 11 ? '從本國第一關重新遠征。' : '前往下一關。')
        : '與夥伴一起前進中。';
  if (modeNotice && !suspended) $('battleHint').textContent += ' · ' + modeNotice;
}
function automaticAttack(reason) {
  if (mic) {
    mic.track.onended = null;
    mic.close();
    mic = null;
  }
  voice = false;
  micPaused = 0;
  modeNotice = reason;
}
function tick() {
  if (!running) return;
  const now = performance.now(),
    dt = Math.min(0.25, (now - lastTick) / 1000);
  lastTick = now;
  if (data.story !== null) return;
  micPaused = mic && (mic.context.state !== 'running' || mic.track.muted) ? micPaused + dt : 0;
  if (micPaused >= 10) automaticAttack('收音暫停，已切換自動攻擊');
  voice = mic?.sample(dt) ?? false;
  const event = advance(data, dt, !mic || voice);
  if (event || now - lastSaved >= 3000) {
    persist();
    lastSaved = now;
  }
  if (event === 'chapter') {
    lobby.story(() => {
      if (!running) return;
      data.runs[data.country] ??= newTrip(data.country);
      party = travelingParty(data);
      persist();
      renderBattle();
    });
    return;
  }
  renderBattle();
}
function returnToCamp() {
  running = false;
  lobby.stopStory();
  clearInterval(timer);
  cancelAnimationFrame(frame);
  if (mic) {
    mic.track.onended = null;
    mic.close();
    mic = null;
  }
  voice = false;
  persist();
  lobby.refresh();
  focusBattle(false);
  $('status').textContent = '進度已保存。可繼續本國遠征，或從地圖前往其他國家。';
  if (data.story !== null && !document.hidden) lobby.story();
}
$('returnCamp').onclick = returnToCamp;
$('action').onclick = () => {
  if (!pending && !running && !modeDialog.open && data.story === null && available(data, data.country)) {
    modeDialog.showModal();
    modeCountdown.start(10, (seconds) => seconds + ' 秒後以高音質模式自動出發', () => startBattle(false));
  }
};
function closeMode() {
  modeCountdown.cancel();
  modeDialog.close();
}
$('cancelMode').onclick = closeMode;
modeDialog.addEventListener('cancel', () => modeCountdown.cancel());
modeDialog.addEventListener('close', () => modeCountdown.cancel());
$('singMode').onclick = () => startBattle(true);
$('qualityMode').onclick = () => startBattle(false);

async function startBattle(useMicrophone) {
  if (!modeDialog.open || pending || running) return;
  const attempt = ++startAttempt;
  closeMode();
  modeNotice = '';
  micPaused = 0;
  pending = true;
  $('action').disabled = true;
  $('status').textContent = useMicrophone ? '正在開啟麥克風…' : '正在出發…';
  document.querySelector('main').inert = true;
  document.querySelector('header').inert = true;
  try {
    let input = null;
    if (useMicrophone) {
      try {
        input = await listen();
      } catch {
        modeNotice = '麥克風未能啟用，已切換自動攻擊';
      }
    }
    if (attempt !== startAttempt) {
      input?.close();
      return;
    }
    mic = input;
    data.runs[data.country] ??= newTrip(data.country);
    persist();
    running = true;
    party = travelingParty(data);
    document.querySelector('main').inert = false;
    focusBattle(true);
    renderBattle();
    if (mic) mic.track.onended = () => automaticAttack('收音已中斷，已切換自動攻擊');
    lastTick = performance.now();
    lastSaved = lastTick;
    timer = setInterval(tick, 100);
    frame = requestAnimationFrame(animate);
  } catch (error) {
    if (attempt !== startAttempt) return;
    if (running) returnToCamp();
    $('status').textContent =
      error.name === 'NotAllowedError'
        ? '麥克風權限尚未開啟。可使用高音質模式。'
        : error.name === 'NotFoundError'
          ? '找不到麥克風。可接上麥克風或使用高音質模式。'
          : error.message;
  } finally {
    if (attempt === startAttempt) {
      pending = false;
      if (!running) {
        document.querySelector('main').inert = false;
        document.querySelector('header').inert = false;
        $('action').disabled = false;
      }
    }
  }
}
const lessMotion = matchMedia('(prefers-reduced-motion: reduce)');
let lastPaint = -100;
function animate(ms) {
  if (!running) return;
  if (ms - lastPaint > (lessMotion.matches ? 200 : 45)) {
    const trip = data.runs[data.country];
    draw({
      time: lessMotion.matches ? 0 : ms / 1000,
      country: data.country,
      area: currentArea(trip),
      loadouts: data.loadouts,
      party,
      stage: trip.stage,
      foe: monsters[trip.foe],
      strike: trip.strike
    });
    lastPaint = ms;
  }
  frame = requestAnimationFrame(animate);
}
window.addEventListener('pagehide', () => {
  closeMode();
  if (pending) {
    startAttempt++;
    pending = false;
    document.querySelector('main').inert = false;
    document.querySelector('header').inert = false;
    lobby.refresh();
  }
  if (running) returnToCamp();
  lobby.stopStory();
});
window.addEventListener('pageshow', () => {
  if (!running && data.story !== null && !$('story').open) lobby.story();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && running) persist();
});
