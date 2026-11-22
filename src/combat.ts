import creatures from "./data/creatures.json";
import moves from "./data/skills.json";
import chart from "./data/types.json";

type Species = typeof creatures[number];
type Skill = typeof moves[number];
type Status = "poison" | "burn" | "slow" | null;
export type Member = {id:string; level:number; xp:number; hp:number; affinity:number; form:number};
export type Party = {team:Member[]; storage:Member[]; capsules:number; prism:number; berries:number; coins:number; seen:string[]; caught:string[]};
const byId = new Map(creatures.map(c=>[c.id,c]));
export const speciesOf=(member:Member)=>byId.get(member.id)!;
const stat=(member:Member,i:number)=>Math.floor(speciesOf(member).stats[i]*member.level/40)+(i===0?28:8);
export const maxHp=(member:Member)=>stat(member,0);
export function createMember(species:Species,level:number):Member {
  const member={id:species.id,level,xp:0,hp:0,affinity:0,form:species.evolution.levels.reduce((form,n,index)=>level>=n?index:form,0)};
  member.hp=maxHp(member);
  return member;
}
export function newParty():Party{
  const team=[0,4,8].map(i=>createMember(creatures[i],5));
  const caught=team.map(c=>c.id);
  return {team,storage:[],capsules:8,prism:1,berries:5,coins:120,seen:[...caught],caught};
}
function gain(member:Member, xp:number) {
  member.xp+=xp;
  while(member.level<40 && member.xp>=member.level*12) {
    member.xp-=member.level*12;
    const hp=maxHp(member);
    member.level++;
    member.hp+=maxHp(member)-hp;
  }
  if(member.level===40)member.xp=0;
  member.form=speciesOf(member).evolution.levels.reduce((form,level,index)=>member.level>=level?index:form,0);
  member.affinity=Math.min(100,member.affinity+2);
}
function hit(attacker:Member,defender:Member,move:Skill) {
  const matchup=chart[move.type as keyof typeof chart];
  const type=speciesOf(defender).type;
  const multiplier=matchup.strong.includes(type)?1.6:matchup.weak.includes(type)?.64:1;
  const physical=move.category==="physical";
  const affinity=attacker.affinity>=25 && move.type===speciesOf(attacker).type?1.1:1;
  const damage=Math.max(1,Math.round(((attacker.level/15+1)*move.power*(stat(attacker,physical?1:3)/stat(defender,physical?2:4))*.13+2)*multiplier*affinity));
  defender.hp=Math.max(0,defender.hp-damage);
  return damage;
}
export function battle(host:HTMLElement, party:Party, wild:Species, level:number, finish:(remove:boolean)=>void, options:{noCapture?:boolean;opponent?:string;alias?:string;mixed?:boolean}={}) {
  const enemy=createMember(wild,level);
  const enemyMoves=moves.filter(move=>options.mixed?move.power===55:wild.skills.includes(move.id));
  const enemyName=options.alias??wild.name;
  const encounterName=options.opponent?options.opponent+" · "+enemyName:enemyName;
  let active=party.team.findIndex(c=>c.hp>0);
  if(active<0)return false;
  if(!party.seen.includes(wild.id))party.seen.push(wild.id);
  const statuses=new Map<Member,Status>();
  const panel=document.createElement("section");
  panel.className="battle panel";
  panel.setAttribute("role","dialog");
  host.append(panel);
  let log=encounterName+" appeared!";
  let ended=false, remove=false;
  function end(message:string,removeCreature:boolean) {log=message;ended=true;remove=removeCreature;}
  function player(){return party.team[active];}
  function attack(from:Member,to:Member,skill:Skill){
    if(from.hp<=0||to.hp<=0)return;
    const amount=hit(from,to,skill);
    log+=speciesOf(from).name+" · "+skill.name+" −"+amount+". ";
    if(skill.status && !statuses.has(to) && Math.random()<.3)statuses.set(to,skill.status as Status);
  }
  function counter(){attack(enemy,player(),enemyMoves[Math.floor(Math.random()*enemyMoves.length)]);}
  function settle(){
    for(const [member,status] of statuses)if(status==="poison"||status==="burn")member.hp=Math.max(0,member.hp-Math.max(1,Math.floor(maxHp(member)*.08)));
    if(enemy.hp<=0){gain(player(),level*11);party.coins+=level*3;end(enemyName+" was defeated. Team gained experience.",true);}
    else if(player().hp<=0){
      const next=party.team.findIndex(c=>c.hp>0);
      if(next>=0){active=next;log+=speciesOf(player()).name+" takes over.";}
      else{for(const member of party.team)member.hp=Math.ceil(maxHp(member)/2);end("Your team recovered at half health.",false);}
    }
  }
  function render(){
    const current=player();
    const available=moves.filter(move=>speciesOf(current).skills.includes(move.id));
    panel.innerHTML=`<h2>${encounterName} · Lv.${level}</h2><progress max="${maxHp(enemy)}" value="${enemy.hp}"></progress>
      <p>${speciesOf(current).name} · Lv.${current.level} · ${current.hp}/${maxHp(current)} HP</p><p aria-live="polite">${log}</p>
      <div class="battle-buttons">${ended?'<button data-action="close">Continue</button>':available.map(move=>`<button data-action="move:${move.id}">${move.name}</button>`).join("")+
      `<button data-action="capsules" ${options.noCapture||party.capsules<=0?"disabled":""}>Capsule Aether ×${party.capsules}</button>
      <button data-action="prism" ${options.noCapture||party.prism<=0?"disabled":""}>Capsule Prisme ×${party.prism}</button>
      <button data-action="berry" ${party.berries<=0?"disabled":""}>Berry ×${party.berries}</button>
      <button data-action="flee">Flee</button>`+party.team.map((member,i)=>i===active||member.hp<=0?"":`<button data-action="switch:${i}">Switch to ${speciesOf(member).name}</button>`).join("")}</div>`;
  }
  panel.addEventListener("click",event=>{
    const action=(event.target as HTMLElement).closest<HTMLButtonElement>("button")?.dataset.action;
    if(!action)return;
    if(action==="close"){panel.remove();finish(remove);return;}
    log="";
    if(action==="flee"){end("You escaped.",false);}
    else if(action==="capsules"||action==="prism"){
      if(options.noCapture||party[action]<=0)return;
      party[action]--;
      const chance=Math.min(.94,(.22+.75*(1-enemy.hp/maxHp(enemy)))*(action==="prism"?1.6:1)/(1+(wild.rarity-1)*.33));
      if(Math.random()<chance){
        (party.team.length<6?party.team:party.storage).push(enemy);
        if(!party.caught.includes(wild.id))party.caught.push(wild.id);
        gain(player(),level*7);end(wild.name+" joined your collection.",true);
      }else{log="The capsule opened. ";counter();}
    }else if(action==="berry"){
      if(party.berries<=0)return;
      party.berries--;
      player().hp=Math.min(maxHp(player()),player().hp+35);
      player().affinity=Math.min(100,player().affinity+2);
      counter();
    }else if(action.startsWith("switch:")){
      active=Number(action.slice(7));counter();
    }else{
      const move=moves.find(skill=>skill.id===action.slice(5));
      if(!move)return;
      const speed=(member:Member)=>stat(member,5)*(statuses.get(member)==="slow"?.65:1);
      if(speed(player())>=speed(enemy)){attack(player(),enemy,move);counter();}
      else{counter();attack(player(),enemy,move);}
    }
    if(!ended)settle();
    render();
  });
  render();
  return true;
}
