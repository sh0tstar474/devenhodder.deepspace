/* ══════════════════════════════════════════════════════════════════════════
   DEEP FIELD — engine
   You shouldn't need to edit this file. All content lives in config.js.
   ══════════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";

/* ── 1 · environment ──────────────────────────────────────────────────── */
const $  = s => document.querySelector(s);
const canvas  = $("#field");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse  = matchMedia("(pointer: coarse)").matches;
const isNarrow = () => innerWidth < 881;
const lowPow  = coarse || (navigator.hardwareConcurrency || 8) <= 4;
const LOD     = lowPow ? 0.45 : 1;
const clamp   = (v,a,b) => v<a?a:v>b?b:v;
const lerp    = (a,b,t) => a+(b-a)*t;
const TAU     = Math.PI*2;
const D2R     = Math.PI/180;

/* Tunables — see SITE.sky / SITE.motion in config.js */
const SKY = Object.assign({stars:0.85, dust:1, haze:0.03}, SITE.sky||{});
const MOT = Object.assign({look:1, flight:1}, SITE.motion||{});

$("#siteName").textContent = SITE.name;
$("#siteSub").textContent  = SITE.sub;
document.title = SITE.name + " — portfolio";
if(!SITE.ambience) $("#btnAmb").remove();

let renderer;
try{
  renderer = new THREE.WebGLRenderer({canvas, antialias:!lowPow, alpha:false, powerPreference:"high-performance"});
}catch(e){
  document.body.classList.add("no-gl");
  $("#boot").classList.add("is-done");
  return;
}
renderer.setClearColor(0x000000, 1);
renderer.sortObjects = true;

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 3000);
const FOV_BASE = 62;
scene.add(camera);

/* ── 2 · generated textures ───────────────────────────────────────────── */
function tex(size, draw){
  const c = document.createElement("canvas"); c.width = c.height = size;
  draw(c.getContext("2d"), size, size/2);
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}

const T_STAR = tex(128,(g,S,h)=>{
  const r = g.createRadialGradient(h,h,0,h,h,h);
  r.addColorStop(0,"rgba(255,255,255,1)"); r.addColorStop(.09,"rgba(255,255,255,.92)");
  r.addColorStop(.24,"rgba(255,255,255,.3)"); r.addColorStop(.5,"rgba(255,255,255,.07)");
  r.addColorStop(1,"rgba(255,255,255,0)");
  g.fillStyle=r; g.fillRect(0,0,S,S);
  g.globalCompositeOperation="lighter"; g.translate(h,h);
  for(let i=0;i<2;i++){
    const sp=g.createLinearGradient(-h,0,h,0);
    sp.addColorStop(0,"rgba(255,255,255,0)"); sp.addColorStop(.5,"rgba(255,255,255,.5)");
    sp.addColorStop(1,"rgba(255,255,255,0)");
    g.fillStyle=sp; g.rotate(i*Math.PI/2); g.fillRect(-h,-1,S,2);
  }
});

const T_GLOW = tex(128,(g,S,h)=>{
  const r=g.createRadialGradient(h,h,0,h,h,h);
  r.addColorStop(0,"rgba(255,255,255,.5)"); r.addColorStop(.25,"rgba(255,255,255,.14)");
  r.addColorStop(.6,"rgba(255,255,255,.03)"); r.addColorStop(1,"rgba(255,255,255,0)");
  g.fillStyle=r; g.fillRect(0,0,S,S);
});

const T_RING = tex(256,(g,S,h)=>{
  g.translate(h,h);
  const r=g.createRadialGradient(0,0,h*.80,0,0,h*.99);
  r.addColorStop(0,"rgba(255,255,255,0)"); r.addColorStop(.55,"rgba(255,255,255,.95)");
  r.addColorStop(1,"rgba(255,255,255,0)");
  g.fillStyle=r; g.beginPath(); g.arc(0,0,h,0,TAU); g.fill();
});

const T_CLOUD = tex(256,(g,S,h)=>{
  for(let i=0;i<26;i++){
    const x=Math.random()*S,y=Math.random()*S,r=30+Math.random()*80;
    const rg=g.createRadialGradient(x,y,0,x,y,r);
    rg.addColorStop(0,"rgba(255,255,255,.05)"); rg.addColorStop(1,"rgba(255,255,255,0)");
    g.fillStyle=rg; g.fillRect(0,0,S,S);
  }
  /* the blobs above are scattered anywhere on the canvas and can reach the
     corners, which left the sprite's square boundary faintly visible
     against a black sky. Mask everything back down to transparent well
     before the edge, the same way every other generated texture here is
     built from one gradient that never reaches its own corners. */
  g.globalCompositeOperation = "destination-in";
  const mask = g.createRadialGradient(h,h,0,h,h,h);
  mask.addColorStop(0,"rgba(255,255,255,1)"); mask.addColorStop(.7,"rgba(255,255,255,1)");
  mask.addColorStop(1,"rgba(255,255,255,0)");
  g.fillStyle=mask; g.fillRect(0,0,S,S);
});

/* ── 3 · shared materials ─────────────────────────────────────────────── */
const DUST_X = 440, DUST_Y = 380, DUST_Z = 520, DUST_SPAN = DUST_Z*2;

function pointsMat(loop){
  return new THREE.ShaderMaterial({
    uniforms:{ uTime:{value:0}, uDpr:{value:1}, uFade:{value:0}, uStretch:{value:0},
               uTravel:{value:0}, uLoop:{value:loop?1:0}, uBright:{value:1},
               /* white by default — does nothing unless a caller sets it,
                  same contract as bodyMat/annulusMat's tints */
               uTint:{value:new THREE.Color(0xffffff)} },
    vertexShader:[
      "attribute float aSize; attribute float aSeed; attribute float aLum;",
      "uniform float uTime,uDpr,uStretch,uTravel,uLoop;",
      "varying float vTw; varying float vL;",
      "void main(){",
      " vec3 p=position;",
      " if(uLoop>0.5){ p.z=-DZ+mod(p.z+DZ+uTravel,DSPAN); p.z+=uStretch*aSize*1.1; }",
      " vec4 mv=modelViewMatrix*vec4(p,1.0);",
      " float d=max(-mv.z,1.0);",
      " vTw=0.55+0.45*sin(uTime*(0.4+aSeed*0.3)+aSeed*9.0);",
      " gl_PointSize=min(aSize*uDpr*(300.0/d), 96.0*uDpr);",
      " gl_Position=projectionMatrix*mv; vL=aLum;",
      "}"].join("\n").replace(/DSPAN/g, DUST_SPAN.toFixed(1)).replace(/DZ/g, DUST_Z.toFixed(1)),
    fragmentShader:[
      "uniform float uFade,uBright; uniform vec3 uTint; varying float vTw; varying float vL;",
      "void main(){",
      " float d=length(gl_PointCoord-vec2(0.5)); if(d>0.5) discard;",
      " float a=pow(smoothstep(0.5,0.0,d),2.3);",
      " float v=vL*vTw*uBright;",
      " gl_FragColor=vec4(uTint*v,a*v*uFade);",
      "}"].join("\n"),
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
  });
}

/* Same point-sprite recipe as pointsMat, but coloured per-point instead of
   per-material — the galaxy is the one point cloud on this page that needs
   a gradient (red core fading to blue arms) rather than a single tint. */
function galaxyMat(){
  return new THREE.ShaderMaterial({
    uniforms:{ uTime:{value:0}, uDpr:{value:1}, uFade:{value:0}, uBright:{value:1} },
    vertexShader:[
      "attribute float aSize; attribute float aSeed; attribute float aLum; attribute vec3 aColor;",
      "uniform float uTime,uDpr;",
      "varying float vTw; varying float vL; varying vec3 vC;",
      "void main(){",
      " vec4 mv=modelViewMatrix*vec4(position,1.0);",
      " float d=max(-mv.z,1.0);",
      " vTw=0.55+0.45*sin(uTime*(0.4+aSeed*0.3)+aSeed*9.0);",
      " gl_PointSize=min(aSize*uDpr*(300.0/d), 96.0*uDpr);",
      " gl_Position=projectionMatrix*mv; vL=aLum; vC=aColor;",
      "}"].join("\n"),
    fragmentShader:[
      "uniform float uFade,uBright; varying float vTw; varying float vL; varying vec3 vC;",
      "void main(){",
      " float d=length(gl_PointCoord-vec2(0.5)); if(d>0.5) discard;",
      " float a=pow(smoothstep(0.5,0.0,d),2.3);",
      " float v=vL*vTw*uBright;",
      " gl_FragColor=vec4(vC*v,a*v*uFade);",
      "}"].join("\n"),
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
  });
}

/* Unlit body with a fixed world sun, banding and a rim. Used for solid objects. */
function bodyMat(o){
  o = o||{};
  return new THREE.ShaderMaterial({
    uniforms:{
      uLight:{value:new THREE.Vector3(-0.55,0.42,0.72).normalize()},
      uBase:{value:o.base!==undefined?o.base:0.55},
      uBands:{value:o.bands!==undefined?o.bands:0},
      uGrain:{value:o.grain!==undefined?o.grain:0},
      uRim:{value:o.rim!==undefined?o.rim:0.30},
      uAmb:{value:o.amb!==undefined?o.amb:0.04},
      /* both default to white, so anything that doesn't pass a tint renders
         exactly as before — plain grayscale */
      uTintA:{value:new THREE.Color(o.tintA!==undefined?o.tintA:0xffffff)},
      uTintB:{value:new THREE.Color(o.tintB!==undefined?o.tintB:0xffffff)},
      uFade:{value:0}
    },
    vertexShader:[
      "varying vec3 vN; varying vec3 vP; varying vec3 vVN;",
      "void main(){ vN=normalize(mat3(modelMatrix)*normal); vVN=normalize(normalMatrix*normal);",
      " vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }"].join("\n"),
    fragmentShader:[
      "uniform vec3 uLight; uniform float uBase,uBands,uGrain,uRim,uAmb,uFade;",
      "uniform vec3 uTintA,uTintB;",
      "varying vec3 vN; varying vec3 vP; varying vec3 vVN;",
      "float h3(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }",
      "void main(){",
      " vec3 n=normalize(vN);",
      " float l=max(dot(n,uLight),0.0);",
      " float sh=smoothstep(0.0,0.42,l);",
      " float v=uBase;",
      " vec3 q=normalize(vP);",
      " if(uBands>0.0){",
      /* two octaves of latitude banding, warped so they wander like real
         cloud belts rather than sitting in perfect stripes */
      "   float w=sin(q.x*3.1)*0.62+sin(q.z*2.3)*0.48+sin(q.x*7.7+q.z*5.1)*0.16;",
      "   v+=0.21*(0.5+0.5*sin(q.y*uBands+w));",
      "   v+=0.085*(0.5+0.5*sin(q.y*uBands*3.1+w*2.2));",
      "   v+=0.05*(0.5+0.5*sin(q.y*uBands*7.3-w*3.4));",
      " }",
      " if(uGrain>0.0){",
      "   v+=0.17*(h3(floor(vP*uGrain))-0.5);",
      "   v+=0.09*(h3(floor(vP*uGrain*2.7)+7.0)-0.5);",
      " }",
      /* two-tone tint across the bands themselves, not a flat colour wash —
         brighter bands lean toward tintA, darker bands toward tintB */
      " vec3 tint=mix(uTintB,uTintA,clamp(v*1.15-0.15,0.0,1.0));",
      " float fres=1.0-max(dot(normalize(vVN),vec3(0.0,0.0,1.0)),0.0);",
      " float rim=pow(fres,3.0);",
      /* limb glow only on the lit side, so the terminator stays crisp */
      " float limb=pow(fres,5.0)*smoothstep(-0.25,0.55,l);",
      " vec3 c=tint*v*(uAmb+ (1.0-uAmb)*sh)",
      "        + vec3(0.62,0.70,0.78)*rim*uRim",
      "        + vec3(0.80,0.86,0.94)*limb*uRim*1.5;",
      " gl_FragColor=vec4(c*uFade,1.0);",
      "}"].join("\n"),
    transparent:false, depthWrite:true
  });
}

/* Blackbody radiation colour, Kelvin -> THREE.Color. Same curve-fit as the
   GLSL blackbody() in accretionMat, just needed on the JS side too for the
   infall embers (a Points material, coloured per-vertex rather than by a
   continuous shader field). */
function blackbodyColor(k){
  const t = k/100;
  let r,g,b;
  r = t<=66 ? 255 : clamp(329.698727446*Math.pow(t-60,-0.1332047592),0,255);
  g = t<=66 ? clamp(99.4708025861*Math.log(Math.max(t,1))-161.1195681661,0,255)
             : clamp(288.1221695283*Math.pow(t-60,-0.0755148492),0,255);
  b = t>=66 ? 255 : t<=19 ? 0 : clamp(138.5177312231*Math.log(t-10)-305.0447927307,0,255);
  return new THREE.Color(r/255,g/255,b/255);
}

/* Accretion disk / planetary rings: polar-shaded annulus. */
function annulusMat(o){
  o=o||{};
  return new THREE.ShaderMaterial({
    uniforms:{
      uTime:{value:0}, uIn:{value:o.inner}, uOut:{value:o.outer},
      uSpin:{value:o.spin!==undefined?o.spin:1.6},
      uFreq:{value:o.freq!==undefined?o.freq:8.0},
      uFine:{value:o.fine!==undefined?o.fine:26.0},
      uDop:{value:o.doppler?1:0}, uInt:{value:o.intensity!==undefined?o.intensity:1},
      uHot:{value:o.hot!==undefined?o.hot:0},
      /* white by default — same "does nothing unless you pass it" contract
         as bodyMat's tints */
      uTint:{value:new THREE.Color(o.tint!==undefined?o.tint:0xffffff)},
      uFade:{value:0}
    },
    vertexShader:[
      "varying vec2 vPol; uniform float uIn,uOut;",
      "void main(){ float r=length(position.xy);",
      " vPol=vec2(clamp((r-uIn)/(uOut-uIn),0.0,1.0), atan(position.y,position.x));",
      " gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }"].join("\n"),
    fragmentShader:[
      "uniform float uTime,uSpin,uFreq,uFine,uDop,uInt,uHot,uFade; uniform vec3 uTint;",
      "varying vec2 vPol;",
      /* same smooth value noise as the black hole's disk — the sine-product
         turbulence this used to share with it aliases into a moiré ripple
         once you look closely, especially once it's coloured. */
      "float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }",
      "float vnoise(vec2 p){",
      " vec2 i=floor(p), f=fract(p);",
      " float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));",
      " vec2 u=f*f*(3.0-2.0*f);",
      " return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;",
      "}",
      "void main(){",
      " float t=vPol.x, a=vPol.y;",
      /* inner material orbits faster — this is what shears the bands into
         filaments and reads as differential rotation */
      " float swirl=a - uTime*uSpin/(0.16+t*1.5);",
      " vec2 np=vec2(swirl*uFreq*0.5, t*uFine*0.32);",
      " float n1=vnoise(np);",
      " float n2=vnoise(np*2.3+vec2(3.1,8.4));",
      " float turb=smoothstep(0.18,0.9,n1*0.65+n2*0.35);",
      " float edge=smoothstep(0.0,0.09,t)*smoothstep(1.0,0.60,t);",
      " float v=edge*(0.16+0.84*turb);",
      /* white-hot inner edge where the disk meets the horizon */
      " v+=edge*uHot*pow(1.0-t,4.0)*(0.65+0.35*n1);",
      " if(uDop>0.5) v*=0.24+1.28*smoothstep(-1.0,1.0,cos(a));",
      " v*=uInt;",
      " gl_FragColor=vec4(uTint*v, v*uFade);",
      "}"].join("\n"),
    transparent:true, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending
  });
}

/* Ring debris: small chunks holding a steady orbit at their own fixed
   radius (unlike the black hole's embers, nothing falls in here — a
   planetary ring is a stable orbit, not an infall) with inner chunks
   circling faster than outer ones, same as any real ring system. */
