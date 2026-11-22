import regions from "./data/regions.json";
import quests from "./data/quests.json";
import story from "./data/story.json";

type Point={id:string;name:string;kind:string;x:number;z:number;y:number|null};
export type Exploration={discovered:string[];x:number;z:number;objective?:string|null};
const locations=regions.flatMap<Point>(r=>r.locations);
const marks:Record<string,string>={statue:"✧",village:"⌂",ruin:"◇",tower:"♜",cave:"◒",resource:"◆",habitat:"✿",chest:"▣"};
export function openMap(host:HTMLElement,world:Exploration|undefined,close:()=>void,travel?:(point:Point)=>void){
  const panel=document.createElement("section");
  panel.className="atlas panel world-atlas";
  host.append(panel);
  let zoom=1,tab=0;
  const objective=locations.find(p=>p.id===(world?.objective===undefined?(story.scenes[0]?.location??quests[0].steps[0].location):world.objective));
  const known=(point:Point)=>world?.discovered.includes(point.id)??false;
  const x=(value:number)=>((value+940)/1880)*100;
  const y=(value:number)=>((value+900)/1650)*100;
  function marker(point:Point){
    return `<button class="map-marker ${known(point)?"":"unknown"}" style="left:${x(point.x)}%;top:${y(point.z)}%" data-place="${point.id}" title="${known(point)?point.name:point.kind}">${marks[point.kind]}</button>`;
  }
  function map(){
    return `<div class="map-layout"><aside class="map-legend"><h3>Map Legend</h3><dl>${Object.entries(marks).map(([kind,mark])=>`<div><dt>${mark}</dt><dd>${kind}</dd></div>`).join("")}</dl></aside><div><div class="map-viewport"><div class="map-paper" style="transform:scale(${zoom})">${regions.map(r=>`<div class="map-region ${r.locations.some(known)?"":"unknown"}" style="--region:${r.color};left:${x(r.x)}%;top:${y(r.z)}%"><span>${r.name}</span></div>`).join("")}
    ${objective?`<span class="map-objective" style="left:${x(objective.x)}%;top:${y(objective.z)}%" title="Main Objective">✦</span>`:""}${locations.map(marker).join("")}${world?`<span class="map-player" style="left:${x(world.x)}%;top:${y(world.z)}%" title="You">▲</span>`:""}</div></div>
    <div class="map-tools"><div class="atlas-tabs"><button data-zoom="-1" aria-label="Zoom out">−</button><button data-zoom="1" aria-label="Zoom in">+</button></div><p class="map-note">Select a marker to inspect it.</p></div></div></div>
    <div class="map-regions">${regions.map(r=>`<button data-region="${r.id}" style="--region:${r.color}">${r.name}<small>${r.locations.filter(known).length}/${r.locations.length}</small></button>`).join("")}</div>`;
  }
  function draw(){
    const count=world?.discovered.length??0;
    const body=[map(),regions.map(r=>`<p><strong style="color:${r.color}">${r.name}</strong> · ${r.biome} · ${r.locations.filter(known).length}/${r.locations.length}</p>`).join(""),locations.filter(known).map(p=>`<p>${marks[p.kind]} ${p.name}</p>`).join("")||"<p>No locations discovered.</p>",Object.entries(marks).map(([kind,mark])=>`<p>${mark} · ${kind}</p>`).join("")][tab];
    panel.innerHTML=`<header class="atlas-header"><strong>World Map</strong><span class="atlas-count">${count}/${locations.length} discovered · ${Math.round(100*count/locations.length)}%</span><button data-close aria-label="Close">×</button></header>
      <div class="atlas-tabs">${["World Map","Regions","Discovery","Field Guide"].map((name,i)=>`<button data-tab="${i}" aria-pressed="${i===tab}">${name}</button>`).join("")}</div>${body}`;
  }
  panel.addEventListener("click",e=>{
    const btn=(e.target as HTMLElement).closest("button");
    if(!btn)return;
    if("close" in btn.dataset){panel.remove();close();return;}
    if(btn.dataset.tab!==undefined){tab=Number(btn.dataset.tab);draw();}
    if(btn.dataset.zoom){zoom=Math.min(2.25,Math.max(1,zoom+Number(btn.dataset.zoom)*.25));draw();}
    if(btn.dataset.region){
      const region=regions.find(r=>r.id===btn.dataset.region)!;
      panel.querySelector(".map-note")!.textContent=region.name+" · "+region.locations.filter(known).length+"/"+region.locations.length;
    }
    if(btn.dataset.place){
      const place=locations.find(p=>p.id===btn.dataset.place)!;
      const note=panel.querySelector(".map-note")!;
      note.textContent=known(place)?place.name+" · "+place.kind:"Undiscovered "+place.kind;
      if(known(place)&&place.kind==="statue"&&travel){
        const go=document.createElement("button");go.textContent="Fast Travel";
        go.addEventListener("click",()=>{panel.remove();travel(place);close();});
        note.append(" ",go);
      }
    }
  });
  draw();
}
export function discover(world:Exploration,y:number){
  const point=locations.find(p=>!world.discovered.includes(p.id)&&Math.hypot(world.x-p.x,world.z-p.z)<19&&(p.y===null||Math.abs(y-p.y)<10));
  if(point)world.discovered.push(point.id);
  return point;
}
