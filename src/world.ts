import * as T from "three";
import regions from "./data/regions.json";
import { wildlife } from "./wildlife";
import { openDex } from "./dex";
import { ambience, writeSave, type Save } from "./save";
import { nearestSite, newJourney, objective, openBag, visit } from "./quests";
import { discover, openMap, type Exploration } from "./map";
import { battle, newParty, speciesOf, maxHp } from "./combat";

const SIZE = 96;
const SEA = -6;
const seed = 194127;
const clamp = T.MathUtils.clamp;
function sample(x: number, z: number) {
  const n = Math.sin(x * 127.1 + z * 311.7 + seed) * 43758.5453;
  return n - Math.floor(n);
}
function nearest(x: number, z: number) {
  return regions.reduce((best, region) => Math.hypot(x-region.x,z-region.z) < Math.hypot(x-best.x,z-best.z) ? region : best);
}
function terrain(x: number, z: number) {
  const wave = 8*Math.sin(x/47)*Math.cos(z/66)+4*Math.sin((x+z)/25);
  const peak = (cx:number,cz:number,r:number,h:number) => h*Math.exp(-((x-cx)**2+(z-cz)**2)/r**2);
  return wave + peak(-520,-490,130,65) + peak(550,-460,105,59) + peak(-90,-610,65,138)
    - peak(620,0,135,22) - peak(-500,600,120,18) - Math.max(0,Math.hypot(x,z)-880)*.15;
}
function surface(x: number, z: number, y: number) {
  const island = regions.at(-1)!;
  return Math.hypot(x-island.x,z-island.z) < 125 && y > 86 ? 91 : Math.max(terrain(x,z), SEA - .4);
}