function debrisMat(){
  return new THREE.ShaderMaterial({
    uniforms:{ uTime:{value:0}, uDpr:{value:1}, uFade:{value:0}, uInt:{value:1},
               uTint:{value:new THREE.Color(0xead9b0)} },
    vertexShader:[
      "attribute float aRad; attribute float aAng0; attribute float aSize;",
      "attribute float aSeed; attribute float aY;",
      "uniform float uTime,uDpr;",
      "varying float vB;",
      "void main(){",
      " float ang=aAng0 + uTime*2.4/aRad;",
      " vec3 p=vec3(cos(ang)*aRad, aY, sin(ang)*aRad);",
      " vec4 mv=modelViewMatrix*vec4(p,1.0);",
      " float d=max(-mv.z,1.0);",
      " float tw=0.72+0.28*sin(uTime*(1.4+aSeed*1.1)+aSeed*8.0);",
      " vB=tw;",
      " gl_PointSize=min(aSize*uDpr*(300.0/d),18.0*uDpr);",
      " gl_Position=projectionMatrix*mv;",
      "}"].join("\n"),
    fragmentShader:[
      "uniform float uFade,uInt; uniform vec3 uTint; varying float vB;",
      "void main(){",
      " float d=length(gl_PointCoord-vec2(0.5)); if(d>0.5) discard;",
      " float a=pow(smoothstep(0.5,0.0,d),2.0);",
      " gl_FragColor=vec4(uTint*vB*uInt, a*vB*uInt*uFade);",
      "}"].join("\n"),
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
  });
}

/* Pulsar beam cone: fades along its length. */
function beamMat(){
  return new THREE.ShaderMaterial({
    uniforms:{ uFade:{value:0}, uInt:{value:1}, uTime:{value:0} },
    vertexShader:["varying float vY; varying vec3 vVN;",
      "void main(){ vY=uv.y; vVN=normalize(normalMatrix*normal);",
      " gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }"].join("\n"),
    fragmentShader:["uniform float uFade,uInt,uTime; varying float vY; varying vec3 vVN;",
      "void main(){",
      " float f=pow(1.0-clamp(vY,0.0,1.0),1.6);",
      " float side=pow(1.0-abs(dot(normalize(vVN),vec3(0.0,0.0,1.0))),1.4);",
      " float flick=0.85+0.15*sin(uTime*11.0);",
      " float v=f*side*uInt*flick*0.5;",
      " gl_FragColor=vec4(vec3(v),v*uFade);",
      "}"].join("\n"),
    transparent:true, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending
  });
}

/* Every material that fades in on boot / out on distance gets collected here. */
const fadeables = [];
function reg(m){ fadeables.push(m); return m; }

function sprite(map, opacity, blend){
  const m = new THREE.SpriteMaterial({
    map, transparent:true, depthWrite:false, fog:false, opacity:0,
    blending: blend===undefined ? THREE.AdditiveBlending : blend
  });
  m.userData.base = opacity;
  fadeables.push(m);
  return new THREE.Sprite(m);
}

/* ── 4 · dust field + deep background ─────────────────────────────────── */
function pointCloud(n, place){
  const pos=new Float32Array(n*3), siz=new Float32Array(n), sed=new Float32Array(n), lum=new Float32Array(n);
  /* r/g/b default white — costs nothing for the many callers that never
     touch them, but lets a caller like the galaxy hand back a per-point
     colour instead of plain grayscale */
  const col=new Float32Array(n*3);
  const v={x:0,y:0,z:0,s:1,l:1,r:1,g:1,b:1};
  for(let i=0;i<n;i++){
    v.r=1; v.g=1; v.b=1;
    place(v,i,n);
    pos[i*3]=v.x; pos[i*3+1]=v.y; pos[i*3+2]=v.z;
    siz[i]=v.s; lum[i]=v.l; sed[i]=Math.random()*TAU;
    col[i*3]=v.r; col[i*3+1]=v.g; col[i*3+2]=v.b;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.BufferAttribute(pos,3));
  g.setAttribute("aSize",new THREE.BufferAttribute(siz,1));
  g.setAttribute("aSeed",new THREE.BufferAttribute(sed,1));
  g.setAttribute("aLum", new THREE.BufferAttribute(lum,1));
  g.setAttribute("aColor",new THREE.BufferAttribute(col,3));
  return g;
}

const dustMat = reg(pointsMat(true));
const dust = new THREE.Points(pointCloud(Math.round(3000*LOD),(v)=>{
  v.x=(Math.random()*2-1)*DUST_X;
  v.y=(Math.random()*2-1)*DUST_Y;
  v.z=(Math.random()*2-1)*DUST_Z;
  const d=Math.hypot(v.x,v.y,v.z);
  if(d<70){ const k=(70+Math.random()*90)/Math.max(d,0.001); v.x*=k; v.y*=k; v.z*=k; }
  v.s=0.8+Math.pow(Math.random(),2.8)*6.2;
  v.l=0.14+Math.pow(Math.random(),2.4)*0.86;
}), dustMat);
dust.frustumCulled=false; scene.add(dust);

const deepMat = reg(pointsMat(false));
const deep = new THREE.Points(pointCloud(Math.round(2600*LOD),(v)=>{
  const u=Math.random()*2-1, th=Math.random()*TAU, s=Math.sqrt(1-u*u), R=900+Math.random()*900;
  v.x=Math.cos(th)*s*R; v.y=u*R; v.z=Math.sin(th)*s*R;
  v.s=5+Math.pow(Math.random(),2.2)*21;
  v.l=0.06+Math.pow(Math.random(),3.2)*0.94;
}), deepMat);
deep.frustumCulled=false; scene.add(deep);

/* A hint of far nebulosity — kept very faint. This is the single biggest
   lever on how black the sky reads; raise the 0.035 to bring back haze. */
for(let i=0;i<(SKY.haze>0?2:0);i++){
  const s=sprite(T_CLOUD,SKY.haze);
  const u=Math.random()*2-1, th=Math.random()*TAU, k=Math.sqrt(1-u*u), R=1250;
  s.position.set(Math.cos(th)*k*R, u*R*0.7, Math.sin(th)*k*R);
  s.scale.setScalar(620+Math.random()*280);
  s.renderOrder=-10;
  scene.add(s);
}

/* ── 5 · the phenomena ────────────────────────────────────────────────── */
const MAKERS = {};

/* Accretion disk: same polar turbulence as annulusMat, but with a real
   radial temperature gradient (white-hot at the horizon, cooling to ember
   red at the outer edge) instead of flat grayscale. */
function accretionMat(o){
  o=o||{};
  return new THREE.ShaderMaterial({
    uniforms:{
      uTime:{value:0}, uIn:{value:o.inner}, uOut:{value:o.outer},
      uSpin:{value:o.spin!==undefined?o.spin:1.5},
      uFreq:{value:o.freq!==undefined?o.freq:7.0},
      uFine:{value:o.fine!==undefined?o.fine:24.0},
      uDop:{value:o.doppler?1:0}, uInt:{value:o.intensity!==undefined?o.intensity:1},
      uHot:{value:o.hot!==undefined?o.hot:0.9},
      uTemp:{value:o.temp!==undefined?o.temp:9400.0},
      uFade:{value:0}
    },
    vertexShader:[
      "varying vec2 vPol; uniform float uIn,uOut;",
      "void main(){ float r=length(position.xy);",
      " vPol=vec2(clamp((r-uIn)/(uOut-uIn),0.0,1.0), atan(position.y,position.x));",
      " gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }"].join("\n"),
    fragmentShader:[
      "uniform float uTime,uSpin,uFreq,uFine,uDop,uInt,uHot,uTemp,uFade;",
      "varying vec2 vPol;",
      /* smooth value noise — stacked sine bands at incommensurate
         frequencies were beating against each other into a dense moiré
         ripple instead of reading as turbulence, so the disk builds up
         into visual noise the longer you look at it. This has no
         periodic component to beat against itself. */
      "float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }",
      "float vnoise(vec2 p){",
      " vec2 i=floor(p), f=fract(p);",
      " float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));",
      " vec2 u=f*f*(3.0-2.0*f);",
      " return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;",
      "}",
      /* blackbody radiation colour, Kelvin in -> RGB out. Standard
         Planckian-locus curve fit — the same physics that makes a stove
         element go dull red, then orange, then white as it heats up. */
      "vec3 blackbody(float k){",
      " float t=k/100.0; float r,gr,bl;",
      " if(t<=66.0){ r=255.0; } else { r=clamp(329.698727446*pow(t-60.0,-0.1332047592),0.0,255.0); }",
      " if(t<=66.0){ gr=clamp(99.4708025861*log(max(t,1.0))-161.1195681661,0.0,255.0); }",
      " else { gr=clamp(288.1221695283*pow(t-60.0,-0.0755148492),0.0,255.0); }",
      " if(t>=66.0){ bl=255.0; } else if(t<=19.0){ bl=0.0; }",
      " else { bl=clamp(138.5177312231*log(t-10.0)-305.0447927307,0.0,255.0); }",
      " return vec3(r,gr,bl)/255.0;",
      "}",
      "void main(){",
      " float t=vPol.x, a=vPol.y;",
      /* inner material orbits faster — this is what shears the bands into
         filaments and reads as differential rotation */
      " float swirl=a - uTime*uSpin/(0.16+t*1.5);",
      " vec2 np=vec2(swirl*uFreq*0.5, t*uFine*0.32);",
      " float n1=vnoise(np);",
      " float n2=vnoise(np*2.1+vec2(5.2,1.3));",
      " float n3=vnoise(np*4.2+vec2(9.1,7.7));",
      " float turb=smoothstep(0.15,0.92,n1*0.55+n2*0.30+n3*0.15);",
      " float edge=smoothstep(0.0,0.09,t)*smoothstep(1.0,0.60,t);",
      " float v=edge*(0.16+0.84*turb);",
      " v+=edge*uHot*pow(1.0-t,4.0)*(0.65+0.35*n1);",
      " float beam=1.0;",
      " if(uDop>0.5) beam=0.24+1.28*smoothstep(-1.0,1.0,cos(a));",
      " v*=beam*uInt;",
      /* radial temperature gradient driven by real blackbody colour — hot
         and blue-white at the horizon, cooling toward the outer edge the
         same way a real disk's temperature falls off with radius. */
      " vec3 hotC=blackbody(uTemp), coolC=blackbody(uTemp*0.30);",
      " vec3 col=mix(hotC,coolC,pow(t,0.62));",
      " col=mix(col,vec3(1.0),clamp((v-0.72)*1.3,0.0,0.82));",
      " col=mix(col,mix(col,vec3(1.0,0.97,0.92),0.3),clamp((beam-1.0)*0.6,0.0,1.0));",
      " gl_FragColor=vec4(col*v, v*uFade);",
      "}"].join("\n"),
    transparent:true, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending
  });
}

/* Photon ring, faked as a Fresnel rim on a shell just outside the horizon.
   Because it's view-angle driven rather than a flat billboard or a fixed
   ring plane, it reads correctly from every direction you orbit to. */
function photonRimMat(){
  return new THREE.ShaderMaterial({
    uniforms:{ uTime:{value:0}, uInt:{value:1}, uFade:{value:0},
               uTint:{value:new THREE.Color(0xfff2df)} },
    vertexShader:[
      "varying vec3 vN; varying vec3 vV;",
      "void main(){",
      " vN=normalize(normalMatrix*normal);",
      " vec4 mv=modelViewMatrix*vec4(position,1.0);",
      " vV=normalize(-mv.xyz);",
      " gl_Position=projectionMatrix*mv;",
      "}"].join("\n"),
    fragmentShader:[
      "uniform float uTime,uInt,uFade; uniform vec3 uTint; varying vec3 vN; varying vec3 vV;",
      "void main(){",
      " float rim=1.0-max(dot(normalize(vN),normalize(vV)),0.0);",
      " float ring=pow(rim,9.0);",
      " float shim=0.88+0.12*sin(uTime*2.2);",
      " float v=ring*shim*uInt;",
      " gl_FragColor=vec4(uTint*v, v*uFade);",
      "}"].join("\n"),
    transparent:true, depthWrite:false, side:THREE.FrontSide, blending:THREE.AdditiveBlending
  });
}

/* Infall embers: matter streaming down out of the visible disk and
   vanishing at the horizon, accelerating as it falls — same recycling
   "flow" trick as the pulsar's embers, just spiralling inward. */
function infallMat(){
  return new THREE.ShaderMaterial({
    uniforms:{ uTime:{value:0}, uDpr:{value:1}, uFade:{value:0}, uFlow:{value:0.1},
               uInt:{value:1}, uIn:{value:21}, uOut:{value:86},
               uCore:{value:blackbodyColor(9400)}, uOuter:{value:blackbodyColor(9400*0.30)} },
    vertexShader:[
      "attribute float aSize; attribute float aSeed; attribute float aU0;",
      "attribute float aAng; attribute float aTilt;",
      "uniform float uTime,uDpr,uFlow,uIn,uOut;",
      "varying float vB; varying float vT;",
      "void main(){",
      " float u=fract(aU0+uTime*uFlow);",
      " float tt=1.0-u;",
      " float rad=uIn+(uOut-uIn)*pow(tt,1.7);",
      " float ang=aAng - uTime*1.4/(0.16+tt*1.5);",
      " vec3 p=vec3(cos(ang)*rad, sin(ang)*rad, sin(aTilt)*rad*0.05*tt);",
      " vec4 mv=modelViewMatrix*vec4(p,1.0);",
      " float d=max(-mv.z,1.0);",
      " float tw=0.55+0.45*sin(uTime*(2.4+aSeed*1.3)+aSeed*10.0);",
      " float edge=smoothstep(0.0,0.06,u)*(1.0-smoothstep(0.85,1.0,u));",
      " vB=edge*tw; vT=tt;",
      " gl_PointSize=min(aSize*uDpr*(300.0/d)*(0.6+(1.0-tt)*1.4),46.0*uDpr);",
      " gl_Position=projectionMatrix*mv;",
      "}"].join("\n"),
    fragmentShader:[
      "uniform float uFade,uInt; uniform vec3 uCore,uOuter; varying float vB; varying float vT;",
      "void main(){",
      " float d=length(gl_PointCoord-vec2(0.5)); if(d>0.5) discard;",
      " float a=pow(smoothstep(0.5,0.0,d),1.8);",
      " vec3 col=mix(uCore,uOuter,vT);",
      " float v=vB*uInt;",
      " gl_FragColor=vec4(col*v, a*min(v,1.6)*uFade);",
      "}"].join("\n"),
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
  });
}

MAKERS.blackhole = (cfg) => {
  cfg = cfg || {};
  const g = new THREE.Group();
  const horizon = new THREE.Mesh(new THREE.SphereGeometry(20,32,24),
    new THREE.MeshBasicMaterial({color:0x000000}));
  horizon.renderOrder = 0; g.add(horizon);

  const DISK_TEMP = 4200;   /* warm orange-white — lower Kelvin reads orange,
                                higher reads blue-white */

  const rm = reg(photonRimMat());
  rm.uniforms.uTint.value.copy(blackbodyColor(DISK_TEMP*1.15));
  const rim = new THREE.Mesh(new THREE.SphereGeometry(21.4,32,24), rm);
  rim.renderOrder = 1; g.add(rim);

  /* a lone rigid assembly for the disk — an earlier version also carried a
     second ring standing on a different plane to fake the far side bent
     over the pole, but two thin additive surfaces crossing through each
     other at an angle tears/flickers along the seam, and duplicates the
     ring visually. One clean disk reads better and costs less. */
  const precess = new THREE.Group(); g.add(precess);

  const dm = reg(accretionMat({inner:27,outer:88,spin:1.5,freq:7,fine:24,
                             doppler:true,intensity:1.15,hot:0.9,temp:DISK_TEMP}));
  const disk = new THREE.Mesh(new THREE.RingGeometry(27,88,192,10), dm);
  disk.rotation.set(-Math.PI/2 + 0.30, 0, 0.22);
  disk.renderOrder = 2; precess.add(disk);

  const im = reg(infallMat());
  im.uniforms.uCore.value.copy(blackbodyColor(DISK_TEMP));
  im.uniforms.uOuter.value.copy(blackbodyColor(DISK_TEMP*0.30));

  function scatterEmbers(host, count){
    const sz=new Float32Array(count), sd=new Float32Array(count), u0=new Float32Array(count),
          an=new Float32Array(count), ti=new Float32Array(count);
    for(let i=0;i<count;i++){
      sz[i]=1.3+Math.random()*2.8; sd[i]=Math.random()*TAU;
      u0[i]=Math.random(); an[i]=Math.random()*TAU; ti[i]=Math.random()*TAU;
    }
    const G=new THREE.BufferGeometry();
    G.setAttribute("position",new THREE.BufferAttribute(new Float32Array(count*3),3));
    G.setAttribute("aSize",new THREE.BufferAttribute(sz,1));
    G.setAttribute("aSeed",new THREE.BufferAttribute(sd,1));
    G.setAttribute("aU0",  new THREE.BufferAttribute(u0,1));
    G.setAttribute("aAng", new THREE.BufferAttribute(an,1));
    G.setAttribute("aTilt",new THREE.BufferAttribute(ti,1));
    const pts=new THREE.Points(G,im); pts.frustumCulled=false;
    host.add(pts);   /* inherits the host's own plane/tilt for free */
    return pts;
  }
  scatterEmbers(disk, Math.round(320*LOD));

  const halo = sprite(T_GLOW, 0.26);
  halo.scale.setScalar(150); halo.renderOrder = 3; g.add(halo);
  halo.material.color.copy(blackbodyColor(DISK_TEMP));

  const amb = makeAmbience(g, cfg, {synth:"hum", near:195, far:310, volume:0.45});

  return { group:g, bound:92, standoff:190, update(t,dt,f){
    dm.uniforms.uTime.value = t;
    dm.uniforms.uInt.value = 1.15 + f*0.5;
    rm.uniforms.uTime.value = t;
    rm.uniforms.uInt.value = 1.35 + f*0.7;
    im.uniforms.uTime.value = t;
    im.uniforms.uInt.value = 0.9 + f*0.5;
    im.uniforms.uFlow.value = 0.09 + f*0.05;
    halo.material.userData.base = 0.26 + f*0.18;
    precess.rotation.z += dt*0.02;
    amb(f,dt);
  }};
};

