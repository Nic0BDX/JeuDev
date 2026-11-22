import * as T from "three";
import { painted } from "./valley-art";

export function creatureGeometry(id:string,type:string,color:number) {
  const plant=id==="florix"||type==="Nature";
  const bird=id==="pyrowl"||["Wind","Sky","Fire"].includes(type);
  const aquatic=id==="bubblit"||type==="Water";
  const accent=plant?0x89c844:bird?0xffad38:aquatic?0x5ee4fa:color;
  const dark=plant?0x306341:bird?0x63324c:aquatic?0x24518e:0x354263;
  const cream=plant?0xffdeb1:bird?0xffedd4:0xe6f8ff;
  const parts:{geometry:T.BufferGeometry;color:number}[]=[];
  const shape=(tint:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,turn=0)=>{
    parts.push({color:tint,geometry:new T.SphereGeometry(1,10,7).scale(sx,sy,sz).rotateZ(turn).translate(x,y-1.16,z)});
  };
  shape(color,0,.64,0,.47,.45,.54);
  shape(cream,0,.62,.34,.34,.32,.26);
  shape(color,0,1.18,.22,bird?.35:.46,.39,.39);
  shape(cream,0,1.04,.52,.28,.20,.15);
  for(const side of [-1,1]){
    shape(dark,side*.16,1.23,.555,.071,.099,.047);
    shape(0xffffff,side*.16-.021,1.26,.591,.023,.028,.016);
    shape(dark,side*.25,.18,.28,.14,.16,.23);
    if(plant){
      shape(dark,side*.32,1.57,.04,.13,.40,.085,-side*.56);
      shape(accent,side*.36,1.65,.105,.12,.31,.07,-side*.56);
      shape(accent,side*.30,.76,.31,.23,.095,.12,side*.48);
    }else if(bird){
      shape(dark,side*.51,.72,-.08,.48,.11,.24,side*.22);
      shape(accent,side*.65,.76,-.16,.35,.12,.17,side*.22);
      shape(color,side*.36,1.42,.03,.13,.30,.12,-side*.67);
    }else{
      shape(accent,side*.47,.63,.03,.28,.11,.22,side*.48);
      shape(accent,side*.22,1.54,.11,.13,.24,.085,-side*.65);
    }
  }
  shape(bird?accent:dark,0,1.08,.68,bird?.12:.069,.067,.10);
  shape(accent,0,plant?1.05:.56,-.58,plant?.33:.24,plant?.46:.13,.34,.22);
  if(aquatic)shape(0xe9ffff,0,1.55,.19,.102,.13,.10);
  return painted(parts);
}