export function explore(host: HTMLElement, settings: {quality:string;sensitivity:number;volume:number}, exit:()=>void, resume?:Save) {
  const low = settings.quality === "low" || (settings.quality === "auto" && matchMedia("(pointer:coarse)").matches);
  const renderer = new T.WebGLRenderer({antialias:!low});
  const scene = new T.Scene();
  const sky = new T.Color();
  const clearSky = new T.Color(0x80c8f7);
  const overcastSky = new T.Color(0x9eafc7);
  const fog = new T.FogExp2(0x8bc8eb,.0024);
  scene.background = sky;
  scene.fog = fog;
  const camera = new T.PerspectiveCamera(62,1,.2,1850);
  const light = new T.HemisphereLight(0xe0f8ff,0x708b59,2);
  const sun = new T.DirectionalLight(0xffe2b2,2);
  sun.position.set(80,120,40);
  scene.add(light,sun);
  const planet = new T.Mesh(new T.SphereGeometry(135,24,16),new T.MeshBasicMaterial({color:0xc3deff,fog:false}));
  scene.add(planet);
  const water = new T.Mesh(new T.PlaneGeometry(14000,14000),new T.MeshPhongMaterial({color:0x37a8cf,shininess:100}));
  water.rotation.x = -Math.PI/2;
  water.position.y = SEA;
  scene.add(water);
  const island = new T.Mesh(new T.CylinderGeometry(125,22,42,12),new T.MeshLambertMaterial({color:0x826fba}));
  island.position.set(0,70,-750);
  scene.add(island);
  const marker = new T.CylinderGeometry(.35,1.5,8,5);
  const crystal = new T.MeshLambertMaterial({color:0xbcf3ff,emissive:0x27608b,flatShading:true});
  for(const region of regions) for(const place of region.locations) {
    const landmark = new T.Mesh(marker,crystal);
    landmark.scale.setScalar(place.kind === "statue" ? 1.5 : .75);
    landmark.position.set(place.x,(place.y ?? terrain(place.x,place.z))+3,place.z);
    scene.add(landmark);
  }
  const actor = new T.Group();
  const addPart=(geometry:T.BufferGeometry,color:number,x:number,y:number,z:number)=>{
    const mesh=new T.Mesh(geometry,new T.MeshLambertMaterial({color,flatShading:true}));
    mesh.position.set(x,y,z);
    actor.add(mesh);
    return mesh;
  };
  addPart(new T.SphereGeometry(.32,10,7),0xe4af88,0,.72,0);
  addPart(new T.SphereGeometry(.34,9,6),0x3b2a44,0,.85,.04).scale.y=.68;
  addPart(new T.CylinderGeometry(.34,.43,.74,8),0x294f9a,0,.16,0);
  addPart(new T.CylinderGeometry(.35,.37,.14,8),0xe4bf73,0,.48,0);
  addPart(new T.BoxGeometry(.46,.48,.2),0x62473d,.06,.14,.38);
  for(const side of [-1,1]){
    addPart(new T.CylinderGeometry(.12,.13,.51,7),0x1f2d52,side*.18,-.48,0);
    addPart(new T.BoxGeometry(.26,.22,.36),0x392d42,side*.18,-.78,-.06);
  }
  actor.position.set(0,terrain(0,0)+1,12);
  scene.add(actor);
  const fauna=wildlife(scene,nearest,surface,sample);
  if(resume)actor.position.fromArray(resume.position);
  const party=resume?.party??newParty();
  const journey=resume?.journey??newJourney();
  const exploration:Exploration=resume?.exploration??{discovered:[],x:actor.position.x,z:actor.position.z};
  fauna.setCompanion(speciesOf(party.team[0]));
  let fighting=false,overlay=false,lastBattle=0;
  let target:ReturnType<typeof fauna.update>;

  const material = new T.MeshLambertMaterial({vertexColors:true,flatShading:true});
  const leaves = new T.ConeGeometry(1,3,5);
  const leafMaterial = new T.MeshLambertMaterial({color:0xffffff,flatShading:true});
  const chunks = new Map<string,{mesh:T.Mesh;trees:T.InstancedMesh}>();
  const dummy = new T.Object3D();
  function stream() {
    const cx = Math.floor(actor.position.x/SIZE);
    const cz = Math.floor(actor.position.z/SIZE);
    const radius = low ? 2 : 3;
    const active = new Set<string>();
    for(let z=-radius;z<=radius;z++) for(let x=-radius;x<=radius;x++){
      const gx=cx+x,gz=cz+z;
      const segments=Math.max(Math.abs(x),Math.abs(z))<=1?16:8;
      const id = [gx,gz,segments].join(",");
      active.add(id);
      if(chunks.has(id)) continue;
      const geometry = new T.PlaneGeometry(SIZE,SIZE,segments,segments).rotateX(-Math.PI/2).translate((gx+.5)*SIZE,0,(gz+.5)*SIZE);
      const pos=geometry.attributes.position;
      const colors=[];
      for(let i=0;i<pos.count;i++){
        const wx=pos.getX(i),wz=pos.getZ(i),height=terrain(wx,wz);
        pos.setY(i,height);
        const c=new T.Color(nearest(wx,wz).color).multiplyScalar(.86+.23*sample(wx,wz));
        colors.push(c.r,c.g,c.b);
      }
      geometry.setAttribute("color",new T.Float32BufferAttribute(colors,3));
      geometry.computeVertexNormals();
      const mesh=new T.Mesh(geometry,material);
      const trees=new T.InstancedMesh(leaves,leafMaterial,low?10:22);
      for(let i=0;i<trees.count;i++){
        const wx=(gx+sample(gx*31+i,gz))*SIZE,wz=(gz+sample(gx,gz*31+i))*SIZE;
        const h=terrain(wx,wz),size=1.2+sample(wx,wz)*2.8;
        dummy.position.set(wx,h+size,wz);
        dummy.scale.setScalar(h>SEA+1?size:0);
        dummy.rotation.y=i;
        dummy.updateMatrix();
        trees.setMatrixAt(i,dummy.matrix);
        trees.setColorAt(i,new T.Color(nearest(wx,wz).color).multiplyScalar(.65));
      }
      scene.add(mesh,trees);
      chunks.set(id,{mesh,trees});
    }
    for(const [id,chunk] of chunks) if(!active.has(id)){
      scene.remove(chunk.mesh,chunk.trees);
      chunk.mesh.geometry.dispose();
      chunk.trees.dispose();
      chunks.delete(id);
    }
  }
  host.innerHTML=`<div class="world"></div>
  <section class="world-info"><strong></strong><small></small></section>
  <button class="world-exit" aria-label="Return to title">‹</button>
  <button class="minimap" aria-label="Open world map" data-key="KeyM"><canvas width="96" height="96" aria-hidden="true"></canvas><b>N</b><span>▲</span><small></small></button><div class="minimap-zoom"><button data-key="Equal" aria-label="Minimap zoom in">+</button><button data-key="Minus" aria-label="Minimap zoom out">−</button></div>
  <div class="discovery-note" aria-live="polite"></div><aside class="quest-track"><strong>The Call of Skyspire</strong><small></small></aside><div class="quick-items"><button data-key="KeyI" aria-label="Bag">Bag</button><button data-key="Digit1" aria-label="Use berry">Berry</button><button data-key="KeyL" aria-label="Field mail">✉</button><button data-key="KeyP" aria-label="Save game">Save</button></div>
  <section class="team-hud" aria-label="Party"><strong></strong><div class="team-slots"></div></section>
  <div class="energy-hud"><label><span>♥</span><progress class="player-hp" max="100" value="100" aria-label="Player health"></progress></label><label><span>⚡</span><progress class="player-energy" max="100" value="100" aria-label="Energy"></progress></label></div>
  <div class="stick" aria-label="Move"><i></i></div>
  <div class="world-shortcuts"><button data-key="Tab" aria-label="Creature Dex">◇</button><button data-key="KeyB" aria-label="Scan">⌕</button></div>
  <div class="world-actions"><button data-key="KeyR" aria-label="Recenter camera">⌖</button><button data-key="Space" aria-label="Jump or glide">⛯</button><button class="interact" data-key="KeyE" aria-label="Interact"><span>✧</span>Interact</button><button data-key="ShiftLeft" aria-label="Sprint">⇧</button></div>`;
  const viewport=host.querySelector(".world")!;
  viewport.append(renderer.domElement);
  const info=host.querySelector(".world-info strong")!;
  const clock=host.querySelector(".world-info small")!;
  const energyBar=host.querySelector<HTMLProgressElement>(".player-energy")!;
  const healthBar=host.querySelector<HTMLProgressElement>(".player-hp")!;
  const discoveryNote=host.querySelector(".discovery-note")!;
  const compass=host.querySelector<HTMLElement>(".minimap span")!;
  const mapCount=host.querySelector(".minimap small")!;
  const mapInk=host.querySelector<HTMLCanvasElement>(".minimap canvas")!.getContext("2d");
  let mapRange=74,mapNext=0;
  function drawMinimap(x:number,z:number){
    if(!mapInk)return;
    const size=96,cell=8;
    for(let row=0;row<size;row+=cell)for(let col=0;col<size;col+=cell){
      const wx=x+(col+cell/2-size/2)*mapRange/size,wz=z+(row+cell/2-size/2)*mapRange/size;
      const ground=terrain(wx,wz);
      mapInk.fillStyle=ground<SEA?"#236697":nearest(wx,wz).color;
      mapInk.globalAlpha=ground<SEA?1:clamp(.67+ground*.012,.54,.95);
      mapInk.fillRect(col,row,cell,cell);
    }
    mapInk.globalAlpha=1;
    for(const place of nearest(x,z).locations){
      const dx=(place.x-x)*size/mapRange,dz=(place.z-z)*size/mapRange;
      if(Math.hypot(dx,dz)>43)continue;
      mapInk.fillStyle=place.kind==="statue"?"#ffd784":"#f5faff";
      mapInk.fillRect(46+dx,46+dz,4,4);
    }
  }
  const team=host.querySelector(".team-hud strong")!;
  const slots=host.querySelector(".team-slots")!;
  let teamKey="",placeLabel="",weatherLabel="";
  let noteUntil=0;
  const questTrack=host.querySelector(".quest-track small")!;
  const berry=host.querySelector("[data-key=Digit1]")!;
  const closeOverlay=()=>{overlay=false;fauna.setCompanion(speciesOf(party.team[0]));};
  function notify(message:string){discoveryNote.textContent=message;noteUntil=time+4;}
  function startBattle() {
    if(!target||fighting||time<lastBattle)return;
    const opponent=target;
    held.clear();
    fighting=battle(host,party,opponent.species,opponent.level,remove=>{
      if(remove)fauna.remove(opponent);
      fauna.setCompanion(speciesOf(party.team[0]));
      fighting=false;lastBattle=time+2;save();
    });
  }
  const listeners=new AbortController();
  const options={signal:listeners.signal};
  const held=new Set<string>();
  let yaw=resume?.yaw??0,pitch=resume?.pitch??.32,vertical=resume?.vertical??0,energy=resume?.energy??100,time=resume?.time??0,jump=false,glide=resume?.glide??false,raf=0;
  let nextSave=time+8;
  let playerHp=resume?.hp??100;
  healthBar.value=playerHp;
  const stopSound=ambience(settings.volume);
  function save(){
    if(fighting)return false;
    const p=actor.position;
    return writeSave({version:1,party,journey,exploration,position:[p.x,p.y,p.z],yaw,pitch,vertical,energy,time,glide,hp:playerHp});
  }
  window.addEventListener("pagehide",save,options);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)save();},options);
  save();
  let stickX=0,stickZ=0;
  const move=new T.Vector3();
  const focus=new T.Vector3();
  const offset=new T.Vector3();
  function press(code:string) {
    if(!overlay&&!fighting&&(code==="Equal"||code==="Minus")){mapRange=clamp(mapRange*(code==="Equal"?.72:1.38),34,230);mapNext=0;return;}
    if(fighting||overlay)return;
    if(code==="KeyM"){
      overlay=true;held.clear();
      openMap(host,exploration,()=>{overlay=false;},point=>{actor.position.set(point.x,(point.y??surface(point.x,point.z,0))+1,point.z);vertical=0;});return;
    }
    if(code==="Tab"){overlay=true;held.clear();openDex(host,party,()=>{overlay=false;});return;}
    if(code==="KeyE"){
      const p=actor.position;const site=nearestSite(p.x,p.y,p.z);
      if(!site){startBattle();return;}
      const result=visit(journey,party,site);
      if(result)notify(result);
      if(site.kind==="village"){overlay=true;held.clear();openBag(host,party,journey,closeOverlay,site);}
      return;
    }
    if(code==="KeyP"){notify(save()?"Adventure saved.":"Save unavailable.");return;}
    if(code==="KeyI"){overlay=true;held.clear();openBag(host,party,journey,closeOverlay);return;}
    if(code==="KeyL"){notify("Field mail · "+(objective(journey)?.name??"Skyspire thanks you for your service."));return;}
    if(code==="Digit1"&&party.berries){const lead=party.team[0];party.berries--;lead.hp=Math.min(maxHp(lead),lead.hp+Math.ceil(35*(lead.affinity>=25?1.05:1)));lead.affinity=Math.min(100,lead.affinity+2);notify("Berry used · "+speciesOf(lead).name);return;}
    if(code==="KeyB"&&target&&!party.seen.includes(target.species.id))party.seen.push(target.species.id);
    if(code==="Space" && !held.has(code)) jump=true;
    if(code==="KeyR") { yaw=0;pitch=.32; }
    held.add(code);
  }
  window.addEventListener("keydown",e=>{if(!overlay&&(e.code==="Space"||e.code==="Tab"))e.preventDefault();press(e.code);},options);
  window.addEventListener("keyup",e=>held.delete(e.code),options);
  window.addEventListener("blur",()=>held.clear(),options);
  function drag(node:Element,move:(event:PointerEvent)=>void,stop:()=>void=()=>{}) {
    node.addEventListener("pointerdown",event=>{
      const e=event as PointerEvent;
      node.setPointerCapture(e.pointerId);
      move(e);
    },options);
    node.addEventListener("pointermove",event=>{const e=event as PointerEvent;if(node.hasPointerCapture(e.pointerId)) move(e);},options);
    node.addEventListener("lostpointercapture",stop,options);
  }
  drag(viewport,e=>{if(e.type==="pointermove"){yaw-=e.movementX*settings.sensitivity*.00009;pitch=clamp(pitch+e.movementY*.005,.06,1.12);}});
  const stick=host.querySelector(".stick")!;
  const knob=host.querySelector<HTMLElement>(".stick i")!;
  drag(stick,e=>{const r=stick.getBoundingClientRect();stickX=clamp((e.clientX-r.left-r.width/2)/(r.width*.34),-1,1);stickZ=clamp((e.clientY-r.top-r.height/2)/(r.height*.34),-1,1);knob.style.transform='translate('+stickX*24+'px,'+stickZ*24+'px)';},()=>{stickX=0;stickZ=0;knob.style.transform="";});
  for(const button of Array.from(host.querySelectorAll<HTMLButtonElement>("[data-key]"))){
    const code=button.dataset.key!;
    button.addEventListener("pointerdown",e=>{button.setPointerCapture(e.pointerId);press(code);},options);
    button.addEventListener("click",e=>{if(e.detail===0){press(code);held.delete(code);}},options);
    button.addEventListener("lostpointercapture",()=>held.delete(code),options);
  }
  function resize() {
    renderer.setPixelRatio(Math.min(devicePixelRatio,low?1.25:1.8));
    renderer.setSize(viewport.clientWidth,viewport.clientHeight);
    camera.aspect=viewport.clientWidth/Math.max(1,viewport.clientHeight);
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize",resize,options);
  resize();
  stream();
  const meter = new URLSearchParams(location.search).get("performance") === "1" ? document.createElement("output") : null;
  if(meter){meter.className="performance-meter";host.append(meter);}
  let sampleStart=0,samplePrevious=0;
  const frameIntervals:number[]=[];
  let lastObjective="",lastBerry="",lastHeading=NaN,lastEnergy=-1;
  let prev=performance.now(),lastChunk="";
  function frame(now:number) {
    const dt=Math.min(.05,(now-prev)/1000);
    prev=now;
    if(fighting||overlay){sampleStart=samplePrevious=0;frameIntervals.length=0;raf=requestAnimationFrame(frame);return;}
    time+=dt;
    if(time>=nextSave){save();nextSave=time+8;}
    const p=actor.position;
    const floor=surface(p.x,p.z,p.y)+.9;
    const grounded=p.y<=floor+.15;
    const swim=terrain(p.x,p.z)<SEA-1 && p.y<SEA+1;
    const sprint=held.has("ShiftLeft")&&energy>3;
    const dx=stickX+Number(held.has("KeyD"))-Number(held.has("KeyA")||held.has("KeyQ"));
    const dz=stickZ+Number(held.has("KeyS"))-Number(held.has("KeyW")||held.has("KeyZ"));
    move.set(dx,0,dz).applyAxisAngle(T.Object3D.DEFAULT_UP,yaw);
    if(move.lengthSq()>1)move.normalize();
    if(move.lengthSq()>.01)actor.rotation.y=Math.atan2(-move.x,-move.z);
    if(jump){
      if(grounded){vertical=11;glide=false;}else glide=!glide;
      jump=false;
    }
    if(grounded&&vertical<=0)glide=false;
    const type=speciesOf(party.team[0]).type;
    const speed=swim?(type==="Water"?9:5):glide?19:sprint?15:8;
    const step=move.multiplyScalar(speed*dt);
    p.add(step);
    energy=clamp(energy+dt*(glide?((type==="Wind"||type==="Sky")?-4:-7):sprint&&step.lengthSq()>0?-12:14),0,100);
    if(!energy)glide=false;
    vertical=Math.max(glide?-2.6:-44,vertical-24*dt);
    p.y+=vertical*dt;
    const nextFloor=surface(p.x,p.z,p.y)+.9;
    if(p.y<nextFloor){
      p.y=nextFloor;
      if(vertical<-28&&!swim){playerHp=clamp(playerHp+Math.round((vertical+26)*2),0,100);notify("Hard landing");}
      if(playerHp<=0){p.set(0,surface(0,12,0)+1,12);playerHp=100;notify("Recovered at Skyspire City");}
      healthBar.value=playerHp;
      vertical=0;
    }
    focus.copy(p).y+=1;
    offset.set(0,Math.sin(pitch)*10,Math.cos(pitch)*10).applyAxisAngle(T.Object3D.DEFAULT_UP,yaw);
    camera.position.copy(focus).add(offset);
    camera.position.y=Math.max(camera.position.y,terrain(camera.position.x,camera.position.z)+1);
    camera.lookAt(focus);
    planet.position.set(p.x-310,235,p.z-780);
    const hour=(8+time*.06)%24;
    const day=clamp(.4+.75*Math.cos((hour-12)*Math.PI/12),0,1);
    const weather=["Clear","Rain","Storm","Snow","Fog"][Math.floor(time/75)%5];
    sky.set(0x15214e).lerp(weather==="Clear"?clearSky:overcastSky,day);
    fog.color.copy(sky);
    fog.density=weather==="Fog"?.008:weather==="Storm"?.004:.0024;
    light.intensity=.55+day*1.45;
    sun.intensity=day*2;
    const chunk=Math.floor(p.x/SIZE)+","+Math.floor(p.z/SIZE);
    if(chunk!==lastChunk){lastChunk=chunk;stream();}
    const nearby=fauna.update(p,dt,time,hour,weather);
    target=nearby;
    exploration.x=p.x;exploration.z=p.z;
    const site=discover(exploration,p.y);
    if(site)notify("Discovered · "+site.name);
    const objectiveName=objective(journey)?.name??"Complete";
    if(lastObjective!==objectiveName){lastObjective=objectiveName;questTrack.textContent=objectiveName;}
    const berryLabel="Berry ×"+party.berries;
    if(lastBerry!==berryLabel){lastBerry=berryLabel;berry.textContent=berryLabel;}
    if(discoveryNote.textContent && time>noteUntil)discoveryNote.textContent="";
    if(lastHeading!==yaw){lastHeading=yaw;compass.style.transform="rotate("+(-yaw)+"rad)";}
    if(time>=mapNext){drawMinimap(p.x,p.z);mapCount.textContent=exploration.discovered.length+"/64";mapNext=time+.2;}
    if(nearby?.species.behavior==="aggressive" && nearby.sprite.position.distanceTo(p)<2.5)startBattle();
    const placeName=nearest(p.x,p.z).name;
    if(placeName!==placeLabel){placeLabel=placeName;info.textContent=placeName;}
    const timeLabel=String(Math.floor(hour)).padStart(2,"0")+":"+String(Math.floor(hour%1*60)).padStart(2,"0")+" · "+weather;
    if(timeLabel!==weatherLabel){weatherLabel=timeLabel;clock.textContent=timeLabel;}
    const stateKey=party.team.map(m=>[m.id,m.hp,m.level].join(":")).join("|");
    if(stateKey!==teamKey){
      teamKey=stateKey;
      team.textContent="Party · "+party.team.length+"/6";
      slots.innerHTML=Array.from({length:6},(_,index)=>{
        const member=party.team[index];
        if(!member)return '<span class="team-empty" aria-label="Empty party slot">+</span>';
        const c=speciesOf(member);
        return `<span class="team-member" title="${c.name}"><span class="team-portrait">${c.id==="florix"?'<img src="/sprites/florix.png" alt="Florix">':c.name.slice(0,2)}</span><small>Lv.${member.level}</small><progress value="${member.hp}" max="${maxHp(member)}" aria-label="${c.name} HP"></progress></span>`;
      }).join("");
    }
    const energyDisplay=Math.round(energy);
    if(lastEnergy!==energyDisplay){lastEnergy=energyDisplay;energyBar.value=energyDisplay;}
    renderer.render(scene,camera);
    if(meter){
      if(!sampleStart){sampleStart=now;samplePrevious=now;}
      else {
        frameIntervals.push(now-samplePrevious);
        samplePrevious=now;
        const elapsed=now-sampleStart;
        if(elapsed>=5000){
          const count=frameIntervals.length;
          frameIntervals.sort((a,b)=>a-b);
          const fps=Number((count*1000/elapsed).toFixed(1));
          const p95=Number(frameIntervals[Math.ceil(count*.95)-1].toFixed(1));
          const {calls,triangles}=renderer.info.render;
          meter.value=fps+" FPS · p95 "+p95+" ms · "+calls+" draws";
          meter.dataset.sample=JSON.stringify({fps,p95,calls,triangles,frames:count,low});
          sampleStart=now;
          frameIntervals.length=0;
        }
      }
    }
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  const dispose=()=>{
    cancelAnimationFrame(raf);
    save();
    listeners.abort();
    stopSound();
    fauna.dispose();
    scene.traverse(node=>{if(node instanceof T.Mesh){node.geometry.dispose();const mats=Array.isArray(node.material)?node.material:[node.material];mats.forEach(mat=>mat.dispose());}});
    renderer.dispose();
  };
  host.querySelector(".world-exit")!.addEventListener("click",()=>{dispose();exit();},options);
}