MAKERS.pulsar = (cfg) => {
  cfg = cfg || {};
  const g    = new THREE.Group();
  const spin = new THREE.Group(); g.add(spin);
 
  const J      = cfg.jet || {};
  const REACH  = J.reach || 70;
  const TURNS  = J.turns !== undefined ? J.turns : 1.9;
  const WIDTH  = J.width !== undefined ? J.width : 9.5;
  const OBLIQ  = cfg.obliquity !== undefined ? cfg.obliquity : 0.45;
  const period = cfg.period || 0.1933;
  const omega  = TAU / period;
  const TINT   = new THREE.Color(cfg.tint || 0x3f8dff);
 
  /* A short period means a fast strobe. Two flashes per rotation past ~3Hz
     is both ugly and a real photosensitivity risk, so flash contrast rolls
     off automatically as the period shortens — it keeps spinning fast, it
     just stops hammering. */
  const SAFE = Math.min(1, 3 / Math.max(2/period, 3));
 
  /* ── anamorphic flare ─────────────────────────────────────────────── */
  const T_FLARE = tex(256,(c,S,h)=>{
    c.translate(h,h);
    let r=c.createRadialGradient(0,0,0,0,0,h*0.45);
    r.addColorStop(0,"rgba(255,255,255,.9)");
    r.addColorStop(.22,"rgba(255,255,255,.24)");
    r.addColorStop(1,"rgba(255,255,255,0)");
    c.fillStyle=r; c.beginPath(); c.arc(0,0,h,0,TAU); c.fill();
    c.globalCompositeOperation="lighter";
    const spike=(len,wid,a,op)=>{
      c.save(); c.rotate(a);
      const lg=c.createLinearGradient(-len,0,len,0);
      lg.addColorStop(0,"rgba(255,255,255,0)");
      lg.addColorStop(.5,"rgba(255,255,255,"+op+")");
      lg.addColorStop(1,"rgba(255,255,255,0)");
      c.fillStyle=lg;
      c.beginPath(); c.moveTo(-len,0); c.lineTo(0,-wid);
      c.lineTo(len,0); c.lineTo(0,wid); c.closePath(); c.fill();
      c.restore();
    };
    spike(h*0.97, 1.6, 0,          .95);
    spike(h*0.50, 1.1, Math.PI/2,  .60);
    spike(h*0.32, 0.7, Math.PI/4,  .32);
    spike(h*0.32, 0.7, -Math.PI/4, .32);
    r=c.createRadialGradient(0,0,0,0,0,h*0.11);
    r.addColorStop(0,"rgba(255,255,255,1)"); r.addColorStop(1,"rgba(255,255,255,0)");
    c.fillStyle=r; c.beginPath(); c.arc(0,0,h*0.11,0,TAU); c.fill();
  });
 
  /* ══ RIBBON MATERIAL ═══════════════════════════════════════════════════
     vA runs -1..1 across the strip, vU runs 0..1 from the star outward,
     vFace is 1 face-on and 0 edge-on. ══ */
  function ribbonMat(o){
    return reg(new THREE.ShaderMaterial({
      uniforms:{
        uTime:{value:0}, uFade:{value:0}, uWave:{value:0},
        uInt:{value:o.int}, uCore:{value:o.core}, uPlume:{value:o.plume},
        uTight:{value:o.tight}, uBroad:{value:o.broad}, uFil:{value:o.fil}
      },
      vertexShader:[
        "attribute float aAcross; attribute float aU;",
        "varying float vA; varying float vU; varying float vFace;",
        "void main(){",
        " vA=aAcross; vU=aU;",
        " vec3 n=normalize(normalMatrix*normal);",
        " vFace=abs(n.z);",
        " gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);",
        "}"].join("\n"),
      fragmentShader:[
        "uniform float uTime,uFade,uWave,uInt,uTight,uBroad,uFil;",
        "uniform vec3 uCore,uPlume;",
        "varying float vA; varying float vU; varying float vFace;",
        "void main(){",
        " float a2=vA*vA;",
        /* transverse: a wide soft lobe plus a tight hot centre line */
        " float broad=pow(max(1.0-a2,0.0),1.7)*uBroad;",
        " float core=exp(-a2*uTight);",
        /* optical depth — an edge-on sheet is far brighter. This single
           term is what produces the hard pinch-lines in the reference. */
        " float depth=min(1.0/max(vFace,0.19),5.3);",
        /* along the jet: hot at the foot, cooling outward, soft tip */
        " float along=smoothstep(0.0,0.04,vU)*pow(1.0-vU,1.45);",
        /* travelling emission front, launched on every pulse */
        " float w=1.0-min(abs(vU-uWave)*6.0,1.0);",
        " float pulse=w*w*w;",
        /* filamentation so the sheet isn't glassy */
        " float fil=1.0-uFil+uFil*(0.5+0.5*sin(vU*34.0-uTime*2.6+vA*3.4));",
        " float v=(broad+core)*depth*along*fil*(1.0+pulse*2.4)*uInt;",
        /* tint the plume, keep the hot centre white — mixing toward white
           by intensity stops bright areas turning to muddy pastel */
        " vec3 col=mix(uCore,uPlume,clamp(vU*1.3,0.0,1.0));",
        " col=mix(col,vec3(1.0),clamp((v-0.85)*0.75,0.0,0.8));",
        " gl_FragColor=vec4(col, clamp(v,0.0,1.7)*uFade);",
        "}"].join("\n"),
      transparent:true, depthWrite:false, side:THREE.DoubleSide,
      blending:THREE.AdditiveBlending
    }));
  }
 
  /* ══ RIBBON GEOMETRY ═══════════════════════════════════════════════════
     One continuous strip from -REACH through the star to +REACH, twisting
     about Y and flaring as it climbs. ══ */
  function ribbon(turns, w0, wMax, phase, drift){
    const SEG=150, N=(SEG+1)*2;
    const pos=new Float32Array(N*3), nrm=new Float32Array(N*3),
          ac =new Float32Array(N),   au =new Float32Array(N);
    const idx=new Uint16Array(SEG*6);
 
    /* pass 1 — positions */
    for(let i=0;i<=SEG;i++){
      const y   = (i/SEG*2-1)*REACH;
      const dir = y>=0 ? 1 : -1;
      const u   = Math.abs(y)/REACH;
      const half= w0 + Math.pow(u,1.25)*wMax;
      const tw  = phase + dir*Math.pow(u,0.85)*turns*TAU;
      const cx  = Math.sin(u*2.1)*u*drift;          /* gentle S-curve */
      const cz  = Math.cos(u*1.7)*u*drift*0.6;
      const ax  = Math.cos(tw), az = Math.sin(tw);
      for(let j=0;j<2;j++){
        const k=i*2+j, a=j*2-1;
        pos[k*3  ]=cx+ax*half*a;
        pos[k*3+1]=y;
        pos[k*3+2]=cz+az*half*a;
        ac[k]=a; au[k]=u;
      }
      if(i<SEG){
        const b=i*2, o=i*6;
        idx[o]=b; idx[o+1]=b+1; idx[o+2]=b+2;
        idx[o+3]=b+1; idx[o+4]=b+3; idx[o+5]=b+2;
      }
    }
 
    /* pass 2 — true surface normals by finite difference. The strip is
       sheared hard by the twist, so an analytic guess is off by tens of
       degrees near the tip and would misplace every bright pinch. */
    const rd=(k,c)=>pos[k*3+c];
    for(let i=0;i<=SEG;i++){
      const i0=Math.max(i-1,0), i1=Math.min(i+1,SEG);
      const cx0=rd(i*2,0), cy0=rd(i*2,1), cz0=rd(i*2,2);
      const acx=rd(i*2+1,0)-cx0, acy=rd(i*2+1,1)-cy0, acz=rd(i*2+1,2)-cz0;
      for(let j=0;j<2;j++){
        const k=i*2+j;
        const alx=rd(i1*2+j,0)-rd(i0*2+j,0),
              aly=rd(i1*2+j,1)-rd(i0*2+j,1),
              alz=rd(i1*2+j,2)-rd(i0*2+j,2);
        let nx=acy*alz-acz*aly, ny=acz*alx-acx*alz, nz=acx*aly-acy*alx;
        const L=Math.hypot(nx,ny,nz)||1;
        nrm[k*3]=nx/L; nrm[k*3+1]=ny/L; nrm[k*3+2]=nz/L;
      }
    }
    const G=new THREE.BufferGeometry();
    G.setAttribute("position",new THREE.BufferAttribute(pos,3));
    G.setAttribute("normal",  new THREE.BufferAttribute(nrm,3));
    G.setAttribute("aAcross", new THREE.BufferAttribute(ac,1));
    G.setAttribute("aU",      new THREE.BufferAttribute(au,1));
    G.setIndex(new THREE.BufferAttribute(idx,1));
    return G;
  }
 
  const WHITE = new THREE.Color(0xffffff);
  const PALE  = TINT.clone().lerp(WHITE, 0.72);
 
  /* faint wide sheath — the diffuse gas the bright strands sit inside */
  const mSheath = ribbonMat({int:0.30, core:PALE,  plume:TINT,
                             tight:5.0,  broad:1.00, fil:0.30});
  /* the two bright strands */
  const mStrand = ribbonMat({int:1.00, core:WHITE, plume:TINT,
                             tight:24.0, broad:0.42, fil:0.34});
  /* the collimated spine — near-straight, very tight, very white */
  const mSpine  = ribbonMat({int:1.25, core:WHITE, plume:PALE,
                             tight:70.0, broad:0.10, fil:0.16});
 
  const parts = [
    new THREE.Mesh(ribbon(TURNS*0.80, 2.4,  WIDTH*1.75, 0.90, 2.2), mSheath),
    new THREE.Mesh(ribbon(TURNS,      0.7,  WIDTH,      0.00, 2.6), mStrand),
    new THREE.Mesh(ribbon(TURNS*1.18, 0.5,  WIDTH*0.72, 2.15, 2.0), mStrand),
    new THREE.Mesh(ribbon(TURNS*0.22, 0.32, 1.1,        0.00, 0.9), mSpine)
  ];
  parts.forEach((m,i)=>{ m.frustumCulled=false; m.renderOrder=i; spin.add(m); });
 
  /* ── embers streaming out along the field lines ── */
  const em = reg(new THREE.ShaderMaterial({
    uniforms:{ uTime:{value:0}, uDpr:{value:1}, uFade:{value:0}, uFlow:{value:0.16},
               uInt:{value:1}, uReach:{value:REACH}, uTint:{value:PALE},
               uTurns:{value:TURNS}, uWidth:{value:WIDTH} },
    vertexShader:[
      "attribute float aSize; attribute float aSeed; attribute float aU0;",
      "attribute float aDir; attribute float aAng; attribute float aRad;",
      "uniform float uTime,uDpr,uFlow,uInt,uReach,uTurns,uWidth;",
      "varying float vB;",
      "void main(){",
      " float u=fract(aU0+uTime*uFlow);",
      " float ph=aDir*pow(u,0.85)*uTurns*6.28318+aAng;",
      " float rr=aRad*(0.7+pow(u,1.25)*uWidth);",
      " vec3 p=vec3(cos(ph)*rr, aDir*u*uReach, sin(ph)*rr);",
      " vec4 mv=modelViewMatrix*vec4(p,1.0);",
      " float d=max(-mv.z,1.0);",
      " float tw=0.5+0.5*sin(uTime*(2.6+aSeed*1.4)+aSeed*11.0);",
      " float edge=smoothstep(0.0,0.07,u)*(1.0-smoothstep(0.74,1.0,u));",
      " vB=edge*tw*uInt;",
      " gl_PointSize=min(aSize*uDpr*(300.0/d),52.0*uDpr);",
      " gl_Position=projectionMatrix*mv;",
      "}"].join("\n"),
    fragmentShader:[
      "uniform float uFade; uniform vec3 uTint; varying float vB;",
      "void main(){",
      " float d=length(gl_PointCoord-vec2(0.5)); if(d>0.5) discard;",
      " float a=pow(smoothstep(0.5,0.0,d),1.9);",
      " gl_FragColor=vec4(uTint, a*clamp(vB,0.0,1.0)*uFade);",
      "}"].join("\n"),
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
  }));
 
  const EN = Math.round(240*LOD);
  (function(){
    const sz=new Float32Array(EN), sd=new Float32Array(EN), u0=new Float32Array(EN),
          dr=new Float32Array(EN), an=new Float32Array(EN), rd=new Float32Array(EN);
    for(let i=0;i<EN;i++){
      dr[i]=(i&1)?1:-1; u0[i]=Math.random();
      an[i]=(Math.random()-.5)*0.7; rd[i]=0.3+Math.random()*0.8;
      sz[i]=1.4+Math.random()*3.0;  sd[i]=Math.random()*TAU;
    }
    const G=new THREE.BufferGeometry();
    G.setAttribute("position",new THREE.BufferAttribute(new Float32Array(EN*3),3));
    G.setAttribute("aSize",new THREE.BufferAttribute(sz,1));
    G.setAttribute("aSeed",new THREE.BufferAttribute(sd,1));
    G.setAttribute("aU0",  new THREE.BufferAttribute(u0,1));
    G.setAttribute("aDir", new THREE.BufferAttribute(dr,1));
    G.setAttribute("aAng", new THREE.BufferAttribute(an,1));
    G.setAttribute("aRad", new THREE.BufferAttribute(rd,1));
    const embers=new THREE.Points(G,em); embers.frustumCulled=false; spin.add(embers);
  })();
 
  /* ── equatorial wind torus, perpendicular to the SPIN axis ── */
  const tm = reg(pointsMat(false)); tm.uniforms.uBright.value=0.5;
  const torus = new THREE.Points(pointCloud(Math.round(700*LOD),(v)=>{
    const a=Math.random()*TAU, rr=25+Math.pow(Math.random(),0.6)*23;
    v.x=Math.cos(a)*rr; v.z=Math.sin(a)*rr;
    v.y=(Math.random()-.5)*5*(rr/44);
    v.s=1+Math.pow(Math.random(),2.5)*3.4;
    v.l=0.09+Math.random()*0.40;
  }), tm);
  g.add(torus);
 
  spin.rotation.z = OBLIQ;
 
  /* ── core + flare ── */
  const core = new THREE.Mesh(new THREE.SphereGeometry(2.2,20,16),
    new THREE.MeshBasicMaterial({color:0xffffff}));
  spin.add(core);
  const hot   = sprite(T_GLOW, 0.85); hot.scale.setScalar(24);
  const glow  = sprite(T_GLOW, 1.4);  glow.scale.setScalar(128);
  const flare = sprite(T_FLARE,0.55); flare.scale.setScalar(62);
  hot.material.color.copy(PALE);
  glow.material.color.copy(TINT);
  flare.material.color.copy(PALE);
  g.add(hot, glow, flare);

  const jetGlow = [1,-1].map(dir=>{
    const s=sprite(T_GLOW,0.5); s.scale.setScalar(15); s.position.y=dir*5;
    s.material.color.copy(PALE); spin.add(s); return s;
  });

  /* ══ AUDIO — pulsar.mp3 loops once you're close enough to hear it,
     via the shared per-object ambience wiring every phenomenon uses ══ */
  const amb = makeAmbience(g, cfg, {src:"audio/pulsar.mp3", near:158, far:245, volume:0.5});

  return { group:g, bound:76, standoff:150, update(t,dt,f){
    const phi  = Math.atan2(camera.position.z-g.position.z,
                            camera.position.x-g.position.x);

    spin.rotation.y = t*omega;
 
    let ph=((t*omega-(Math.PI-phi))/TAU)%1; if(ph<0) ph+=1;
    const c=Math.cos(ph*TAU);
    const beat=Math.max(Math.pow(Math.max(c,0),24),
                        Math.pow(Math.max(-c,0),24)*0.42) * SAFE;
 
    const wave = ph*1.35;
    mSheath.uniforms.uTime.value = t; mSheath.uniforms.uWave.value = wave;
    mStrand.uniforms.uTime.value = t; mStrand.uniforms.uWave.value = wave;
    mSpine .uniforms.uTime.value = t; mSpine .uniforms.uWave.value = wave;
    mSheath.uniforms.uInt.value = 0.30 + beat*0.22 + f*0.14;
    mStrand.uniforms.uInt.value = 1.00 + beat*0.75 + f*0.35;
    mSpine .uniforms.uInt.value = 1.25 + beat*1.10 + f*0.40;
 
    em.uniforms.uTime.value = t;
    em.uniforms.uInt.value  = 0.9 + beat*0.7 + f*0.3;
    em.uniforms.uFlow.value = 0.15 + beat*0.18 + f*0.04;
 
    tm.uniforms.uTime.value = t;
    tm.uniforms.uBright.value = 0.5 + f*0.3;
    torus.rotation.y += dt*0.05;
 
    hot.scale.setScalar(24 + beat*10 + f*8);
    glow.scale.setScalar(128 + beat*30 + f*30);
    flare.scale.setScalar(58 + beat*54 + f*20);
    hot.material.userData.base   = 0.70 + beat*0.30;
    glow.material.userData.base  = 1.0  + beat*0.45;
    flare.material.userData.base = 0.30 + beat*0.55;
    jetGlow.forEach(s=>{
      s.scale.setScalar(15 + beat*12 + f*7);
      s.material.userData.base = 0.42 + beat*0.40;
    });

    amb(f,dt);
  }};
};

