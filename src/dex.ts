import creatures from "./data/creatures.json";
import moves from "./data/skills.json";
import types from "./data/types.json";
import regions from "./data/regions.json";
import { maxHp, type Party } from "./combat";

const tabs=["Dex","Collection","Affinity","Evolution Guide","Species Compendium"];
const typeIcons: Record<string,string> = {Nature:"❧",Fire:"♨",Water:"◈",Wind:"≋",Earth:"▲",Light:"✦",Shadow:"☾",Crystal:"◇",Sky:"❋"};
const stats=["HP","ATK","DEF","SP. ATK","SP. DEF","SPD"];
export function openDex(host:HTMLElement,party:Party|undefined,close:()=>void){
  const panel=document.createElement("section");
  panel.className="atlas panel creature-dex";
  host.append(panel);
  let tab=0,filter="",query="",selected=creatures[0];
  const caught=(id:string)=>party?.caught.includes(id)??false;
  const seen=(id:string)=>party?.seen.includes(id)??false;
  const typeColor=(type:string)=>types[type as keyof typeof types].color;
  function portrait(id:string,type:string){
    return `<span class="portrait" style="--type:${typeColor(type)}"><span aria-hidden="true">${typeIcons[type]}</span><img src="/sprites/${id}.png" alt="" loading="lazy"></span>`;
  }
  function grid(){
    const rows=creatures.filter(c=>(!filter||c.type===filter)&&c.name.toLowerCase().includes(query)&&(tab!==1||caught(c.id)));
    if(tab===4)return [...new Set(creatures.map(c=>c.type))].map(type=>{
      const rows=creatures.filter(c=>c.type===type);
      const habitats=[...new Set(rows.flatMap(c=>c.habitats))].map(id=>regions.find(r=>r.id===id)?.name).filter(Boolean);
      return `<section class="poster-type" style="--type:${typeColor(type)}">
        <header><span aria-hidden="true">${typeIcons[type]}</span><h3>${type}</h3><small>${habitats.join(" · ")}</small></header>
        <div>${rows.map(c=>`<button data-species="${c.id}" ${seen(c.id)?"":"disabled"} aria-label="${seen(c.id)?c.name:"Undiscovered "+type+" species"}"><span class="poster-art ${seen(c.id)?"":"locked"}">${seen(c.id)?portrait(c.id,c.type):'<span aria-hidden="true">?</span>'}</span><span class="poster-name">${seen(c.id)?c.name:"Undiscovered"}</span></button>`).join("")}</div>
      </section>`;
    }).join("");
    return rows.map(c=>`<button data-species="${c.id}" aria-pressed="${selected.id===c.id}">${portrait(c.id,c.type)}<small>No.${String(c.no).padStart(3,"0")}</small>${c.name}${caught(c.id)?" ✓":""}</button>`).join("") || "<p>No matching creatures.</p>";
  }
  function detail(){
    const c=selected;
    const member=[...(party?.team??[]),...(party?.storage??[])].find(m=>m.id===c.id);
    const affinity=member?.affinity??0;
    const bond=`<section><h3>Affinity · Lv.${Math.min(20,Math.floor(affinity/5))}</h3><progress max="100" value="${affinity}"></progress><p>${affinity>=25?"+10% type skill power · +5% recovery":"Lv.5 unlocks a type power and recovery bonus."}</p></section>`;
    const evolution=`<section><h3>Evolution</h3><p>${c.evolution.forms.map((form,i)=>form+" · Lv."+c.evolution.levels[i]).join(" → ")}</p></section>`;
    return `<small>No.${String(c.no).padStart(3,"0")}</small><h2>${c.name}</h2><p style="color:${typeColor(c.type)}">${c.type} · ${"★".repeat(c.rarity)}</p>
      ${tab===2?bond:tab===3?evolution:`<p>${member?`Lv.${member.level} · ${member.xp} XP · ${member.hp}/${maxHp(member)} HP`:"Unowned"}</p>
      <p class="species-description">${c.description}</p><p>${c.habitats.map(id=>regions.find(r=>r.id===id)?.name).join(" · ")}</p>
      <h3>Base stats · ${c.stats.reduce((a,b)=>a+b,0)}</h3><div class="stat-bars">${stats.map((name,i)=>`<label>${name} <progress max="140" value="${c.stats[i]}"></progress> ${c.stats[i]}</label>`).join("")}</div>
      <h3>Skills</h3><ul class="dex-skills">${c.skills.map(id=>moves.find(move=>move.id===id)).filter(move=>move!==undefined).map(move=>`<li><strong>${move.name}</strong><small>${move.type} · ${move.power}</small></li>`).join("")}</ul>${evolution}${bond}`}`;
  }
  function draw(){
    panel.classList.toggle("compendium",tab===4);
    panel.innerHTML=`<header class="atlas-header"><strong>Creature Dex · ${party?.caught.length??0}/${creatures.length}</strong><button data-close aria-label="Close">×</button></header>
      <div class="atlas-tabs">${tabs.map((name,i)=>`<button data-tab="${i}" aria-pressed="${i===tab}">${name}</button>`).join("")}</div>
      ${tab===4?`<div class="poster-heading"><h2>Grand Species Compendium</h2><p>${party?.seen.length??0}/${creatures.length} species discovered</p></div>`:`<div class="atlas-filters"><input type="search" placeholder="Search species" aria-label="Search species"><select aria-label="Filter by type"><option value="">All types · ${creatures.length}</option>${Object.keys(types).map(type=>`<option value="${type}">${type} · ${creatures.filter(c=>c.type===type).length}</option>`).join("")}</select></div>`}
      <div class="atlas-body"><div class="species-grid"></div><div class="dex-hero"></div><aside class="species-detail"></aside></div>`;
    const search=panel.querySelector("input");
    const select=panel.querySelector("select");
    if(search)search.value=query;
    if(select)select.value=filter;
    refresh();
  }
  function refresh(){
    panel.querySelector(".species-grid")!.innerHTML=grid();
    panel.querySelector(".species-grid")!.classList.toggle("poster",tab===4);
    panel.querySelector(".species-detail")!.innerHTML=detail();
    panel.querySelector(".dex-hero")!.innerHTML=`${portrait(selected.id,selected.type)}<strong>${selected.name}</strong>`;
  }
  panel.addEventListener("error",e=>{if(e.target instanceof HTMLImageElement)e.target.hidden=true;},true);
  panel.addEventListener("input",e=>{if(e.target instanceof HTMLInputElement){query=e.target.value.toLowerCase();refresh();}});
  panel.addEventListener("change",e=>{if(e.target instanceof HTMLSelectElement){filter=e.target.value;refresh();}});
  panel.addEventListener("click",e=>{
    const btn=(e.target as HTMLElement).closest("button");
    if(!btn)return;
    if("close" in btn.dataset){panel.remove();close();return;}
    if(btn.dataset.tab!==undefined){tab=Number(btn.dataset.tab);draw();}
    if(btn.dataset.species){selected=creatures.find(c=>c.id===btn.dataset.species)??selected;if(tab===4){tab=0;draw();}else refresh();}
  });
  draw();
}
