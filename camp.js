import {
  realms,
  available,
  roster,
  travelingParty,
  completedRuns,
  companions,
  skills,
  skillText,
  startingGear,
  slots,
  monsters,
  equipment,
  elements,
  recruitmentLines
} from './catalog.js';
import { portrait, journalIcon, storyScene } from './scene.js';
import { countdown } from './countdown.js';
import { drumSpells, drumColors, drumStyle } from './drum-spells.js';
import { drumVolume } from './drums.js';
import { echoSettings, microphoneSettings, listMicrophones, microphoneSession } from './mic.js';
import { legends, LEGEND_DROP_RATE, LEGEND_DAMAGE, isLegendId, equippedLegend, equipLegend, unequipLegend, legendIcon } from './legends.js';
import { hasCinematic } from './spell-plans.js';

const $ = (id) => document.getElementById(id);
const characterName = (game, id) => (id === 0 ? game.name : companions[id - 1]);
function button(label, action) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  el.onclick = action;
  return el;
}
function selected(el, on) {
  el.setAttribute('aria-pressed', String(on));
}
export function camp(game, persist, previewSpell = () => {}) {
  function renderHeroPortrait() {
    $('heroPhotoPreview').hidden = !game.heroPortrait;
    $('heroPortraitPreview').hidden = !!game.heroPortrait;
    if (game.heroPortrait) $('heroPhotoPreview').src = game.heroPortrait;
    else portrait($('heroPortraitPreview'), game.loadouts[0], 0, true);
  }
  renderHeroPortrait();
  $('heroPortraitFile').onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    $('heroPortraitFile').disabled = true;
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const size = Math.min(bitmap.width, bitmap.height);
      canvas.getContext('2d').drawImage(bitmap,
        (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 256, 256);
      const image = canvas.toDataURL('image/jpeg', .85);
      // Verify storage before replacing the current portrait.
      localStorage.setItem('sing-rpg.eight-realms-v1', JSON.stringify({ ...game, heroPortrait: image }));
      game.heroPortrait = image;
      persist();
      renderHeroPortrait();
      $('portraitStatus').textContent = '已儲存，放招時會使用這張圖片。';
    } catch {
      $('portraitStatus').textContent = '圖片無法讀取或儲存，請換一張較小的圖片再試。';
    } finally {
      bitmap?.close();
      $('heroPortraitFile').disabled = false;
      $('heroPortraitFile').value = '';
    }
  };
  $('resetHeroPortrait').onclick = () => {
    delete game.heroPortrait;
    persist();
    renderHeroPortrait();
    $('portraitStatus').textContent = '已改用角色外觀。';
  };
  const input = microphoneSettings(game);
  const source = $('micSource');
  if (input.source.startsWith('device:')) {
    source.add(new Option(game.micSourceLabel || '已選麥克風（可重新讀取清單）', input.source));
  }
  source.value = input.source;
  source.onchange = () => {
    game.micSource = source.value;
    game.micSourceLabel = source.selectedOptions[0].textContent;
    persist();
  };
  for (const [id, value] of [['micSessionType', input.session], ['micLatencyHint', input.latency]]) {
    $(id).value = value;
    $(id).onchange = () => { game[id] = $(id).value; persist(); };
  }
  for (const [id, value] of [['micEchoCancellation', input.echoCancellation],
    ['micNoiseSuppression', input.noiseSuppression], ['micAutoGainControl', input.autoGainControl]]) {
    $(id).checked = value;
    $(id).onchange = () => { game[id] = $(id).checked; persist(); };
  }
  $('loadMicrophones').onclick = async () => {
    $('loadMicrophones').disabled = true;
    $('micDevicesStatus').textContent = '正在讀取麥克風，可能需要授權…';
    const restore = microphoneSession(navigator, 'auto');
    try {
      const devices = await listMicrophones();
      const selected = source.value;
      // Keep a saved, disconnected input visible so refreshing never silently
      // replaces the user's selection with the system default.
      const savedLabel = source.selectedOptions[0].textContent;
      source.replaceChildren(new Option('無麥克風（自動戰鬥）', 'none'),
        new Option('系統預設麥克風', 'default'), new Option('手機／裝置內建麥克風', 'phone'));
      for (const device of devices) {
        source.add(new Option(device.label || '未命名麥克風', 'device:' + device.deviceId));
      }
      if (selected.startsWith('device:') && ![...source.options].some(option => option.value === selected)) {
        source.add(new Option(savedLabel, selected));
      }
      source.value = selected;
      $('micDevicesStatus').textContent = devices.length
        ? '清單已更新，請選擇手機或車機麥克風。讀取完成後已停止暫時收音。'
        : '瀏覽器沒有提供可指定的麥克風。可使用系統預設，或換瀏覽器重試。';
    } catch (error) {
      $('micDevicesStatus').textContent = error.name === 'NotAllowedError'
        ? '麥克風權限未開啟，無法讀取清單。' : error.message;
    } finally {
      restore();
      $('loadMicrophones').disabled = false;
    }
  };
  for (const [id, value, format] of [
    ['micThreshold', input.threshold, value => value + '%'],
    ['micCooldown', input.cooldown, value => (value / 1000).toFixed(1) + ' 秒']
  ]) {
    $(id).value = value;
    const show = () => { $(id + 'Value').value = format(Number($(id).value)); };
    show();
    $(id).oninput = () => { game[id] = Number($(id).value); show(); persist(); };
  }
  const echo = echoSettings(game);
  $('echoEnabled').checked = echo.enabled;
  $('echoDelay').value = echo.delay;
  function updateEcho() {
    $('echoDelayValue').value = $('echoDelay').value + ' ms';
  }
  updateEcho();
  $('echoEnabled').onchange = () => {
    game.echoEnabled = $('echoEnabled').checked;
    persist();
  };
  $('echoDelay').oninput = () => {
    game.echoDelay = Number($('echoDelay').value);
    updateEcho();
    persist();
  };
  const volume = $('drumVolume');
  volume.value = drumVolume(game);
  function showVolume() {
    $('drumVolumeValue').value = volume.value + '%';
  }
  showVolume();
  volume.oninput = () => {
    game.drumVolume = Number(volume.value);
    showVolume();
    persist();
  };
  const simpleAnimations = $('simpleAnimations');
  simpleAnimations.checked = !!game.simpleAnimations;
  simpleAnimations.onchange = () => {
    game.simpleAnimations = simpleAnimations.checked;
    persist();
  };
  for (const [id, options, selected] of [
    ['drumSpell', drumSpells, drumStyle(game).spell],
    ['drumColor', drumColors, drumStyle(game).tint]
  ]) {
    const select = $(id);
    for (const option of options) select.add(new Option(option.name, option.id));
    select.value = selected.id;
    select.onchange = () => { game[id] = select.value; persist(); };
  }
  let tab = 'map',
    preview = game.country,
    member = 0,
    isMonster = true,
    legendBook = false,
    page = 0;
  const pins = realms.map((realm, id) => {
    const pin = button(realm.name, () => {
      preview = id;
      if (available(game, id)) {
        game.country = id;
        persist();
      }
      renderMap();
    });
    pin.className = 'map-pin';
    pin.style.left = realm.xy[0] + '%';
    pin.style.top = realm.xy[1] + '%';
    $('worldMap').append(pin);
    $('bookCountry').add(new Option(realm.name, id));
    return pin;
  });
  function collectionProgress(country) {
    const rates = [[monsters, game.seen], [equipment, game.owned]].map(([entries, known]) => {
      const local = entries.filter(entry => entry.country === country);
      return local.filter(entry => !!known[entry.id]).length / local.length;
    });
    return Math.floor((rates[0] + rates[1]) * 5000) / 100 + '%';
  }
  function renderMap() {
    const realm = realms[preview],
      run = game.runs[preview],
      open = available(game, preview);
    $('worldProgress').textContent = '已通關 ' + game.cleared.length + ' / 8 國';
    $('realmNumber').textContent = 'REALM ' + String(preview + 1).padStart(2, '0') + ' / 08';
    $('realmName').textContent = realm.name + ' · ' + collectionProgress(preview);
    $('affinities').replaceChildren(
      ...[realm.el + '主屬', ...[...realm.sub].map((e) => e + '相')].map((value) => {
        const tag = document.createElement('span');
        tag.textContent = value;
        return tag;
      })
    );
    $('realmInfo').textContent = '穿越四處地標，在' + realm.land[3] + '挑戰' + realm.boss + '。';
    $('routeState').textContent = open
      ? (game.cleared.includes(preview) ? '已通關 · 可重遊' : '可遠征') +
        (run
          ? '　／　' +
            run.areas[Math.floor(run.step / 3)].element +
            '相' +
            realm.land[run.areas[Math.floor(run.step / 3)].land] +
            ' · 第 ' +
            ((run.step % 3) + 1) +
            ' 戰'
          : '')
      : preview === 7
        ? '集齊前七國線索後開放'
        : '苔冠王國通關後開放';
    $('action').disabled = !open;
    $('action').textContent = !open ? '尚未開放' : run ? '繼續戰鬥 →' : '開始戰鬥 →';
    $('settingsAction').disabled = !available(game, game.country);
    $('landmarks').replaceChildren(
      ...realm.land.map((land, i) => {
        const li = document.createElement('li'),
          name = document.createElement('strong'),
          sub = document.createElement('small');
        name.textContent = land;
        sub.textContent = i === 3 ? '國主所在' : Array.from(realm.sub).join(' ／ ');
        li.append(name, sub);
        return li;
      })
    );
    pins.forEach((pin, id) => {
      pin.textContent = realms[id].name + ' ' + collectionProgress(id);
      selected(pin, id === preview);
      pin.classList.toggle('locked', !available(game, id));
      pin.classList.toggle('cleared', game.cleared.includes(id));
      pin.title =
        realms[id].name +
        ' · 圖鑑收集 ' + collectionProgress(id) + '（裝備與敵人平均） · ' +
        (game.cleared.includes(id) ? '已通關' : available(game, id) ? '可遠征' : '尚未開放');
    });
  }
  function renderSummary() {
    const party = travelingParty(game);
    portrait($('leaderSprite'), game.loadouts[0], 0);
    $('playerName').textContent = game.name;
    $('playerLevel').textContent = 'Lv. ' + (1 + Math.floor(game.total / 3));
    const sprites = party.map((id) => {
      const canvas = document.createElement('canvas');
      canvas.width = 42;
      canvas.height = 46;
      canvas.title = characterName(game, id);
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', canvas.title);
      portrait(canvas, game.loadouts[id], id);
      return canvas;
    });
    if (party.length > 3) {
      const more = document.createElement('small');
      more.className = 'party-overflow';
      more.textContent = '+' + (party.length - 3);
      more.title = party
        .slice(3)
        .map((id) => characterName(game, id))
        .join('、');
      sprites.push(more);
    }
    $('partySprites').replaceChildren(...sprites);
    $('killTotal').textContent = game.total;
    $('clearTotal').textContent = completedRuns(game);
    const found = Object.keys(game.seen).length + Object.keys(game.owned).length;
    const total = monsters.length + equipment.length;
    $('atlasPercent').textContent = Math.floor((found * 10000) / total) / 100 + '%';
  }
  function renderCrew() {
    const ids = roster(game);
    $('crewCount').textContent = '夥伴 ' + (ids.length - 1) + ' / 9';
    $('roster').replaceChildren(
      ...ids.map((id) => {
        const el = button(characterName(game, id), () => {
          member = id;
          renderCrew();
        });
        selected(el, member === id);
        return el;
      })
    );
    $('roleName').textContent = member === 0 ? '吟遊詩人' : member === game.partner ? '援護夥伴' : '同行夥伴';
    $('personName').textContent = characterName(game, member);
    $('skillName').textContent = member ? skills[member - 1] : '吟遊詩人出招';
    $('skillText').textContent = member ? skillText[member - 1] : '跟著歌聲攻擊，和同行夥伴一起探索八國。';
    $('partnerButton').hidden = member === 0;
    $('partnerButton').disabled = member === game.partner;
    $('partnerButton').textContent = member === game.partner ? '目前援護' : '設為援護夥伴';
    const gear = game.loadouts[member];
    $('loadout').replaceChildren(
      ...slots.map((slot, i) => {
        const label = document.createElement('label'),
          select = document.createElement('select');
        label.textContent = slot;
        select.add(new Option(startingGear[i], -1));
        for (const id of Object.keys(game.owned)) {
          const item = equipment[id];
          if (item.slot === i) select.add(new Option(item.name, id));
        }
        // Only the bard can wield a legendary weapon; it swaps the drum spell for its own skill.
        if (member === 0 && i === 2) {
          const group = document.createElement('optgroup');
          group.label = '傳說武器';
          for (const legend of legends) {
            if (game.legends?.[legend.index]) group.append(new Option(legend.name + '（' + legend.spell.name + '）', legend.id));
          }
          if (group.children.length) select.append(group);
        }
        select.value = gear[i];
        select.onchange = () => {
          const value = Number(select.value);
          if (isLegendId(value)) equipLegend(game, value - legends[0].id);
          else {
            if (isLegendId(gear[i])) unequipLegend(game);
            gear[i] = value;
          }
          persist();
          portrait($('portrait'), gear, member);
          renderSummary();
        };
        label.append(select);
        return label;
      })
    );
    portrait($('portrait'), gear, member);
    $('collection').textContent = '全隊共用收藏　' + Object.keys(game.owned).length + ' / ' + equipment.length;
  }
  $('partnerButton').onclick = () => {
    game.partner = member;
    persist();
    renderSummary();
    renderCrew();
  };
  const journals = [equipment, monsters].map((book) =>
    [...book].sort(
      (a, b) =>
        a.form - b.form || a.country - b.country || a.element.localeCompare(b.element) || a.base - b.base
    )
  );
  function renderLegends() {
    const owned = legends.filter((legend) => game.legends?.[legend.index]).length;
    const current = equippedLegend(game);
    $('bookProgress').max = legends.length;
    $('bookProgress').value = owned;
    $('bookCount').textContent = '已取得 ' + owned + ' / ' + legends.length;
    $('legendBook').replaceChildren(
      ...legends.map((legend) => {
        const have = game.legends?.[legend.index] || 0,
          ready = hasCinematic(legend.spell),
          realm = realms[legend.country];
        const card = document.createElement('article'),
          icon = document.createElement('canvas'),
          text = document.createElement('div');
        card.className = have ? 'owned' : 'locked';
        card.style.setProperty('--legend-color', legend.color);
        icon.width = icon.height = 88;
        icon.setAttribute('role', 'img');
        icon.setAttribute('aria-label', have ? legend.name + '外觀' : legend.name + '剪影（未取得）');
        legendIcon(icon, legend, !!have);
        const line = (tag, value) => {
          const el = document.createElement(tag);
          el.textContent = value;
          text.append(el);
          return el;
        };
        line('small', '#L0' + (legend.index + 1) + ' · ' + (have ? '已取得 ×' + have + (current === legend ? ' · 裝備中' : '') : '未取得'));
        line('strong', legend.name);
        line('small', '掉落：' + realm.name + '・' + legend.boss + '（' + LEGEND_DROP_RATE * 100 + '%）');
        line('p', '技能「' + legend.spell.name + '」· 傷害 ' + LEGEND_DAMAGE);
        line('small', ready ? '專屬動畫：已完成' : '專屬動畫：製作中 · 戰鬥中暫以 cut-in 結算').className = ready ? 'legend-ready' : 'legend-pending';
        const actions = document.createElement('div');
        actions.className = 'legend-actions';
        const preview = button(ready ? '預覽技能' : '動畫製作中', () => previewSpell(legend));
        preview.disabled = !ready;
        actions.append(preview);
        if (have) {
          const equip = button(current === legend ? '卸下' : '裝備', () => {
            if (current === legend) unequipLegend(game);
            else equipLegend(game, legend.index);
            persist();
            renderSummary();
            renderLegends();
          });
          equip.setAttribute('aria-pressed', String(current === legend));
          actions.append(equip);
        }
        text.append(actions);
        card.append(icon, text);
        return card;
      })
    );
  }
  function renderBook() {
    selected($('legendTab'), legendBook);
    for (const el of document.querySelectorAll('.atlas-only')) el.hidden = legendBook;
    $('legendBook').hidden = !legendBook;
    if (legendBook) {
      selected($('monsterTab'), false);
      selected($('gearTab'), false);
      renderLegends();
      return;
    }
    const book = journals[Number(isMonster)],
      known = isMonster ? game.seen : game.owned;
    selected($('monsterTab'), isMonster);
    selected($('gearTab'), !isMonster);
    $('bookProgress').max = book.length;
    $('bookProgress').value = Object.keys(known).length;
    $('bookCount').textContent =
      (isMonster ? '已遭遇 ' : '已收藏 ') + Object.keys(known).length + ' / ' + book.length;
    const country = $('bookCountry').value,
      filter = $('bookState').value,
      query = $('query').value.trim();
    const matches = book.filter(
      (entry) =>
        (country === '' || entry.country === Number(country)) &&
        (filter === '全部' || Boolean(known[entry.id]) === (filter === '已登錄')) &&
        (entry.name + entry.type + realms[entry.country].name + realms[entry.country].el).includes(query)
    );
    const pages = Math.max(1, Math.ceil(matches.length / 12));
    page = Math.min(page, pages - 1);
    $('atlas').replaceChildren(
      ...matches.slice(page * 12, page * 12 + 12).map((entry) => {
        const card = document.createElement('article'),
          icon = document.createElement('canvas'),
          text = document.createElement('div');
        icon.width = 40;
        icon.height = 40;
        icon.setAttribute('aria-hidden', 'true');
        journalIcon(icon, entry, isMonster);
        if (!known[entry.id]) {
          const context = icon.getContext('2d');
          context.globalCompositeOperation = 'source-in';
          context.fillStyle = '#000';
          context.fillRect(0, 0, icon.width, icon.height);
          context.globalCompositeOperation = 'source-over';
        }
        const label = document.createElement('small'),
          title = document.createElement('strong'),
          detail = document.createElement('small');
        const record = known[entry.id];
        label.textContent =
          '#' + String(entry.id + 1).padStart(4, '0') + ' · ' + (record ? '已登錄' : '未登錄');
        title.textContent = entry.name;
        detail.textContent = realms[entry.country].name + ' · ' + entry.type;
        text.append(label, title, detail);
        const note = document.createElement('small');
        note.textContent = isMonster
          ? elements[entry.element][1] + (record ? ' · 初遇於' + record.first : '')
          : entry.element + '相刻印' + (record ? ' · 取得 ' + record + ' 次' : '');
        text.append(note);
        card.append(icon, text);
        return card;
      })
    );
    $('pageCount').textContent = matches.length
      ? '第 ' + (page + 1) + ' / ' + pages + ' 頁 · ' + matches.length + ' 筆'
      : '沒有符合條件的條目';
    $('prev').disabled = page === 0;
    $('next').disabled = page === pages - 1;
  }
  function resetBook() {
    page = 0;
    renderBook();
  }
  $('legendTab').onclick = () => {
    legendBook = true;
    renderBook();
  };
  $('monsterTab').onclick = () => {
    legendBook = false;
    isMonster = true;
    resetBook();
  };
  $('gearTab').onclick = () => {
    legendBook = false;
    isMonster = false;
    resetBook();
  };
  $('query').oninput = resetBook;
  $('bookState').onchange = resetBook;
  $('bookCountry').onchange = resetBook;
  $('prev').onclick = () => {
    page--;
    renderBook();
  };
  $('next').onclick = () => {
    page++;
    renderBook();
  };
  $('nameForm').onsubmit = (event) => {
    event.preventDefault();
    const name = $('heroName').value.trim();
    if (!name) {
      $('nameStatus').textContent = '請輸入吟遊詩人姓名。';
      return;
    }
    game.name = name;
    renderSummary();
    $('heroName').value = name;
    persist();
    $('nameStatus').textContent = '已儲存，吟遊詩人 ' + name + '。';
  };
  function openTab(next) {
    tab = next;
    renderSummary();
    for (const el of document.querySelectorAll('.camp-page')) el.hidden = el.id !== tab;
    for (const el of document.querySelectorAll('[data-tab]')) selected(el, el.dataset.tab === tab);
    $('musicPanel').hidden = tab !== 'map';
    if (tab === 'map') renderMap();
    if (tab === 'crew') renderCrew();
    if (tab === 'books') renderBook();
    if (tab === 'settings') {
      renderHeroPortrait();
      $('heroName').value = game.name;
      simpleAnimations.checked = !!game.simpleAnimations;
      const legend = equippedLegend(game);
      $('legendSpellNote').hidden = !legend;
      if (legend) $('legendSpellNote').textContent = '主角裝備「' + legend.name + '」中，集氣招式暫由「' + legend.spell.name + '」取代；卸下後恢復這裡的設定。';
      $('nameStatus').textContent = '';
    }
  }
  for (const el of document.querySelectorAll('[data-tab]')) el.onclick = () => openTab(el.dataset.tab);
  const storyCountdown = countdown($('storyCountdown'));
  let afterStory = null,
    step = 0;
  function finishStory() {
    if (game.story === null) return;
    storyCountdown.cancel();
    const chapter = game.story;
    const next = afterStory;
    afterStory = null;
    game.story = null;
    persist();
    $('story').close();
    if (next) next();
    else if (chapter >= 0) {
      member = chapter + 2;
      openTab('crew');
    } else openTab('map');
  }
  function showFrame() {
    const chapter = game.story,
      intro = chapter === -1,
      final = chapter === 7,
      realm = realms[Math.max(0, chapter)];
    const titles = intro
      ? ['消失的公主', '鐘樓的藍緞帶', '第一位旅伴']
      : final
        ? ['最後一道門', '找到公主了', '公主成為你的夥伴']
        : ['王庭開門', '公主不在這裡', '新夥伴加入'];
    const lines = intro
      ? [
          '公主蕾雅失蹤那夜，王城的鐘聲只響了一半。',
          game.name + ' 在鐘樓拾起藍緞帶，上面還留著公主常哼的旋律。',
          '洛：「我認得這段歌。從苔冠出發吧，我們一起救回公主。」'
        ]
      : [
          realm.boss + '落敗，' + realm.land[3] + '的大門緩緩打開。',
          realm.clue,
          final
            ? '蕾雅背起琴，走向 ' + game.name + '。「這次，換我陪你出發。」'
            : realm.friend + '：「' + recruitmentLines[chapter] + '」'
        ];
    $('storyTitle').textContent = titles[step];
    $('storyLine').textContent = lines[step];
    $('storyLabel').textContent = (intro ? '序章' : realm.name + ' · 首通') + '　0' + (step + 1) + ' / 03';
    $('storyReward').textContent =
      step === 2
        ? (intro ? companions[0] : realm.friend) +
          ' 加入隊伍' +
          (!intro ? '　·　取得 ' + equipment[game.lastDrop].name : '') +
          (!intro && game.lastLegend != null ? '　·　傳說武器 ' + legends[game.lastLegend].name : '')
        : '';
    $('storyArt').classList.toggle('opening', step === 0);
    storyScene($('storyCanvas'), chapter, step, game);
    $('skipStory').textContent = intro ? '直接出發' : '略過動畫';
    $('skipStory').hidden = step === 2;
    $('nextStory').textContent = step < 2 ? '下一幕 →' : afterStory ? '繼續遠征 →' : intro ? '出發尋找公主 →' : '查看新夥伴 →';
    storyCountdown.start(
      step < 2 ? 4 : 5,
      (seconds) => seconds + ' 秒後' + (step < 2 ? '自動播放下一幕' : afterStory ? '自動從本國第一關繼續遠征' : '自動完成劇情'),
      nextFrame
    );
  }
  function nextFrame() {
    if (step === 2) finishStory();
    else {
      step++;
      showFrame();
    }
  }
  function stopStory() {
    storyCountdown.cancel();
    afterStory = null;
    $('story').close();
  }
  function story(next = null) {
    if (game.story === null) return;
    afterStory = next;
    step = 0;
    if (!$('story').open) $('story').showModal();
    showFrame();
  }
  $('story').oncancel = (event) => {
    event.preventDefault();
    finishStory();
  };
  $('skipStory').onclick = finishStory;
  $('nextStory').onclick = nextFrame;
  openTab('map');
  story();
  return {
    refresh(next = 'map') {
      preview = game.country;
      if (next !== 'map') renderMap();
      openTab(next);
    },
    story,
    stopStory
  };
}