MAKERS.planet = (cfg) => {
  cfg = cfg || {};
  const g = new THREE.Group();
  /* HD 189733 b is the real "blue planet" exoplanet — its cobalt colour
     comes from silicate haze scattering blue light, so that's the tint
     to lean into rather than a generic tan/brown gas giant. */
  const bm = reg(bodyMat({base:0.52, bands:11.0, rim:0.38, amb:0.045,
                          tintA:0x9fc6e8, tintB:0x1c3f6e}));
  const body = new THREE.Mesh(new THREE.SphereGeometry(26,48,36), bm);
  g.add(body);

  const rm = reg(annulusMat({inner:36,outer:58,spin:0.10,freq:1,fine:150,
                             intensity:0.42,tint:0xcbb994}));
  const rings = new THREE.Mesh(new THREE.RingGeometry(36,58,160,2), rm);
  rings.rotation.set(Math.PI/2 - 0.42, 0, 0.16);
  rings.renderOrder = 1;
  g.add(rings);

  /* slow-orbiting debris riding the same plane as the ring mesh */
  const debm = reg(debrisMat());
  const DN = Math.round(220*LOD);
  (function(){
    const rd=new Float32Array(DN), an=new Float32Array(DN), sz=new Float32Array(DN),
          sd=new Float32Array(DN), yy=new Float32Array(DN);
    for(let i=0;i<DN;i++){
      rd[i]=37+Math.random()*20; an[i]=Math.random()*TAU;
      sz[i]=0.8+Math.pow(Math.random(),2.2)*2.6;
      sd[i]=Math.random()*TAU; yy[i]=(Math.random()-.5)*0.8;
    }
    const G=new THREE.BufferGeometry();
    G.setAttribute("position",new THREE.BufferAttribute(new Float32Array(DN*3),3));
    G.setAttribute("aRad", new THREE.BufferAttribute(rd,1));
    G.setAttribute("aAng0",new THREE.BufferAttribute(an,1));
    G.setAttribute("aSize",new THREE.BufferAttribute(sz,1));
    G.setAttribute("aSeed",new THREE.BufferAttribute(sd,1));
    G.setAttribute("aY",   new THREE.BufferAttribute(yy,1));
    const debris=new THREE.Points(G,debm); debris.frustumCulled=false;
    rings.add(debris);   /* inherits the ring's own plane/tilt for free */
  })();

  const atm = sprite(T_GLOW,0.20); atm.scale.setScalar(84); g.add(atm);
  atm.material.color.set(0x9fc6e8);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(3.4,18,14),
    reg(bodyMat({base:0.5, grain:1.4, rim:0.2, amb:0.03,
                tintA:0xcfc0a6, tintB:0x8a7860})));
  g.add(moon);

  const amb = makeAmbience(g, cfg, {synth:"wind", near:130, far:210, volume:0.35});

  return { group:g, bound:62, standoff:126, update(t,dt,f){
    body.rotation.y += dt*0.09;
    rm.uniforms.uTime.value = t;
    rm.uniforms.uInt.value = 0.42 + f*0.22;
    debm.uniforms.uTime.value = t;
    debm.uniforms.uInt.value = 0.8 + f*0.3;
    const a = t*0.28;
    moon.position.set(Math.cos(a)*72, Math.sin(a*0.9)*10, Math.sin(a)*72);
    moon.rotation.y += dt*0.3;
    amb(f,dt);
  }};
};

MAKERS.nebula = (cfg) => {
  cfg = cfg || {};
  const g = new THREE.Group();
  /* Each clump gets an axis and a length, so the gas forms filaments and
     pillars rather than six identical fuzzy balls. */
  const cores = [];
  for(let i=0;i<6;i++) cores.push({
    c:  new THREE.Vector3((Math.random()-.5)*130,(Math.random()-.5)*80,(Math.random()-.5)*130),
    ax: new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize(),
    len:50+Math.random()*95
  });
  /* the two hot stars blow a cavity in the gas around them */
  const winds = [cores[0].c.clone().multiplyScalar(0.6), cores[1].c.clone().multiplyScalar(0.6)];

  /* Hα emission reads pink/rose in most nursery photos; keeping it this
     side of pastel (rather than a saturated magenta) so it still reads as
     gas lit from within, not a neon sign — same call the black hole's
     disk and the pulsar's plume make with their own tints. */
  const nm = reg(pointsMat(false)); nm.uniforms.uBright.value = 0.9;
  nm.uniforms.uTint.value.set(0xe6a8d0);
  const g3 = () => Math.random()+Math.random()+Math.random()-1.5;
  const geo = pointCloud(Math.round(3200*LOD),(v)=>{
    const k = cores[(Math.random()*cores.length)|0];
    const along = (Math.random()*2-1)*k.len;
    const w = 9+Math.random()*20;                 /* tight across the filament */
    v.x = k.c.x + k.ax.x*along + g3()*w;
    v.y = k.c.y + k.ax.y*along + g3()*w*0.8;
    v.z = k.c.z + k.ax.z*along + g3()*w;
    for(const p of winds){                        /* carve the cavity */
      const dx=v.x-p.x, dy=v.y-p.y, dz=v.z-p.z;
      const d=Math.hypot(dx,dy,dz);
      if(d<30){ const m=(30+Math.random()*16)/Math.max(d,0.001);
        v.x=p.x+dx*m; v.y=p.y+dy*m; v.z=p.z+dz*m; }
    }
    v.s=1.5+Math.pow(Math.random(),2.4)*10;
    v.l=0.10+Math.pow(Math.random(),2.0)*0.80;
  });
  const pts = new THREE.Points(geo, nm); g.add(pts);

  /* three veils, three roles rather than three copies of the same colour:
     warm rose matching the gas, a cool teal for the reflection light off
     dust, and a dim gold where the dust itself is warmed rather than lit
     from within. */
  const VEIL_TINT = [0xe38fc0, 0x74d3c9, 0xd8b483];
  const veils = [];
  for(let i=0;i<3;i++){
    const s = sprite(T_CLOUD, 0.20);
    s.position.copy(cores[i].c); s.scale.setScalar(170+i*60);
    s.material.color.set(VEIL_TINT[i]);
    g.add(s); veils.push(s);
  }
  /* two bright young stars inside the cloud, hot enough to read blue-white */
  const hot = [];
  for(let i=0;i<2;i++){
    const s=sprite(T_STAR,0.9); s.scale.setScalar(26);
    s.position.copy(winds[i]); s.material.color.set(0xcfe0ff); g.add(s); hot.push(s);
  }
  /* a scatter of dimmer protostars through the filaments — a nursery is
     busier than two headline stars and some gas */
  const embryos = [];
  for(let i=0;i<8;i++){
    const k = cores[(Math.random()*cores.length)|0];
    const along = (Math.random()*2-1)*k.len;
    const s = sprite(T_STAR, 0.4);
    s.scale.setScalar(5+Math.random()*6);
    s.position.set(k.c.x+k.ax.x*along+g3()*10, k.c.y+k.ax.y*along+g3()*8, k.c.z+k.ax.z*along+g3()*10);
    s.material.color.set(Math.random()<0.5?0xbfd4ff:0xffdfb0);
    g.add(s); embryos.push({s, seed:Math.random()*TAU});
  }

  const amb = makeAmbience(g, cfg, {synth:"shimmer", near:260, far:410, volume:0.35});

  return { group:g, bound:135, standoff:250, update(t,dt,f){
    g.rotation.y += dt*0.012;
    nm.uniforms.uTime.value = t;
    nm.uniforms.uBright.value = 0.9 + f*0.5;
    veils.forEach((s,i)=>{ s.material.userData.base = 0.16+0.06*Math.sin(t*0.19+i*2)+f*0.09; });
    hot.forEach((s,i)=> s.scale.setScalar(26+Math.sin(t*1.6+i)*4));
    embryos.forEach(({s,seed})=>{
      s.material.userData.base = 0.18+0.20*Math.pow(0.5+0.5*Math.sin(t*(0.7+seed*0.4)+seed*6.0),3)+f*0.12;
    });
    amb(f,dt);
  }};
};

MAKERS.galaxy = (cfg) => {
  cfg = cfg || {};
  const g = new THREE.Group();

  /* Real spiral galaxies read this way too: the bulge is old, cool, red
     stars; the arms are young, hot, blue ones lighting up the gas they
     just formed out of. So the gradient isn't decoration, it's the same
     age/temperature story the black hole's disk and the binary's two
     stars tell with colour. */
  const CORE_COL  = {r:1.00, g:0.45, b:0.32};
  const OUTER_COL = {r:0.56, g:0.70, b:1.00};
  const KNOT_COL  = {r:0.80, g:0.88, b:1.00};
  const HALO_COL  = {r:0.85, g:0.88, b:0.98};
  const lerpCol = (a,b,t) => ({r:a.r+(b.r-a.r)*t, g:a.g+(b.g-a.g)*t, b:a.b+(b.b-a.b)*t});

  const gm = reg(galaxyMat()); gm.uniforms.uBright.value = 0.95;
  const ARMS = 2, R = 140;
  const geo = pointCloud(Math.round(3400*LOD),(v,i,n)=>{
    if(i % 80 === 0){                           /* sparse globular-cluster halo */
      const u=Math.random()*2-1, th=Math.random()*TAU, k=Math.sqrt(1-u*u);
      const rr = 150+Math.random()*140;
      v.x=Math.cos(th)*k*rr; v.y=u*rr*0.6; v.z=Math.sin(th)*k*rr;
      v.s=1.2+Math.random()*2.0; v.l=0.35+Math.random()*0.35;
      v.r=HALO_COL.r; v.g=HALO_COL.g; v.b=HALO_COL.b;
    }else if(i % 9 === 0){                      /* the bar */
      const u = (Math.random()*2-1);
      v.x = u*54 + (Math.random()-.5)*10;
      v.y = (Math.random()-.5)*7;
      v.z = (Math.random()-.5)*15*(1-Math.abs(u)*0.5);
      v.s = 1.5+Math.random()*5; v.l = 0.30+Math.random()*0.55;
      const c = lerpCol(CORE_COL, OUTER_COL, Math.min(Math.abs(u)*0.5,0.5));
      v.r=c.r; v.g=c.g; v.b=c.b;
    }else if(i % 5 === 0){                      /* central bulge */
      const rr = Math.pow(Math.random(),2.1)*34;
      const u=Math.random()*2-1, th=Math.random()*TAU, k=Math.sqrt(1-u*u);
      v.x=Math.cos(th)*k*rr; v.y=u*rr*0.55; v.z=Math.sin(th)*k*rr;
      v.s=1.6+Math.random()*6; v.l=0.4+Math.random()*0.6;
      const c = lerpCol(CORE_COL, OUTER_COL, Math.min((rr/34)*0.35,0.35));
      v.r=c.r; v.g=c.g; v.b=c.b;
    }else{                                       /* spiral arms */
      const t = Math.pow(Math.random(),0.62);
      const rad = 48 + t*R;                      /* arms spring from the bar tips */
      const arm = (i % ARMS) * (TAU/ARMS);
      /* a gap on the leading edge of each arm reads as a dust lane */
      let off = (Math.random()-.5)*0.46;
      if(Math.abs(off+0.13) < 0.055) off += 0.17;
      const ang = arm + t*3.0 + off;
      const sc = 5 + t*16;
      v.x=Math.cos(ang)*rad + (Math.random()-.5)*sc;
      v.y=(Math.random()-.5)*sc*0.5;
      v.z=Math.sin(ang)*rad + (Math.random()-.5)*sc;
      v.s=1.3+Math.pow(Math.random(),2.4)*7;
      v.l=0.12+Math.pow(Math.random(),1.8)*0.68;
      const c = lerpCol(CORE_COL, OUTER_COL, t);
      v.r=c.r; v.g=c.g; v.b=c.b;
      if(Math.random()<0.035){                  /* star-forming knots */
        v.s*=3.2; v.l=0.95; v.r=KNOT_COL.r; v.g=KNOT_COL.g; v.b=KNOT_COL.b;
      }
    }
  });
  const pts = new THREE.Points(geo, gm); g.add(pts);

  const core = sprite(T_GLOW,0.5); core.scale.setScalar(120);
  core.material.color.set(0xff7a52); g.add(core);
  /* faint atmospheric bleed either side of the gradient, not just the
     points themselves — a warm inner glow, a cool outer one */
  const innerGlow = sprite(T_GLOW,0.16); innerGlow.scale.setScalar(85);
  innerGlow.material.color.set(0xff5a3c); g.add(innerGlow);
  const outerGlow = sprite(T_GLOW,0.09); outerGlow.scale.setScalar(260);
  outerGlow.material.color.set(0x6f9aff); g.add(outerGlow);

  g.rotation.set(0.42,0,0.2);

  const amb = makeAmbience(g, cfg, {synth:"choir", near:280, far:440, volume:0.4});

  return { group:g, bound:180, standoff:270, update(t,dt,f){
    pts.rotation.y += dt*0.026;
    gm.uniforms.uTime.value = t;
    gm.uniforms.uBright.value = 0.95 + f*0.45;
    core.scale.setScalar(120+Math.sin(t*0.5)*6+f*30);
    innerGlow.material.userData.base = 0.16 + f*0.10;
    outerGlow.material.userData.base = 0.09 + f*0.08;
    outerGlow.scale.setScalar(260+f*40);
    amb(f,dt);
  }};
};

