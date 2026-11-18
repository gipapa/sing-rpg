import {draw,portrait} from './scene.js';
import {advance,newTrip,currentArea,castSpell} from './adventure.js';
import {listen,microphoneSettings} from './mic.js';
import {battleScreenLock} from './screen.js';
import {realms,monsters,equipment,companions,newGame,available,travelingParty} from './catalog.js';
import {camp} from './camp.js';
import {battleDrums} from './drums.js';
import {songbook} from './songbook.js';
import {spellCinematic,hasCinematic} from './spell-cinematic.js';
import {legends} from './legends.js';
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
$('playlistForm').onsubmit=event=>{
  event.preventDefault();
  try{loadList($('playlist').value);$('formError').textContent='';$('editor').open=false;}
  catch{$('formError').textContent='請在 Apple Music 的歌單選擇「分享播放列表」，複製完整的 music.apple.com 連結。';}
};
const saveKey = 'eight-realms-v1';
const data = read(saveKey) || newGame();
data.legends ??= {};
const drums = battleDrums($('field'), data, showSpell);
const cinematic = spellCinematic($('spellDialog'));
let spellPlaying = false;
let cutInAnimation;
let cutInTimer;
function hideCutIn() {
  cutInAnimation?.cancel();
  clearTimeout(cutInTimer);
  $('spellCutIn').style.opacity = '';
}
async function showSpell(style) {
  if (!running || spellPlaying) return;
  const trip = data.runs[data.country];
  spellPlaying = true;
  drums.setPaused(true);
  hideCutIn();
  let completed;
  try {
    completed = data.simpleAnimations || !hasCinematic(style.spell)
      ? true
      : await cinematic.play(style, {
        country: data.country, area: currentArea(trip), gear: [...data.loadouts[0]],
        foe: trip.stage === 'battle' ? monsters[trip.foe] : null
      }, data.name);
  } finally {
    spellPlaying = false;
    drums.setPaused(false);
    lastTick = performance.now();
  }
  if (!completed || !running || data.runs[data.country] !== trip) return;
  const previousHp = trip.hp;
  const event = castSpell(data, style.spell);
  const damage = event ? previousHp - trip.hp : 0;
  $('cutInName').textContent = data.name;
  $('cutInSpell').textContent = style.spell.name;
  $('cutInDamage').textContent = damage ? '傷害 ' + damage : '';
  $('cutInPhoto').hidden = !data.heroPortrait;
  $('cutInPortrait').hidden = !!data.heroPortrait;
  if (data.heroPortrait) $('cutInPhoto').src = data.heroPortrait;
  else portrait($('cutInPortrait'), data.loadouts[0], 0, true);
  const panel = $('spellCutIn');
  panel.style.setProperty('--spell-color', style.color);
  if (data.simpleAnimations) {
    panel.style.opacity = '1';
    cutInTimer = setTimeout(hideCutIn, 800);
  } else {
    cutInAnimation = panel.animate([
      { opacity: 0, transform: lessMotion.matches ? 'none' : 'translateX(-20px)' },
      { opacity: 1, transform: 'none', offset: .12 },
      { opacity: 1, transform: 'none', offset: .78 },
      { opacity: 0, transform: lessMotion.matches ? 'none' : 'translateX(20px)' }
    ], { duration: 1200 });
  }
  handleBattleEvent(event, performance.now());
}
function persist() {
  save(saveKey, data);
}
// Camp-only skill preview: a demonstration duel that never touches battle, charge or progress.
function previewSpell(legend) {
  if (running || pending || spellPlaying) return;
  const country = legend.country;
  const foe = monsters.find((m) => m.country === country && m.base === 3);
  // Unowned weapons stay hidden: the hero keeps the current blade until the legend is found.
  const gear = [...data.loadouts[0]];
  if (data.legends[legend.index]) gear[2] = legend.id;
  return cinematic.play({ spell: legend.spell, tint: null, color: legend.color }, {
    country, area: { land: 3, element: realms[country].sub[0] }, gear, foe, foeName: '示範敵人・' + foe.name
  }, data.name);
}
const lobby = camp(data, persist, previewSpell);
const songbookUI = songbook();
let mic = null,
  running = false,
  pending = false,
  timer = 0,
  frame = 0,
  voice = false,
  lastTick = 0,
  lastSaved = 0,
  micPaused = 0,
  inputNotice = '',
  startAttempt = 0;
