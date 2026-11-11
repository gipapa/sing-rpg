// Each route lists its encounters in travel order. One victory awards one relic.
export const routes = [
  { id:'forest', name:'霧林古道', stops:[
    ['月影山徑','苔背森狼','wolf','moss'],
    ['守望哨塔','霧林守衛','guard','frost'],
    ['銀角王庭','鹿角騎士','stag','antlers']
  ]},
  { id:'ice', name:'霜潮海岸', stops:[
    ['浮冰淺灘','霜翼海鴞','owl','feather'],
    ['藍晶潮洞','潮晶蟹','crab','tide'],
    ['極光燈塔','白潮女王','queen','crown']
  ]},
  { id:'ember', name:'燼火遺城', stops:[
    ['炭灰市集','熔芯蜥','lizard','ash'],
    ['斷劍熔爐','鑄火魔像','golem','star'],
    ['落日王座','暮金龍王','dragon','gold']
  ]}
];
export const slots={body:'衣裝',head:'頭飾',weapon:'武器'};
export const items={
  coat:{name:'旅人斗篷',slot:'body',color:'#b86e52'},
  bare:{name:'卸下頭飾',slot:'head',color:'#815f50'},
  hood:{name:'旅人布帽',slot:'head',color:'#748b94'},
  sword:{name:'鐵短劍',slot:'weapon',color:'#cad0c0'},
  moss:{name:'苔光披肩',slot:'body',color:'#62bb87'},
  frost:{name:'霜刃短劍',slot:'weapon',color:'#a9edff'},
  antlers:{name:'銀角戰盔',slot:'head',color:'#eddbb2'},
  feather:{name:'霜羽髮冠',slot:'head',color:'#a2dcf7'},
  tide:{name:'潮晶長槍',slot:'weapon',color:'#65d7df'},
  crown:{name:'白潮王冠',slot:'head',color:'#c3eff9'},
  ash:{name:'餘燼披風',slot:'body',color:'#dc664e'},
  star:{name:'星焰長劍',slot:'weapon',color:'#ffca73'},
  gold:{name:'暮金鎧甲',slot:'body',color:'#dfb96f'}
};
export const starter={body:'coat',head:'hood',weapon:'sword'};
export function encounter(trip){
  // During the loot animation stay at the location of the defeated enemy.
  const cleared=Math.max(0,trip.kills-(trip.stage==='loot'?1:0));
  const start=Math.max(0,routes.findIndex(route=>route.id===trip.route));
  const route=routes[(start+Math.floor(cleared/3))%routes.length];
  const index=cleared%3;
  const [place,name,kind,relic]=route.stops[index];
  return {route,place,name,kind,relic,index,boss:index===2};
}
export function restore(saved={}){
  const owned=new Set([...Object.values(starter),'bare']);
  const equipped={...starter};
  // The first release assigned the first five relics in a fixed sequence.
  const legacy=['moss','frost','antlers','star','gold'];
  for(const id of legacy.slice(0,saved.gear||0)){
    owned.add(id);equipped[items[id].slot]=id;
  }
  for(const id of saved.owned||[])if(Object.hasOwn(items,id))owned.add(id);
  for(const [slot,id] of Object.entries(saved.equipped||{})){
    if(owned.has(id)&&items[id].slot===slot)equipped[slot]=id;
  }
  return {owned:[...owned],equipped,total:saved.total||0,last:saved.last||null,
    current:saved.current||null,route:saved.route||'forest'};
}