MAKERS.binary = (cfg) => {
  cfg = cfg || {};
  const g = new THREE.Group();

  /* Real stellar colour drives the glow, not the surface — a star this
     close to camera is so bright its photosphere blows out to white
     (exactly what the pulsar's own core sphere does), and the colour you
     actually see comes from the light around it. Lower kelvin = redder,
     same blackbody curve the black hole's disk uses. */
  const TEMP_A = 4000, TEMP_B = 1600;
  const COL_A = blackbodyColor(TEMP_A), COL_B = blackbodyColor(TEMP_B);
  const WHITE = new THREE.Color(0xffffff);

  function makeStar(radius, grain){
    const bm = reg(bodyMat({base:1.0, grain, rim:0.25, amb:0.97,
                            tintA:0xffffff, tintB:0xffffff}));
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius,40,30), bm);
    g.add(mesh);
    return {mesh, bm};
  }
  const A = makeStar(9.5, 5);   /* primary — bigger, sun-like */
  const B = makeStar(6.0, 5);   /* companion — smaller, cooler, redder */

  /* layered glow per star — tight hot core, soft halo, and a huge dim
     bloom standing in for how violently a star this close overwhelms the
     space around it. No spike sprite — the light itself does the work. */
  function makeGlow(core, halo, bloom, col){
    const hot  = sprite(T_GLOW,1.0);  hot.scale.setScalar(core);
    hot.material.color.copy(col).lerp(WHITE,0.6);
    const glow = sprite(T_GLOW,0.85); glow.scale.setScalar(halo);
    glow.material.color.copy(col).lerp(WHITE,0.15);
    const bl   = sprite(T_GLOW,0.40); bl.scale.setScalar(bloom);
    bl.material.color.copy(col);
    g.add(hot,glow,bl);
    return {hot,glow,bl,coreS:core,haloS:halo,bloomS:bloom};
  }
  const glowA = makeGlow(42, 150, 280, COL_A);
  const glowB = makeGlow(28, 100, 190, COL_B);

  const amb = makeAmbience(g, cfg, {synth:"pulse", near:115, far:185, volume:0.35});

  return { group:g, bound:80, standoff:112, update(t,dt,f){
    /* a fast, tight mutual orbit — no ring to trace it and no gas bridge
       between them, just two stars visibly whipping around their shared
       centre of mass */
    const th = t*10;
    const c=Math.cos(th), s=Math.sin(th);
    const rot=(x,z)=>{ const y=-z*Math.sin(0.5), zz=z*Math.cos(0.5); return [x,y,zz]; };
    const [ax,ay,az]=rot(c*11, s*7.2);
    const [bx,by,bz]=rot(-c*26, -s*17);

    A.mesh.position.set(ax,ay,az);
    B.mesh.position.set(bx,by,bz);
    A.mesh.rotation.y += dt*0.5;
    B.mesh.rotation.y += dt*0.8;
    [glowA.hot,glowA.glow,glowA.bl].forEach(s=>s.position.set(ax,ay,az));
    [glowB.hot,glowB.glow,glowB.bl].forEach(s=>s.position.set(bx,by,bz));

    A.bm.uniforms.uAmb.value = 0.97 + Math.sin(t*0.9)*0.02 + f*0.05;
    glowA.hot.scale.setScalar(glowA.coreS + f*10);
    glowA.glow.scale.setScalar(glowA.haloS + Math.sin(t*1.3)*8 + f*40);
    glowA.bl.scale.setScalar(glowA.bloomS + Math.sin(t*1.3)*14 + f*70);
    glowA.hot.material.userData.base  = 1.00 + f*0.30;
    glowA.glow.material.userData.base = 0.85 + f*0.30;
    glowA.bl.material.userData.base   = 0.40 + f*0.25;

    B.bm.uniforms.uAmb.value = 0.97 + Math.sin(t*0.9+2)*0.02 + f*0.05;
    glowB.hot.scale.setScalar(glowB.coreS + f*8);
    glowB.glow.scale.setScalar(glowB.haloS + Math.sin(t*1.3+2)*6 + f*32);
    glowB.bl.scale.setScalar(glowB.bloomS + Math.sin(t*1.3+2)*10 + f*55);
    glowB.hot.material.userData.base  = 1.00 + f*0.30;
    glowB.glow.material.userData.base = 0.85 + f*0.28;
    glowB.bl.material.userData.base   = 0.38 + f*0.25;

    amb(f,dt);
  }};
};

MAKERS.comet = (cfg) => {
  cfg = cfg || {};
  const g = new THREE.Group();
  const nuc = new THREE.Mesh(new THREE.IcosahedronGeometry(4.2,1),
    reg(bodyMat({base:0.42, grain:1.8, rim:0.3, amb:0.05})));
  g.add(nuc);
  const coma = sprite(T_GLOW,0.55); coma.scale.setScalar(46); g.add(coma);
  const spark = sprite(T_STAR,0.8); spark.scale.setScalar(34); g.add(spark);

  const tm = reg(pointsMat(false)); tm.uniforms.uBright.value = 0.8;
  const L = 260;
  const geo = pointCloud(Math.round(900*LOD),(v)=>{
    const t = Math.pow(Math.random(),0.7);
    const spread = 4 + t*46;
    v.x = t*L + (Math.random()-.5)*spread*0.5;
    v.y = (Math.random()-.5)*spread + t*t*36;      /* curve of the dust tail */
    v.z = (Math.random()-.5)*spread;
    v.s = 1.4+Math.pow(Math.random(),2.5)*7;
    v.l = (1-t)*(0.3+Math.random()*0.7);
  });
  const tail = new THREE.Points(geo, tm); g.add(tail);
  /* ion tail — straighter, fainter */
  const im = reg(pointsMat(false)); im.uniforms.uBright.value = 0.55;
  const igeo = pointCloud(Math.round(420*LOD),(v)=>{
    const t=Math.pow(Math.random(),0.55);
    v.x=t*L*1.35; v.y=(Math.random()-.5)*(3+t*14); v.z=(Math.random()-.5)*(3+t*14);
    v.s=1+Math.random()*3.4; v.l=(1-t)*0.55;
  });
  g.add(new THREE.Points(igeo, im));
  g.rotation.set(0.2,0,0.28);

  /* no ambience — vacuum doesn't carry sound, and a comet has nothing
     else (no magnetosphere, no surface impacts) that would make any */

  return { group:g, bound:70, standoff:130, update(t,dt,f){
    nuc.rotation.x += dt*0.25; nuc.rotation.y += dt*0.17;
    tm.uniforms.uTime.value = t; im.uniforms.uTime.value = t*0.7;
    tm.uniforms.uBright.value = 0.8+f*0.4;
    coma.scale.setScalar(46+Math.sin(t*0.9)*5+f*22);
    spark.scale.setScalar(30+Math.sin(t*1.7)*5+f*16);
    g.position.y = Math.sin(t*0.11)*4;
  }};
};

MAKERS.rogue = (cfg) => {
  cfg = cfg || {};
  const g = new THREE.Group();

  /* A cold, sunless world — a smooth body like the ringed planet's, not
     a jagged asteroid, but with no ring, no moon, no debris. Just a dark
     rust-red sphere, oxidised over however many billion years it's been
     drifting with nothing to orbit. The same latitude banding the ringed
     planet has, but kept low-contrast and mostly in shadow (very low
     base/ambient) so it reads as weathering rather than stripes. */
  const bm = reg(bodyMat({base:0.17, bands:8.0, grain:0.8, rim:0.16, amb:0.035,
                          tintA:0x8a4a30, tintB:0x1c0c08}));
  const rock = new THREE.Mesh(new THREE.SphereGeometry(18,48,36), bm);
  g.add(rock);

  /* a whisper of infrared — a body this dark and this far from any star
     still radiates a little heat of its own */
  const glow = sprite(T_GLOW,0.07); glow.scale.setScalar(58);
  glow.material.color.set(0xdd2a12);
  g.add(glow);

  const amb = makeAmbience(g, cfg, {synth:"creak", near:70, far:110, volume:0.3});

  return { group:g, bound:26, standoff:66, update(t,dt,f){
    rock.rotation.y += dt*0.05; rock.rotation.x += dt*0.008; rock.rotation.z += dt*0.005;
    bm.uniforms.uAmb.value = 0.035 + f*0.05;
    glow.scale.setScalar(58 + f*14);
    glow.material.userData.base = 0.07 + f*0.06;
    amb(f,dt);
  }};
};

MAKERS.beacon = (cfg) => {
  cfg = cfg || {};
  const g = new THREE.Group();
  /* the famous printout had "Wow!" scrawled in green pen next to the
     signal — every other section has its own colour by now, this one
     had none, so that's the natural one to reach for here. Same
     core-white / plume-tint split the pulsar uses, so the hot parts
     read as light rather than flat green. */
  const TINT  = 0x9be8b8;
  const WHITE = new THREE.Color(0xffffff);
  const PALE  = new THREE.Color(TINT).lerp(WHITE, 0.72);

  /* ── lattice core: two counter-spinning wireframe shells standing in
     for a transmitter array — the same layered-parts trick the black
     hole uses for its horizon + photon rim ── */
  const outer = new THREE.Mesh(new THREE.IcosahedronGeometry(9,0),
    new THREE.MeshBasicMaterial({color:TINT,wireframe:true,transparent:true,opacity:0}));
  outer.material.userData={base:0.50}; fadeables.push(outer.material);
  g.add(outer);

  const inner = new THREE.Mesh(new THREE.OctahedronGeometry(5,0),
    new THREE.MeshBasicMaterial({color:PALE,wireframe:true,transparent:true,opacity:0}));
  inner.material.userData={base:0.85}; fadeables.push(inner.material);
  g.add(inner);

  /* small solid glow filling the lattice in — otherwise it's just thin
     lines with nothing behind them */
  const hot = sprite(T_GLOW,0.9); hot.scale.setScalar(14);
  hot.material.color.copy(PALE); g.add(hot);

  const glow = sprite(T_GLOW,0.8); glow.scale.setScalar(52);
  glow.material.color.set(TINT); g.add(glow);
  const spark = sprite(T_STAR,0.95); spark.scale.setScalar(30);
  spark.material.color.copy(PALE); g.add(spark);

  /* ── telemetry motes: a loose halo of points drifting around the
     array, the same trick as the pulsar's wind torus or the planet's
     ring debris — gives the beacon some depth instead of one flat
     wireframe hanging in empty space ── */
  const swm = reg(pointsMat(false)); swm.uniforms.uBright.value = 0.7;
  const swarm = new THREE.Points(pointCloud(Math.round(160*LOD),(v)=>{
    const u=Math.random()*2-1, th=Math.random()*TAU, s=Math.sqrt(1-u*u);
    const rr = 15+Math.pow(Math.random(),1.7)*28;
    v.x=Math.cos(th)*s*rr; v.y=u*rr*0.75; v.z=Math.sin(th)*s*rr;
    v.s=1+Math.pow(Math.random(),2.2)*2.8; v.l=0.2+Math.random()*0.7;
  }), swm);
  swarm.frustumCulled=false; g.add(swarm);

  const rings=[];
  for(let i=0;i<5;i++){
    const r=sprite(T_RING,0.4); r.userData.o=i/5;
    r.material.color.set(i===0?PALE:TINT); g.add(r); rings.push(r);
  }

  const amb = makeAmbience(g, cfg, {synth:"carrier", near:88, far:140, volume:0.35});

  return { group:g, bound:38, standoff:84, update(t,dt,f){
    outer.rotation.x += dt*0.22; outer.rotation.y += dt*0.30;
    inner.rotation.x -= dt*0.48; inner.rotation.y -= dt*0.62;
    const beat = Math.pow(0.5+0.5*Math.sin(t*2.4),3);
    outer.scale.setScalar(1+beat*0.08+f*0.10);
    inner.scale.setScalar(1+beat*0.16+f*0.14);
    hot.scale.setScalar(14+beat*6+f*6);
    spark.scale.setScalar(24+beat*22+f*14);
    glow.scale.setScalar(52+beat*16+f*24);
    swarm.rotation.y += dt*0.06;
    swm.uniforms.uTime.value = t;
    swm.uniforms.uBright.value = 0.7 + beat*0.3 + f*0.35;
    rings.forEach(r=>{
      const p=(t*0.30+r.userData.o)%1;
      r.scale.setScalar(14+p*190);
      r.material.userData.base=(1-p)*(1-p)*0.34*(1+f*0.8);
    });
    amb(f,dt);
  }};
};

/* ── 6 · build the field from config ──────────────────────────────────── */
const OBJ = [];
OBJECTS.forEach((cfg, i)=>{
  const make = MAKERS[cfg.type] || MAKERS.rogue;
  const inst = make(cfg);
  const az = cfg.az*D2R, el = cfg.el*D2R;
  const pos = new THREE.Vector3(
    Math.sin(az)*Math.cos(el), Math.sin(el), -Math.cos(az)*Math.cos(el)
  ).multiplyScalar(cfg.r);
  inst.group.position.copy(pos);
  scene.add(inst.group);
  OBJ.push({
    i, cfg, inst, pos,
    az: ((cfg.az % 360)+360)%360,
    bound: inst.bound,
    standoff: Math.min(inst.standoff, cfg.r*0.72),
    focus: 0, hover: false, el:null, blip:null
  });
});

/* ── 7 · markers + compass tape ───────────────────────────────────────── */
const marksEl = $("#marks"), tapeEl = $("#tape");
const TAPE_SPAN = 130;   /* degrees visible either side of centre */

OBJ.forEach(o=>{
  const b = document.createElement("button");
  b.className = "node"; b.type = "button";
  b.setAttribute("aria-label", o.cfg.label + " — " + o.cfg.kind);
  b.innerHTML =
    '<i class="br br-tl"></i><i class="br br-tr"></i><i class="br br-bl"></i><i class="br br-br"></i>'+
    '<span class="node-lab" aria-hidden="true"><span class="node-t">'+o.cfg.label+
    '</span><span class="node-d">'+o.cfg.desig+'</span></span>';
  b.addEventListener("click", e=>{ if(!suppressClick) travelTo(o.i); });
  b.addEventListener("pointerenter",()=>o.hover=true);
  b.addEventListener("pointerleave",()=>o.hover=false);
  b.addEventListener("focus",()=>{ o.hover=true; if(active<0) aimAt(o); });
  b.addEventListener("blur",()=>o.hover=false);
  marksEl.appendChild(b); o.el=b;

  const p = document.createElement("button");
  p.className="blip"; p.type="button";
  p.setAttribute("aria-label","Go to "+o.cfg.label);
  p.innerHTML='<span class="blip-dot" aria-hidden="true"></span><span class="blip-l">'+o.cfg.label+'</span>';
  p.addEventListener("click",()=>travelTo(o.i));
  p.addEventListener("pointerenter",()=>o.hover=true);
  p.addEventListener("pointerleave",()=>o.hover=false);
  tapeEl.appendChild(p); o.blip=p;
});

/* tape ticks drawn as a shifting gradient — no per-tick DOM */
const tapeTrack = $("#tapeTrack");
function paintTape(){
  const per = innerWidth / (TAPE_SPAN*2);
  tapeTrack.style.background =
    "repeating-linear-gradient(90deg,rgba(186,206,222,.20) 0 1px,transparent 1px "+(per*10).toFixed(2)+"px)";
  tapeTrack.style.backgroundSize = "auto 14px";
  tapeTrack.style.backgroundPosition = "0 100%";
  tapeTrack.style.backgroundRepeat = "repeat-x";
}

/* pitch ladder ticks */
(function(){
  const L = $("#ladder");
  for(let d=-60; d<=60; d+=10){
    const i=document.createElement("i");
    if(d%30===0) i.className="maj";
    i.style.top = ((1-(d+60)/120)*100)+"%";
    L.appendChild(i);
  }
})();

/* ── 8 · camera: 360 look + travel ────────────────────────────────────── */
let yaw=0, pitch=0, vYaw=0, vPitch=0;
let baseYaw=0, basePitch=0;
const camPos = new THREE.Vector3();
let active=-1, flying=false, idle=0;
let speed=0, tgtSpeed=1, travelDist=0, fov=FOV_BASE, tgtFov=FOV_BASE, fovPunch=0;
let fade=0;
let zoom=0;   /* scroll-wheel zoom: subtracted from FOV, narrower = closer-looking */
let warp=0;   /* gravitational time-dilation feel near the black hole, 0..1 */

const PITCH_MAX = 1.28;
const flight = { on:false, t:0, dur:2.0, p0:new THREE.Vector3(), p1:new THREE.Vector3(),
                 p2:new THREE.Vector3(), y0:0,y1:0,pi0:0,pi1:0, cb:null };

const norm = a => Math.atan2(Math.sin(a),Math.cos(a));
const easeOut = t => 1-Math.pow(1-t,3);
const easeInOut = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;

function aimFor(o){
  const stop = o.pos.clone().sub(o.pos.clone().normalize().multiplyScalar(o.standoff));
  const d = new THREE.Vector3().subVectors(o.pos, stop);
  const narrow = isNarrow();
  return {
    stop,
    yaw:   Math.atan2(-d.x,-d.z) + (narrow ? 0 : -0.24),
    pitch: Math.atan2(d.y, Math.hypot(d.x,d.z)) + (narrow ? -0.20 : 0)
  };
}

