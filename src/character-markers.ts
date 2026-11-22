import * as T from "three";
import { characterAt } from "./characters";

export function mountCharacterMarkers(scene:T.Scene, sites:{id:string;x:number;y:number;z:number}[]){
  const meshes:T.Sprite[]=[];
  let disposed=false;
  const image = new Image();
  image.onload=()=>{
    if(disposed)return;
    for(const site of sites){
      const character=characterAt.get(site.id);
      if(!character)continue;
      const canvas=document.createElement("canvas");
      canvas.width=canvas.height=96;
      const ctx=canvas.getContext("2d");
      if(!ctx)continue;
      ctx.beginPath();ctx.arc(48,48,44,0,Math.PI*2);ctx.clip();
      const {x,y}=character.portrait;
      const sx=image.naturalWidth/1536,sy=image.naturalHeight/1024;
      ctx.drawImage(image,(x-75)*sx,(y-75)*sy,150*sx,150*sy,0,0,96,96);
      ctx.beginPath();ctx.arc(48,48,42,0,Math.PI*2);ctx.lineWidth=4;ctx.strokeStyle="#79e9ff";ctx.stroke();
      const map=new T.CanvasTexture(canvas);
      map.colorSpace=T.SRGBColorSpace;
      const sprite=new T.Sprite(new T.SpriteMaterial({map,alphaTest:.2}));
      sprite.position.set(site.x+2,site.y+3.4,site.z);
      sprite.scale.set(2.5,2.5,1);
      scene.add(sprite);
      meshes.push(sprite);
    }
  };
  image.src=import.meta.env.BASE_URL+"characters/aetheris-cast.png";
  return ()=>{
    disposed=true;
    for(const sprite of meshes){scene.remove(sprite);sprite.material.map?.dispose();sprite.material.dispose();}
  };
}
