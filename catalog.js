export const realms = [
  {
    name: '苔冠王國',
    el: '木',
    color: '#97a879',
    xy: [21, 53],
    sub: '水風光',
    land: ['鹿角林道', '垂藤水庭', '古木哨塔', '銀角王庭'],
    boss: '鹿角騎士',
    friend: '林衛・芮恩',
    clue: '窗鉤上繫著公主的藍緞帶，線頭還沾著鹽霜。',
    beasts: ['森狼', '棘衛', '枝鴞', '根蜥', '冠甲蟹', '鹿角騎士'],
    skill: '藤縛',
    effect: '首擊纏住敵人，下一擊追加傷害。'
  },
  {
    name: '白潮群島',
    el: '水',
    color: '#88b9ba',
    xy: [16, 27],
    sub: '冰風雷',
    land: ['潮骨灘', '船塚灣', '聽潮燈塔', '白貝宮'],
    boss: '潮汐女王',
    friend: '潮醫・汐',
    clue: '礁石上有王室的求救刻痕，最後一筆指向內陸。',
    beasts: ['潮狼', '鹽兵', '海鴞', '滑鰭蜥', '珊瑚蟹', '潮汐女王'],
    skill: '回潮',
    effect: '每隔數次攻擊，潮聲會補上一擊。'
  },
  {
    name: '赤爐公國',
    el: '火',
    color: '#c48669',
    xy: [38, 76],
    sub: '土雷光',
    land: ['炭灰驛', '熔渠', '鑄鐵街', '赤爐要塞'],
    boss: '熔爐巨像',
    friend: '鍛師・銅火',
    clue: '鐵匠留下半枚王室胸針，背面刻著逃離的暗號。',
    beasts: ['灰狼', '爐兵', '燼鴉', '熔蜥', '鐵蟹', '熔爐巨像'],
    skill: '鍛火',
    effect: '對護甲造成額外傷害。'
  },
  {
    name: '眠雪大公國',
    el: '冰',
    color: '#9db8cf',
    xy: [43, 21],
    sub: '水土闇',
    land: ['雪脊坡', '冰鏡湖', '霜鐘樓', '冬眠宮'],
    boss: '霜冠白鹿',
    friend: '雪獵・冬葵',
    clue: '結冰的窗格裡壓著公主用過的髮針。',
    beasts: ['雪狼', '冰衛', '雪鴞', '霜蜥', '晶蟹', '霜冠白鹿'],
    skill: '裂冰',
    effect: '擊碎冰甲時再追加一擊。'
  },
  {
    name: '雲帆聯邦',
    el: '風',
    color: '#aac09f',
    xy: [42, 50],
    sub: '木水光',
    land: ['浮草原', '風箏谷', '高帆港', '雲舵臺'],
    boss: '天帆翼獅',
    friend: '領航・翎',
    clue: '瞭望員交出一張從王室飛艇飄下的航票。',
    beasts: ['嵐狼', '帆衛', '信風鷹', '翼蜥', '浮甲蟲', '天帆翼獅'],
    skill: '追風',
    effect: '每場戰鬥的第一擊提早發動。'
  },
  {
    name: '黃砂城邦',
    el: '土',
    color: '#c5aa76',
    xy: [65, 76],
    sub: '火風闇',
    land: ['鹽沙路', '千柱市', '赤壁井', '琥珀陵'],
    boss: '琥珀獅王',
    friend: '遺跡師・沙羅',
    clue: '旅店帳簿夾著一枚王室印記，旁邊寫有地牢的方位。',
    beasts: ['砂狼', '砂衛', '沙鷹', '岩蜥', '琥珀蠍', '琥珀獅王'],
    skill: '碎岩',
    effect: '持續攻擊時逐層削弱敵方防禦。'
  },
  {
    name: '鳴雷帝國',
    el: '雷',
    color: '#c2a0c9',
    xy: [66, 35],
    sub: '火冰風',
    land: ['雷紋橋', '銅線谷', '鳴鐘塔', '伏雷殿'],
    boss: '鳴雷天將',
    friend: '鐘匠・鳴',
    clue: '密電裡藏著公主的聲音，她還活著。',
    beasts: ['電狼', '銅衛', '雷隼', '弧蜥', '鳴甲蟲', '鳴雷天將'],
    skill: '雷鳴',
    effect: '命中一定次數後召下一道落雷。'
  },
  {
    name: '暮星王庭',
    el: '闇',
    color: '#a294bf',
    xy: [83, 57],
    sub: '冰雷光',
    land: ['黃昏廊', '無燈街', '星盤臺', '蝕月寢宮'],
    boss: '蝕月之龍',
    friend: '公主・蕾雅',
    clue: '「那段旋律……你真的一路唱到了這裡。」',
    beasts: ['夜狼', '影衛', '星鴞', '影蜥', '夜晶蟹', '蝕月之龍'],
    skill: '星之和聲',
    effect: '每場戰鬥首次觸發屬性效果時，再奏一次。'
  }
];

