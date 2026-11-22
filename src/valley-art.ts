import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

type Height = (x: number, z: number) => number;
type Part = { geometry: T.BufferGeometry; color: number };

export function painted(parts: Part[]) {
  for (const part of parts) {
    if (part.geometry.index) {
      const expanded = part.geometry.toNonIndexed();
      part.geometry.dispose();
      part.geometry = expanded;
    }
    const {geometry, color} = part;
    geometry.deleteAttribute("uv");
    const base = new T.Color(color);
    const rgb = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < rgb.length; i += 3) base.toArray(rgb, i);
    geometry.setAttribute("color", new T.BufferAttribute(rgb, 3));
  }
  const geometry = mergeGeometries(parts.map(part => part.geometry))!;
  for (const part of parts) part.geometry.dispose();
  return geometry;
}

export function canopyGeometry() {
  const parts: Part[] = [{
    geometry: new T.CylinderGeometry(.1, .24, 2, 7).translate(0, 1, 0),
    color: 0x745343
  }];
  for (const [x,y,z,s,color] of [
    [0,2.35,0,1.10,0x569b51], [-.72,1.98,.15,.74,0x3d794b],
    [.60,2.16,.30,.78,0x72ac56], [.12,2.94,-.28,.80,0x9fbc60],
    [0,1.93,-.65,.70,0x437d55]
  ]) {
    parts.push({geometry: new T.IcosahedronGeometry(1, 1).scale(s, s * .84, s).translate(x,y,z), color});
  }
  return painted(parts);
}

function movingWater(width: number, height: number, waterfall: boolean) {
  const uniforms = {clock: {value: 0}};
  const material = new T.MeshLambertMaterial({
    color: 0xffffff, side: waterfall ? T.DoubleSide : T.FrontSide,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.clock = uniforms.clock;
    shader.vertexShader = "varying vec3 waterPosition; varying float waterDepth;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>", "#include <begin_vertex>\nwaterPosition = position; waterDepth = -(modelViewMatrix * vec4(position, 1.)).z;"
    );
    shader.fragmentShader = "uniform float clock;\nvarying vec3 waterPosition; varying float waterDepth;\n" + shader.fragmentShader.replace(
      "#include <color_fragment>", `#include <color_fragment>
      vec2 p = waterPosition.xy;
      ${waterfall ? `
      float channel = .50 + .28 * sin(p.x*11. + sin(p.x*5.)*2.) + .14*sin(p.x*27.);
      float curtain = sin(p.x*3.7 + p.y*.2 + sin(p.y*.42+clock)*.36);
      float streak = pow(.5+.5*sin(p.y*3.2 + clock*13. + channel*8.),5.);
      float foam = 1.-smoothstep(-6.4,-4.7,p.y);
      float white = clamp(channel*.54+curtain*.08+streak*.31+foam*.62,0.,1.);
      diffuseColor.rgb *= mix(vec3(.035,.44,.63),vec3(.88,.99,1.),white);
      ` : `
      float fade = 1. - smoothstep(65., 175., waterDepth);
      float wave = sin(p.x * .56 + p.y * .28 + clock * 1.5)
        * sin(p.y * .79 - p.x * .2 - clock * 1.1);
      float ripples = pow(max(0., wave), 6.) * fade;
      diffuseColor.rgb *= mix(vec3(.04,.37,.48), vec3(.42,.85,.91), .25 + ripples * .65);
      `}`
    );
  };
  material.customProgramCacheKey = () => waterfall ? "valley-falls" : "valley-water";
  return {mesh: new T.Mesh(new T.PlaneGeometry(width, height), material), uniforms};
}

