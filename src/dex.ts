import creatures from "./data/creatures.json";
import moves from "./data/skills.json";
import types from "./data/types.json";
import regions from "./data/regions.json";
import { maxHp, type Party } from "./combat";

const tabs=["Dex","Collection","Affinity","Evolution Guide","Species Compendium"];
const stats=["HP","ATK","DEF","SP. ATK","SP. DEF","SPD"];
export function openDex(host:HTMLElement,party:Party|undefined,close:()=>void){
  const panel=document.createElement("section");
  panel.className="atlas panel";
  host.append(panel);
  let tab=0,filter="",query="",selected=creatures[0];
  const caught=(id:string)=>party?.caught.includes(id)??false;
  const seen=(id:string)=>party?.seen.includes(id)??false;
  const typeColor=(type:string)=>types[type as keyof typeof types].color;
  function portrait(id:string,type:string){
    return `<span class="portrait" style="--type:${typeColor(type)}"><span aria-hidden="true">✧</span><img src="/sprites/${id}.png" alt="" loading="lazy"></span>`;
  }
  function grid(){
    const rows=creatures.filter(c=>(!filter||c.type===filter)&&c.name.toLowerCase().includes(query)&&(tab!==1||caught(c.id)));
    if(tab===4)return Object.entries(types).map(([type])=>`<section class="poster-type"><h3 style="color:${typeColor(type)}">${type}</h3><div>${creatures.filter(c=>c.type===type).map(c=>`<button data-species="${c.id}" ${seen(c.id)?"":"disabled"}>${seen(c.id)?portrait(c.id,c.type)+c.name:"?"}</button>`).join("")}</div></section>`).join("");
    return rows.map(c=>`<button data-species="${c.id}" aria-pressed="${selected.id===c.id}">${portrait(c.id,c.type)}<small>No.${String(c.no).padStart(3,"0")}</small>${c.name}${caught(c.id)?" ✓":""}</button>`).join("") || "<p>No matching creatures.</p>";
  }
  function detail(){
    const c=selected;
    const member=[...(party?.team??[]),...(party?.storage??[])].find(m=>m.id===c.id);
    const affinity=member?.affinity??0;
    const bond=`<section><h3>Affinity · Lv.${Math.min(20,Math.floor(affinity/5))}</h3><progress max="100" value="${affinity}"></progress><p>${affinity>=25?"+10% type skill power · +5% recovery":"Lv.5 unlocks a type power and recovery bonus."}</p></section>`;
    const evolution=`<section><h3>Evolution</h3><p>${c.evolution.forms.map((form,i)=>form+" · Lv."+c.evolution.levels[i]).join(" → ")}</p></section>`;
    return `<h2>${c.name}</h2>${portrait(c.id,c.type)}<p style="color:${typeColor(c.type)}">${c.type} · ${"★".repeat(c.rarity)}</p>
      ${tab===2?bond:tab===3?evolution:`<p>${member?`Lv.${member.level} · ${member.xp} XP · ${member.hp}/${maxHp(member)} HP`:"Unowned"}</p>
      <p>${c.description}</p><p>${c.habitats.map(id=>regions.find(r=>r.id===id)?.name).join(" · ")}</p>
      <h3>Base stats · ${c.stats.reduce((a,b)=>a+b,0)}</h3><div class="stat-bars">${stats.map((name,i)=>`<label>${name} <progress max="140" value="${c.stats[i]}"></progress> ${c.stats[i]}</label>`).join("")}</div>
      <h3>Skills</h3><p>${c.skills.map(id=>moves.find(move=>move.id===id)?.name).join(" · ")}</p>${evolution}${bond}`}`;
  }
  function draw(){
    panel.innerHTML=`<header class="atlas-header"><strong>Creature Dex · ${party?.caught.length??0}/${creatures.length}</strong><button data-close aria-label="Close">×</button></header>
      <div class="atlas-tabs">${tabs.map((name,i)=>`<button data-tab="${i}" aria-pressed="${i===tab}">${name}</button>`).join("")}</div>
      <div class="atlas-filters"><input type="search" placeholder="Search species" aria-label="Search species"><select aria-label="Filter by type"><option value="">All types · ${creatures.length}</option>${Object.keys(types).map(type=>`<option value="${type}">${type} · ${creatures.filter(c=>c.type===type).length}</option>`).join("")}</select></div>
      <div class="atlas-body"><div class="species-grid"></div><aside class="species-detail"></aside></div>`;
    panel.querySelector("input")!.value=query;
    panel.querySelector("select")!.value=filter;
    refresh();
  }
  function refresh(){
    panel.querySelector(".species-grid")!.innerHTML=grid();
    panel.querySelector(".species-grid")!.classList.toggle("poster",tab===4);
    panel.querySelector(".species-detail")!.innerHTML=detail();
  }
  panel.addEventListener("error",e=>{if(e.target instanceof HTMLImageElement)e.target.hidden=true;},true);
  panel.addEventListener("input",e=>{if(e.target instanceof HTMLInputElement){query=e.target.value.toLowerCase();refresh();}});
  panel.addEventListener("change",e=>{if(e.target instanceof HTMLSelectElement){filter=e.target.value;refresh();}});
  panel.addEventListener("click",e=>{
    const btn=(e.target as HTMLElement).closest("button");
    if(!btn)return;
    if("close" in btn.dataset){panel.remove();close();return;}
    if(btn.dataset.tab!==undefined){tab=Number(btn.dataset.tab);draw();}
    if(btn.dataset.species){selected=creatures.find(c=>c.id===btn.dataset.species)??selected;refresh();}
  });
  draw();
}