export const slots = ['衣裝', '頭飾', '武器'];
const forms = ['冠紋', '裂紋', '環紋', '羽紋', '棘紋', '星紋', '角紋', '鏡紋'];
const materials = ['赤銅', '月銀', '黑鐵', '琥珀', '青玉', '白骨', '霜晶', '星鋼'];
const materialColors = ['#ce886e', '#d7d8c3', '#888798', '#e8af67', '#74b2a2', '#ddcba7', '#a9d4e7', '#b6afda'];
const shapes = ['斗篷', '胸甲', '頭冠', '頭盔', '短劍', '長槍'];
const kinds = ['wolf', 'guard', 'owl', 'lizard', 'crab'];
const sovereigns = ['stag', 'queen', 'golem', 'hart', 'griffin', 'lion', 'general', 'dragon'];
export const elements = {
  木: ['#97c687', '第三擊前萌發枝甲'],
  水: ['#87d7da', '潮甲吸收首擊'],
  火: ['#efa079', '第三擊灼破外殼'],
  冰: ['#b5d9f2', '首擊碎冰後露出弱點'],
  風: ['#a0d1ab', '半血時使用一次風步'],
  土: ['#d8b27d', '前兩擊受到岩盾保護'],
  雷: ['#cab0e1', '第三擊引發放電'],
  闇: ['#b59dc8', '首次受擊後召出影甲'],
  光: ['#e8d797', '半血時回復一次生命']
};
// Each sovereign raises its own ward on this strike, in addition to the regional aspect.
export const sovereignWards = [
  { name: '銀角招架', hit: 3 },
  { name: '白潮屏障', hit: 4 },
  { name: '熔鐵護甲', hit: 2 },
  { name: '霜冠冰壁', hit: 3 },
  { name: '旋風護翼', hit: 2 },
  { name: '琥珀石膚', hit: 4 },
  { name: '雷鼓結陣', hit: 3 },
  { name: '蝕月龍鱗', hit: 5 }
];
export const monsters = [],
  equipment = [];
// The array index is the permanent collection ID, also stored in the save file.
for (const [country, realm] of realms.entries()) {
  for (let base = 0; base < 6; base++) {
    for (const element of realm.sub) {
      for (let form = 0; form < 8; form++) {
        const id = monsters.length;
        const variant = { id, country, base, element, form };
        monsters.push({
          ...variant,
          name: element + '相' + forms[form] + '・' + realm.beasts[base],
          kind: kinds[base] || sovereigns[country],
          type: base === 5 ? '國主' : base >= 3 ? '菁英' : '普通'
        });
        const slot = Math.floor(base / 2);
        equipment.push({
          ...variant,
          name: realm.el + '紋' + materials[form] + shapes[base] + '・' + element,
          slot,
          type: slots[slot],
          color: materialColors[form]
        });
      }
    }
  }
}
export const recruitmentLines = [
  '公主不在這裡。讓我帶路，我們一起找。',
  '她的船早已離港。我知道哪一股潮水能追上她。',
  '這胸針被人折過。我帶上鍛鎚，路上慢慢修給她。',
  '髮針還有一點暖意。跟著我，趁風雪蓋住足跡前出發。',
  '這班飛艇沒有回程票。把帆升起來，我陪你追。',
  '我認得帳簿上的地牢。拿上燈，我們從舊道進去。',
  '你聽，密電的末尾有人在和聲。讓我帶著這口鐘同行。'
];
export const companions = ['旅歌手・洛', ...realms.map((r) => r.friend)];
export const skills = ['伴奏', ...realms.map((r) => r.skill)];
export const skillText = ['以伴奏加強每場戰鬥的第一擊。', ...realms.map((r) => r.effect)];
export const startingGear = ['旅行斗篷', '旅行布帽', '旅行短劍'];
export const defaultName = 'あああ';
export function newGame() {
  return {
    name: defaultName,
    country: 0,
    partner: 1,
    cleared: [],
    runs: {},
    seen: {},
    owned: {},
    loadouts: Array.from({ length: 10 }, () => [-1, -1, -1]),
    total: 0,
    story: -1,
    lastDrop: null
  };
}
export function available(game, country) {
  if (!realms[country]) return false;
  if (country === 0) return true;
  if (country === 7) return realms.slice(0, 7).every((_, i) => game.cleared.includes(i));
  return game.cleared.includes(0);
}
export function roster(game) {
  return [0, 1, ...game.cleared.map((country) => country + 2)];
}

// The support companion stands at the front, followed by the other recruits in join order.
export function travelingParty(game) {
  return [game.partner, ...roster(game).filter((id) => id !== 0 && id !== game.partner)];
}

export function completedRuns(game) {
  // Every clear is twelve wins. Remove unfinished runs in each country; the last boss's
  // loot screen already represents a complete run. This also counts replays in older saves.
  const unfinished = Object.values(game.runs).reduce(
    (sum, trip) => sum + ((trip.step + Number(trip.stage === 'loot')) % 12),
    0
  );
  return Math.floor((game.total - unfinished) / 12);
}