/* look at an object from where we are, without travelling (keyboard focus) */
function aimAt(o){
  const d = o.pos.clone().sub(camPos);
  baseYaw = Math.atan2(-d.x,-d.z); basePitch = Math.atan2(d.y, Math.hypot(d.x,d.z));
  yaw = baseYaw; pitch = clamp(basePitch,-PITCH_MAX,PITCH_MAX); vYaw=vPitch=0;
}

function travelTo(i){
  if(i===active && panelOpen) return;
  const o = OBJ[i];
  active = i; idle = 0;
  hideHint();
  markTape();
  $("#tObj").textContent = o.cfg.label.toUpperCase();

  const aim = aimFor(o);
  shockwave(o);

  if(reduced){
    camPos.copy(aim.stop); yaw=aim.yaw; pitch=clamp(aim.pitch,-PITCH_MAX,PITCH_MAX);
    closePanel(true); arrive(i); return;
  }

  flight.on=true; flight.t=0; flight.dur=2.9/MOT.flight; flying=true;
  flight.p0.copy(camPos); flight.p2.copy(aim.stop);
  const seg = new THREE.Vector3().subVectors(aim.stop, camPos);
  const perp = new THREE.Vector3().crossVectors(seg, new THREE.Vector3(0,1,0));
  if(perp.lengthSq() < 1e-6) perp.set(1,0,0);
  perp.normalize().multiplyScalar(Math.min(seg.length()*0.16, 38));
  flight.p1.copy(camPos).lerp(aim.stop,0.5).add(perp).add(new THREE.Vector3(0,16,0));
  flight.y0=yaw; flight.y1=flight.y0+norm(aim.yaw-flight.y0);
  flight.pi0=pitch; flight.pi1=aim.pitch;
  vYaw=vPitch=0;

  speed = 2.8; tgtSpeed = 0.16;       /* warp burst, then decelerate in */
  fovPunch = 1;
  flashPulse();
  closePanel(true);
  flight.cb = ()=>arrive(i);
}

function goHome(){
  hideHint();
  closePanel();
  active=-1; markTape();
  $("#tObj").textContent = "—";
  if(reduced){ camPos.set(0,0,0); flying=false; return; }
  flight.on=true; flight.t=0; flight.dur=2.3/MOT.flight; flying=true;
  flight.p0.copy(camPos); flight.p2.set(0,0,0);
  flight.p1.copy(camPos).multiplyScalar(0.5).add(new THREE.Vector3(0,-16,0));
  flight.y0=yaw; flight.y1=yaw; flight.pi0=pitch; flight.pi1=pitch*0.35;
  speed=1.9; tgtSpeed=1; fovPunch=0.55;
  flight.cb = ()=>{ flying=false; };
}

function arrive(i){
  flying=false;
  openPanel(i);
  $("#live").textContent = OBJ[i].cfg.label + " — " + OBJ[i].cfg.kind + ".";
}

/* ── drag look ── */
let down=false, px=0, py=0, moved=0, suppressClick=false;
function onDown(e){
  if(e.target.closest && e.target.closest(".panel,.tape,.tools,.lbx,.vall,.dtl,.boot")) return;
  down=true; moved=0; px=e.clientX; py=e.clientY; idle=0;
  document.body.classList.add("is-dragging");
}
function onMove(e){
  if(!down) return;
  const dx=e.clientX-px, dy=e.clientY-py; px=e.clientX; py=e.clientY;
  moved += Math.abs(dx)+Math.abs(dy);
  const k = (panelOpen ? 0.4 : 1) * (1 - warp*0.6);
  vYaw   -= dx*0.0021*k*MOT.look;
  vPitch -= dy*0.0017*k*MOT.look;
  hideHint();
}
function onUp(){
  if(!down) return;
  down=false; document.body.classList.remove("is-dragging");
  if(moved>8){ suppressClick=true; setTimeout(()=>suppressClick=false,60); }
}
addEventListener("pointerdown",onDown,{passive:true});
addEventListener("pointermove",onMove,{passive:true});
addEventListener("pointerup",onUp,{passive:true});
addEventListener("pointercancel",onUp,{passive:true});

/* scroll to zoom — a FOV pinch rather than a dolly, since the camera's
   position is always driven by travel/standoff, never free-floating */
addEventListener("wheel",e=>{
  if(e.target.closest && e.target.closest(".panel,.tape,.tools,.lbx,.vall,.dtl,.boot")) return;
  zoom = clamp(zoom + e.deltaY*0.045, -28, 22);
  idle = 0;
  e.preventDefault();
},{passive:false});

/* subtle mouse parallax on fine pointers */
let mx=0,my=0;
if(!coarse) addEventListener("pointermove",e=>{
  mx=(e.clientX/innerWidth)*2-1; my=(e.clientY/innerHeight)*2-1;
},{passive:true});

/* keyboard look */
const keys={};
addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    if(dtlOpen) closeDetail();
    else if(lbxOpen) closeLbx();
    else if(vallOpen) closeViewAll();
    else goHome();
    return;
  }
  if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)){
    if(document.activeElement && document.activeElement.closest(".panel")) return;
    keys[e.key]=true; e.preventDefault(); hideHint();
  }
});
addEventListener("keyup",e=>{ keys[e.key]=false; });

$("#btnHome").addEventListener("click",goHome);

/* ── travel feedback: flash + shockwave ── */
const flashEl = $("#flash"), ringHost = $("#ringHost");
function flashPulse(){
  if(reduced) return;
  flashEl.animate([{opacity:0},{opacity:.5,offset:.12},{opacity:0}],
    {duration:900,easing:"cubic-bezier(.16,.84,.32,1)"});
}
function shockwave(o){
  if(reduced) return;
  const v = o.pos.clone().project(camera);
  if(v.z>1) return;
  const x=(v.x*.5+.5)*innerWidth, y=(-v.y*.5+.5)*innerHeight;
  for(let i=0;i<2;i++){
    const d=document.createElement("div");
    d.className="ring"; d.style.left=x+"px"; d.style.top=y+"px";
    ringHost.appendChild(d);
    d.animate([{transform:"scale(1)",opacity:.85},{transform:"scale(46)",opacity:0}],
      {duration:1100,delay:i*140,easing:"cubic-bezier(.16,.84,.32,1)"})
      .onfinish = ()=>d.remove();
  }
}

/* ── 9 · resize ───────────────────────────────────────────────────────── */
function resize(){
  const w=innerWidth,h=innerHeight;
  renderer.setSize(w,h,false);
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
  const dpr=Math.min(devicePixelRatio||1, coarse?1.75:2);
  renderer.setPixelRatio(dpr);
  dustMat.uniforms.uDpr.value=dpr; deepMat.uniforms.uDpr.value=dpr;
  fadeables.forEach(m=>{ if(m.uniforms && m.uniforms.uDpr) m.uniforms.uDpr.value=dpr; });
  paintTape();
}
addEventListener("resize",resize,{passive:true});
addEventListener("orientationchange",()=>setTimeout(resize,140),{passive:true});
resize();

/* ── 10 · main loop ───────────────────────────────────────────────────── */
const v3 = new THREE.Vector3(), v3b = new THREE.Vector3();
const tAz=$("#tAz"), tEl=$("#tEl"), tRng=$("#tRng"), ladderB=$("#ladderB");
let t=0, lastT=performance.now(), raf=0;

document.addEventListener("visibilitychange",()=>{
  if(document.hidden){ cancelAnimationFrame(raf); }
  else { lastT=performance.now(); raf=requestAnimationFrame(loop); }
});

function loop(now){
  raf = requestAnimationFrame(loop);
  const dt = Math.min((now-lastT)/1000, 0.05); lastT = now; t += dt;

  /* global fade-in */
  fade = lerp(fade, 1, Math.min(dt*1.0,1));
  dustMat.uniforms.uFade.value = fade*SKY.dust;
  deepMat.uniforms.uFade.value = fade*0.62*SKY.stars;
  fadeables.forEach(m=>{
    if(m.uniforms && m.uniforms.uFade) m.uniforms.uFade.value = fade;
    else if(m.userData && m.userData.base!==undefined) m.opacity = m.userData.base*fade;
  });

  /* dust march */
  speed = lerp(speed, tgtSpeed, Math.min(dt*1.15,1));
  travelDist += 21*speed*dt;
  dustMat.uniforms.uTravel.value = travelDist;
  dustMat.uniforms.uStretch.value = Math.max(0, speed-1)*3.0;
  dustMat.uniforms.uTime.value = t;
  deepMat.uniforms.uTime.value = t;
  deep.rotation.y += dt*0.004;

  /* flight */
  if(flight.on){
    flight.t += dt/flight.dur;
    const k=Math.min(flight.t,1), e=easeInOut(k), inv=1-e;
    camPos.set(
      inv*inv*flight.p0.x + 2*inv*e*flight.p1.x + e*e*flight.p2.x,
      inv*inv*flight.p0.y + 2*inv*e*flight.p1.y + e*e*flight.p2.y,
      inv*inv*flight.p0.z + 2*inv*e*flight.p1.z + e*e*flight.p2.z
    );
    yaw   = lerp(flight.y0, flight.y1, e);
    pitch = lerp(flight.pi0, flight.pi1, e);
    vYaw=vPitch=0;
    if(k>=1){ flight.on=false; const cb=flight.cb; flight.cb=null; if(cb) cb(); }
  }else{
    /* keyboard look */
    const ks = 0.95*dt*MOT.look;
    if(keys.ArrowLeft)  vYaw += ks*0.5;
    if(keys.ArrowRight) vYaw -= ks*0.5;
    if(keys.ArrowUp)    vPitch += ks*0.4;
    if(keys.ArrowDown)  vPitch -= ks*0.4;

    yaw   += vYaw; pitch += vPitch;
    vYaw   *= Math.pow(0.0025, dt);   /* frame-rate independent damping */
    vPitch *= Math.pow(0.0025, dt);
    pitch = clamp(pitch, -PITCH_MAX, PITCH_MAX);

    /* adrift: very slow yaw when nobody has touched anything */
    idle += dt;
    if(!reduced && idle>9 && !panelOpen) yaw += dt*0.009;
  }

  /* FOV: punch out on departure, tighten on arrival, scroll wheel zooms */
  fovPunch = Math.max(0, fovPunch - dt*1.05);
  tgtFov = clamp((active>=0 && !flying ? 54 : FOV_BASE) + fovPunch*15 + zoom, 20, 84);
  fov = lerp(fov, tgtFov, Math.min(dt*2.2,1));
  if(Math.abs(camera.fov-fov)>0.01){ camera.fov=fov; camera.updateProjectionMatrix(); }

  /* apply camera */
  const par = panelOpen ? 0.3 : 1;
  const sway = reduced ? 0 : Math.sin(t*0.17)*0.010;
  camera.position.copy(camPos);
  camera.rotation.set(
    pitch - my*0.020*par + Math.sin(t*0.12)*0.005,
    yaw   - mx*0.030*par + sway,
    Math.sin(t*0.08)*0.004, "YXZ");
  camera.updateMatrixWorld(true);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

  /* telemetry */
  const heading = ((-yaw*180/Math.PI)%360+360)%360;
  tAz.textContent = heading.toFixed(1).padStart(5,"0");
  const elDeg = pitch*180/Math.PI;
  tEl.textContent = (elDeg>=0?"+":"") + elDeg.toFixed(1);
  ladderB.style.top = (clamp((1-(elDeg+60)/120),0,1)*100)+"%";

  /* objects */
  const halfW=innerWidth/2, halfH=innerHeight/2;
  const per = innerWidth/(TAPE_SPAN*2);
  let nearest=-1, nearestD=1e9, bhFocus=0;

  for(let i=0;i<OBJ.length;i++){
    const o=OBJ[i];
    const want = (i===active?1:0) + (o.hover?0.55:0);
    o.focus = lerp(o.focus, Math.min(want,1), Math.min(dt*4,1));
    o.inst.update(t, dt, o.focus);
    if(o.cfg.type==="blackhole") bhFocus=Math.max(bhFocus,o.focus);

    /* project centre and edge for bracket sizing */
    v3.copy(o.pos).project(camera);
    const onScreen = v3.z<1;
    const sx=(v3.x*halfW)+halfW, sy=(-v3.y*halfH)+halfH;

    if(onScreen && Math.abs(v3.x)<1.5 && Math.abs(v3.y)<1.5){
      v3b.setFromMatrixColumn(camera.matrixWorld, 0)
         .multiplyScalar(o.bound).add(o.pos).project(camera);
      const rad = clamp(Math.abs((v3b.x*halfW+halfW)-sx), 30, 210);

      o.el.style.transform = "translate3d("+sx.toFixed(1)+"px,"+sy.toFixed(1)+"px,0)";
      o.el.style.width = o.el.style.height = (rad*2)+"px";
      o.el.style.marginLeft = o.el.style.marginTop = (-rad)+"px";
      o.el.classList.remove("is-off"); o.el.classList.add("is-on");
      const off = Math.max(Math.abs(v3.x),Math.abs(v3.y));
      o.el.classList.toggle("is-near", off<0.55 && !panelOpen);
      o.el.classList.toggle("is-mute", panelOpen && i!==active);
      if(off<nearestD){ nearestD=off; nearest=i; }
    }else{
      o.el.classList.add("is-off"); o.el.classList.remove("is-on","is-near");
    }

    /* compass blip */
    let d = o.az - heading;
    while(d>180) d-=360; while(d<-180) d+=360;
    const beyond = Math.abs(d)>TAPE_SPAN;
    o.blip.style.transform = "translateX(-50%) translateX("+
      (halfW + clamp(d,-TAPE_SPAN,TAPE_SPAN)*per).toFixed(1)+"px)";
    o.blip.classList.toggle("is-edge", beyond);
    o.blip.classList.toggle("is-near", Math.abs(d)<9 && !beyond);
  }

  tapeTrack.style.backgroundPositionX = (-heading*per).toFixed(1)+"px";
  tRng.textContent = active>=0
    ? Math.round(camPos.distanceTo(OBJ[active].pos)) + "u"
    : (nearest>=0 ? Math.round(OBJ[nearest].pos.distanceTo(camPos)) + "u" : "—");

  /* time dilation: the closer you are to the black hole, the more the
     interface itself visibly drags — same signal that slows look input
     in onMove() below */
  warp = reduced ? 0 : lerp(warp, bhFocus, Math.min(dt*2.2,1));
  document.documentElement.style.setProperty("--warp", warp.toFixed(3));

  if(playing) tickWave();
  renderer.render(scene,camera);
}

/* ══════════════════════════════════════════════════════════════════════
   11 · PANEL — renders the block system from config.js
   ══════════════════════════════════════════════════════════════════════ */
