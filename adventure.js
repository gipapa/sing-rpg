import { realms, monsters, equipment, elements, skills, sovereignWards } from './catalog.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
export function newTrip(country) {
  const realm = realms[country];
  const landmarks = [0, 1, 2];
  for (let i = landmarks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [landmarks[i], landmarks[j]] = [landmarks[j], landmarks[i]];
  }
  const areas = [...landmarks, 3].map((land) => ({ land, element: pick(realm.sub) }));
  return {
    country,
    areas,
    step: 0,
    stage: 'travel',
    remaining: 2.5,
    elapsed: 0,
    foe: null,
    drop: null,
    hp: 0,
    maxHp: 0,
    charge: 0,
    strike: 0,
    hits: 0,
    reacted: false,
    message: ''
  };
}
export function currentArea(trip) {
  return trip.areas[Math.floor(trip.step / 3)];
}

function beginBattle(game, trip) {
  const { element, land } = currentArea(trip);
  const candidates = monsters.filter(
    (m) =>
      m.country === trip.country &&
      m.element === element &&
      (trip.step === 11 ? m.base === 5 : trip.step % 3 === 2 ? m.base === 3 || m.base === 4 : m.base < 3)
  );
  const fresh = candidates.filter((m) => !game.seen[m.id]);
  const different = candidates.filter((m) => m.id !== trip.foe);
  const pool = fresh.length && Math.random() < 0.72 ? fresh : different;
  const foe = pick(pool.length ? pool : candidates);
  trip.foe = foe.id;
  const region = realms[trip.country].land[land];
  const record = (game.seen[foe.id] ??= { count: 0, first: region });
  record.count++;
  trip.stage = 'battle';
  trip.maxHp = [7, 9, 8, 12, 14, 24][foe.base];
  trip.hp = trip.maxHp;
  trip.charge = game.partner === 6 ? 0.75 : 0;
  trip.hits = 0;
  trip.reacted = false;
  trip.message = elements[element][1];
}

// A matching inscription boosts a support strike once, even if both characters wear several.
function strike(game, trip) {
  const { element } = currentArea(trip),
    partner = game.partner,
    hit = ++trip.hits;
  const half = trip.hp <= trip.maxHp / 2;
  const foe = monsters[trip.foe],
    ward = sovereignWards[trip.country];
  const speciesGuard = (foe.base === 1 && hit === 2) || (foe.base === 4 && hit === 1);
  const royalGuard = foe.base === 5 && hit === ward.hit;
  const armored =
    speciesGuard ||
    royalGuard ||
    (element === '水' && hit === 1) ||
    (element === '土' && hit <= 2) ||
    (element === '木' && hit === 3) ||
    (element === '闇' && hit === 2);
  const dodge = element === '風' && half && !trip.reacted;
  let damage = 2,
    effect = '';
  if (armored) {
    damage = element === '水' ? 0 : 1;
    effect = royalGuard ? ward.name : '護甲承受攻擊';
  }
  if (dodge) {
    damage = 0;
    trip.reacted = true;
    effect = '風步閃避';
  }
  if (element === '光' && half && !trip.reacted) {
    trip.hp = Math.min(trip.maxHp, trip.hp + 2);
    trip.reacted = true;
    effect = '光紋回復';
  }
  const fragile = (element === '冰' && hit === 2) || (['火', '雷'].includes(element) && hit === 3);
  if (fragile) {
    damage += 2;
    effect = '屬性破綻';
  }
  const assists = [
    false,
    hit === 1,
    hit === 2,
    hit % 3 === 0,
    armored,
    element === '冰' && hit === 2,
    hit === 1,
    hit >= 3,
    hit % 4 === 0,
    !!effect && !trip.echoed
  ];
  if (assists[partner]) {
    const matched = [...game.loadouts[0], ...game.loadouts[partner]].some(
      (id) => equipment[id]?.element === element
    );
    damage += matched ? 3 : 2;
    if (partner === 9) trip.echoed = true;
    effect = skills[partner - 1] + (matched ? '・刻印共鳴' : '');
  }
  trip.message = effect || '吟遊詩人出招';
  trip.hp = Math.max(0, trip.hp - damage);
  trip.strike = 0.45;
}
function victory(game, trip) {
  const { element } = currentArea(trip);
  const candidates = equipment.filter((item) => item.country === trip.country && item.element === element);
  const fresh = candidates.filter((item) => !game.owned[item.id]);
  const reward = pick(fresh.length && (trip.step === 11 || Math.random() < 0.6) ? fresh : candidates);
  game.owned[reward.id] = (game.owned[reward.id] || 0) + 1;
  game.total++;
  game.lastDrop = trip.drop = reward.id;
  trip.stage = 'loot';
  trip.remaining = 2.6;
  if (trip.step === 11 && !game.cleared.includes(trip.country)) {
    game.cleared.push(trip.country);
    game.story = trip.country;
    delete game.runs[trip.country];
    return 'chapter';
  }
  return 'loot';
}
// Mutations for each transition are saved together by the caller, including the final reward and recruit.
export function advance(game, dt, attacking) {
  const trip = game.runs[game.country];
  trip.elapsed += dt;
  trip.strike = Math.max(0, trip.strike - dt);
  if (trip.stage === 'battle') {
    if (!attacking) return;
    trip.charge += dt;
    if (trip.charge < 1) return;
    trip.charge -= 1;
    strike(game, trip);
    return trip.hp > 0 ? 'hit' : victory(game, trip);
  }
  trip.remaining -= dt;
  if (trip.remaining > 0) return;
  if (trip.stage === 'travel') {
    trip.echoed = false;
    beginBattle(game, trip);
    return 'battle';
  }
  if (trip.step === 11) game.runs[game.country] = newTrip(game.country);
  else {
    trip.step++;
    trip.stage = 'travel';
    trip.remaining = 2.5;
  }
  return 'travel';
}
