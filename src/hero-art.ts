import * as T from "three";
import { painted } from "./valley-art";

export function makeHero() {
  const actor=new T.Group();
  const navy=0x263963, blue=0x285fb7, gold=0xf4bf62, leather=0x503544;
  const linen=0xffe7c5, skin=0xe4aa82, hair=0x3d2b43;
  const groups=new Map<T.Group,{geometry:T.BufferGeometry;color:number}[]>();
  function part(parent:T.Group,geometry:T.BufferGeometry,color:number,x:number,y:number,z:number,turn=0) {
    let parts=groups.get(parent);
    if(!parts){parts=[];groups.set(parent,parts);}
    parts.push({geometry:geometry.rotateZ(turn).translate(x,y,z),color});
  }
  const ball=()=>new T.SphereGeometry(1,12,8);
  const oval=(parent:T.Group,color:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,turn=0)=>
    part(parent,ball().scale(sx,sy,sz),color,x,y,z,turn);
  oval(actor,blue,0,.18,0,.36,.45,.23);
  oval(actor,linen,0,.53,.015,.39,.135,.26);
  oval(actor,skin,0,.79,-.024,.29,.30,.27);
  oval(actor,hair,0,.94,.04,.32,.245,.26);
  for(let i=0;i<5;i++){
    oval(actor,hair,(i-2)*.116,.94+.075*Math.sin(i),.16,.105,.17,.117,(i-2)*.24);
  }
  part(actor,new T.CylinderGeometry(.33,.35,.105,12),leather,0,-.069,0);
  part(actor,new T.BoxGeometry(.13,.12,.05),gold,.12,-.067,-.237);
  part(actor,new T.BoxGeometry(.19,.21,.17),leather,.35,-.12,.07);
  const limbs=[-1,1].map(side=>{
    const arm=new T.Group(),leg=new T.Group();
    arm.position.set(side*.32,.36,0);
    leg.position.set(side*.17,-.17,0);
    actor.add(arm,leg);
    oval(arm,linen,0,-.10,0,.135,.19,.125);
    oval(arm,navy,0,-.282,0,.10,.16,.105);
    oval(arm,leather,0,-.445,-.015,.091,.10,.088);
    oval(leg,navy,0,-.192,0,.13,.265,.132);
    oval(leg,linen,0,-.39,0,.125,.097,.13);
    oval(leg,leather,0,-.59,-.072,.13,.16,.21);
    return {arm,leg,side};
  });
  const material=new T.MeshLambertMaterial({vertexColors:true});
  for(const [pivot,parts] of groups) pivot.add(new T.Mesh(painted(parts),material));
  const capeGeometry=new T.PlaneGeometry(1,1,10,12);
  const capePositions=capeGeometry.attributes.position;
  const colors=[];
  const trim=new T.Color(gold), cloth=new T.Color(0x303f9b);
  for(let i=0;i<capePositions.count;i++){
    const u=capePositions.getX(i),v=.5-capePositions.getY(i);
    const diamond=Math.abs(u)*3+Math.abs(v-.58)*2<.22;
    const color=Math.abs(u)>.42||v>.92||diamond?trim:cloth;
    colors.push(color.r,color.g,color.b);
  }
  capeGeometry.setAttribute("color",new T.Float32BufferAttribute(colors,3));
  const cape=new T.Mesh(capeGeometry,new T.MeshLambertMaterial({side:T.DoubleSide,vertexColors:true}));
  cape.frustumCulled=false;
  actor.add(cape);
  let stride=0, pace=0;
  function animate(dt:number,time:number,moving:boolean,running:boolean) {
    const speed=moving?(running?1:.58):0;
    pace=T.MathUtils.damp(pace,speed,12,dt);
    stride+=dt*(running?12:8);
    const swing=Math.sin(stride)*pace;
    for(const {arm,leg,side} of limbs){
      arm.rotation.x=-swing*side*.69;
      leg.rotation.x=swing*side*.88;
    }
    for(let row=0;row<=12;row++){
      const v=row/12;
      for(let col=0;col<=10;col++){
        const u=col/10-.5;
        const wave=Math.sin(time*5+v*6+u*6)*v*v;
        capePositions.setXYZ(row*11+col,u*(.50+v*.31)+wave*.035,.49-v*1.04+pace*v*.21,.205+v*(.15+pace*.43)+wave*.11+u*u*.15);
      }
    }
    capePositions.needsUpdate=true;
    capeGeometry.computeVertexNormals();
  }
  animate(0,0,false,false);
  return {actor,animate};
}