const panel=$("#panel"), pin=$("#pin");
let panelOpen=false;
const esc = s => String(s).replace(/&(?!amp;|lt;|gt;|#)/g,"&amp;").replace(/</g,"&lt;");

const BLOCK = {
  text: b => '<p class="lede">'+esc(b.body)+'</p>',

  stats: b => '<div class="stats">'+b.items.map(([n,l])=>
    '<div class="stat"><span class="stat-n">'+esc(n)+'</span><span class="stat-l">'+esc(l)+'</span></div>'
  ).join("")+'</div>',

  media: (b, bi) => '<div class="media" data-cols="'+(b.cols||1)+'">'+b.items.map((m,i)=>{
    const has = m.src && m.src.length;
    const inner = !has
      ? '<div class="shot-load">Add a URL in config.js</div>'
      : (m.kind==="video"
          ? '<div class="shot-load">Loading</div><video data-src="'+esc(m.src)+'"'+
            (m.poster?' poster="'+esc(m.poster)+'"':'')+
            ' muted loop playsinline preload="none" referrerpolicy="no-referrer"></video>'
          : '<div class="shot-load">Loading</div><img data-src="'+esc(m.src)+'" alt="'+esc(m.label||"")+'" referrerpolicy="no-referrer">');
    return '<figure class="shot">'+
      (has?'<button class="shot-zoom" type="button" data-zoom="'+i+'">Expand</button>':'')+
      '<div class="shot-f">'+inner+'</div>'+
      '<figcaption><span>'+esc(m.label||"")+'</span><span>'+esc(m.note||"")+'</span></figcaption>'+
      '</figure>';
  }).join("")+'</div>'+
    ((b.more&&b.more.length)?'<button class="view-all" type="button" data-kind="media" data-blk="'+bi+'">View all '+(b.items.length+b.more.length)+' →</button>':''),

  audio: b => '<div class="tracks">'+b.items.map((a,i)=>
    '<div class="trk" data-trk="'+i+'">'+
      '<button class="trk-b" type="button" aria-label="Play '+esc(a.title)+'">'+
        '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z"/></svg></button>'+
      '<div class="trk-m"><div class="trk-top"><span class="trk-t">'+esc(a.title)+
      '</span><span class="trk-x">'+esc(a.meta||"")+'</span></div>'+
      '<div class="wave" role="presentation">'+waveBars(a.title)+'</div></div>'+
    '</div>').join("")+'</div>',

  rows: (b, bi) => '<div class="rows" data-blk="'+bi+'">'+b.items.map(([n,m,d],i)=>
    '<button class="row" type="button" data-i="'+i+'"><span class="row-t">'+esc(n)+'</span><span class="row-m">'+esc(m)+
    '</span><span class="row-d">'+esc(d)+'</span></button>').join("")+'</div>'+
    ((b.more&&b.more.length)?'<button class="view-all" type="button" data-kind="rows" data-blk="'+bi+'">View all '+(b.items.length+b.more.length)+' →</button>':''),

  tags: b => '<div class="tags">'+b.items.map(x=>{
    const hot = /^\*.*\*$/.test(x);
    return '<span class="tag">'+(hot?'<b>'+esc(x.slice(1,-1))+'</b>':esc(x))+'</span>';
  }).join("")+'</div>',

  tiers: b => '<div class="tiers">'+b.items.map(x=>
    '<div class="tier" data-f="'+(x.flag?1:0)+'">'+(x.flag?'<span class="tier-f">'+esc(x.flag)+'</span>':'')+
    '<h3 class="tier-t">'+esc(x.t)+'</h3><p class="tier-p">'+esc(x.p)+'</p><ul>'+
    x.items.map(y=>'<li>'+esc(y)+'</li>').join("")+'</ul></div>').join("")+'</div>',

  list: b => '<ul class="blist">'+b.items.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>',

  links: b => '<div class="links">'+b.items.map(([k,v,href])=>
    '<a class="lnk" href="'+esc(href||"#")+'"'+(/^https?:/.test(href||"")?' target="_blank" rel="noopener"':'')+
    '><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></a>').join("")+'</div>'
};

/* deterministic bar heights so a track always looks the same */
function waveBars(seedStr){
  let s=0; for(let i=0;i<seedStr.length;i++) s=(s*31+seedStr.charCodeAt(i))>>>0;
  const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
  let out="";
  const N=44;
  for(let i=0;i<N;i++){
    const env=Math.sin((i/N)*Math.PI);
    const h=Math.max(6, Math.round((0.25+rnd()*0.75)*env*100));
    out+='<i style="height:'+h+'%"></i>';
  }
  return out;
}

function renderPanel(i){
  const o=OBJ[i], c=o.cfg;
  let s=0;
  const st = () => ' class="st" style="animation-delay:'+(0.06+(s++)*0.055).toFixed(3)+'s"';

  let h='<button class="p-close" type="button" id="pClose">Back to field ✕</button>';
  h+='<div'+st()+'><div class="p-desig"><span><b>'+esc(c.desig)+'</b></span></div>';
  h+='<div class="p-kind">'+esc(c.kind)+'</div>';
  h+='<h2 id="pTitle">'+c.title+'</h2></div>';
  if(c.lede) h+='<div'+st()+'><p class="lede">'+c.lede+'</p></div>';

  (c.blocks||[]).forEach((b,bi)=>{
    const fn=BLOCK[b.k]; if(!fn) return;
    h+='<section class="blk"'+st()+'>';
    if(b.title) h+='<h3 class="blk-h"><span>'+esc(b.title)+'</span>'+
      (b.note?'<span>'+esc(b.note)+'</span>':'')+'</h3>';
    h+=fn(b,bi)+'</section>';
  });

  const nx = OBJ[(i+1)%OBJ.length];
  h+='<div class="p-foot"'+st()+'>'+
     '<button class="fbtn" type="button" id="fHome">Back to field</button>'+
     '<button class="fbtn" type="button" id="fNext">'+esc(nx.cfg.label)+' <i></i></button></div>';

  pin.innerHTML=h; panel.scrollTop=0;
  $("#pClose").addEventListener("click",goHome);
  $("#fHome").addEventListener("click",goHome);
  $("#fNext").addEventListener("click",()=>travelTo((i+1)%OBJ.length));
  wireMedia(i); wireAudio(i); wireContent(i);
}

function openPanel(i){
  renderPanel(i);
  panel.classList.add("is-open");
  panelOpen=true;
  document.body.classList.add("is-panel");
  panel.focus({preventScroll:true});
}
function closePanel(quiet){
  if(!panelOpen) return;
  stopAudio();
  panel.classList.remove("is-open");
  panelOpen=false;
  document.body.classList.remove("is-panel");
  if(!quiet) $("#live").textContent="Back to the field.";
}

/* ── media: lazy load, play only while visible ── */
let mediaIO=null;
function wireMedia(i){
  const cfg=OBJ[i].cfg;
  const all=[]; (cfg.blocks||[]).forEach(b=>{ if(b.k==="media") all.push(...b.items); });

  if(mediaIO) mediaIO.disconnect();
  mediaIO = new IntersectionObserver(es=>{
    es.forEach(en=>{
      const el = en.target.querySelector("img,video");
      if(!el) return;
      if(en.isIntersecting){
        if(el.dataset.src){
          if(el.tagName==="VIDEO"){ el.src=el.dataset.src; el.load(); }
          else el.src=el.dataset.src;
          delete el.dataset.src;
          const done=()=>en.target.classList.add("is-ready");
          el.addEventListener(el.tagName==="VIDEO"?"loadeddata":"load",done,{once:true});
          el.addEventListener("error",()=>{
            const l=en.target.querySelector(".shot-load");
            if(l) l.textContent="Couldn't load — check the URL";
          },{once:true});
        }
        if(el.tagName==="VIDEO") el.play().catch(()=>{});
      }else if(el.tagName==="VIDEO"){ el.pause(); }
    });
  },{root:panel, rootMargin:"200px 0px"});

  pin.querySelectorAll(".shot-f").forEach(f=>mediaIO.observe(f));

  pin.querySelectorAll(".shot-zoom").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const fig=btn.closest(".shot");
      const src=fig.querySelector("img,video");
      const idx=[...pin.querySelectorAll(".shot")].indexOf(fig);
      openLbx(all[idx], src);
    });
  });
}

/* ── lightbox ── */
const lbx=$("#lbx"), lbxBody=$("#lbxBody"), lbxCap=$("#lbxCap");
let lbxOpen=false;
function openLbx(item, srcEl){
  if(!item || !item.src) return;
  lbxBody.innerHTML = item.kind==="video"
    ? '<video src="'+esc(item.src)+'" autoplay loop muted playsinline controls referrerpolicy="no-referrer"></video>'
    : '<img src="'+esc(item.src)+'" alt="'+esc(item.label||"")+'" referrerpolicy="no-referrer">';
  lbxCap.textContent = [item.label,item.note].filter(Boolean).join(" · ");
  lbx.classList.add("is-open"); lbxOpen=true;
}
function closeLbx(){ lbx.classList.remove("is-open"); lbxBody.innerHTML=""; lbxOpen=false; }
$("#lbxX").addEventListener("click",closeLbx);
lbx.addEventListener("click",e=>{ if(e.target===lbx) closeLbx(); });

/* ── rows + view-all: click a project to widen it, or see everything ──
   Every "rows"/"media" block can carry a `more` array in config.js —
   same item shape as `items`, just the work that isn't in the featured
   cut. If it's there, a "View all" button shows up and opens this
   overlay with the full list, sortable by the year found in each
   item's meta/note text. */
function wireContent(i){
  const cfg=OBJ[i].cfg;
  pin.querySelectorAll('.rows[data-blk]').forEach(rowsEl=>{
    const b=(cfg.blocks||[])[+rowsEl.dataset.blk]; if(!b) return;
    rowsEl.querySelectorAll('.row').forEach((rowEl,ri)=>
      rowEl.addEventListener('click',()=>openDetail(b.items[ri])));
  });
  pin.querySelectorAll('.view-all').forEach(btn=>{
    const b=(cfg.blocks||[])[+btn.dataset.blk]; if(!b) return;
    const kind=btn.dataset.kind, all=(b.items||[]).concat(b.more||[]);
    btn.addEventListener('click',()=>openViewAll(kind,b.title||'',all));
  });
}

function yearOf(item,kind){
  const text = kind==="rows" ? (item[1]||"") : (item.date||item.note||"");
  const m = String(text).match(/(\d{4})/);
  return m ? +m[1] : Infinity;   // undated items (e.g. "Ongoing") read as current
}

const vall=$("#vall"), vallTitle=$("#vallTitle"), vallBody=$("#vallBody"),
      vallNewest=$("#vallNewest"), vallOldest=$("#vallOldest");
let vallOpen=false, vallState=null;

/* eased wheel scroll — native scrolling jumps per tick, this catches the
   target up over a few frames instead. Owns scrollTop while animating, so
   it must be the only thing writing it (no CSS scroll-behavior on these). */
function smoothScroll(el){
  let target=el.scrollTop, raf=null;
  function step(){
    const cur=el.scrollTop, diff=target-cur;
    if(Math.abs(diff)<0.5){ el.scrollTop=target; raf=null; return; }
    el.scrollTop=cur+diff*0.2;
    raf=requestAnimationFrame(step);
  }
  el.addEventListener("wheel",e=>{
    if(!raf) target=el.scrollTop;
    target=Math.min(Math.max(target+e.deltaY,0),el.scrollHeight-el.clientHeight);
    e.preventDefault();
    if(!raf) raf=requestAnimationFrame(step);
  },{passive:false});
}
smoothScroll(panel); smoothScroll(vall);

function renderVall(){
  const {kind,items,dir}=vallState;
  const sorted=items.slice().sort((a,b)=>{
    const ya=yearOf(a,kind), yb=yearOf(b,kind);
    return dir==="asc" ? ya-yb : yb-ya;
  });
  const delay = i => (0.03+Math.min(i,16)*0.035).toFixed(3)+'s';
  if(kind==="rows"){
    vallBody.innerHTML='<div class="rows">'+sorted.map(([n,m,d],i)=>
      '<button class="row" type="button" style="animation-delay:'+delay(i)+'"><span class="row-t">'+esc(n)+
      '</span><span class="row-m">'+esc(m)+'</span><span class="row-d">'+esc(d)+'</span></button>'
    ).join("")+'</div>';
    vallBody.querySelectorAll(".row").forEach((el,i)=>
      el.addEventListener("click",()=>openDetail(sorted[i])));
  }else{
    vallBody.innerHTML='<div class="media" data-cols="2">'+sorted.map((m,i)=>{
      const has=m.src && m.src.length;
      const inner=!has
        ? '<div class="shot-load">Add a URL in config.js</div>'
        : (m.kind==="video"
            ? '<video src="'+esc(m.src)+'"'+(m.poster?' poster="'+esc(m.poster)+'"':'')+' autoplay muted loop playsinline preload="auto" referrerpolicy="no-referrer"></video>'
            : '<img src="'+esc(m.src)+'" alt="'+esc(m.label||"")+'" referrerpolicy="no-referrer">');
      return '<figure class="shot" style="animation-delay:'+delay(i)+(has?";cursor:pointer":"")+'">'+
        '<div class="shot-f is-ready">'+inner+'</div>'+
        '<figcaption><span>'+esc(m.label||"")+'</span><span>'+esc(m.note||"")+'</span></figcaption>'+
        '</figure>';
    }).join("")+'</div>';
    vallBody.querySelectorAll(".shot").forEach((el,i)=>{
      const m=sorted[i]; if(!m.src) return;
      el.addEventListener("click",()=>openLbx(m, el.querySelector("img,video")));
    });
  }
}

function openViewAll(kind,title,items){
  vallState={kind,items,dir:"desc"};
  vallTitle.textContent=title||"All work";
  vallNewest.setAttribute("aria-pressed","true");
  vallOldest.setAttribute("aria-pressed","false");
  renderVall();
  vall.classList.add("is-open"); vallOpen=true; vall.scrollTop=0;
  $("#vallX").focus({preventScroll:true});
}
function closeViewAll(){ vall.classList.remove("is-open"); vallOpen=false; }
$("#vallX").addEventListener("click",closeViewAll);
vall.addEventListener("click",e=>{ if(e.target===vall) closeViewAll(); });
vallNewest.addEventListener("click",()=>{
  if(!vallState||vallState.dir==="desc") return;
  vallState.dir="desc"; vallNewest.setAttribute("aria-pressed","true"); vallOldest.setAttribute("aria-pressed","false");
  renderVall();
});
vallOldest.addEventListener("click",()=>{
  if(!vallState||vallState.dir==="asc") return;
  vallState.dir="asc"; vallOldest.setAttribute("aria-pressed","true"); vallNewest.setAttribute("aria-pressed","false");
  renderVall();
});

/* ── project detail: widen a single row item ── */
const dtl=$("#dtl"), dtlBody=$("#dtlBody");
let dtlOpen=false;
function openDetail(item){
  if(!item) return;
  const [n,m,d]=item;
  dtlBody.innerHTML='<div class="dtl-m">'+esc(m)+'</div><h2 class="dtl-t">'+esc(n)+'</h2><p class="dtl-d">'+esc(d)+'</p>';
  dtl.classList.add("is-open"); dtlOpen=true;
  $("#dtlX").focus({preventScroll:true});
}
function closeDetail(){ dtl.classList.remove("is-open"); dtlOpen=false; }
$("#dtlX").addEventListener("click",closeDetail);
dtl.addEventListener("click",e=>{ if(e.target===dtl) closeDetail(); });

/* ══════════════════════════════════════════════════════════════════════
   12 · AUDIO — file playback, or synthesised placeholders
   ══════════════════════════════════════════════════════════════════════ */
let AC=null, master=null, ambNodes=null, ambOn=false;
function ac(){
  if(!AC){
    const C = window.AudioContext || window.webkitAudioContext;
    if(!C) return null;
    AC = new C();
    master = AC.createGain(); master.gain.value=0.9; master.connect(AC.destination);
  }
  if(AC.state==="suspended") AC.resume();
  return AC;
}
let noiseBuf=null;
function noise(){
  if(!noiseBuf){
    const n=AC.sampleRate*3, b=AC.createBuffer(1,n,AC.sampleRate), d=b.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
    noiseBuf=b;
  }
  const s=AC.createBufferSource(); s.buffer=noiseBuf; s.loop=true; return s;
}
function loadAudioElement(src){
  return new Promise((resolve,reject)=>{
    const el = new Audio(src);
    el.loop = true;
    el.addEventListener("canplaythrough",()=>resolve(el),{once:true});
    el.addEventListener("error",()=>reject(new Error("audio load failed: "+src)),{once:true});
    el.load();
  });
}

/* ══ per-object ambience ═══════════════════════════════════════════════
   Every phenomenon can carry a looping bed tied to how close you are AND
   whether you're actually focused on it (hover or selected) — pure
   distance let sound bleed into neighbouring objects once the field got
   spaced out. This used to be bespoke to the pulsar; every object wants
   the same wiring, just pointed at a different sound. */
