import * as T from "three";

type Anchor={x:number;z:number};
type ForgeAnchors={entrance:Anchor;vent:Anchor;shelter:Anchor};

export function mountForge(scene:T.Scene,anchors:ForgeAnchors,height:(x:number,z:number)=>number){
  const basalt=new T.MeshLambertMaterial({color:0x493148,flatShading:true});
  const iron=new T.MeshLambertMaterial({color:0x796474,flatShading:true});
  const heat=new T.MeshBasicMaterial({color:0xffa241});
  const box=new T.BoxGeometry(1,1,1);
  const shaft=new T.CylinderGeometry(.55,.74,1,8);
  const wheel=new T.TorusGeometry(.65,.13,5,12);
  const fire=new T.OctahedronGeometry(.35);
  function buildSite(anchor:Anchor,name:string){
    const site=new T.Group();
    site.name=name;
    site.position.set(anchor.x,height(anchor.x,anchor.z),anchor.z);
    scene.add(site);
    return site;
  }
  function put(site:T.Group,geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number,sx=1,sy=1,sz=1){
    const mesh=new T.Mesh(geometry,material);
    mesh.position.set(x,y,z);
    mesh.scale.set(sx,sy,sz);
    site.add(mesh);
    return mesh;
  }
  const entrance=buildSite(anchors.entrance,"Forge du Cratère");
  for(const side of [-1,1]){
    put(entrance,box,basalt,side*2.5,1.8,0,1.25,4.2,2.3);
    put(entrance,fire,heat,side*2.5,4.1,0);
  }
  put(entrance,box,basalt,0,3.8,0,5.8,1.05,2.3);
  put(entrance,box,heat,0,3.21,.78,3.8,.12,.2);
  const vent=buildSite(anchors.vent,"Évent de pression");
  put(vent,box,basalt,0,.2,0,2.8,.5,2.8);
  put(vent,shaft,iron,0,1.25,0,1.2,2,1.2);
  const valve=put(vent,wheel,heat,0,1.65,.8);
  put(vent,box,heat,0,1.65,.81,.11,1.06,.15);
  const shelter=buildSite(anchors.shelter,"Abri des petits");
  for(const side of [-1,1])put(shelter,box,basalt,side*1.45,1.3,0,.65,3.2,2);
  put(shelter,box,basalt,0,2.7,0,3.6,.55,2.4);
  const hatch=put(shelter,box,iron,0,1.15,0,2.2,2.25,.24);
  put(shelter,fire,heat,0,3.12,.4);
  return (ventOpen:boolean,shelterOpen:boolean)=>{
    valve.rotation.z=ventOpen?Math.PI*.5:0;
    hatch.position.y=shelterOpen?2.8:1.15;
  };
}