let party = travelingParty(data);
const keepScreenOn = battleScreenLock($('screenToggle'), $('screenStatus'));
let battleEntry = $('action');

function battleMenu(open) {
  $('battleTools').hidden = !open;
  $('battleMenuToggle').setAttribute('aria-expanded', String(open));
}
$('battleMenuToggle').onclick = () => battleMenu($('battleTools').hidden);
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.battle-tools, .battle-actions') && !$('battleTools').hidden) battleMenu(false);
});
function musicDrawer(open) {
  if (open && !$('player').hasAttribute('src')) {
    try { loadList(read('playlist') || defaultList); }
    catch { loadList(defaultList); }
  }
  $('musicPanel').hidden = !open;
  document.body.classList.toggle('music-open', open);
  $('musicPanel').inert = !open;
  $('musicToggle').setAttribute('aria-expanded', String(open));
  (open ? $('closeMusic') : $('battleTools').hidden ? $('battleMenuToggle') : $('musicToggle')).focus({ preventScroll: true });
}
$('musicToggle').onclick = () => musicDrawer(!document.body.classList.contains('music-open'));
$('closeMusic').onclick = () => musicDrawer(false);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.classList.contains('music-open')) musicDrawer(false);
  else if (event.key === 'Escape' && !$('battleTools').hidden) {
    battleMenu(false);
    $('battleMenuToggle').focus({ preventScroll: true });
  }
});
function focusBattle(on) {
  $('musicPanel').hidden = true;
  if (!on) $('player').removeAttribute('src');
  songbookUI.setBattle(on);
  document.body.classList.toggle('on-quest', on);
  document.body.classList.remove('music-open');
  battleMenu(false);
  $('musicToggle').setAttribute('aria-expanded', 'false');
  for (const el of document.querySelectorAll('body > header, main > :not(.field)')) el.inert = on;
  keepScreenOn(on);
  if (on) $('battleMenuToggle').focus({ preventScroll: true });
  else battleEntry.focus({ preventScroll: true });
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
      ? equipment[trip.drop].name + (trip.legend != null ? '　＋　傳說武器・' + legends[trip.legend].name : '')
      : '前往' + realm.land[area.land];
  $('hp').max = trip.maxHp || 1;
  $('hp').value = battle ? trip.hp : 0;
  $('hpText').textContent = battle ? trip.hp + ' / ' + trip.maxHp : '—';
  const suspended = mic && (mic.context.state !== 'running' || mic.track.muted);
  $('battleHint').textContent = suspended
    ? '收音暫停，' + Math.max(1, Math.ceil(10 - micPaused)) + ' 秒後切換自動攻擊。'
    : battle
      ? (mic ? (voice ? '聽音攻擊' : '等待聲音') : '自動攻擊') + ' · ' + trip.message
      : trip.stage === 'loot'
        ? '戰利品已收入全隊收藏，稍後自動' + (trip.step === 11 ? '從本國第一關重新遠征。' : '前往下一關。')
        : '與夥伴一起前進中。';
  if (inputNotice && !suspended) $('battleHint').textContent += ' · ' + inputNotice;
}
function automaticAttack(reason) {
  $('micStatus').hidden = true;
  drums.setMic(null);
  if (mic) {
    mic.track.onended = null;
    mic.close();
    mic = null;
  }
  voice = false;
  micPaused = 0;
  inputNotice = reason;
}
function tick() {
  if (!running) return;
  const now = performance.now(),
    dt = Math.min(0.25, (now - lastTick) / 1000);
  lastTick = now;
  if (data.story !== null) return;
  micPaused = mic && (mic.context.state !== 'running' || mic.track.muted) ? micPaused + dt : 0;
  if (micPaused >= 10) automaticAttack('收音暫停，已切換自動攻擊');
  if (spellPlaying) return;
  voice = mic?.sample(dt) ?? false;
  drums.sing(dt, voice);
  if (spellPlaying) return;
  const event = advance(data, dt, !mic || voice, mic?.cooldown ?? 0);
  handleBattleEvent(event, now);
}
function handleBattleEvent(event, now) {
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
  $('micStatus').hidden = true;
  cinematic.cancel();
  hideCutIn();
  drums.stop();
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
  lobby.refresh(battleEntry.id === 'settingsAction' ? 'settings' : 'map');
  focusBattle(false);
  departureStatus('進度已保存。可繼續本國遠征，或從地圖前往其他國家。');
  if (data.story !== null && !document.hidden) lobby.story();
}
$('returnCamp').onclick = returnToCamp;
function departureStatus(message) {
  $('status').textContent = message;
  $('settingsBattleStatus').textContent = message;
}
async function startBattle(event) {
  if (pending || running || data.story !== null || !available(data, data.country)) return;
  if ($('loadMicrophones').disabled) {
    departureStatus('請先完成麥克風清單讀取或關閉授權提示，再開始戰鬥。');
    return;
  }
  battleEntry = event.currentTarget;
  const useMicrophone = microphoneSettings(data).source !== 'none';
  const attempt = ++startAttempt;
  inputNotice = '';
  $('micStatus').hidden = true;
  $('micStatus').textContent = '';
  micPaused = 0;
  pending = true;
  $('action').disabled = true;
  $('settingsAction').disabled = true;
  departureStatus(useMicrophone ? '正在開啟麥克風…' : '正在出發…');
  document.querySelector('main').inert = true;
  document.querySelector('header').inert = true;
  try {
    const input = await listen(data);
    if (attempt !== startAttempt) {
      input?.close();
      return;
    }
    mic = input;
    if (mic) {
      $('micStatus').textContent = '瀏覽器回報收音：' + (mic.track.label || '未提供裝置名稱');
      $('micStatus').hidden = false;
    }
    data.runs[data.country] ??= newTrip(data.country);
    data.runs[data.country].soundCooldown = 0;
    persist();
    running = true;
    drums.start(mic);
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
    departureStatus(
      error.name === 'NotAllowedError'
        ? '麥克風權限尚未開啟。請允許收音，或在設定選擇「無麥克風」自動戰鬥。'
        : error.name === 'NotFoundError'
          ? '找不到麥克風。請確認連線，或在設定選擇「無麥克風」自動戰鬥。'
          : error.message);
  } finally {
    if (attempt === startAttempt) {
      pending = false;
      if (!running) {
        document.querySelector('main').inert = false;
        document.querySelector('header').inert = false;
        $('action').disabled = false;
        $('settingsAction').disabled = false;
      }
    }
  }
}
$('action').onclick = startBattle;
$('settingsAction').onclick = startBattle;
const lessMotion = matchMedia('(prefers-reduced-motion: reduce)');
let lastPaint = -100;
function animate(ms) {
  if (!running) return;
  drums.sample(ms);
  if (!spellPlaying && ms - lastPaint > (lessMotion.matches ? 200 : 45)) {
    const trip = data.runs[data.country];
    draw({
      time: lessMotion.matches ? 0 : ms / 1000,
      country: data.country,
      area: currentArea(trip),
      loadouts: data.loadouts,
      party,
      stage: trip.stage,
      foe: monsters[trip.foe],
      strike: trip.strike,
      drumEffect: drums.effect(ms)
    });
    lastPaint = ms;
  }
  frame = requestAnimationFrame(animate);
}
window.addEventListener('pagehide', () => {
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
