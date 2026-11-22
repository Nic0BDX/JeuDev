import regions from "./data/regions.json";
import quests from "./data/quests.json";
import items from "./data/items.json";
import {maxHp,speciesOf,type Party} from "./combat";

const places=regions.flatMap<typeof regions[number]['locations'][number]>(region=>region.locations);
const main=quests[0];
const sides=quests.slice(1);
export type Journey={step:number;accepted:string[];done:string[];looted:string[];crystals:number};
export const newJourney=():Journey=>({step:0,accepted:[],done:[],looted:[],crystals:0});
export const objective=(journey:Journey)=>places.find(place=>place.id===main.steps[journey.step]?.location);
export function nearestSite(x:number,y:number,z:number){
  return places.filter(place=>Math.hypot(place.x-x,place.z-z)<13&&(place.y===null||Math.abs(place.y-y)<10)).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];
}
export function visit(journey:Journey,party:Party,site:typeof places[number],advanceMain=true){
  const notices:string[]=[];
  if(advanceMain&&objective(journey)?.id===site.id){
    journey.step++;
    party.coins+=25;
    notices.push(journey.step===main.steps.length?"The Call of Skyspire complete.":"Objective complete · "+(objective(journey)?.name??""));
  }
  for(const quest of sides){
    if(journey.accepted.includes(quest.id)&&!journey.done.includes(quest.id)&&quest.steps.some(step=>step.location===site.id)){
      journey.done.push(quest.id);party.coins+=quest.reward??0;notices.push(quest.name+" complete.");
    }
  }
  if(!journey.looted.includes(site.id)){
    const type=speciesOf(party.team[0]).type;
    if(site.kind==="chest"){party.prism++;party.coins+=30;journey.looted.push(site.id);notices.push("Cache · Prism Capsule and 30 coins");}
    if(site.kind==="resource"){journey.crystals+=type==="Earth"?3:1;journey.looted.push(site.id);notices.push("Crystal deposit collected.");}
    if(site.kind==="ruin"&&type==="Fire"){party.coins+=15;journey.looted.push(site.id);notices.push("Your companion lit the old torch.");}
  }
  return notices.join(" ");
}
export function openBag(host:HTMLElement,party:Party,journey:Journey,close:()=>void,site?:typeof places[number]){
  const panel=document.createElement("section");
  panel.className="atlas panel bag-panel";
  host.append(panel);
  let log="";
  const merchant=site?.kind==="village";
  const offers=sides.filter(quest=>quest.giver===site?.name);
  function draw(){
    panel.innerHTML=`<header class="atlas-header"><strong>${merchant?(site?.id==="skyspire-village"?"Grande Chercheuse · Skyspire City":site?.name):"Field Bag"} · ${party.coins} coins</strong><button data-bag="close">×</button></header>
    <p aria-live="polite">${log || (merchant?"The roads are open. Stock your pack before heading into the wild.":"Choose an item or change your lead creature.")}</p>
    <div class="atlas-tabs"><button data-bag="berry">Berry ×${party.berries}</button><button data-bag="nature">Nature care</button><span>Aether ×${party.capsules} · Prism ×${party.prism} · Crystal ×${journey.crystals}</span></div>
    ${merchant?`<h3>Shop</h3><div class="atlas-tabs">${items.map(item=>`<button data-bag="buy:${item.id}">${item.name} · ${item.price}</button>`).join("")}<button data-bag="sell">Sell crystal</button></div>
    <h3>Field requests</h3>${offers.map(q=>`<p>${q.name} · ${q.reward} coins <button data-bag="quest:${q.id}" ${journey.accepted.includes(q.id)?"disabled":""}>${journey.done.includes(q.id)?"Done":journey.accepted.includes(q.id)?"Active":"Accept"}</button></p>`).join("")}`:""}
    <h3>Team · ${party.team.length}/6</h3>${party.team.map((m,i)=>`<p>${speciesOf(m).name} · Lv.${m.level} · ${m.hp}/${maxHp(m)} HP ${i?`<button data-bag="lead:${i}">Lead</button><button data-bag="store:${i}">Store</button>`:""}</p>`).join("")}
    <h3>Storage · ${party.storage.length}</h3>${party.storage.map((m,i)=>`<p>${speciesOf(m).name} · Lv.${m.level} <button data-bag="retrieve:${i}" ${party.team.length>=6?"disabled":""}>Add to team</button></p>`).join("")}`;
  }
  panel.addEventListener("click",e=>{
    const code=(e.target as HTMLElement).closest("button")?.dataset.bag;
    if(!code)return;
    const [action,id]=code.split(":");
    if(action==="close"){panel.remove();close();return;}
    const lead=party.team[0];
    if(action==="berry"){
      if(party.berries){party.berries--;const heal=items.find(item=>item.id==="berry")?.heal??35;lead.hp=Math.min(maxHp(lead),lead.hp+Math.ceil(heal*(lead.affinity>=25?1.05:1)));lead.affinity=Math.min(100,lead.affinity+2);log="Your companion ate a berry.";}
      else log="No berries.";
    }
    if(action==="nature"){
      if(speciesOf(lead).type==="Nature"&&lead.hp<maxHp(lead)&&party.coins>=5){party.coins-=5;lead.hp=Math.min(maxHp(lead),lead.hp+18);log="Your companion gathered soothing herbs.";}
      else log="Nature care requires an injured Nature lead and 5 coins.";
    }
    if(action==="lead"){const i=Number(id);[party.team[0],party.team[i]]=[party.team[i],party.team[0]];}
    if(action==="store"&&party.team.length>1)party.storage.push(party.team.splice(Number(id),1)[0]);
    if(action==="retrieve"&&party.team.length<6)party.team.push(party.storage.splice(Number(id),1)[0]);
    if(action==="quest"&&!journey.accepted.includes(id)){journey.accepted.push(id);log="Field request accepted.";}
    if(action==="buy"&&merchant){
      const item=items.find(i=>i.id===id);
      if(item&&party.coins>=item.price){party.coins-=item.price;if(id==="berry")party.berries++;if(id==="capsule")party.capsules++;if(id==="prism-capsule")party.prism++;if(id==="crystal")journey.crystals++;log="Purchased "+item.name;}
      else log="Not enough coins.";
    }
    if(action==="sell"&&merchant&&journey.crystals){journey.crystals--;party.coins+=10;log="Sold a crystal.";}
    draw();
  });
  draw();
}
