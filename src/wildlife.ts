import * as T from "three";
import species from "./data/creatures.json";
import types from "./data/types.json";

const weatherType: Record<string,string> = {Rain:"Water",Storm:"Wind",Snow:"Crystal",Fog:"Shadow"};

type Species = typeof species[number];
type Biome = { id:string };
type Wild = { species:Species; sprite:T.Sprite; origin:T.Vector3; level:number };
const sprites = new Map<string,T.SpriteMaterial>();
function spriteMaterial(creature:Species) {
  const old = sprites.get(creature.id);
  if(old) return old;
  const canvas=document.createElement("canvas");
  canvas.width=128;canvas.height=128;
  const g=canvas.getContext("2d")!;
  const color=types[creature.type as keyof typeof types].color;
  const index=creature.no % 4;
  g.strokeStyle="#182946";g.lineWidth=5;g.lineJoin="round";
  g.fillStyle=color;
  g.beginPath();
  g.moveTo(24,67);g.lineTo(18+index*4,17);g.lineTo(51,44);g.lineTo(77,44);g.lineTo(106-index*4,17);g.lineTo(104,67);
  g.quadraticCurveTo(130,109,86,115);g.quadraticCurveTo(64,124,40,115);g.quadraticCurveTo(0,109,24,67);
  g.closePath();g.fill();g.stroke();
  g.fillStyle="#fff4df";
  g.beginPath();g.ellipse(64,96,24,17,0,0,Math.PI*2);g.fill();
  for(const x of [45,83]){
    g.fillStyle="#17233e";g.beginPath();g.ellipse(x,75,7,11,0,0,Math.PI*2);g.fill();
    g.fillStyle="white";g.beginPath();g.arc(x-2,72,2.5,0,Math.PI*2);g.fill();
  }
  g.fillStyle="#ca5765";g.beginPath();g.arc(64,91,7,0,Math.PI);g.fill();
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const material=new T.SpriteMaterial({map:texture,alphaTest:.12});
  sprites.set(creature.id,material);
  new T.TextureLoader().load("/"+"sprites/"+creature.id+".png",map=>{
    map.colorSpace=T.SRGBColorSpace;material.map?.dispose();material.map=map;material.needsUpdate=true;
  },undefined,()=>{});
  return material;
}

export function wildlife(scene:T.Scene, regionAt:(x:number,z:number)=>Biome, floor:(x:number,z:number,y:number)=>number, random:(x:number,z:number)=>number) {
  const wild = new Map<string,Wild[]>();
  const size=48;
  const companion=new T.Sprite(spriteMaterial(species[0]));
  companion.scale.set(2.5,2.5,1);
  scene.add(companion);
  let initialized=false;
  return {
    update(p:T.Vector3,dt:number,time:number,hour:number,weather:string) {
      const cx=Math.floor(p.x/size),cz=Math.floor(p.z/size);
      const active=new Set<string>();
      for(let z=cz-1;z<=cz+1;z++) for(let x=cx-1;x<=cx+1;x++){
        const key=x+","+z;
        active.add(key);
        if(wild.has(key))continue;
        const pool=species.filter(c=>c.habitats.includes(regionAt((x+.5)*size,(z+.5)*size).id));
        const preferred=pool.filter(c=>c.type===weatherType[weather]);
        const available=preferred.length&&random(x,z)>.45?preferred:pool;
        const group=Array.from({length:2},(_,i)=>{
          const wx=(x+.2+random(x+i,z)*.6)*size,wz=(z+.2+random(x,z+i+1)*.6)*size;
          const creature=available[Math.floor(random(x*5+i,z*13)*available.length)]??species[0];
          const sprite=new T.Sprite(spriteMaterial(creature));
          sprite.scale.set(3,3,1);
          const origin=new T.Vector3(wx,floor(wx,wz,p.y)+1.25,wz);
          sprite.position.copy(origin);
          scene.add(sprite);
          return {species:creature,sprite,origin,level:Math.min(40,2+Math.floor(Math.hypot(wx,wz)/28))};
        });
        wild.set(key,group);
      }
      let closest:Wild|undefined, min=7;
      for(const [key,group] of wild){
        if(!active.has(key)){
          group.forEach(c=>scene.remove(c.sprite));
          wild.delete(key);
          continue;
        }
        for(const c of group){
          const q=c.sprite.position;
          const distance=Math.hypot(q.x-p.x,q.z-p.z);
          const asleep=c.species.behavior==="sleep"&&(hour<6||hour>21);
          const reaction=distance<10?(c.species.behavior==="flee"?-1:c.species.behavior==="aggressive"?1:0):0;
          if(!asleep){
            if(reaction&&distance>1){
              q.x+=(p.x-q.x)/distance*dt*reaction*4;
              q.z+=(p.z-q.z)/distance*dt*reaction*4;
            } else {
              q.x+=(c.origin.x+5*Math.sin(time*.6+c.origin.z)-q.x)*dt;
              q.z+=(c.origin.z+5*Math.cos(time*.7+c.origin.x)-q.z)*dt;
            }
          }
          q.y=floor(q.x,q.z,q.y)+1.25+(asleep?-.4:Math.sin(time*3+c.origin.x)*.2);
          if(distance<min&&Math.abs(q.y-p.y)<4){closest=c;min=distance;}
        }
      }
      if(!initialized){companion.position.copy(p);initialized=true;}
      companion.position.x+=(p.x+2.4-companion.position.x)*Math.min(1,dt*4);
      companion.position.z+=(p.z+1.8-companion.position.z)*Math.min(1,dt*4);
      companion.position.y+=(p.y+.25-companion.position.y)*Math.min(1,dt*5);
      return closest;
    },
    setCompanion(creature:Species){companion.material=spriteMaterial(creature);},
    remove(target:Wild){for(const group of wild.values()){const index=group.indexOf(target);if(index>=0){scene.remove(target.sprite);group.splice(index,1);break;}}},
    dispose(){for(const material of sprites.values()){material.map?.dispose();material.dispose();}sprites.clear();}
  };
}