const AMB_PRESETS = {
  /* deep gravitational rumble — three sub oscillators beating slowly */
  hum(C,bus){
    [30,30.4,45.2].forEach((fr,i)=>{
      const o=C.createOscillator(); o.type=i===2?"triangle":"sine"; o.frequency.value=fr;
      const g=C.createGain(); g.gain.value=0.30/(i+1);
      o.connect(g); g.connect(bus); o.start();
    });
  },
  /* thin high atmosphere — filtered noise breathing slowly */
  wind(C,bus){
    const n=noise(), f=C.createBiquadFilter(); f.type="bandpass"; f.Q.value=0.8; f.frequency.value=520;
    const g=C.createGain(); g.gain.value=0.5;
    n.connect(f); f.connect(g); g.connect(bus); n.start();
    const lfo=C.createOscillator(), lg=C.createGain();
    lfo.frequency.value=0.05; lg.gain.value=260;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start();
  },
  /* slow shifting pad — a nursery of young, unsettled stars */
  shimmer(C,bus){
    [660,880,1320].forEach((fr,i)=>{
      const o=C.createOscillator(); o.type="sine"; o.frequency.value=fr;
      const g=C.createGain(); g.gain.value=0.05/(i+1);
      const lfo=C.createOscillator(), lg=C.createGain();
      lfo.frequency.value=0.08+i*0.03; lg.gain.value=6+i*3;
      lfo.connect(lg); lg.connect(o.frequency);
      o.connect(g); g.connect(bus); o.start(); lfo.start();
    });
  },
  /* vast detuned choir — a scaled-up version of the sitewide ambience bed */
  choir(C,bus){
    [98,98.15,147,147.2].forEach((fr,i)=>{
      const o=C.createOscillator(); o.type=i%2?"sawtooth":"triangle"; o.frequency.value=fr;
      const lp=C.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=900;
      const g=C.createGain(); g.gain.value=0.12/(i+1);
      o.connect(lp); lp.connect(g); g.connect(bus); o.start();
    });
  },
  /* two voices trading a slow beat — a binary's mismatched periods */
  pulse(C,bus){
    [220,220.6].forEach(fr=>{
      const o=C.createOscillator(); o.type="sine"; o.frequency.value=fr;
      const g=C.createGain(); g.gain.value=0.14;
      o.connect(g); g.connect(bus); o.start();
    });
  },
  /* thin icy tone plus a hiss of sublimating gas */
  whistle(C,bus){
    const o=C.createOscillator(); o.type="sine"; o.frequency.value=1450;
    const og=C.createGain(); og.gain.value=0.05;
    o.connect(og); og.connect(bus); o.start();
    const n=noise(), f=C.createBiquadFilter(); f.type="highpass"; f.frequency.value=3200;
    const ng=C.createGain(); ng.gain.value=0.08;
    n.connect(f); f.connect(ng); ng.connect(bus); n.start();
  },
  /* sparse low groan — a cold, tumbling rock, mostly silence between */
  creak(C,bus){
    const o=C.createOscillator(); o.type="triangle"; o.frequency.value=52;
    const g=C.createGain(); g.gain.value=0.10;
    const lfo=C.createOscillator(), lg=C.createGain();
    lfo.frequency.value=0.04; lg.gain.value=10;
    lfo.connect(lg); lg.connect(o.frequency);
    o.connect(g); g.connect(bus); o.start(); lfo.start();
  },
  /* steady carrier tone with a slow breathing ping — reads as artificial */
  carrier(C,bus){
    const o=C.createOscillator(); o.type="sine"; o.frequency.value=740;
    const og=C.createGain(); og.gain.value=0.03;
    o.connect(og); og.connect(bus); o.start();
    const lfo=C.createOscillator(), lg=C.createGain();
    lfo.frequency.value=0.28; lg.gain.value=0.028;
    lfo.connect(lg); lg.connect(og.gain); lfo.start();
  }
};

/* g: the object's THREE.Group, used to measure live distance from camera.
   cfg: the object's config entry — reads cfg.sound and cfg.volume.
   defaults: {synth|src, near, far, volume} for this phenomenon type.
   cfg.sound: false disables it; true/omitted uses defaults; a string
   overrides with a real file (same "swap one line to use your own
   audio" contract as the AUDIO panel blocks); an object can override
   any of {synth,src,near,far,volume} individually.
   Returns a tick(f) function to call once per frame with the object's
   current focus (0..1) — it measures distance itself. */
function makeAmbience(g, cfg, defaults){
  const snd = cfg.sound;
  if(snd === false) return ()=>{};
  let src = defaults.src || null, synth = defaults.synth || null;
  if(typeof snd === "string"){ src = snd; synth = null; }
  else if(snd && typeof snd === "object"){
    if(snd.src)   { src = snd.src; synth = null; }
    if(snd.synth) { synth = snd.synth; src = null; }
  }
  const FAR  = (snd && snd.far)  !== undefined ? snd.far  : defaults.far;
  const NEAR = (snd && snd.near) !== undefined ? snd.near : defaults.near;
  const VOL  = cfg.volume !== undefined ? cfg.volume
             : (snd && snd.volume !== undefined) ? snd.volume : defaults.volume;

  let gestured=false, A=null, building=false;
  addEventListener("pointerdown",()=>gestured=true,{once:true,passive:true});
  addEventListener("keydown",   ()=>gestured=true,{once:true,passive:true});

  function build(){
    if(building) return;
    building=true;
    if(src){
      /* Plays outside the Web Audio graph on purpose — routing a file:// media
         element through createMediaElementSource taints it (Chrome treats every
         file:// URL as its own opaque origin, even siblings), which silently
         outputs zeroes. Setting .volume directly works everywhere. */
      loadAudioElement(src).then(el=>{
        el.volume=0;
        el.play().catch(()=>{});
        A={el};
      }).catch(()=>{ building=false; });
    }else{
      const C=ac(); if(!C){ building=false; return; }
      const bus=C.createGain(); bus.gain.value=0; bus.connect(master);
      (AMB_PRESETS[synth]||AMB_PRESETS.hum)(C,bus);
      A={C,bus};
    }
  }

  let curVol=0;
  return function(f,dt){
    if(!gestured) return;
    const dist = camera.position.distanceTo(g.position);
    const distLvl = Math.min(Math.max((FAR-dist)/(FAR-NEAR),0),1);
    const lvl = distLvl*Math.min(f,1)*VOL;
    if(lvl>0.005 && !A) build();
    if(!A) return;
    if(A.el){
      /* el.volume has no built-in ramp — fast camera moves (the fly-to-object
         transit) would otherwise snap it instead of fading. Ease toward the
         target with the same ~0.3s time constant setTargetAtTime used below. */
      const k = 1-Math.exp(-(dt||0.016)/0.3);
      curVol += (lvl-curVol)*k;
      A.el.volume = Math.min(Math.max(curVol,0),1);
    }else A.bus.gain.setTargetAtTime(lvl, A.C.currentTime, 0.3);
  };
}

/* preset → { dur } and starts immediately */
const PRESETS = {
  impact(g,now){
    const n=noise(), f=AC.createBiquadFilter(); f.type="lowpass";
    f.frequency.setValueAtTime(2600,now); f.frequency.exponentialRampToValueAtTime(90,now+0.5);
    g.gain.setValueAtTime(0.9,now); g.gain.exponentialRampToValueAtTime(0.0008,now+1.5);
    n.connect(f); f.connect(g); n.start(now); n.stop(now+1.6);
    const o=AC.createOscillator(), og=AC.createGain(); o.type="sine";
    o.frequency.setValueAtTime(84,now); o.frequency.exponentialRampToValueAtTime(36,now+0.45);
    og.gain.setValueAtTime(0.85,now); og.gain.exponentialRampToValueAtTime(0.001,now+0.9);
    o.connect(og); og.connect(g); o.start(now); o.stop(now+1.0);
    return 1.7;
  },
  whoosh(g,now){
    const n=noise(), f=AC.createBiquadFilter(); f.type="bandpass"; f.Q.value=1.6;
    f.frequency.setValueAtTime(320,now);
    f.frequency.exponentialRampToValueAtTime(2600,now+0.8);
    f.frequency.exponentialRampToValueAtTime(220,now+1.9);
    g.gain.setValueAtTime(0.001,now);
    g.gain.exponentialRampToValueAtTime(0.75,now+0.75);
    g.gain.exponentialRampToValueAtTime(0.001,now+2.0);
    n.connect(f); f.connect(g); n.start(now); n.stop(now+2.1);
    return 2.1;
  },
  riser(g,now){
    const n=noise(), f=AC.createBiquadFilter(); f.type="bandpass"; f.Q.value=3.4;
    f.frequency.setValueAtTime(260,now); f.frequency.exponentialRampToValueAtTime(5200,now+2.6);
    g.gain.setValueAtTime(0.02,now); g.gain.linearRampToValueAtTime(0.55,now+2.5);
    g.gain.exponentialRampToValueAtTime(0.001,now+3.0);
    n.connect(f); f.connect(g); n.start(now); n.stop(now+3.1);
    const o=AC.createOscillator(); o.type="sawtooth";
    o.frequency.setValueAtTime(70,now); o.frequency.exponentialRampToValueAtTime(420,now+2.6);
    const og=AC.createGain(); og.gain.setValueAtTime(0.05,now);
    og.gain.linearRampToValueAtTime(0.22,now+2.4); og.gain.exponentialRampToValueAtTime(0.001,now+3.0);
    o.connect(og); og.connect(g); o.start(now); o.stop(now+3.1);
    return 3.1;
  },
  sub(g,now){
    const o=AC.createOscillator(), o2=AC.createOscillator();
    o.type="sine"; o2.type="triangle";
    o.frequency.value=41; o2.frequency.value=61.5;
    const f=AC.createBiquadFilter(); f.type="lowpass"; f.frequency.value=180;
    const l=AC.createOscillator(), lg=AC.createGain();
    l.frequency.value=0.35; lg.gain.value=26; l.connect(lg); lg.connect(f.frequency);
    g.gain.setValueAtTime(0.001,now); g.gain.linearRampToValueAtTime(0.7,now+0.6);
    g.gain.setValueAtTime(0.7,now+3.0); g.gain.exponentialRampToValueAtTime(0.001,now+4.2);
    o.connect(f); o2.connect(f); f.connect(g);
    o.start(now); o2.start(now); l.start(now);
    o.stop(now+4.3); o2.stop(now+4.3); l.stop(now+4.3);
    return 4.3;
  },
  glitch(g,now){
    for(let i=0;i<16;i++){
      const at=now+i*0.11+Math.random()*0.03, len=0.02+Math.random()*0.05;
      const o=AC.createOscillator(); o.type=Math.random()>.5?"square":"sawtooth";
      o.frequency.value=180+Math.random()*2600;
      const og=AC.createGain();
      og.gain.setValueAtTime(0,at);
      og.gain.linearRampToValueAtTime(0.28+Math.random()*0.3,at+0.004);
      og.gain.exponentialRampToValueAtTime(0.001,at+len);
      o.connect(og); og.connect(g); o.start(at); o.stop(at+len+0.02);
    }
    g.gain.value=1;
    return 1.9;
  },
  chime(g,now){
    [880,1320,1760].forEach((fr,i)=>{
      const o=AC.createOscillator(); o.type="sine"; o.frequency.value=fr;
      const og=AC.createGain();
      og.gain.setValueAtTime(0,now+i*0.012);
      og.gain.linearRampToValueAtTime(0.3/(i+1),now+i*0.012+0.006);
      og.gain.exponentialRampToValueAtTime(0.001,now+0.55);
      o.connect(og); og.connect(g); o.start(now); o.stop(now+0.6);
    });
    g.gain.value=1;
    return 0.7;
  }
};

let playing=null;   /* {row, bars, t0, dur, stop()} */
function stopAudio(){
  if(!playing) return;
  try{ playing.stop(); }catch(e){}
  playing.row.classList.remove("is-play");
  playing.bars.forEach(b=>b.classList.remove("on"));
  playing=null;
}
function tickWave(){
  const p = (AC ? AC.currentTime : performance.now()/1000) - playing.t0;
  const k = p/playing.dur;
  if(k>=1){ stopAudio(); return; }
  const head = Math.floor(k*playing.bars.length);
  playing.bars.forEach((b,i)=>{
    b.classList.toggle("on", i<=head);
    b.style.transform = (i>head-3 && i<=head)
      ? "scaleY("+(1+Math.random()*0.5).toFixed(2)+")" : "";
  });
}

function wireAudio(i){
  const cfg=OBJ[i].cfg;
  const items=[]; (cfg.blocks||[]).forEach(b=>{ if(b.k==="audio") items.push(...b.items); });
  if(!items.length) return;

  pin.querySelectorAll(".trk").forEach((row,n)=>{
    const item=items[n]; if(!item) return;
    const bars=[...row.querySelectorAll(".wave i")];
    const play=()=>{
      const wasThis = playing && playing.row===row;
      stopAudio();
      if(wasThis) return;
      const C=ac();
      if(!C){ row.querySelector(".trk-x").textContent="No audio support"; return; }

      row.classList.add("is-play");
      if(item.src){
        const el=new Audio(item.src); el.play().catch(()=>{
          row.classList.remove("is-play");
          row.querySelector(".trk-x").textContent="File not found";
        });
        playing={row,bars,t0:C.currentTime,dur:12,stop:()=>{el.pause();el.src="";}};
        el.addEventListener("loadedmetadata",()=>{ if(playing&&playing.row===row) playing.dur=el.duration||12; });
        el.addEventListener("ended",stopAudio);
      }else{
        const g=C.createGain(); g.connect(master);
        const fn=PRESETS[item.synth] || PRESETS.impact;
        const dur=fn(g,C.currentTime);
        playing={row,bars,t0:C.currentTime,dur,stop:()=>{
          try{ g.gain.cancelScheduledValues(C.currentTime);
               g.gain.setTargetAtTime(0,C.currentTime,0.02); }catch(e){}
          setTimeout(()=>{ try{g.disconnect();}catch(e){} },300);
        }};
      }
    };
    row.querySelector(".trk-b").addEventListener("click",play);
    row.querySelector(".wave").addEventListener("click",play);
  });
}

/* ── ambience ── */
const btnAmb=$("#btnAmb");
if(btnAmb) btnAmb.addEventListener("click",()=>{
  if(ambOn){
    ambOn=false; btnAmb.setAttribute("aria-pressed","false");
    if(ambNodes){ const g=ambNodes.g, n=AC.currentTime;
      g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0,n,0.8);
      const stopAt=ambNodes; setTimeout(()=>{ stopAt.list.forEach(x=>{try{x.stop();}catch(e){}}); },2500);
      ambNodes=null; }
    return;
  }
  const C=ac(); if(!C) return;
  ambOn=true; btnAmb.setAttribute("aria-pressed","true");
  const g=C.createGain(); g.gain.value=0; g.connect(master);
  const list=[];
  [38.9,58.3,77.8].forEach((f,i)=>{
    const o=C.createOscillator(); o.type= i===2?"triangle":"sawtooth";
    o.frequency.value=f*(1+(i-1)*0.0015);
    const lp=C.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=210+i*60; lp.Q.value=2;
    const og=C.createGain(); og.gain.value=0.24/(i+1);
    o.connect(lp); lp.connect(og); og.connect(g); o.start(); list.push(o);
    const lfo=C.createOscillator(), lg=C.createGain();
    lfo.frequency.value=0.03+i*0.017; lg.gain.value=60;
    lfo.connect(lg); lg.connect(lp.frequency); lfo.start(); list.push(lfo);
  });
  const n=noise(), bp=C.createBiquadFilter(); bp.type="bandpass";
  bp.frequency.value=440; bp.Q.value=0.7;
  const ng=C.createGain(); ng.gain.value=0.035;
  n.connect(bp); bp.connect(ng); ng.connect(g); n.start(); list.push(n);
  const lfo2=C.createOscillator(), lg2=C.createGain();
  lfo2.frequency.value=0.021; lg2.gain.value=260;
  lfo2.connect(lg2); lg2.connect(bp.frequency); lfo2.start(); list.push(lfo2);
  g.gain.setTargetAtTime(0.16, C.currentTime, 2.4);
  ambNodes={g,list};
});

/* ── misc UI ── */
const hintEl=$("#hint");
let hintGone=false;
function hideHint(){ if(hintGone) return; hintGone=true; hintEl.classList.add("is-gone"); }
setTimeout(hideHint, 11000);

function markTape(){
  OBJ.forEach((o,i)=>o.blip.setAttribute("aria-current", i===active?"true":"false"));
}
markTape();

/* ── 13 · boot ────────────────────────────────────────────────────────── */
const boot=$("#boot"), bootBar=$("#bootBar"), bootMsg=$("#bootMsg");
const MSG=["Spinning up optics","Reading the catalogue","Resolving "+OBJ.length+" objects","Field acquired"];
let bi=0;
const bt=setInterval(()=>{
  bi++;
  bootBar.style.transform="scaleX("+Math.min(bi/4,1)+")";
  bootMsg.textContent=MSG[Math.min(bi,3)];
  if(bi>=4){
    clearInterval(bt);
    setTimeout(()=>{
      boot.classList.add("is-done");
      document.body.classList.add("is-live");
      tgtSpeed=1;
    },420);
  }
}, reduced?100:380);

lastT=performance.now();
raf=requestAnimationFrame(loop);
})();
