import * as T from "three";

export function mountSky(scene: T.Scene) {
  const uniforms = {
    horizon: {value:new T.Color()},
    zenith: {value:new T.Color()},
    daylight: {value:1},
    elapsed: {value:0},
  };
  const atmosphere = new T.Mesh(new T.SphereGeometry(1400,24,12),new T.ShaderMaterial({
    uniforms, side:T.BackSide, depthWrite:false, fog:false,
    vertexShader:`
      varying vec3 direction;
      void main() {
        direction = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
      }
    `,
    fragmentShader:`
      varying vec3 direction;
      uniform vec3 horizon;
      uniform vec3 zenith;
      uniform float daylight;
      uniform float elapsed;
      float hash(vec2 p) {
        p = fract(p * vec2(.1031,.11369));
        p += dot(p,p.yx + 19.19);
        return fract((p.x + p.y) * p.x);
      }
      float noise(vec2 p) {
        vec2 i=floor(p), f=fract(p);
        f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
                   mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
      }
      void main() {
        vec3 ray=normalize(direction);
        float h=max(ray.y,0.);
        vec3 sky=mix(horizon,zenith,smoothstep(0.,.83,h));
        vec2 uv=ray.xz/(.19+h)*2.6+vec2(elapsed*.005,0.);
        float cloud=noise(uv)*.56+noise(uv*2.1)*.27+noise(uv*4.4)*.12+noise(uv*9.)*.05;
        float opacity=smoothstep(.49,.69,cloud)*smoothstep(.025,.16,h);
        vec3 cloudColor=mix(vec3(.56,.72,.91),vec3(1.,.97,.9),smoothstep(.54,.78,cloud));
        sky=mix(sky,cloudColor*(.16+.84*daylight),opacity*.9);
        float sun=max(0.,dot(ray,normalize(vec3(-.55,.48,-.82))));
        sky+=daylight*vec3(1.,.74,.36)*(pow(sun,48.)*.17+smoothstep(.9993,.9997,sun)*2.);
        gl_FragColor=vec4(sky,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }));
  atmosphere.frustumCulled=false;
  atmosphere.renderOrder=-100;
  scene.add(atmosphere);
  const night=new T.Color(0x101837);
  const clear=new T.Color(0x215ab6);
  const cloudy=new T.Color(0x647f9c);
  return (camera:T.Camera,horizon:T.Color,day:number,isClear:boolean,time:number)=>{
    atmosphere.position.copy(camera.position);
    uniforms.horizon.value.copy(horizon);
    uniforms.zenith.value.copy(night).lerp(isClear?clear:cloudy,day);
    uniforms.daylight.value=day;
    uniforms.elapsed.value=time;
  };
}
