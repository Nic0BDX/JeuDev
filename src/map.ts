import regions from "./data/regions.json";

type Point={id:string;name:string;kind:string;x:number;z:number;y:number|null};
export type Exploration={discovered:string[];x:number;z:number};
const locations=regions.flatMap(r=>r.locations);
const marks:Record<string,string>={statue:"✧",village:"⌂",ruin:"◇",tower:"♜",cave:"◒",resource:"◆",habitat:"✿",chest:"▣"};
export function openMap(host:HTMLElement,world:Exploration|undefined,close:()=>void,travel?:(point:Point)=>void){
  const panel=document.createElement("section");
  panel.className="atlas panel";
  host.append(panel);
  let zoom=1,tab=0;
  const known=(point:Point)=>world?.discovered.includes(point.id)??false;
  const x=(value:number)=>((value+940)/1880)*100;
  const y=(value:number)=>((value+900)/1650)*100;
  function marker(point:Point){
    return `<button class="map-marker ${known(point)?"":"unknown"}" style="left:${x(point.x)}%;top:${y(point.z)}%" data-place="${point.id}" title="${known(point)?point.name:point.kind}">${marks[point.kind]}</button>`;
  }
  function map(){
    return `<div class="map-viewport"><div class="map-paper" style="transform:scale(${zoom})">${regions.map(r=>`<div class="map-region ${r.locations.some(known)?"":"unknown"}" style="--region:${r.color};left:${x(r.x)}%;top:${y(r.z)}%">${r.name}</div>`).join("")}
    ${locations.map(marker).join("")}${world?`<span class="map-player" style="left:${x(world.x)}%;top:${y(world.z)}%" title="You">▲</span>`:""}</div></div>
    <div class="atlas-tabs"><button data-zoom="-1">−</button><button data-zoom="1">+</button></div><p class="map-note">Select a marker to inspect it.</p>`;
  }
  function draw(){
    const count=world?.discovered.length??0;
    const body=[map(),regions.map(r=>`<p><strong style="color:${r.color}">${r.name}</strong> · ${r.biome} · ${r.locations.filter(known).length}/${r.locations.length}</p>`).join(""),locations.filter(known).map(p=>`<p>${marks[p.kind]} ${p.name}</p>`).join("")||"<p>No locations discovered.</p>",Object.entries(marks).map(([kind,mark])=>`<p>${mark} · ${kind}</p>`).join("")][tab];
    panel.innerHTML=`<header class="atlas-header"><strong>World Map · ${count}/${locations.length} · ${Math.round(100*count/locations.length)}%</strong><button data-close aria-label="Close">×</button></header>
      <div class="atlas-tabs">${["World Map","Regions","Discovery","Field Guide"].map((name,i)=>`<button data-tab="${i}" aria-pressed="${i===tab}">${name}</button>`).join("")}</div>${body}`;
  }
  panel.addEventListener("click",e=>{
    const btn=(e.target as HTMLElement).closest("button");
    if(!btn)return;
    if("close" in btn.dataset){panel.remove();close();return;}
    if(btn.dataset.tab!==undefined){tab=Number(btn.dataset.tab);draw();}
    if(btn.dataset.zoom){zoom=Math.min(2.25,Math.max(1,zoom+Number(btn.dataset.zoom)*.25));draw();}
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
