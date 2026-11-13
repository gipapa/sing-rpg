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
import { echoSettings } from './mic.js';

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
export function camp(game, persist) {
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
  function renderMap() {
    const realm = realms[preview],
      run = game.runs[preview],
      open = available(game, preview);
    $('worldProgress').textContent = '已通關 ' + game.cleared.length + ' / 8 國';
    $('realmNumber').textContent = 'REALM ' + String(preview + 1).padStart(2, '0') + ' / 08';
    $('realmName').textContent = realm.name;
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
      selected(pin, id === preview);
      pin.classList.toggle('locked', !available(game, id));
      pin.title =
        realms[id].name +
        ' · ' +
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
        select.value = gear[i];
        select.onchange = () => {
          gear[i] = Number(select.value);
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
  function renderBook() {
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
  $('monsterTab').onclick = () => {
    isMonster = true;
    resetBook();
  };
  $('gearTab').onclick = () => {
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
          (!intro ? '　·　取得 ' + equipment[game.lastDrop].name : '')
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
    refresh() {
      preview = game.country;
      openTab('map');
    },
    story,
    stopStory
  };
}