export function mountValley(scene: T.Scene, ground: Height, sea: number, random: Height) {
  const water = movingWater(14000, 14000, false);
  water.mesh.name = "Valley lake and rivers";
  water.mesh.rotation.x = -Math.PI / 2;
  water.mesh.position.y = sea;
  scene.add(water.mesh);

  const falls = movingWater(7.4, 12.8, true);
  falls.mesh.name = "Verdant Cascade";
  falls.mesh.position.set(-22, sea + 6.35, -28);
  scene.add(falls.mesh);

  const rockMaterial = new T.MeshLambertMaterial({color: 0x798297, flatShading: true});
  const rockGeometry = new T.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 8; i++) {
    const x = -27 + i * 1.45;
    const rock = new T.Mesh(rockGeometry, rockMaterial);
    rock.position.set(x, sea + 3.25 + random(i, 8), -31);
    rock.scale.set(2.2, 6.9 + random(i, 7) * 2.2, 2.6);
    rock.rotation.y = random(i, 5) * 6.28;
    scene.add(rock);
  }

  const terraces: Part[] = [];
  for(let i=0;i<12;i++){
    const x=-55+i*3.5,z=-44+Math.sin(i*1.2)*3;
    const height=9+random(i,45)*7;
    const base=ground(x,z)-2;
    const stone=[0x7585a0,0x8b94ac,0x657a97][i%3];
    terraces.push({geometry:new T.CylinderGeometry(2.2,3.2,height,6)
      .scale(1,1,1.42).rotateY(random(i,46)*Math.PI).translate(x,base+height/2,z),color:stone});
    terraces.push({geometry:new T.IcosahedronGeometry(1,1)
      .scale(2.6,1.15,3.7).translate(x,base+height,z),color:i%3===0?0x9cab57:0x628f54});
  }
  const backdrop: Part[] = [];
  for(let i=0;i<13;i++){
    const x=(i-6)*66,z=-345-random(i,47)*115;
    const height=24+random(i,48)*33;
    const ridge=new T.IcosahedronGeometry(1,0).rotateY(random(i,49)*Math.PI);
    const vertices=ridge.attributes.position;
    for(let j=0;j<vertices.count;j++){
      const y=vertices.getY(j);
      const pointed=(y+.9)/1.8;
      vertices.setX(j,vertices.getX(j)*(1-pointed*.53)+pointed*.33);
      vertices.setY(j,y*(.88+random(i,j%3)*.18));
    }
    ridge.computeVertexNormals();
    backdrop.push({geometry:ridge.scale(56,height,40).translate(x,height*.37,z),color:i%3===0?0x8c9bbd:0x6b8caa});
  }
  const scenery=new T.Mesh(painted([...terraces,...backdrop]),new T.MeshLambertMaterial({vertexColors:true,flatShading:true}));
  scenery.name="Verdant escarpments and distant ridgeline";
  scene.add(scenery);

  const stoneMaterial = new T.MeshLambertMaterial({color: 0xffffff, flatShading: true});
  const stones = new T.InstancedMesh(new T.CylinderGeometry(.9, 1, .18, 6), stoneMaterial, 148);
  const dummy = new T.Object3D();
  const stoneTint = new T.Color();
  for (let i = 0; i < stones.count; i++) {
    const z = 19 - Math.floor(i / 4) * 2.05;
    const x = Math.sin((12 - z) / 22) * 5 + (i % 4 - 1.5) * 1.44;
    dummy.position.set(x, ground(x,z) + .065, z);
    dummy.rotation.set((ground(x,z-1)-ground(x,z+1)) * .5, random(i,4) * 2, (ground(x+1,z)-ground(x-1,z)) * .5);
    dummy.scale.set(.84 + random(i,3)*.15, 1, .92 + random(i,2)*.22);
    dummy.updateMatrix();
    stones.setMatrixAt(i, dummy.matrix);
    stoneTint.set([0xb5aa98,0xa49486,0xcbbf9f][i%3]);
    stones.setColorAt(i, stoneTint);
  }
  stones.name = "Skyspire stone trail";
  scene.add(stones);

  const meadow = painted([
    {geometry: new T.CylinderGeometry(.035,.045,.72,4).translate(0,.36,0), color:0x5b983f},
    {geometry: new T.IcosahedronGeometry(.18,1).scale(1,.65,1).translate(0,.73,0), color:0xffffff},
    {geometry: new T.IcosahedronGeometry(.075,0).translate(0,.83,0), color:0xffd39a},
    {geometry: new T.BoxGeometry(.065,.55,.065).rotateZ(.34).translate(-.14,.26,0), color:0x6e9e43},
    {geometry: new T.BoxGeometry(.065,.65,.065).rotateZ(-.34).translate(.16,.29,0), color:0x83b34d},
  ]);
  const flowers = new T.InstancedMesh(meadow, new T.MeshLambertMaterial({vertexColors:true}), 240);
  for (let i=0; i<flowers.count; i++) {
    const z=23-random(i,11)*75;
    const x=Math.sin((12-z)/22)*5+(i%2===0?1:-1)*(3.7+random(i,12)*20);
    const h=ground(x,z);
    dummy.position.set(x,h+.12,z);
    dummy.rotation.set(0,random(i,13)*6.28,0);
    dummy.scale.setScalar(h>sea+.4 ? .45+random(i,14)*1.35 : 0);
    dummy.updateMatrix();
    flowers.setMatrixAt(i,dummy.matrix);
    flowers.setColorAt(i,stoneTint.set([0xf1a6fc,0xffca84,0xb0b9ff,0xeaf5db][i%4]));
  }
  flowers.name = "Verdant meadow";
  scene.add(flowers);

  const positions: number[] = [];
  for (const [x,z,bend,height] of [[-.18,0,-.2,.62],[.12,.09,.19,.82],[0,-.13,.03,.53]]) {
    positions.push(x-.07,0,z, x+.07,0,z, x+bend,height,z+.04);
  }
  const blades = new T.BufferGeometry();
  blades.setAttribute("position",new T.Float32BufferAttribute(positions,3));
  blades.computeVertexNormals();
  const tip = new T.Color(0xc6dc62);
  const grass = new T.InstancedMesh(blades,new T.MeshLambertMaterial({side:T.DoubleSide}),1800);
  let grassCount=0;
  for (let i=0; i<grass.count; i++) {
    const z=29-random(i,33)*110;
    const path=Math.sin((12-z)/22)*5;
    const x=path+(i%2===0?1:-1)*(3.2+random(i,34)**1.55*39);
    const y=ground(x,z);
    if (y<sea+.8) continue;
    dummy.position.set(x,y-.07,z);
    dummy.rotation.set(0,random(i,36)*Math.PI*2,0);
    dummy.scale.set(.85,.48+random(i,35)*.85,.85);
    dummy.updateMatrix();
    grass.setMatrixAt(grassCount,dummy.matrix);
    grass.setColorAt(grassCount++,stoneTint.set(0x356f32).lerp(tip,random(i,37)));
  }
  grass.count=grassCount;
  grass.name="Trailside grass";
  scene.add(grass);

  const castleParts: Part[] = [];
  const ivory = 0xe1d9cc, blue = 0x5f7bc0, gold = 0xffd17e;
  for (const [x,z,h,r] of [[-10,0,16,3],[0,-2,29,4],[10,0,16,3],[-6,5,12,2.4],[6,5,12,2.4]]) {
    castleParts.push(
      {geometry:new T.CylinderGeometry(r,r*1.13,h,8).translate(x,h/2,z),color:ivory},
      {geometry:new T.CylinderGeometry(.22,r*1.27,h*.35,8).translate(x,h*1.175,z),color:blue},
      {geometry:new T.OctahedronGeometry(.65).translate(x,h*1.35+.5,z),color:gold},
      {geometry:new T.BoxGeometry(r*.42,h*.25,.18).translate(x,h*.66,z+r),color:0x36548d}
    );
  }
  castleParts.push({geometry:new T.BoxGeometry(23,7,8).translate(0,3.5,1),color:ivory});
  const castle = new T.Mesh(painted(castleParts),new T.MeshLambertMaterial({vertexColors:true}));
  castle.name="Skyspire castle";
  castle.position.set(15,ground(15,-90)-1,-90);
  scene.add(castle);

  const islands = new T.InstancedMesh(
    painted([
      {geometry:new T.DodecahedronGeometry(1).scale(1,.58,.78),color:0x8c91b9},
      {geometry:new T.CylinderGeometry(.76,.91,.14,7).translate(0,.38,0),color:0x7fb06d}
    ]),
    new T.MeshLambertMaterial({vertexColors:true}), 5
  );
  for(let i=0;i<islands.count;i++){
    dummy.position.set(38+i*28,38+random(i,21)*25,-155-random(i,22)*85);
    dummy.rotation.set(0,random(i,23)*6.28,0);
    dummy.scale.setScalar(4+random(i,24)*8);
    dummy.updateMatrix();
    islands.setMatrixAt(i,dummy.matrix);
  }
  islands.name="Skyspire floating islets";
  scene.add(islands);

  return (time: number) => {
    water.uniforms.clock.value=time;
    falls.uniforms.clock.value=time;
  };
}
