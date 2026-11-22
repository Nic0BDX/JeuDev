import * as T from "three";
import regions from "./data/regions.json";
import { wildlife } from "./wildlife";
import { openDex } from "./dex";
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

export function explore(host: HTMLElement, settings: {quality:string;sensitivity:number}, exit:()=>void) {
  const low = settings.quality === "low" || (settings.quality === "auto" && matchMedia("(pointer:coarse)").matches);
  const renderer = new T.WebGLRenderer({antialias:!low});
  const scene = new T.Scene();
  const sky = new T.Color();
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
  const actor = new T.Mesh(new T.CapsuleGeometry(.43,1.02,4,8),new T.MeshLambertMaterial({color:0x5e399f}));
  actor.position.set(0,terrain(0,0)+1,12);
  scene.add(actor);
  const fauna=wildlife(scene,nearest,surface,sample);
  const party=newParty();
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
  host.innerHTML='<div class="world"></div><div class="world-info"><strong></strong><small></small><progress max="100" value="100" aria-label="Energy"></progress></div><button class="world-exit">‹</button><div class="stick" aria-label="Move"><i></i></div><div class="world-actions"><button data-key="Tab" aria-label="Creature Dex">◇</button><button data-key="KeyE" aria-label="Interact">E</button><button data-key="KeyB" aria-label="Scan">⌕</button><button data-key="ShiftLeft" aria-label="Sprint">⇧</button><button data-key="Space" aria-label="Jump or glide">⛯</button><button data-key="KeyR" aria-label="Recenter camera">⌖</button></div>';
  const viewport=host.querySelector(".world")!;
  viewport.append(renderer.domElement);
  const info=host.querySelector(".world-info strong")!;
  const clock=host.querySelector(".world-info small")!;
  const energyBar=host.querySelector("progress")!;
  function startBattle() {
    if(!target||fighting||time<lastBattle)return;
    const opponent=target;
    held.clear();
    fighting=battle(host,party,opponent.species,opponent.level,remove=>{
      if(remove)fauna.remove(opponent);
      fauna.setCompanion(speciesOf(party.team[0]));
      fighting=false;lastBattle=time+2;
    });
  }
  const listeners=new AbortController();
  const options={signal:listeners.signal};
  const held=new Set<string>();
  let yaw=0,pitch=.32,vertical=0,energy=100,time=0,jump=false,glide=false,raf=0;
  let stickX=0,stickZ=0;
  const move=new T.Vector3();
  const focus=new T.Vector3();
  const offset=new T.Vector3();
  function press(code:string) {
    if(fighting||overlay)return;
    if(code==="Tab"){overlay=true;held.clear();openDex(host,party,()=>{overlay=false;});return;}
    if(code==="KeyE"){startBattle();return;}
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
  let prev=performance.now(),lastChunk="";
  function frame(now:number) {
    const dt=Math.min(.05,(now-prev)/1000);
    prev=now;
    if(fighting||overlay){raf=requestAnimationFrame(frame);return;}
    time+=dt;
    const p=actor.position;
    const floor=surface(p.x,p.z,p.y)+.9;
    const grounded=p.y<=floor+.15;
    const swim=terrain(p.x,p.z)<SEA-1 && p.y<SEA+1;
    const sprint=held.has("ShiftLeft")&&energy>3;
    const dx=stickX+Number(held.has("KeyD"))-Number(held.has("KeyA")||held.has("KeyQ"));
    const dz=stickZ+Number(held.has("KeyS"))-Number(held.has("KeyW")||held.has("KeyZ"));
    move.set(dx,0,dz).applyAxisAngle(T.Object3D.DEFAULT_UP,yaw);
    if(move.lengthSq()>1)move.normalize();
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
    if(p.y<nextFloor){p.y=nextFloor;vertical=0;}
    focus.copy(p).y+=1;
    offset.set(0,Math.sin(pitch)*10,Math.cos(pitch)*10).applyAxisAngle(T.Object3D.DEFAULT_UP,yaw);
    camera.position.copy(focus).add(offset);
    camera.position.y=Math.max(camera.position.y,terrain(camera.position.x,camera.position.z)+1);
    camera.lookAt(focus);
    planet.position.set(p.x-310,235,p.z-780);
    const hour=(8+time*.06)%24;
    const day=clamp(.4+.75*Math.cos((hour-12)*Math.PI/12),0,1);
    const weather=["Clear","Rain","Storm","Snow","Fog"][Math.floor(time/75)%5];
    sky.set(0x15214e).lerp(new T.Color(weather==="Clear"?0x80c8f7:0x9eafc7),day);
    fog.color.copy(sky);
    fog.density=weather==="Fog"?.008:weather==="Storm"?.004:.0024;
    light.intensity=.55+day*1.45;
    sun.intensity=day*2;
    const chunk=Math.floor(p.x/SIZE)+","+Math.floor(p.z/SIZE);
    if(chunk!==lastChunk){lastChunk=chunk;stream();}
    const nearby=fauna.update(p,dt,time,hour,weather);
    target=nearby;
    if(nearby?.species.behavior==="aggressive" && nearby.sprite.position.distanceTo(p)<2.5)startBattle();
    info.textContent=nearest(p.x,p.z).name+(nearby?' · '+nearby.species.name+' Lv.'+nearby.level:'');
    clock.textContent=String(Math.floor(hour)).padStart(2,"0")+":"+String(Math.floor(hour%1*60)).padStart(2,"0")+" · "+weather+" · "+party.team.length+"/6 · "+party.team[0].hp+"/"+maxHp(party.team[0])+" HP";
    energyBar.value=energy;
    renderer.render(scene,camera);
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  const dispose=()=>{
    cancelAnimationFrame(raf);
    listeners.abort();
    fauna.dispose();
    scene.traverse(node=>{if(node instanceof T.Mesh){node.geometry.dispose();const mats=Array.isArray(node.material)?node.material:[node.material];mats.forEach(mat=>mat.dispose());}});
    renderer.dispose();
  };
  host.querySelector(".world-exit")!.addEventListener("click",()=>{dispose();exit();},options);
}
