export function newTrip() {
  return {elapsed:0, voice:0, kills:0, drops:0, stage:'travel', remaining:4, hp:0, maxHp:0, charge:0, strike:0};
}
export function isBoss(trip) { return trip.kills % 3 === 2; }
export function advance(trip, seconds, singing) {
  trip.elapsed += seconds;
  trip.strike = Math.max(0,trip.strike-seconds);
  if(singing) trip.voice += seconds;
  if(trip.stage !== 'battle'){
    trip.remaining -= seconds;
    if(trip.remaining > 0) return;
    if(trip.stage === 'loot'){
      trip.stage='travel'; trip.remaining=5; return;
    }
    trip.stage='battle'; trip.maxHp=isBoss(trip)?12:4; trip.hp=trip.maxHp;
    return;
  }
  if(!singing) return;
  trip.charge += seconds;
  if(trip.charge < 1) return;
  trip.charge -= 1;
  trip.hp -= 1;
  trip.strike = .45;
  if(trip.hp > 0) return;
  trip.kills++;
  trip.drops++;
  trip.stage='loot'; trip.remaining=3; trip.charge=0;
  return true;
}
