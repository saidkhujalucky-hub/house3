import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Water } from 'three/addons/objects/Water.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

const $=s=>document.querySelector(s),mobile=matchMedia('(max-width:700px)').matches;
const ASSETS={"wood_diff":"./assets/residence/wood_diff.webp","wood_normal":"./assets/residence/wood_normal.webp","wood_rough":"./assets/residence/wood_rough.webp","plaster_diff":"./assets/residence/plaster_diff.webp","plaster_normal":"./assets/residence/plaster_normal.webp","plaster_rough":"./assets/residence/plaster_rough.webp","stone_diff":"./assets/residence/stone_diff.webp","stone_normal":"./assets/residence/stone_normal.webp","stone_rough":"./assets/residence/stone_rough.webp","grass_diff":"./assets/residence/grass_diff.webp","grass_normal":"./assets/residence/grass_normal.webp","environment":"./assets/residence/environment.hdr"};
let randomSeed=1729;
function rand(){randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;}
function between(a,b){return a+(b-a)*rand();}
const clamp=THREE.MathUtils.clamp;
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#c1d1d6',.005);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false});}
catch(e){showFailure('Bu brauzerda 3D grafika ishga tushmadi. Chrome yoki Edge sozlamalarida grafik tezlashtirishni yoqing va qayta oching.');throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.6));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;
$('#scene').prepend(renderer.domElement);renderer.domElement.tabIndex=0;
renderer.domElement.setAttribute('aria-label','Uch o‘lchamli uy. WASD — yurish, sichqoncha — qarash, E — eshik, Esc — kursor.');
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.07,350);
camera.position.set(22,9.4,26.5);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(-.5,2.7,3.1);orbit.enableDamping=true;orbit.dampingFactor=.065;
orbit.minDistance=3;orbit.maxDistance=67;orbit.maxPolarAngle=Math.PI/2-.025;orbit.minPolarAngle=.12;orbit.update();
RectAreaLightUniformsLib.init();
const hemi=new THREE.HemisphereLight('#cfdeed','#73705d',.85);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff0d7',3.1);sun.position.set(-18,26,23);scene.add(sun);
sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);
Object.assign(sun.shadow.camera,{left:-32,right:32,top:29,bottom:-29,near:.5,far:105});
sun.shadow.bias=-.00018;sun.shadow.normalBias=.024;sun.shadow.radius=3;
sun.target.position.set(0,0,4);scene.add(sun.target);
const warmLights=[],emitters=[],colliders=[],doors=[],animatedLeaves=[],reflectionMaterials=[];
const building=new THREE.Group();building.name='Bektemir residence';scene.add(building);
const groundFloor=new THREE.Group(),upperFloor=new THREE.Group(),roof=new THREE.Group(),garden=new THREE.Group(),glazing=new THREE.Group();
for(const [g,n] of [[groundFloor,'Ground floor'],[upperFloor,'Upper floor'],[roof,'Roof'],[garden,'Garden and pool'],[glazing,'Exterior glazing']]){g.name=n;scene.add(g);}
const FLOOR=.60,UPPER=4.0,CEILING=3.77,ROOF=7.46;
const embedded = new URLSearchParams(location.search).has('embed');
let quality=(mobile || embedded)?'fast':'high',timeOfDay='day',mode='orbit',floor2=false,cut=false,transition=null,photo=false,exposureBase=.95;
let yaw=0,pitch=0,footY=FLOOR,stairActive=false,doorManualUntil=0;
let lightingDirty=true,elapsed=0,last=performance.now(),frame=0;

// All repeating colour, normal and roughness maps ship inside the page.
const textureLoader=new THREE.TextureLoader();
async function loadMap(key,color=false){
 if(!ASSETS[key])return null;
 const t=await textureLoader.loadAsync(ASSETS[key]);t.wrapS=t.wrapT=THREE.RepeatWrapping;
 t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=Math.min(12,renderer.capabilities.getMaxAnisotropy());return t;
}
const mapKeys=['wood_diff','wood_normal','wood_rough','stone_diff','stone_normal','stone_rough','plaster_diff','plaster_normal','plaster_rough','grass_diff','grass_normal'];
const textures={};let loadedCount=0;
await Promise.all(mapKeys.map(async key=>{try{textures[key]=await loadMap(key,key.endsWith('_diff'));}catch(e){textures[key]=null;}loadedCount++;$('#load-detail').textContent=`Materiallar tayyorlanmoqda · ${Math.round(loadedCount/mapKeys.length*100)}%`;}));
const materialCache=new Map();
function pbr(color,roughness=.7,metalness=0){const key=color+'|'+roughness+'|'+metalness;if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return materialCache.get(key);}
function maps(prefix,repeat=1,scale=.4){
 const out={};for(const [k,suffix] of [['map','diff'],['normalMap','normal'],['roughnessMap','rough']]){
  const t=textures[prefix+'_'+suffix];if(t){out[k]=t.clone();out[k].repeat.setScalar(repeat);out[k].needsUpdate=true;}
 }if(out.normalMap)out.normalScale=new THREE.Vector2(scale,scale);return out;
}
const M={
 plaster:new THREE.MeshStandardMaterial({color:'#efede4',roughness:.86,...maps('plaster',.48,.24)}),
 stone:new THREE.MeshStandardMaterial({color:'#e3dfd1',roughness:.8,...maps('stone',.48,.5)}),
 stoneDark:new THREE.MeshStandardMaterial({color:'#7e807e',roughness:.81,...maps('stone',.65,.55)}),
 wood:new THREE.MeshStandardMaterial({color:'#b19570',roughness:.57,...maps('wood',.43,.26)}),
 walnut:new THREE.MeshStandardMaterial({color:'#796149',roughness:.52,...maps('wood',.52,.35)}),
 floor:new THREE.MeshStandardMaterial({color:'#e7d3af',roughness:.53,...maps('wood',.34,.22)}),
 grass:new THREE.MeshStandardMaterial({color:'#9ca991',roughness:1,...maps('grass',.19,.8)}),
 charcoal:pbr('#272c30',.62,.18),black:pbr('#101519',.45,.28),rubber:pbr('#1c2021',.94),
 bronze:pbr('#9b815c',.3,.82),steel:pbr('#b3b8b9',.21,.94),white:pbr('#f1eee5',.32),
 grout:pbr('#aaa69b',.96),soil:pbr('#51483b',1),linen:pbr('#c5c1b3',.96),fabric:pbr('#dfd9cb',.93),accent:pbr('#727d70',.92),
 glass:new THREE.MeshPhysicalMaterial({color:'#bacbd0',metalness:.05,roughness:.075,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide,clearcoat:1,ior:1.5}),
 darkGlass:new THREE.MeshPhysicalMaterial({color:'#314449',metalness:.15,roughness:.085,transparent:true,opacity:.72,depthWrite:false,clearcoat:1,side:THREE.DoubleSide}),
 ceramic:pbr('#d6e3df',.26),leaf:new THREE.MeshStandardMaterial({color:'#819067',roughness:.88,side:THREE.DoubleSide,emissive:'#263519',emissiveIntensity:.12}),
 light:new THREE.MeshStandardMaterial({color:'#fff0d2',emissive:'#ffdba5',emissiveIntensity:2.0,roughness:.3}),
 poolTile:pbr('#699998',.35),waterDark:pbr('#236268',.35),car:new THREE.MeshPhysicalMaterial({color:'#303b40',metalness:.76,roughness:.24,clearcoat:1,clearcoatRoughness:.08})
};
reflectionMaterials.push(M.glass,M.darkGlass,M.car,M.steel);
function canvasTexture(w,h,draw,srgb=true){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;return t;}
const weave=canvasTexture(256,256,(c,w,h)=>{c.fillStyle='#999';c.fillRect(0,0,w,h);for(let i=0;i<256;i+=2){c.strokeStyle=i%4?'#a5a5a5':'#7f7f7f';c.lineWidth=.7;c.beginPath();c.moveTo(i,0);c.lineTo(i,256);c.moveTo(0,i);c.lineTo(256,i);c.stroke();}},false);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(16,16);
for(const m of [M.linen,M.fabric,M.accent]){m.bumpMap=weave;m.bumpScale=.009;}
const tileTex=canvasTexture(256,256,(c)=>{c.fillStyle='#729b9b';c.fillRect(0,0,256,256);for(let y=0;y<256;y+=32)for(let x=0;x<256;x+=32){const v=Math.floor(between(0,23));c.fillStyle=`rgb(${103+v},${147+v},${148+v})`;c.fillRect(x+1,y+1,30,30);}},true);tileTex.wrapS=tileTex.wrapT=THREE.RepeatWrapping;tileTex.repeat.set(1.9,1.9);M.poolTile.map=tileTex;M.poolTile.bumpMap=tileTex;M.poolTile.bumpScale=.006;
const barkTex=canvasTexture(256,512,(c)=>{c.fillStyle='#8b8170';c.fillRect(0,0,256,512);for(let i=0;i<900;i++){const x=rand()*256;c.strokeStyle=`rgba(39,36,30,${between(.08,.45)})`;c.lineWidth=between(.3,2);c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+between(-9,9),160,x+between(-7,7),340,x,512);c.stroke();}});barkTex.wrapS=barkTex.wrapT=THREE.RepeatWrapping;const bark=pbr('#998f7b',1);bark.map=barkTex;bark.bumpMap=barkTex;bark.bumpScale=.05;
// Measured UVs keep stone pores and wood grain at a consistent physical scale.
function measuredUV(geo,w,h,d){const a=geo.attributes.uv,n=geo.attributes.normal;for(let i=0;i<a.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));let u=w,v=h;if(nx>ny&&nx>nz)u=d;else if(ny>nx&&ny>nz){u=w;v=d;}a.setXY(i,a.getX(i)*u,a.getY(i)*v);}return geo;}
function shape(name,geo,m,x,y,z,parent=garden,cast=true){const mesh=new THREE.Mesh(geo,m);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=cast;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function box(name,x,y,z,w,h,d,m,parent=garden,cast=true){let geo=new THREE.BoxGeometry(w,h,d);if(!m.map||m.map.wrapS===THREE.RepeatWrapping)geo=measuredUV(geo,w,h,d);return shape(name,geo,m,x,y,z,parent,cast);}
function round(name,x,y,z,w,h,d,r,m,parent=garden){let geo=new RoundedBoxGeometry(w,h,d,3,Math.min(r,Math.min(w,h,d)*.48));if(!m.map||m.map.wrapS===THREE.RepeatWrapping)geo=measuredUV(geo,w,h,d);return shape(name,geo,m,x,y,z,parent);}
function cyl(name,x,y,z,r1,r2,h,m,parent=garden,segments=20){return shape(name,new THREE.CylinderGeometry(r1,r2,h,segments),m,x,y,z,parent);}
function ball(name,x,y,z,r,m,parent=garden){return shape(name,new THREE.SphereGeometry(r,16,12),m,x,y,z,parent);}
function group(name,parent=garden){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
function line(name,points,r,m,parent=garden){return shape(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(8,points.length*5),r,6,false),m,0,0,0,parent);}
function rod(name,a,b,r,m,parent=garden){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);const mesh=cyl(name,...av.clone().add(bv).multiplyScalar(.5).toArray(),r,r,delta.length(),m,parent,10);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;}
function block(x,z,w,d,level=0,label='Furniture'){colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,level,label});}
function wall(name,x,z,w,d,level=0,m=M.plaster,height=3.12){box(name,x,(level?UPPER:FLOOR)+height/2,z,w,height,d,m,level?upperFloor:groundFloor);block(x,z,w,d,level,name);}
function glow(name,x,y,z,w,h,d,parent=groundFloor){return box(name,x,y,z,w,h,d,M.light,parent,false);}
function areaLight(x,y,z,w,h,power,rotation=[-Math.PI/2,0,0]){const l=new THREE.RectAreaLight('#ffdfb3',power,w,h);l.position.set(x,y,z);l.rotation.set(...rotation);scene.add(l);warmLights.push({light:l,power});return l;}
function contact(x,z,w,d,y,parent=groundFloor,opacity=.22){if(parent===groundFloor||parent===upperFloor)y=Math.max(y,(parent===upperFloor?UPPER:FLOOR)+.066);const t=canvasTexture(64,64,(c)=>{const g=c.createRadialGradient(32,32,1,32,32,31);g.addColorStop(0,`rgba(0,0,0,${opacity})`);g.addColorStop(.5,`rgba(0,0,0,${opacity*.65})`);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,64,64);});const m=new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});const p=shape('Soft contact shadow',new THREE.PlaneGeometry(w,d),m,x,y,z,parent,false);p.rotation.x=-Math.PI/2;return p;}

// Outdoor reflections use a real photographed light probe. The visible sky is analytic.
let outdoorBackground=null;
if(ASSETS.environment){try{const env=await new RGBELoader().loadAsync(ASSETS.environment);env.mapping=THREE.EquirectangularReflectionMapping;const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(env).texture;outdoorBackground=env;pmrem.dispose();}catch(e){scene.environment=null;}}
const skyUniforms={top:{value:new THREE.Color('#6c96b3')},horizon:{value:new THREE.Color('#e6e7df')},bottom:{value:new THREE.Color('#aaa994')},sunDir:{value:sun.position.clone().normalize()},warm:{value:0}};
const sky=shape('Atmosphere',new THREE.SphereGeometry(160,32,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:skyUniforms,vertexShader:'varying vec3 vRay; void main(){vRay=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec3 vRay;uniform vec3 top,horizon,bottom,sunDir;uniform float warm;
void main(){vec3 r=normalize(vRay);float h=clamp(r.y,0.,1.);vec3 c=mix(horizon,top,pow(h,.55));c=mix(c,bottom,(1.-smoothstep(-.15,0.,r.y)));float s=max(dot(r,sunDir),0.);c+=vec3(1.,.82,.59)*pow(s,130.)*(.32+warm*.4);c+=vec3(.9,.48,.18)*pow(s,9.)*.08*warm;gl_FragColor=vec4(c,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')}),0,0,0,scene,false);
sky.material.fog=false;sky.frustumCulled=false;

// Excavated terrain: the pool is recessed below the garden, never laid over grass.
const terrain=new THREE.Shape();terrain.moveTo(-85,-65);terrain.lineTo(85,-65);terrain.lineTo(85,85);terrain.lineTo(-85,85);terrain.closePath();
const hole=new THREE.Path();hole.moveTo(.3,13.1);hole.lineTo(.3,20.5);hole.lineTo(14.4,20.5);hole.lineTo(14.4,13.1);hole.closePath();terrain.holes.push(hole);
const tg=new THREE.ShapeGeometry(terrain);tg.rotateX(Math.PI/2); // flip the shape's XY into the ground XZ plane, then face it upward.
tg.rotateX(Math.PI); // resulting Z is the negative of the original shape; corrected below.
// Build an explicitly upward plane with its pool hole in world X/Z coordinates.
const pos=tg.attributes.position;for(let i=0;i<pos.count;i++)pos.setZ(i,-pos.getZ(i));tg.computeVertexNormals();for(let i=0;i<tg.attributes.uv.count;i++)tg.attributes.uv.setXY(i,pos.getX(i),pos.getZ(i));
const terrainMesh=shape('Natural lawn with excavated pool',tg,M.grass,0,-.04,0,garden,false);terrainMesh.material.side=THREE.DoubleSide;
box('Foundation ashlar',0,.24,-.1,19.3,.46,13.4,M.stoneDark,building);
box('Ground floor slab',0,.48,0,18.7,.22,12.6,M.stone,groundFloor);
function paving(x0,x1,z0,z1,size=1.18){
 const cols=Math.floor((x1-x0)/size),rows=Math.floor((z1-z0)/size),geo=measuredUV(new THREE.BoxGeometry(size-.009,.085,size-.009),size,.085,size),mesh=new THREE.InstancedMesh(geo,M.stone,cols*rows),o=new THREE.Object3D(),c=new THREE.Color();let i=0;
 for(let x=0;x<cols;x++)for(let z=0;z<rows;z++){const px=x0+(x+.5)*size,pz=z0+(z+.5)*size;if(px>.1&&px<14.6&&pz>12.9&&pz<20.8)continue;o.position.set(px,.018,pz);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);c.setRGB(between(.88,1),between(.88,.98),between(.84,.95));mesh.setColorAt(i++,c);}
 mesh.count=i;mesh.name='Individually laid limestone paving';mesh.receiveShadow=true;garden.add(mesh);
}
paving(-10,21,6.4,26.6);paving(-18.5,-10.2,6.3,30.5,.58);
box('Driveway base',-14.7,.005,5.6,8.4,.12,25,M.stoneDark,garden,false);
for(let x=-18.6;x<-10.5;x+=.34)for(let z=5.8;z<28;z+=1.4)box('Driveway joint',x,.072,z,.012,.004,1.32,M.grout,garden,false);
for(let i=0;i<3;i++){const z=6.55+(2-i)*.52;box('Entrance limestone stair',-1.7,.10+(i*.09),z,3.2,.2+i*.18,.65,M.stone);glow('Entry stair recessed light',-1.7,.07+i*.18,z+.332,2.7,.015,.014,garden);}
for(let z=8.9;z<28;z+=1.15)box('Floating entry path slab',-4.5,.15,z,2.35,.18,.92,M.stone);
for(let x of [-22,22])box('Boundary rendered wall',x,.75,6,.24,1.5,50,M.plaster);
box('Garden rear boundary wall',0,.75,-18.7,44,1.5,.25,M.plaster);
box('Street asphalt',0,-.015,36,110,.13,7,pbr('#5a5b59',.98));
box('Street curb',0,.12,32.1,48,.28,.25,M.stone);box('Sidewalk',0,.015,31.1,48,.12,1.8,M.stone);
for(let x=-20;x<22;x+=2.2){box('Garden perimeter fence pier',x,.85,29.8,.16,1.7,.17,M.charcoal);for(let y of [.35,.7,1.05,1.4])box('Garden fence horizontal',x+1.05,y,29.8,2.0,.04,.06,M.charcoal);}

// House shell, true window openings and open circulation between the rooms.
for(let level=0;level<=1;level++){
 const y=level?UPPER:FLOOR,g=level?upperFloor:groundFloor;
 wall('Rear wall below window',0,-6.17,18.5,.27,level,M.plaster,1.16);
 box('Rear wall above windows',0,y+2.88,-6.17,18.5,.47,.27,M.plaster,g);block(-8.4,-6.17,1.65,.27,level,'Rear corner');block(8.3,-6.17,1.7,.27,level,'Rear corner');
 for(let x of [-8.8,-2.7,.2,8.8])box('Rear window pier',x,y+1.97,-6.17,.32,1.62,.27,M.plaster,g);
 for(const [a,b] of [[-8.6,-2.9],[-2.5,0],[.4,8.6]])windowPanel(a,b,-6.17,y+1.18,y+2.65,g,'back');
 for(let x of [-9.13,9.13]){
  wall('Side wall plinth',x,0,.27,12.6,level,M.plaster,1.03);
  box('Side window lintel',x,y+2.96,0,.27,.32,12.6,M.plaster,g);
  for(let z of [-5.97,-.2,5.96])box('Side wall pier',x,y+1.99,z,.27,1.8,.46,M.plaster,g);
  block(x,0,.27,12.6,level,'Exterior side wall');
  for(const [z1,z2] of [[-5.73,-.46],[.06,5.73]]){const win=windowPanel(z1,z2,0,y+1.04,y+2.79,g,'side');win.position.set(x,0,0);win.rotation.y=Math.PI/2;}
 }
 if(level===0){
  windowPanel(-8.95,-2.78,6.12,y+.04,y+3.12,g);
  windowPanel(-.62,8.95,6.12,y+.04,y+3.12,g);
  block(-5.85,6.12,6.3,.16,0,'Front glazing');block(4.2,6.12,9.6,.16,0,'Front glazing');
 }else{
  windowPanel(-8.95,.65,6.12,y+.04,y+3.12,g);windowPanel(2.35,8.95,6.12,y+.04,y+3.12,g);
  block(-4.2,6.12,9.7,.16,1,'Front glazing');block(5.8,6.12,6.7,.16,1,'Front glazing');
 }
 for(let x of [-9.0,-2.7,.7,9.0])box('Thin structural front column',x,y+1.56,6.12,.16,3.25,.24,M.charcoal,g);
}
function windowPanel(a,b,z,y1,y2,parent,kind='front'){
 const g=group('Thermally broken double glazing',parent),width=b-a;g.userData.glazing=true;
 for(let x of [a,b])box('Powder-coated aluminium mullion',x,(y1+y2)/2,z,.055,y2-y1,.115,M.charcoal,g);
 for(let y of [y1,y2]){box('Aluminium frame', (a+b)/2,y,z,width,.055,.12,M.charcoal,g);box('Glazing gasket',(a+b)/2,y+(y===y1?.035:-.035),z+.061,width-.06,.014,.009,M.rubber,g,false);}
 const sections=Math.max(1,Math.ceil(width/2.1));
 for(let i=0;i<sections;i++){const w=width/sections,cx=a+(i+.5)*w;box('Clear double glazing',cx,(y1+y2)/2,z,w-.055,y2-y1-.07,.012,M.glass,g,false);if(i)box('Vertical window mullion',a+i*w,(y1+y2)/2,z,.048,y2-y1,.10,M.charcoal,g);}
 if(kind!=='side')box('Stone sill',(a+b)/2,y1-.045,z,width+.10,.07,.28,M.stone,parent,false);
 return g;
}
// A 1.65 m wide hinged entrance. The glass facade has a matching physical opening.
const entrance=group('Opening entrance door',groundFloor);entrance.position.set(-2.72,FLOOR,6.13);entrance.userData.dynamic=true;
box('Timber entry door',.99,1.47,0,1.92,2.94,.11,M.walnut,entrance);
for(let x=.12;x<1.92;x+=.105)box('Entry door timber bead',x,1.47,.063,.019,2.88,.016,M.wood,entrance,false);
for(let x of [.11,1.87])box('Door edge bronze detail',x,1.47,.065,.015,2.86,.015,M.bronze,entrance,false);
for(let side of [-1,1]){rod('Door pull', [1.68,.98,.115*side],[1.68,1.72,.115*side],.026,M.bronze,entrance);cyl('Door lock',1.67,.82,.087*side,.025,.025,.025,M.steel,entrance).rotation.x=Math.PI/2;}
doors.push({group:entrance,angle:0,target:0,type:'entry',x:-1.72,z:6.13});
box('Recessed entry portal',-3.0,2.1,6.20,.27,3.45,.46,M.stone,groundFloor);
box('Recessed entry lintel',-1.7,3.82,6.20,2.8,.18,.46,M.stone,groundFloor);
glow('Door canopy concealed light',-1.7,3.70,6.34,2.25,.026,.04,groundFloor);
round('Smart video intercom',-.36,2.02,6.28,.15,.27,.045,.02,M.black,groundFloor);
ball('Intercom camera',-.36,2.09,6.312,.025,M.darkGlass,groundFloor);
const plaqueTexture=canvasTexture(384,256,c=>{c.fillStyle='#303635';c.fillRect(0,0,384,256);c.fillStyle='#ded9c8';c.font='300 120px sans-serif';c.textAlign='center';c.fillText('04',192,155);c.font='20px sans-serif';c.fillText('B E K T E M I R',192,211);});
box('House number plaque',-3.45,1.93,6.29,.55,.38,.035,new THREE.MeshStandardMaterial({map:plaqueTexture,roughness:.56}),groundFloor);
// Left front bedroom and rear dining have a 1.1 m doorway from the hall.
for(let lev=0;lev<=1;lev++){
 wall('West corridor partition',-2.62,-4.45,.16,3.1,lev,M.plaster);
 wall('West corridor partition',-2.62,2.85,.16,5.7,lev,M.plaster);
 wall('West corridor door jamb',-2.62,-.95,.16,1.50,lev,M.plaster);
 box('West door opening lintel',-2.62,(lev?UPPER:FLOOR)+2.77,-2.30,.16,.68,1.20,M.plaster,lev?upperFloor:groundFloor);
 wall('West rooms dividing wall',-5.75,-.18,6.1,.16,lev,M.plaster);
 // Doorway at the front of each west bedroom, adjoining the entrance / upper landing.
 wall('West corridor front stub',-2.62,5.89,.16,.35,lev,M.plaster);
}
// Ground bedroom entrance is at z .3..1.4. Split the solid corridor panel to leave it open.
function removeWallByNameAndPosition(g,x,z){for(const m of [...g.children])if(m.name==='West corridor partition'&&Math.abs(m.position.x-x)<.01&&Math.abs(m.position.z-z)<.01){g.remove(m);m.geometry.dispose();}for(let i=colliders.length-1;i>=0;i--){const c=colliders[i];if(c.label==='West corridor partition'&&Math.abs((c.minX+c.maxX)/2-x)<.01&&Math.abs((c.minZ+c.maxZ)/2-z)<.01&&c.level===(g===upperFloor?1:0))colliders.splice(i,1);}}
for(const [g,l] of [[groundFloor,0],[upperFloor,1]]){removeWallByNameAndPosition(g,-2.62,2.85);wall('Bedroom hall wall',-2.62,3.72,.16,4.12,l);wall('Bedroom hall wall',-2.62,.18,.16,.36,l);box('Bedroom doorway lintel',-2.62,(l?UPPER:FLOOR)+2.77,1.01,.16,.68,1.30,M.plaster,g);}
wall('Living media wall',4.8,-.10,7.2,.18,0,M.charcoal,2.9);
wall('Master rear divider',4.8,-.18,7.2,.16,1,M.plaster);
wall('Master corridor wall',.58,3.9,.16,4.3,1,M.plaster);
wall('Master corridor rear',.58,-3.45,.16,5.3,1,M.plaster);
box('Master doorway lintel',.58,UPPER+2.78,.94,.16,.68,1.30,M.plaster,upperFloor);
// Upper floor slabs surround the actual staircase void.
for(const [x,z,w,d] of [[-5.78,0,6.55,12.6],[4.47,0,9.65,12.6],[-1.45,3.69,2.1,5.22],[-1.45,-5.85,2.1,.95]])box('Upper concrete deck',x,3.86,z,w,.28,d,M.stone,upperFloor);
function woodFloor(x,z,w,d,y,parent){
 box('Hardwood floor',x,y,z,w,.055,d,M.floor,parent,false);
 // Boards cover the entire slab (no bare strips) and the end joints are staggered like a real laid floor.
 const L=1.6,geo=measuredUV(new THREE.BoxGeometry(L,.016,.19),L,.016,.19),rows=Math.ceil(d/.2),pw=d/rows;
 const mesh=new THREE.InstancedMesh(geo,M.floor,rows*(Math.ceil(w/L)+2)),o=new THREE.Object3D(),c=new THREE.Color();let i=0;
 for(let k=Math.floor(w/L)*Math.floor(d/.2);k>0;k--)rand(); // keeps the seeded scatter used by the garden unchanged
 for(let r=0;r<rows;r++){
  const sn=Math.sin((r+1)*12.9898+x*78.233+z*37.719)*43758.5453,off=sn-Math.floor(sn);
  let cx=0,len=.45+off*(L-.45);
  while(cx<w-.001){
   const rem=w-cx;len=Math.min(len,rem);if(rem-len<.3)len=rem;
   o.position.set(x-w/2+cx+len/2,y+.035,z-d/2+(r+.5)*pw);o.scale.set(len/L,1,(pw-.01)/.19);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);
   const v=.9+(Math.sin(i*4.37+r)*.5+.5)*.1;c.setRGB(v,v*.99,v*.96);mesh.setColorAt(i++,c);
   cx+=len;len=L;
  }
 }
 mesh.count=i;mesh.name='Oak floor boards with micro bevels';mesh.receiveShadow=true;parent.add(mesh);
}
woodFloor(0,0,17.85,12,FLOOR-.02,groundFloor);
for(const [x,z,w,d] of [[-5.78,0,6.3,12],[4.42,0,9.38,12],[-1.45,3.67,2.1,5.18],[-1.45,-5.85,2.1,.95]])woodFloor(x,z,w,d,UPPER-.02,upperFloor);
// Floating oak stair: 18 treads connect both floors, with continuous steel handrails.
for(let i=0;i<18;i++){const z=.90-(i+.5)*.357,y=FLOOR+(i+1)*(UPPER-FLOOR)/18;round('Oak stair tread',-1.43,y-.055,z,1.70,.11,.37,.014,M.wood,groundFloor);glow('Stair under-tread light',-1.43,y-.08,z+.17,1.45,.013,.015,groundFloor);}
for(let x of [-2.37,-.49]){
 rod('Stair stringer',[x,FLOOR+.02,.90],[x,UPPER-.08,-5.52],.03,M.charcoal,groundFloor);
 rod('Stair continuous handrail',[x,FLOOR+1.02,.90],[x,UPPER+1.02,-5.52],.027,M.bronze,groundFloor);
 for(let i=0;i<18;i++){const z=.9-i*.357,y=FLOOR+i*(UPPER-FLOOR)/18;rod('Stair baluster',[x,y,z],[x,y+.98,z],.012,M.charcoal,groundFloor);}
 block(x,-2.23,.08,6.65,0,'Stair guard');block(x,-2.23,.08,6.65,1,'Stair guard');
}
// The upper-floor stair opening gets a glass guard on its open south edge (the sides already have handrails).
box('Stair void glass guard',-1.43,UPPER+.56,1.075,2.10,1.0,.02,M.glass,upperFloor,false);
rod('Stair void guard rail',[-2.49,UPPER+1.07,1.075],[-.37,UPPER+1.07,1.075],.022,M.steel,upperFloor);
for(let x of [-2.49,-.37])box('Stair void guard post',x,UPPER+.55,1.075,.05,1.1,.05,M.steel,upperFloor);
// White cantilevers, cedar soffits, balcony and rainwater details.
box('Cantilever dark roof',0,7.46,-.03,21.3,.27,15.3,M.charcoal,roof);
box('Knife-edge pale roof fascia',0,7.30,-.03,21.15,.10,15.15,M.plaster,roof);
for(let z=-7.42;z<7.45;z+=.22)box('Cedar soffit board',0,7.235,z,20.7,.035,.205,M.walnut,roof,false);
for(let x of [-8.6,-4.5,0,4.5,8.6]){cyl('Soffit recessed downlight',x,7.204,7.1,.055,.055,.018,M.black,roof);glow('Soffit light diffuser',x,7.191,7.1,.07,.014,.07,roof);}
box('Balcony slab',5.03,3.89,7.21,9.6,.25,2.6,M.plaster,upperFloor);
box('Balcony decking',5.03,4.04,7.23,9.38,.04,2.35,M.wood,upperFloor,false);
for(let x=.5;x<9.8;x+=1.18){box('Balcony laminated glass',x+.54,4.56,8.52,1.07,1.02,.018,M.glass,upperFloor,false);for(let xx of [x+.10,x+.94])box('Glass rail stainless shoe',xx,4.08,8.52,.085,.1,.13,M.steel,upperFloor);}
rod('Balcony top rail',[.35,5.10,8.52],[9.8,5.10,8.52],.025,M.steel,upperFloor);
for(let x of [.24,9.84]){box('Balcony side glass',x,4.56,7.3,.02,1.02,2.36,M.glass,upperFloor,false);rod('Balcony return rail',[x,5.1,6.14],[x,5.1,8.52],.025,M.steel,upperFloor);}
block(5.0,8.53,9.9,.1,1,'Balcony rail');block(.23,7.32,.1,2.6,1,'Balcony rail');block(9.85,7.32,.1,2.6,1,'Balcony rail');
// Individual honed stone courses frame the quieter west bedroom.
for(let row=0;row<7;row++)for(let col=0;col<3;col++){const x=-8.40+col*1.02,y=FLOOR+.23+row*.44;box('Honed limestone facade course',x,y,6.31,1.005,.426,.12,M.stone,groundFloor);}
// Balcony door folds clear of a real 1.7 m opening.
const terraceDoor=windowPanel(.72,2.27,6.11,UPPER+.02,UPPER+3.12,upperFloor);terraceDoor.userData.dynamic=true;terraceDoor.position.x=1.68;terraceDoor.visible=true;
for(let x=-9.45;x<-6.3;x+=.21){box('Cedar privacy fin',x,5.54,6.48,.065,3.18,.35,M.walnut,upperFloor);for(let y of [4.25,6.85])cyl('Louver fixing cap',x,y,6.665,.016,.016,.009,M.bronze,upperFloor,8).rotation.x=Math.PI/2;}
for(let z=-5.9;z<5.8;z+=.54)box('Exterior east reveal',9.30,5.5,z,.08,2.8,.025,M.stone,upperFloor,false);
for(let x of [-9.5,9.5]){rod('Rainwater downpipe',[x,.28,-6.55],[x,7.45,-6.55],.055,M.charcoal,building);for(let y of [1,3.2,5.5])box('Downpipe mounting collar',x,y,-6.55,.14,.04,.14,M.charcoal,building,false);}
for(let z of [6.4,8.7,11.1])for(let i=0;i<26;i++)box('Linear patio drainage grate',-8.3+i*.19,.077,z,.11,.018,.22,M.charcoal,garden,false);
// Carport roof and slatted timber soffit; the driveway reaches the public gate.
box('Carport roof',-14.5,3.53,-.05,8.25,.20,12.7,M.charcoal);
for(let x of [-18.1,-10.9])for(let z of [-5.5,5.45]){box('Carport steel column',x,1.72,z,.13,3.45,.16,M.charcoal);box('Carport column footing',x,.13,z,.23,.18,.25,M.steel);}
for(let z=-6;z<6;z+=.23)box('Carport timber soffit',-14.5,3.40,z,7.85,.04,.20,M.wood);
for(let x of [-17.4,-14.5,-11.6])glow('Carport linear downlight',x,3.365,.2,.028,.02,4.4,garden);
areaLight(-14.5,3.32,.2,5,5,2.4);

// Upholstery has rounded, gently deformed volumes and independent piping.
function pillow(name,x,y,z,w,h,d,material,parent,rotation=0){
 const mesh=round(name,x,y,z,w,h,d,.11,material,parent);mesh.rotation.y=rotation;
 const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),pz=p.getZ(i);p.setY(i,py+Math.sin(px*9+pz*7)*.008*(1-Math.abs(py)/(h*.7)));}mesh.geometry.computeVertexNormals();
 return mesh;
}
function rug(x,z,w,d,y,parent,m=M.linen){round('Handwoven wool rug',x,y,z,w,.026,d,.01,m,parent);const fringe=group('Rug hand-knotted fringe',parent);for(let i=0;i<Math.floor(w/.065);i++)for(let end of [-1,1])line('Wool fringe',[[x-w/2+i*.065,y+.016,z+end*d/2],[x-w/2+i*.065+.01,y+.017,z+end*(d/2+.09)]],.004,M.fabric,fringe);}
function sofa(x,z,w,rot,y,parent,m=M.fabric){
 const g=group('Tailored linen sofa',parent);g.position.set(x,y,z);g.rotation.y=rot;
 for(let sx of [-w/2+.16,w/2-.16])for(let zz of [-.36,.36])cyl('Sofa slim oak foot',sx,.12,zz,.037,.03,.24,M.walnut,g,12);
 round('Upholstered sofa base',0,.33,0,w,.32,1.02,.09,m,g);
 round('Padded sofa back',0,.78,.47,w,.95,.23,.095,m,g);
 for(let sx of [-w/2+.08,w/2-.08])round('Rounded sofa arm',sx,.61,0,.19,.63,1.10,.07,m,g);
 const count=Math.round(w/.95);for(let i=0;i<count;i++){const xx=-w/2+.23+(i+.5)*(w-.46)/count,cw=(w-.46)/count-.025;
  pillow('Deep seat cushion',xx,.56,-.04,cw,.20,.86,m,g);
  const back=pillow('Plump back cushion',xx,.94,.31,cw,.65,.18,m,g);back.rotation.x=.08;
  line('Seat stitched piping',[[xx-cw*.44,.64,-.43],[xx+cw*.44,.64,-.43],[xx+cw*.46,.64,.33]],.005,M.linen,g);
 }
 const p1=pillow('Soft decorative cushion',-w/2+.5,.88,.05,.46,.48,.16,M.accent,g,.20);p1.rotation.z=.17;
 const p2=pillow('Soft decorative cushion',w/2-.55,.86,.02,.45,.43,.16,M.linen,g,-.14);p2.rotation.z=-.15;
 contact(x,z,w+1,2,y+.003,parent,.18);
 if(parent===groundFloor||parent===upperFloor){
  const footprintWidth=Math.abs(Math.cos(rot))*w+Math.abs(Math.sin(rot))*1.10;
  const footprintDepth=Math.abs(Math.sin(rot))*w+Math.abs(Math.cos(rot))*1.10;
  block(x,z,footprintWidth,footprintDepth,parent===upperFloor?1:0,'Sofa');
 }
 return g;
}
function table(x,z,w,d,y,parent,m=M.stone){
 const g=group('Crafted stone table',parent);g.position.set(x,y,z);
 round('Honed stone tabletop',0,.42,0,w,.07,d,.035,m,g);
 for(let sx of [-w*.30,w*.30])round('Sculptural table support',sx,.22,0,.18,.39,d*.55,.045,M.walnut,g);
 return g;
}
function vase(x,y,z,s,parent,m=M.white){
 const points=[[.1,0],[.19,.06],[.22,.20],[.20,.36],[.11,.44],[.1,.55]].map(([r,h])=>new THREE.Vector2(r*s,h*s));return shape('Hand thrown ceramic vase',new THREE.LatheGeometry(points,24),m,x,y,z,parent);
}
function book(x,y,z,w,d,color,parent,rot=0){const g=group('Hardback book',parent);g.position.set(x,y,z);g.rotation.y=rot;box('Paper block',0,.025,0,w-.025,.04,d-.025,M.fabric,g,false);for(let yy of [0,.049])box('Cloth book cover',0,yy,0,w,.009,d,pbr(color,.9),g,false);box('Book spine',-w/2,.025,0,.009,.05,d,pbr(color,.9),g,false);return g;}
function mug(x,y,z,parent,m=M.white){const g=group('Porcelain cup',parent);g.position.set(x,y,z);const pts=[[.065,0],[.078,.015],[.084,.14],[.075,.146],[.070,.018]].map(([r,h])=>new THREE.Vector2(r,h));shape('Thin ceramic cup',new THREE.LatheGeometry(pts,24),m,0,0,0,g);const h=shape('Cup handle',new THREE.TorusGeometry(.045,.012,8,18,Math.PI*1.55),m,.086,.083,0,g);h.rotation.z=-Math.PI*.77;cyl('Coffee surface',0,.135,0,.068,.068,.002,pbr('#37291d',.2),g,24);return g;}
function plate(x,y,z,r,parent){const pts=[[0,0],[r*.65,0],[r*.85,.015],[r,.038],[r,.051],[r*.85,.029],[r*.6,.017],[0,.017]].map(([r,h])=>new THREE.Vector2(r,h));return shape('Glazed ceramic plate',new THREE.LatheGeometry(pts,32),M.white,x,y,z,parent);}
function glass(x,y,z,parent){const g=group('Thin drinking glass',parent);g.position.set(x,y,z);const pts=[[.068,0],[.072,.01],[.076,.18],[.07,.18],[.065,.016]].map(p=>new THREE.Vector2(...p));shape('Glass tumbler',new THREE.LatheGeometry(pts,20),M.glass,0,0,0,g,false);return g;}
function art(x,y,z,w,h,parent,variant=0){
 const g=group('Framed original abstract artwork',parent);g.position.set(x,y,z);round('Shadow gap art frame',0,0,0,w,h,.055,.009,M.walnut,g);
 const tex=canvasTexture(384,512,(c,W,H)=>{c.fillStyle=variant?'#ded9c8':'#d1ccbe';c.fillRect(0,0,W,H);c.fillStyle=variant?'#767f72':'#8f765f';c.beginPath();c.ellipse(W*.48,H*.57,W*.33,H*.32,-.2,0,Math.PI*2);c.fill();c.fillStyle='#c0ac8d';c.fillRect(W*.52,H*.14,W*.17,H*.64);c.strokeStyle='#383e38';c.lineWidth=5;c.beginPath();c.moveTo(W*.15,H*.83);c.bezierCurveTo(W*.9,H*.75,W*.07,H*.1,W*.78,H*.25);c.stroke();for(let i=0;i<3500;i++){c.fillStyle=`rgba(37,37,27,${rand()*.035})`;c.fillRect(rand()*W,rand()*H,1,1);}});
 box('Canvas print',0,0,.033,w-.08,h-.08,.008,new THREE.MeshStandardMaterial({map:tex,roughness:.95}),g,false);return g;
}
function curtain(x,z,w,y,height,parent){
 const g=group('Floor length linen curtain',parent),geo=new THREE.PlaneGeometry(w,height,Math.ceil(w/.035),18),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),fold=Math.sin((px+w/2)*Math.PI/.09)*.055;p.setZ(i,fold+.018*Math.sin(py*2+px*5));p.setY(i,py+.017*Math.cos(px*30)*(1-py/height));}geo.computeVertexNormals();
 const m=M.fabric.clone();m.side=THREE.DoubleSide;shape('Drapery folds',geo,m,x,y,z,g,false);rod('Curtain bronze track',[x-w/2-.07,y+height/2+.07,z],[x+w/2+.07,y+height/2+.07,z],.016,M.bronze,g);return g;
}
function ceilingDetails(y,parent){
 for(let z of [-4.7,-.5,4.7])for(let x of [-7.5,-4.1,2.3,6.9]){cyl('Recessed light trim',x,y,z,.058,.058,.025,M.charcoal,parent,20);cyl('Warm recessed diffuser',x,y-.014,z,.038,.038,.012,M.light,parent,20);}
 for(let z of [5.68,-5.72])glow('Warm concealed perimeter cove',0,y-.02,z,17.2,.02,.035,parent);
 for(let x of [-8.83,8.83])glow('Ceiling perimeter light',x,y-.02,0,.025,.02,11.5,parent);
 for(let x of [-6,4.5])areaLight(x,y-.13,0,5.3,7.5,2.4);
}
ceilingDetails(3.715,groundFloor);ceilingDetails(7.17,upperFloor);
// Baseboards, carefully mitred wall skirtings, slim ventilation and sockets.
for(let lev=0;lev<=1;lev++){const g=lev?upperFloor:groundFloor,y=(lev?UPPER:FLOOR)+.055;
 for(let x of [-8.96,8.96])box('Painted shadow-gap skirting',x,y,0,.024,.10,11.9,M.plaster,g,false);
 box('Rear shadow-gap skirting',0,y,-6.0,17.9,.10,.024,M.plaster,g,false);
 for(let x of [-6.4,4.4]){box('Linear ceiling air supply',x,(lev?UPPER:FLOOR)+2.98,-5.90,2.4,.085,.02,M.charcoal,g,false);for(let yy of [-.021,.012])box('Ventilation grille',x,(lev?UPPER:FLOOR)+2.98+yy,-5.88,2.38,.012,.01,M.plaster,g,false);}
 for(let x of [-7,2,6.8]){round('Electrical socket plate',x,y+.24,-5.985,.11,.11,.018,.009,M.white,g);for(let dx of [-.022,.022])cyl('Socket contact',x+dx,y+.24,-5.971,.008,.008,.004,M.charcoal,g,8).rotation.x=Math.PI/2;}
}

// Living room: clear pathways, deep sofa, layered rug, a low stone table and media wall.
rug(4.55,2.9,6.6,4.75,FLOOR+.035,groundFloor);
sofa(4.28,4.15,3.5,0,FLOOR,groundFloor);
sofa(7.36,2.78,2.5,Math.PI/2,FLOOR,groundFloor,M.linen);
block(4.28,4.15,3.6,1.12,0,'Living sofa');block(7.36,2.78,1.12,2.6,0,'Living chaise');
table(4.25,2.23,1.65,.83,FLOOR,groundFloor);block(4.25,2.23,1.65,.83,0,'Coffee table');
book(4.0,FLOOR+.48,2.25,.43,.31,'#6a786a',groundFloor,.12);book(4.03,FLOOR+.54,2.23,.40,.29,'#bfad91',groundFloor,-.07);
round('Travertine serving tray',4.71,FLOOR+.48,2.25,.45,.022,.38,.018,M.stone,groundFloor);mug(4.71,FLOOR+.50,2.25,groundFloor);
for(let x=1.4;x<8.3;x+=.14)box('Walnut media wall slat',x,FLOOR+1.5,.015,.075,2.75,.05,M.walnut,groundFloor);
round('Floating media console',4.8,FLOOR+.28,.27,5.7,.36,.45,.045,M.walnut,groundFloor);
round('UHD television slim frame',4.7,FLOOR+1.61,.096,2.58,1.46,.05,.025,M.black,groundFloor);
const tvMap=canvasTexture(960,540,(c,w,h)=>{const gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#bcc6bb');gr.addColorStop(.56,'#e2d9be');gr.addColorStop(1,'#3d635e');c.fillStyle=gr;c.fillRect(0,0,w,h);for(let j=0;j<4;j++){c.fillStyle=['#6f8581','#5f7873','#48645c','#334d46'][j];c.beginPath();c.moveTo(0,h);for(let x=0;x<=w;x+=10)c.lineTo(x,h*.39+j*59+Math.sin(x*.006+j*2)*42+Math.cos(x*.016+j)*15);c.lineTo(w,h);c.fill();}c.fillStyle='#f8f4dd';c.font='300 36px sans-serif';c.fillText('A moment of calm.',55,92);});
box('Television landscape screen',4.7,FLOOR+1.61,.127,2.5,1.39,.004,new THREE.MeshBasicMaterial({map:tvMap}),groundFloor,false);
for(let x of [2.30,7.30]){round('Bookshelf speaker',x,FLOOR+.61,.27,.19,.29,.18,.018,M.charcoal,groundFloor);ball('Speaker driver',x,FLOOR+.64,.372,.057,M.rubber,groundFloor);}
vase(6.86,FLOOR+.48,.30,.65,groundFloor,M.accent);
for(let i=0;i<4;i++)book(3.15,FLOOR+.48+i*.055,.28,.37,.27,['#b3b7a7','#c8baa2','#7f8a79','#c3b49a'][i],groundFloor);
contact(4.8,.27,5.8,1.1,FLOOR+.024,groundFloor,.18);
for(let x of [1.22,8.4])curtain(x,5.97,.55,FLOOR+1.55,3.0,groundFloor);
// Slim reading floor lamp with a woven shade.
const reading=group('Living floor lamp',groundFloor);reading.position.set(1.6,FLOOR,4.9);
cyl('Lamp weighted base',0,.035,0,.22,.23,.07,M.bronze,reading);rod('Lamp stem',[0,.06,0],[0,1.6,0],.015,M.bronze,reading);
cyl('Fabric lamp shade',0,1.54,0,.17,.24,.30,M.fabric,reading);cyl('Lamp warm diffuser',0,1.405,0,.19,.19,.014,M.light,reading);

// Kitchen: recessed joinery, real sink bowl, tap, hob, ovens and everyday objects.
box('Kitchen porcelain floor',4.72,FLOOR+.025,-3.12,8.0,.035,5.5,M.stone,groundFloor,false);
for(let x=1.15;x<8.5;x+=1.05){
 const w=.99;box('Kitchen lower cabinet',x,FLOOR+.43,-5.53,w,.80,.65,M.walnut,groundFloor);
 box('Kitchen drawer shadow gap',x,FLOOR+.58,-5.193,w-.05,.008,.008,M.charcoal,groundFloor,false);
 rod('Brushed cabinet handle',[x-.17,FLOOR+.65,-5.167],[x+.17,FLOOR+.65,-5.167],.008,M.bronze,groundFloor);
 box('Kitchen recessed toe kick',x,FLOOR+.035,-5.53,w-.08,.07,.54,M.charcoal,groundFloor,false);
}
block(4.7,-5.53,8.1,.73,0,'Kitchen cabinets');
box('Kitchen marble worktop',4.7,FLOOR+.90,-5.52,8.2,.065,.83,M.stone,groundFloor);
box('Kitchen stone splashback',4.7,FLOOR+1.30,-6.005,8.0,.66,.032,M.stone,groundFloor);
for(let x=1.26;x<8.5;x+=1.10){round('Upper oak cabinet',x,FLOOR+2.38,-5.77,1.04,.66,.45,.018,M.wood,groundFloor);box('Upper cabinet inset handle',x,FLOOR+2.073,-5.53,.68,.015,.01,M.bronze,groundFloor,false);}
glow('Under cabinet LED strip',4.8,FLOOR+2.02,-5.65,7.8,.014,.024,groundFloor);
areaLight(4.8,FLOOR+1.99,-5.45,7.7,.55,4.5);
// Sink has a dark recessed basin surrounded by a thin stone lip.
round('Stainless sink cutout',3.15,FLOOR+.939,-5.45,.74,.018,.51,.045,M.steel,groundFloor);
round('Sink recessed basin',3.15,FLOOR+.951,-5.45,.64,.018,.42,.06,pbr('#687775',.3,.7),groundFloor);
cyl('Sink drain',3.15,FLOOR+.965,-5.45,.04,.04,.004,M.charcoal,groundFloor);
line('Gooseneck mixer tap',[[3.15,FLOOR+.94,-5.79],[3.15,FLOOR+1.35,-5.79],[3.15,FLOOR+1.48,-5.65],[3.15,FLOOR+1.43,-5.42],[3.15,FLOOR+1.28,-5.40]],.019,M.steel,groundFloor);
rod('Mixer lever',[3.30,FLOOR+.95,-5.75],[3.30,FLOOR+1.12,-5.75],.012,M.steel,groundFloor);
round('Induction glass hob',6.55,FLOOR+.94,-5.40,1.12,.018,.58,.012,M.black,groundFloor);
for(let x of [6.29,6.81])for(let z of [-5.56,-5.24]){const r=shape('Etched induction circle',new THREE.TorusGeometry(.135,.0025,5,40),M.steel,x,FLOOR+.951,z,groundFloor,false);r.rotation.x=Math.PI/2;}
round('Built in oven black front',6.55,FLOOR+.47,-5.176,.88,.68,.025,.016,M.black,groundFloor);
round('Oven door tinted glass',6.55,FLOOR+.43,-5.155,.73,.43,.012,.008,M.darkGlass,groundFloor);
rod('Oven metal handle',[6.19,FLOOR+.72,-5.126],[6.91,FLOOR+.72,-5.126],.015,M.steel,groundFloor);
for(let x of [6.27,6.83])cyl('Oven control dial',x,FLOOR+.79,-5.13,.028,.028,.024,M.steel,groundFloor).rotation.x=Math.PI/2;
box('Tall refrigerator cabinet',8.13,FLOOR+1.27,-5.51,.79,2.50,.75,M.wood,groundFloor);for(let y of [.9,1.9])rod('Refrigerator recessed pull',[7.82,FLOOR+y-.15,-5.115],[7.82,FLOOR+y+.15,-5.115],.009,M.bronze,groundFloor);
round('Kitchen island cabinet',4.7,FLOOR+.43,-3.12,3.70,.84,1.07,.025,M.charcoal,groundFloor);
round('Honed island waterfall top',4.7,FLOOR+.91,-3.12,4.10,.085,1.32,.018,M.stone,groundFloor);
for(let x of [2.67,6.73])box('Island stone waterfall side',x,FLOOR+.45,-3.12,.065,.86,1.32,M.stone,groundFloor);
block(4.7,-3.12,4.15,1.35,0,'Kitchen island');
for(let x of [3.45,4.7,5.95]){
 const g=group('Oak counter stool',groundFloor);g.position.set(x,FLOOR,-1.98);
 for(let dx of [-.19,.19])for(let dz of [-.18,.18])rod('Stool tapered leg',[dx*1.15,.03,dz*1.15],[dx,.63,dz],.025,M.walnut,g);
 for(let zz of [-.20,.20])rod('Stool footrest',[-.21,.25,zz],[.21,.25,zz],.012,M.bronze,g);
 round('Upholstered counter seat',0,.66,0,.49,.105,.46,.035,M.linen,g);round('Stool curved back',0,.89,.18,.49,.29,.06,.025,M.walnut,g);
 block(x,-1.98,.50,.53,0,'Counter stool');
 const pg=group('Kitchen pendant',groundFloor);rod('Pendant suspension',[x,3.72,-3.12],[x,2.80,-3.12],.006,M.black,pg);
 const shade=shape('Spun metal pendant shade',new THREE.CylinderGeometry(.11,.22,.20,28,1,true),M.charcoal,x,2.72,-3.12,pg);shade.material.side=THREE.DoubleSide;cyl('Pendant frosted diffuser',x,2.62,-3.12,.18,.18,.012,M.light,pg);
}
round('Oak chopping board',1.57,FLOOR+.96,-5.42,.52,.03,.37,.03,M.wood,groundFloor);
for(let i=0;i<3;i++){const f=ball('Kitchen pear',1.50+i*.12,FLOOR+1.05,-5.4,.065,pbr(['#a7a55f','#c5ab62','#858d4b'][i],.6),groundFloor);f.scale.y=1.25;}
for(let i=0;i<2;i++)cyl('Spice jar',2.15+i*.16,FLOOR+1.03,-5.76,.048,.048,.17,M.glass,groundFloor);
vase(5.75,FLOOR+.96,-3.15,.73,groundFloor,M.accent);
for(let i=0;i<5;i++)line('Olive branch in vase',[[5.75,FLOOR+1.30,-3.15],[5.75+between(-.25,.25),FLOOR+1.75,-3.15+between(-.18,.18)]],.006,M.walnut,groundFloor);
plate(3.36,FLOOR+.965,-3.13,.21,groundFloor);mug(3.78,FLOOR+.96,-3.13,groundFloor);
// Dining room, six solid oak chairs and ceramic place settings.
rug(-5.88,-3.34,5.0,3.8,FLOOR+.037,groundFloor,M.linen);
round('Dining oak tabletop',-5.83,FLOOR+.79,-3.36,3.05,.075,1.08,.055,M.wood,groundFloor);
for(let x of [-6.72,-4.94])round('Dining sculptural pedestal',x,FLOOR+.39,-3.36,.12,.76,.64,.025,M.walnut,groundFloor);
block(-5.83,-3.36,3.05,1.08,0,'Dining table');
for(let side of [-1,1])for(let x of [-6.87,-5.83,-4.79]){
 const g=group('Oak dining chair',groundFloor);g.position.set(x,FLOOR,-3.36+side*.94);g.rotation.y=side>0?0:Math.PI;
 for(let dx of [-.21,.21])for(let dz of [-.20,.20])rod('Chair tapered leg',[dx*1.1,0,dz*1.1],[dx,.43,dz],.020,M.walnut,g);
 round('Dining chair cushion',0,.47,0,.50,.09,.48,.03,M.fabric,g);round('Curved oak chair back',0,.79,.23,.53,.37,.055,.022,M.wood,g);
 rod('Chair back support',[-.23,.44,.22],[-.23,.91,.22],.016,M.walnut,g);rod('Chair back support',[.23,.44,.22],[.23,.91,.22],.016,M.walnut,g);
 plate(x,FLOOR+.84,-3.36+side*.27,.19,groundFloor);rod('Dining knife',[x+.23,FLOOR+.85,-3.36+side*.27-.11],[x+.23,FLOOR+.85,-3.36+side*.27+.11],.006,M.steel,groundFloor);glass(x-.25,FLOOR+.84,-3.36+side*.18,groundFloor);
 block(x,-3.36+side*.94,.55,.52,0,'Dining chair');
}
vase(-5.8,FLOOR+.84,-3.36,.65,groundFloor,M.white);
for(let x of [-6.7,-5.83,-4.96]){rod('Dining pendant cable',[x,3.71,-3.36],[x,2.82,-3.36],.007,M.black,groundFloor);const shade=shape('Hand pleated linen pendant',new THREE.CylinderGeometry(.12,.28,.28,40,1,true),M.fabric,x,2.70,-3.36,groundFloor);shade.material.side=THREE.DoubleSide;cyl('Dining pendant diffuser',x,2.57,-3.36,.235,.235,.013,M.light,groundFloor);}
art(-5.88,2.62,-5.98,1.6,1.05,groundFloor,1);

function bed(x,z,rot,y,parent){
 const g=group('Layered king bed',parent);g.position.set(x,y,z);g.rotation.y=rot;
 round('Oak bed platform',0,.24,0,2.10,.28,2.30,.065,M.walnut,g);
 round('Piped mattress',0,.45,0,2.02,.27,2.19,.11,M.fabric,g);
 round('Upholstered headboard',0,.89,1.10,2.48,1.15,.15,.07,M.linen,g);
 for(let i=0;i<10;i++)round('Headboard upholstered channel',-1.08+i*.24,.89,1.002,.21,1.06,.045,.02,M.fabric,g);
 // Cloth surface folds around the mattress, with a hanging lower edge.
 const geo=new THREE.PlaneGeometry(2.08,1.62,44,36),a=geo.attributes.position;
 for(let i=0;i<a.count;i++){const xx=a.getX(i),zz=a.getY(i);const edge=Math.pow(Math.abs(xx)/1.04,9);a.setXYZ(i,xx,.626+Math.sin(xx*18+zz*7)*.011+Math.cos(zz*19)*.008-edge*.17,zz-.38);}geo.computeVertexNormals();
 const cloth=M.fabric.clone();cloth.side=THREE.DoubleSide;shape('Naturally folded linen duvet',geo,cloth,0,0,0,g);
 round('Turned down duvet fold',0,.675,.25,2.0,.075,.23,.035,M.fabric,g);
 for(let xx of [-.52,.52]){const p=pillow('Soft bed pillow',xx,.67,.68,.85,.19,.49,M.fabric,g);p.rotation.x=-.08;p.rotation.y=xx*.08;}
 const throwMaterial=M.accent.clone();throwMaterial.side=THREE.DoubleSide;const tgeo=new THREE.PlaneGeometry(2.12,.63,40,10),ta=tgeo.attributes.position;
 for(let i=0;i<ta.count;i++){const xx=ta.getX(i),zz=ta.getY(i);ta.setXYZ(i,xx,.68+Math.sin(xx*19+zz*13)*.014-Math.pow(Math.abs(xx)/1.06,8)*.23,zz-.64);}tgeo.computeVertexNormals();shape('Draped woven bed runner',tgeo,throwMaterial,0,0,0,g);
 for(let xx of [-1.43,1.43]){
  round('Floating bedside cabinet',xx,.34,.73,.53,.34,.46,.04,M.wood,g);rod('Nightstand drawer pull',[xx-.10,.37,.492],[xx+.1,.37,.492],.006,M.bronze,g);
  cyl('Bedside lamp bronze base',xx,.55,.73,.10,.11,.05,M.bronze,g);rod('Bedside lamp stem',[xx,.58,.73],[xx,.76,.73],.009,M.bronze,g);cyl('Pleated bedside shade',xx,.80,.73,.11,.16,.19,M.fabric,g);cyl('Bedside lamp diffuser',xx,.71,.73,.13,.13,.009,M.light,g);
 }
 contact(x,z,3.2,3.5,y+.025,parent,.22);return g;
}
// First floor guest room; all furniture fits around a route to the hall.
rug(-5.78,3.10,4.9,4.2,FLOOR+.045,groundFloor);
bed(-5.82,3.48,0,FLOOR,groundFloor);block(-5.82,3.48,2.15,2.45,0,'Guest bed');
round('Guest room dresser',-6.1,FLOOR+.43,.16,3.3,.82,.47,.025,M.wood,groundFloor);block(-6.1,.16,3.3,.5,0,'Guest dresser');
art(-6.1,FLOOR+1.75,.27,1.24,1.07,groundFloor,0);vase(-7.24,FLOOR+.86,.16,.65,groundFloor,M.accent);
for(let x of [-8.55,-3.1])curtain(x,5.99,.54,FLOOR+1.56,3.03,groundFloor);
// Upstairs master room; a wall behind the headboard and an uncluttered dressing area.
rug(4.95,3.1,6.0,4.7,UPPER+.038,upperFloor);
bed(4.97,3.47,0,UPPER,upperFloor);block(4.97,3.47,2.16,2.40,1,'Master bed');
for(let x=3.30;x<6.9;x+=.31)box('Master headboard feature panel',x,UPPER+1.5,5.84,.26,2.9,.07,M.wood,upperFloor,false);
for(let x of [3.28,6.67]){round('Master wall sconce brass',x,UPPER+1.70,5.76,.12,.38,.07,.015,M.bronze,upperFloor);glow('Master wall sconce diffuser',x,UPPER+1.7,5.71,.07,.27,.016,upperFloor);}
round('Master foot bench',4.97,UPPER+.31,1.63,1.90,.20,.50,.055,M.linen,upperFloor);for(let x of [4.20,5.74])rod('Bench leg',[x,UPPER+.02,1.63],[x,UPPER+.25,1.63],.021,M.bronze,upperFloor);
block(4.97,1.63,1.95,.55,1,'Bed bench');
sofa(7.75,1.45,1.6,Math.PI/2,UPPER,upperFloor,M.accent);table(7.19,.42,.65,.65,UPPER,upperFloor);book(7.19,UPPER+.48,.42,.35,.25,'#bcad97',upperFloor);
for(let x of [1.05,8.45])curtain(x,5.98,.50,UPPER+1.53,3.0,upperFloor);
for(let x=1.4;x<8.5;x+=.98){round('Full height dressing wardrobe',x,UPPER+1.43,-5.56,.93,2.81,.75,.018,M.wood,upperFloor);rod('Wardrobe bronze pull',[x+.27,UPPER+1.0,-5.16],[x+.27,UPPER+1.61,-5.16],.009,M.bronze,upperFloor);}
block(4.9,-5.54,7.9,.8,1,'Dressing wardrobes');
round('Dressing island',4.9,UPPER+.47,-3.35,2.0,.85,.95,.045,M.linen,upperFloor);box('Dressing island glass top',4.9,UPPER+.91,-3.35,2.02,.018,.97,M.glass,upperFloor,false);block(4.9,-3.35,2.05,1.0,1,'Dressing island');
// Left upstairs bedroom with a writing desk and a proper chair.
rug(-5.85,3.22,4.8,4.4,UPPER+.038,upperFloor,M.linen);bed(-5.87,3.43,0,UPPER,upperFloor);block(-5.87,3.43,2.15,2.40,1,'Upper guest bed');
round('Studio oak desk',-5.9,UPPER+.77,.37,2.75,.065,.69,.024,M.wood,upperFloor);for(let x of [-7,-4.8])rod('Desk tapered leg',[x,UPPER+.03,.37],[x,UPPER+.74,.37],.03,M.walnut,upperFloor);block(-5.9,.37,2.8,.72,1,'Writing desk');
round('Laptop aluminium base',-5.75,UPPER+.825,.39,.57,.018,.38,.009,M.steel,upperFloor);
const lid=group('Laptop lid on rear hinge',upperFloor);lid.position.set(-5.75,UPPER+.834,.205);lid.rotation.x=-.30;
round('Laptop display',0,.18,.009,.57,.36,.018,.008,M.charcoal,lid);
box('Laptop luminous screen',0,.18,.0185,.53,.32,.004,new THREE.MeshBasicMaterial({color:'#91a5a4'}),lid,false);
for(let row=0;row<4;row++)for(let col=0;col<10;col++)box('Laptop key',-5.98+col*.048,UPPER+.839,.31+row*.038,.035,.004,.026,M.charcoal,upperFloor,false);
book(-6.85,UPPER+.82,.39,.38,.26,'#8a977e',upperFloor);mug(-4.98,UPPER+.81,.38,upperFloor);
curtain(-8.56,5.99,.6,UPPER+1.54,3.0,upperFloor);curtain(-3.1,5.99,.6,UPPER+1.54,3.0,upperFloor);
// Balcony seating and exterior reading spots.
for(let x of [4.9,7.4]){sofa(x,7.26,1.45,0,UPPER+.08,upperFloor,M.fabric);}
table(6.15,7.35,.57,.57,UPPER+.08,upperFloor,M.stone);mug(6.15,UPPER+.56,7.35,upperFloor);

// Bathroom occupies the rear west room; no overlap with either bedroom.
box('Bathroom limestone floor',-5.82,UPPER+.033,-3.22,6.05,.045,5.85,M.stone,upperFloor,false);
for(let x=-8.7;x<-2.8;x+=1.18)for(let y=UPPER+.03;y<7.0;y+=.60)box('Bathroom large format wall tile',x+.57,y+.29,-5.994,1.16,.58,.022,M.stone,upperFloor,false);
// An open-rim bathtub made from a lathed cross-section, rather than a solid white box.
const tub=group('Freestanding oval bath',upperFloor);tub.position.set(-6.94,UPPER,-4.35);tub.rotation.y=.04;
const tubProfile=[[.43,.10],[.58,.13],[.71,.40],[.76,.59],[.75,.63],[.70,.64],[.65,.58],[.59,.25],[.44,.19],[0,.19]].map(v=>new THREE.Vector2(...v));
const bathMesh=shape('Stone resin bath shell',new THREE.LatheGeometry(tubProfile,64),M.white,0,0,0,tub);bathMesh.scale.set(1.76,1,1);
const bathWater=shape('Still bath water',new THREE.CircleGeometry(.60,48),new THREE.MeshPhysicalMaterial({color:'#b4d6cf',metalness:.05,roughness:.08,transparent:true,opacity:.54,side:THREE.DoubleSide}),0,.49,0,tub,false);bathWater.scale.x=1.76;bathWater.rotation.x=-Math.PI/2;
line('Floor mounted bath mixer',[[-5.45,UPPER+.04,-4.5],[-5.45,UPPER+.98,-4.5],[-5.73,UPPER+1.02,-4.5]],.023,M.steel,upperFloor);
block(-6.94,-4.35,2.7,1.53,1,'Bathtub');
// Double floating vanity in the dividing wall, with wall-mounted spouts.
round('Floating bathroom vanity',-5.2,UPPER+.46,-.49,3.75,.52,.67,.045,M.walnut,upperFloor);
round('Bathroom vanity stone top',-5.2,UPPER+.77,-.49,3.85,.06,.75,.018,M.stone,upperFloor);
block(-5.2,-.49,3.9,.75,1,'Bathroom vanity');
for(let x of [-6.24,-4.20]){
 const pts=[[0,0],[.20,0],[.29,.09],[.31,.15],[.29,.17],[.26,.11],[.18,.023],[0,.023]].map(v=>new THREE.Vector2(...v));shape('Ceramic vessel basin',new THREE.LatheGeometry(pts,36),M.white,x,UPPER+.80,-.50,upperFloor);
 line('Brushed wall basin spout',[[x,UPPER+1.15,-.27],[x,UPPER+1.15,-.54],[x,UPPER+1.10,-.57]],.017,M.steel,upperFloor);
 round('Backlit bathroom mirror frame',x,UPPER+1.83,-.282,1.12,1.32,.040,.08,M.bronze,upperFloor);
 const mirrorMat=new THREE.MeshPhysicalMaterial({color:'#d1d9d6',metalness:1,roughness:.07,envMapIntensity:1.2});
 round('Polished bathroom mirror',x,UPPER+1.83,-.31,1.06,1.26,.016,.075,mirrorMat,upperFloor);
 glow('Mirror perimeter backlight',x,UPPER+2.48,-.28,1.00,.018,.03,upperFloor);
}
// Mirror faces the bathroom, toward negative Z.
for(let x of [-3.63,-3.43]){round('Bathroom soap bottle',x,UPPER+.91,-.5,.12,.21,.10,.018,M.accent,upperFloor);rod('Soap pump',[x,UPPER+1.015,-.50],[x+.06,UPPER+1.015,-.50],.008,M.charcoal,upperFloor);}
for(let i=0;i<3;i++)round('Folded cotton bath towel',-7.62,UPPER+.87+i*.065,-.47,.50,.06,.34,.022,M.fabric,upperFloor);
// Walk-in shower with real threshold, rainfall head and a linear drain.
box('Shower tray',-3.67,UPPER+.06,-4.28,1.60,.10,2.25,M.stone,upperFloor);
box('Shower tempered glass screen',-4.47,UPPER+1.25,-4.3,.014,2.46,2.10,M.glass,upperFloor,false);
rod('Shower glass top support',[-4.47,UPPER+2.47,-5.31],[-2.78,UPPER+2.47,-5.31],.009,M.steel,upperFloor);
line('Rain shower arm',[[-2.79,UPPER+2.41,-4.25],[-3.66,UPPER+2.41,-4.25]],.019,M.steel,upperFloor);
cyl('Rain shower thin head',-3.65,UPPER+2.34,-4.25,.20,.20,.022,M.steel,upperFloor,40);
for(let xx=-.13;xx<=.14;xx+=.065)for(let zz=-.13;zz<=.14;zz+=.065)cyl('Rain shower nozzle',-3.65+xx,UPPER+2.324,-4.25+zz,.006,.006,.008,M.rubber,upperFloor,6);
round('Thermostatic shower control',-2.778,UPPER+1.13,-4.25,.035,.34,.13,.018,M.steel,upperFloor);
for(let i=0;i<22;i++)box('Linear shower drain slot',-4.3+i*.057,UPPER+.118,-5.20,.031,.006,.065,M.charcoal,upperFloor,false);
// Slender towel warmer and ceramic accessories.
for(let z of [-2.2,-1.65])rod('Towel rail vertical',[-8.91,UPPER+.5,z],[-8.91,UPPER+1.6,z],.015,M.steel,upperFloor);
for(let y=UPPER+.57;y<UPPER+1.55;y+=.14)rod('Heated towel rail',[-8.91,y,-2.2],[-8.91,y,-1.65],.012,M.steel,upperFloor);
round('Hanging bath towel',-8.86,UPPER+.96,-1.91,.06,.65,.40,.025,M.fabric,upperFloor);

// Pool: tiled walls, recessed floor, broad entry steps and an animated mirrored surface.
box('Pool tiled bottom',7.35,-1.48,16.8,14.02,.08,7.35,M.poolTile,garden,false);
for(let x of [.30,14.40])box('Pool tiled side',x,-.74,16.8,.13,1.48,7.40,M.poolTile,garden,false);
for(let z of [13.10,20.50])box('Pool tiled end',7.35,-.74,z,14.10,1.48,.13,M.poolTile,garden,false);
for(let x of [.16,14.54])box('Honed pool coping',x,.045,16.8,.38,.16,7.9,M.stone,garden,false);
for(let z of [12.94,20.66])box('Honed pool coping',7.35,.045,z,14.1,.16,.38,M.stone,garden,false);
for(let i=0;i<4;i++)box('Submerged entry stair',1.45,-1.30+i*.30,14.0+i*.39,2.05,.22,.56,M.poolTile,garden,false);
for(let z of [15.7,17.1])line('Pool polished ladder handrail',[[13.84,-.85,z],[13.84,.42,z],[14.1,.63,z],[14.54,.51,z],[14.58,.11,z]],.025,M.steel,garden);
for(let y of [-.95,-.61,-.28])rod('Pool ladder tread',[13.84,y,15.7],[13.84,y,17.1],.018,M.steel,garden);
for(let x of [3.2,7.3,11.4]){box('Underwater light',x,-.5,20.405,.18,.065,.015,M.light,garden,false);}
cyl('Pool main drain',7.2,-1.43,17,.13,.13,.008,M.steel,garden,24);
for(let i=0;i<6;i++)box('Pool drain grate',7.12+i*.032,-1.423,17,.014,.003,.18,M.charcoal,garden,false);
const normalCanvas=canvasTexture(256,256,(c,w,h)=>{const im=c.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=Math.cos(x*Math.PI/32+y*Math.PI/64)*.22+Math.sin(x*Math.PI/16-y*Math.PI/32)*.10,dy=Math.cos(y*Math.PI/32-x*Math.PI/64)*.23;const n=new THREE.Vector3(dx,dy,1).normalize(),i=(y*w+x)*4;im.data[i]=(n.x*.5+.5)*255;im.data[i+1]=(n.y*.5+.5)*255;im.data[i+2]=(n.z*.5+.5)*255;im.data[i+3]=255;}c.putImageData(im,0,0);},false);normalCanvas.wrapS=normalCanvas.wrapT=THREE.RepeatWrapping;
const pool=new Water(new THREE.PlaneGeometry(13.96,7.23,1,1),{textureWidth:mobile?384:768,textureHeight:mobile?384:768,waterNormals:normalCanvas,sunDirection:sun.position.clone().normalize(),sunColor:'#fff0d7',waterColor:'#3d8e8a',distortionScale:1.45,size:3.5,fog:true});
pool.name='Reflective rippling pool water';pool.rotation.x=-Math.PI/2;pool.position.set(7.35,-.13,16.8);pool.material.transparent=true;pool.material.uniforms.alpha.value=.82;pool.material.uniforms.size.value=3.5;garden.add(pool);
// Avoid updating the mirror several times per animation frame. Shadows are refreshed on demand.
const waterBeforeRender=pool.onBeforeRender;pool.onBeforeRender=function(...args){if(quality==='fast'&&frame%3!==0)return;return waterBeforeRender.apply(this,args);};
// Outdoor lounge, pergola, a hand woven shade and loose cushions.
for(let x of [17.0,20.45])for(let z of [11.3,24.8]){box('Pergola cedar post',x,1.63,z,.14,3.26,.14,M.walnut);box('Pergola post shoe',x,.12,z,.18,.18,.18,M.charcoal);}
for(let x of [17.0,20.45])box('Pergola side beam',x,3.27,18.0,.12,.20,13.9,M.charcoal);
for(let z=11.25;z<25;z+=.32)box('Pergola shading louver',18.73,3.38,z,3.9,.09,.12,M.wood);
sofa(18.66,23.5,2.65,0,.13,garden,M.fabric);sofa(19.8,21.64,2.10,Math.PI/2,.13,garden,M.linen);table(18.5,21.52,1.12,.80,.13,garden);book(18.3,.62,21.48,.34,.24,'#b5aa8f',garden,.12);mug(18.8,.62,21.5,garden);
function lounger(x,z,angle=0){const g=group('Teak sun lounger');g.position.set(x,.10,z);g.rotation.y=angle;for(let xx of [-.41,.41]){box('Teak lounger rail',xx,.25,0,.045,.07,2.05,M.wood,g);for(let zz of [-.7,.7])rod('Lounger leg',[xx,.04,zz],[xx,.26,zz],.022,M.walnut,g);}for(let zz=-.95;zz<1;zz+=.12)box('Individual teak bed slat',0,.30,zz,.86,.035,.10,M.wood,g);round('Lounger seat cushion',0,.37,.32,.77,.09,1.15,.035,M.fabric,g);const b=round('Angled backrest cushion',0,.56,-.60,.77,.09,.85,.035,M.fabric,g);b.rotation.x=-.50;for(let i=0;i<3;i++)round('Rolled pool towel',0,.43+i*.035,.73,.52,.035,.22,.014,M.linen,g);return g;}
lounger(-1.05,16.2,-.08);lounger(-2.54,16.2,-.08);lounger(15.8,17.5,.13);
const umbrellaGroup=group('Cantilever outdoor umbrella');umbrellaGroup.position.set(-3.0,.12,19.3);
box('Umbrella weighted base',0,.08,0,.72,.16,.72,M.stone,umbrellaGroup);rod('Umbrella pole',[0,.15,0],[0,2.85,0],.027,M.charcoal,umbrellaGroup);
const ug=new THREE.ConeGeometry(1.85,.38,48,1,true),ua=ug.attributes.position;for(let i=0;i<ua.count;i++){const x=ua.getX(i),z=ua.getZ(i),a=Math.atan2(z,x);ua.setY(i,ua.getY(i)+Math.cos(a*8)*.022);}ug.computeVertexNormals();const um=M.fabric.clone();um.side=THREE.DoubleSide;shape('Taut woven umbrella canopy',ug,um,0,2.9,0,umbrellaGroup);
for(let i=0;i<8;i++){const a=i*Math.PI/4;rod('Umbrella rib',[0,3.08,0],[Math.cos(a)*1.78,2.72,Math.sin(a)*1.78],.008,M.walnut,umbrellaGroup);}
// Low garden lamps have warm luminaires and restrained pools of light.
for(const [x,z] of [[-10.1,10],[-10.1,23],[-4.5,24.8],[16.2,12],[16.2,23],[20.8,27]]){box('Path light bollard',x,.40,z,.10,.78,.12,M.charcoal);glow('Bollard light',x,.67,z+.065,.065,.08,.015,garden);const l=new THREE.PointLight('#ffd4a2',.7,4,2);l.position.set(x,.7,z+.12);scene.add(l);warmLights.push({light:l,power:.7});}
areaLight(7.3,-.06,16.8,8,4,1.8,[Math.PI/2,0,0]);

// Botanical detail uses instancing: curved individual leaves, branches and real grass blades.
const leafGeo=new THREE.PlaneGeometry(.115,.265,2,3);const la=leafGeo.attributes.position;
for(let i=0;i<la.count;i++){const x=la.getX(i),y=la.getY(i);const t=(y+.1325)/.265;la.setX(i,x*Math.pow(Math.sin(t*Math.PI),.7));la.setZ(i,.035*Math.sin(t*Math.PI)+x*x*2);}leafGeo.computeVertexNormals();
const leafInstances=[],leafColors=[];
function leafAt(position,scale=1,rotation=null,tint=null){const o=new THREE.Object3D();o.position.copy(position);o.rotation.set(rotation?.[0]??rand()*Math.PI,rotation?.[1]??rand()*Math.PI*2,rotation?.[2]??rand()*Math.PI*2);o.scale.set(scale,scale,scale);o.updateMatrix();leafInstances.push(o.matrix.clone());const c=tint||new THREE.Color().setHSL(between(.18,.25),between(.16,.35),between(.22,.42));leafColors.push(c);}
function tree(x,z,height=5.5,radius=2.2){
 const g=group('Olive tree with branching bark');g.position.set(x,0,z);
 const trunkTop=[.12,height*.56,-.05];rod('Olive tree trunk',[0,0,0],trunkTop,.105,bark,g);
 for(let j=0;j<12;j++){
  const a=j*2.399,by=height*.35+(j%3)*height*.09,br=radius*between(.55,.95),end=[Math.cos(a)*br,height*between(.67,.96),Math.sin(a)*br];
  rod('Secondary tree branch',[.03,by,0],end,.023+(1-j/14)*.025,bark,g);
  for(let k=0;k<3;k++){const a2=a+(k-1)*.55,small=[end[0]+Math.cos(a2)*.45,end[1]+between(.12,.45),end[2]+Math.sin(a2)*.45];rod('Olive twig',end,small,.008,bark,g);}
 }
 for(let i=0;i<(mobile?1100:2350);i++){
  const a=rand()*Math.PI*2,r=Math.sqrt(rand())*radius,dy=between(-.75,.85)*Math.sqrt(Math.max(.05,1-r*r/(radius*radius)));
  const y=height*.78+dy;leafAt(new THREE.Vector3(x+Math.cos(a)*r,y,z+Math.sin(a)*r),between(.72,1.35),null,new THREE.Color().setHSL(between(.19,.24),between(.14,.28),between(.25,.43)));
 }
 contact(x,z,radius*2.6,radius*2.6,.09,garden,.22);
 return g;
}
for(const p of [[-20,-10,5.9,2.1],[-20,6,5.4,2.1],[-19.5,25.8,5.3,2.2],[20,-12.8,6.1,2.4],[20.2,7,4.8,1.8],[19.9,27,5.8,2.1],[-7.4,-15.8,6.1,2.1],[7,-15.5,5.9,2.5]])tree(...p);
function shrub(x,z,r=.5,h=.72){
 for(let i=0;i<120;i++){const a=rand()*Math.PI*2,rr=Math.sqrt(rand())*r;leafAt(new THREE.Vector3(x+Math.cos(a)*rr,h*.45+rand()*h*.65,z+Math.sin(a)*rr),between(.50,.85));}
}
for(let z=-16;z<28;z+=.75){shrub(-21.0,z,.53,.92);shrub(21.1,z,.53,.94);}
for(let x=-19.5;x<20;x+=.75)shrub(x,-17.6,.52,.95);
function indoorPlant(x,z,y,parent,s=1){
 const g=group('Potted indoor plant',parent);g.position.set(x,y,z);g.scale.setScalar(s);
 const points=[[.23,0],[.27,.02],[.31,.49],[.29,.52],[.26,.48],[.22,.04]].map(p=>new THREE.Vector2(...p));shape('Ceramic planter with thick rim',new THREE.LatheGeometry(points,28),M.white,0,0,0,g);cyl('Visible pot soil',0,.45,0,.26,.26,.015,M.soil,g);
 for(let j=0;j<6;j++){const a=j*2.399,h=.65+rand()*.65;rod('Indoor plant stem',[0,.45,0],[Math.cos(a)*.20,h,Math.sin(a)*.20],.009,M.walnut,g);
  for(let i=0;i<4;i++){const yy=.62+i*.16,leaf=shape('Broad waxy plant leaf',leafGeo,M.leaf,Math.cos(a)*(.1+i*.025),yy,Math.sin(a)*(.1+i*.025),g);leaf.scale.set(2.2,2.4,2);leaf.rotation.set(.3,a,1.0);}
 }
 return g;
}
indoorPlant(8.15,5.25,FLOOR,groundFloor,1.1);indoorPlant(.85,5.28,FLOOR,groundFloor,.8);indoorPlant(-8.27,5.1,FLOOR,groundFloor,.8);indoorPlant(8.15,4.9,UPPER,upperFloor,.9);indoorPlant(-8.25,5.17,UPPER,upperFloor,.8);
for(let [x,z] of [[-9.8,10.2],[15.3,11.2],[20.0,24.2]]){round('Outdoor concrete planter',x,.36,z,.88,.64,.88,.025,M.stone);cyl('Planter soil',x,.66,z,.36,.36,.02,M.soil);shrub(x,z,.6,1.65);}
const leaves=new THREE.InstancedMesh(leafGeo,M.leaf,leafInstances.length);for(let i=0;i<leafInstances.length;i++){leaves.setMatrixAt(i,leafInstances[i]);leaves.setColorAt(i,leafColors[i]);}leaves.name='Individual olive and hedge leaves';leaves.castShadow=true;leaves.receiveShadow=true;leaves.instanceMatrix.needsUpdate=true;garden.add(leaves);
leaves.material.onBeforeCompile=shader=>{shader.uniforms.uWind={value:0};animatedLeaves.push(shader.uniforms.uWind);shader.vertexShader='uniform float uWind;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat wind=sin(uWind*.7+instanceMatrix[3].x*.7+instanceMatrix[3].z*.9)*.025;transformed.x+=wind*pow(clamp((position.y+.133)/.266,0.,1.),2.);\n#endif');};
// Low grass catches side light; its density can be reduced without changing the house.
const grassGeo=new THREE.BufferGeometry(),gv=[],gn=[],gu=[];
for(let j=0;j<3;j++){const a=j*Math.PI/3,w=.013,h=.15+j*.025,c=Math.cos(a),s=Math.sin(a);const verts=[[-w*c,0,-w*s],[w*c,0,w*s],[.025*c,h,.025*s]];for(let k=0;k<3;k++){gv.push(...verts[k]);gn.push(-s,0,c);gu.push(k===1?1:0,k===2?1:0);}}
grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(gv,3));grassGeo.setAttribute('normal',new THREE.Float32BufferAttribute(gn,3));grassGeo.setAttribute('uv',new THREE.Float32BufferAttribute(gu,2));
const grassCount=mobile?12000:36000,grassM=new THREE.MeshStandardMaterial({color:'#7e8f68',roughness:1,side:THREE.DoubleSide}),grassBlades=new THREE.InstancedMesh(grassGeo,grassM,grassCount),go=new THREE.Object3D(),gc=new THREE.Color();let ng=0,attempts=0;
while(ng<grassCount&&attempts++<grassCount*8){const x=between(-21.5,21.5),z=between(-18,29);
 if((x>-19&&x<21&&z>6.0&&z<28)||(x>-19&&x<10&&z>-6.6&&z<6.6)||(x>-5.9&&x<-3.1&&z>8))continue;
 go.position.set(x,0,z);go.rotation.y=rand()*Math.PI*2;go.scale.setScalar(between(.65,1.2));go.updateMatrix();grassBlades.setMatrixAt(ng,go.matrix);gc.setHSL(between(.19,.25),between(.16,.3),between(.24,.38));grassBlades.setColorAt(ng++,gc);
}
grassBlades.count=ng;grassBlades.name='Three dimensional lawn blades';grassBlades.receiveShadow=true;garden.add(grassBlades);
// Ornamental grasses and lavender are built from arching stems and small florets.
for(let i=0;i<80;i++){
 const x=between(-9,17),z=between(27.2,28.7),h=between(.35,.85),a=rand()*6.28;
 line('Ornamental grass stalk',[[x,.04,z],[x+.10*Math.cos(a),h*.6,z+.1*Math.sin(a)],[x+.23*Math.cos(a),h,z+.23*Math.sin(a)]],.006,M.leaf,garden);
 for(let k=0;k<5;k++){const f=ball('Lavender floret',x+.19*Math.cos(a),h-k*.035,z+.19*Math.sin(a),.023,pbr('#8b8795',.98));f.scale.y=1.5;}
}
// Natural mixed river stones around the tree beds.
const stoneGeo=new THREE.IcosahedronGeometry(.085,1),stonePebbles=new THREE.InstancedMesh(stoneGeo,M.stoneDark,550),so=new THREE.Object3D(),sc=new THREE.Color();
for(let i=0;i<550;i++){const a=rand()*6.28,r=between(.45,1.3),x=(i<275?-20:20.2)+Math.cos(a)*r,z=(i<275?6:7)+Math.sin(a)*r;so.position.set(x,.04,z);so.rotation.set(rand(),rand(),rand());so.scale.set(between(.7,1.7),between(.3,.6),between(.6,1.4));so.updateMatrix();stonePebbles.setMatrixAt(i,so.matrix);sc.setScalar(between(.65,1));stonePebbles.setColorAt(i,sc);}stonePebbles.name='Landscaping river pebbles';stonePebbles.receiveShadow=true;garden.add(stonePebbles);

// A generic detailed sedan: shaped bodywork, glass, wheels, lights, mirrors and panel seams.
function sedan(x,z){
 const g=group('Detailed graphite sedan');g.position.set(x,.06,z);g.rotation.y=.02;
 const sections=[[-2.40,.72,.49],[-2.16,.98,.64],[-1.48,1.04,.73],[-.70,1.07,.77],[.65,1.06,.74],[1.7,1.00,.63],[2.28,.86,.49]];
 const vp=[],ind=[];for(const [zz,w,top] of sections){for(const [xx,y] of [[-w*.84,.22],[-w,.39],[-w*.99,top*.86],[-w*.77,top],[w*.77,top],[w*.99,top*.86],[w,.39],[w*.84,.22]])vp.push(xx,y+.21,zz);}
 for(let j=0;j<sections.length-1;j++)for(let k=0;k<8;k++){const a=j*8+k,b=j*8+(k+1)%8,c=(j+1)*8+(k+1)%8,d=(j+1)*8+k;ind.push(a,b,d,b,c,d);}
 for(let k=1;k<7;k++){ind.push(0,k+1,k);const e=(sections.length-1)*8;ind.push(e,e+k,e+k+1);}
 const body=new THREE.BufferGeometry();body.setAttribute('position',new THREE.Float32BufferAttribute(vp,3));for(let i=0;i<ind.length;i+=3){const b=ind[i+1];ind[i+1]=ind[i+2];ind[i+2]=b;}body.setIndex(ind);body.computeVertexNormals();shape('Sculpted metallic sedan body',body,M.car,0,0,0,g);
 const cabin=round('Cabin roof',0,1.31,-.30,1.68,.37,1.99,.16,M.car,g);
 const windowMat=M.darkGlass;
 function pane(name,coords){const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(coords.flat(),3));geom.setIndex([0,1,2,0,2,3]);geom.computeVertexNormals();return shape(name,geom,windowMat,0,0,0,g,false);}
 pane('Sloped windshield',[[-.82,.91,.95],[.82,.91,.95],[.72,1.47,.50],[-.72,1.47,.50]]);
 pane('Rear windshield',[[-.80,.96,-1.45],[-.72,1.46,-1.04],[.72,1.46,-1.04],[.80,.96,-1.45]]);
 for(let sx of [-1,1]){
  pane('Side cabin glazing',[[sx*.90,.97,-1.32],[sx*.90,.97,.75],[sx*.78,1.44,.37],[sx*.78,1.44,-.99]]);
  rod('Window B pillar',[sx*.90,.96,-.30],[sx*.79,1.46,-.30],.035,M.black,g);
  line('Door shut line',[[sx*1.065,.58,-.55],[sx*1.07,.90,-.55],[sx*.9,1.0,-.48]],.006,M.rubber,g);
  for(let zz of [-.94,.26])round('Flush door handle',sx*1.055,.90,zz,.025,.032,.18,.01,M.steel,g);
  const mirror=round('Side mirror housing',sx*1.13,1.03,.63,.23,.14,.30,.055,M.car,g);round('Side mirror glass',sx*1.18,1.03,.56,.12,.10,.015,.025,M.darkGlass,g);
  for(let zz of [-1.42,1.37]){
   const tire=shape('Tire sidewall',new THREE.TorusGeometry(.302,.112,12,40),M.rubber,sx*1.03,.43,zz,g);tire.rotation.y=Math.PI/2;
   const disk=cyl('Brake disk',sx*1.10,.43,zz,.247,.247,.024,M.steel,g,32);disk.rotation.z=Math.PI/2;
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5;rod('Alloy wheel spoke',[sx*1.155,.43,zz],[sx*1.155,.43+Math.sin(a)*.235,zz+Math.cos(a)*.235],.025,M.charcoal,g);}
   const hub=cyl('Wheel centre cap',sx*1.17,.43,zz,.060,.060,.016,M.steel,g,20);hub.rotation.z=Math.PI/2;
   for(let i=0;i<34;i++){const a=i*Math.PI*2/34;const tread=box('Tire tread cut',sx*1.04,.43+Math.sin(a)*.403,zz+Math.cos(a)*.403,.15,.009,.014,M.charcoal,g,false);tread.rotation.x=-a;}
  }
 }
 box('Front grille',0,.58,2.269,1.38,.22,.025,M.black,g);
 for(let i=0;i<15;i++)box('Front grille fin',-.64+i*.092,.58,2.286,.012,.18,.015,M.charcoal,g,false);
 for(let sx of [-1,1]){line('LED headlight signature',[[sx*.45,.75,2.17],[sx*.87,.73,2.13],[sx*.94,.64,2.08]],.016,M.light,g);round('Tail lamp lens',sx*.67,.72,-2.25,.49,.09,.024,.014,pbr('#812e2b',.22),g);rod('Rear exhaust tip',[sx*.67,.37,-2.34],[sx*.67,.37,-2.44],.043,M.steel,g);}
 round('Number plate',0,.48,2.299,.50,.11,.014,.006,M.white,g);contact(x,z,3.4,6.0,.09,garden,.31);return g;
}
sedan(-14.5,-.55);

// Repeated opaque geometry is batched by material, while doors, glass and vegetation stay independent.
// This preserves the extra detail without paying one draw call for every screw, plank and book.
function batchStatic(root){
 root.updateMatrixWorld(true);const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert(),batches=new Map(),remove=[];
 root.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh||!o.visible||o.material?.transparent||Array.isArray(o.material)||o===pool)return;
  for(let p=o;p&&p!==root;p=p.parent)if(p.userData.dynamic||!p.visible)return;
  const m=o.material,key=m.uuid+'-'+Number(o.castShadow)+'-'+Number(o.receiveShadow);
  const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
  if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  if(!g.attributes.normal)g.computeVertexNormals();
  for(const a of Object.keys(g.attributes))if(!['position','normal','uv'].includes(a))g.deleteAttribute(a);
  g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
  if(!batches.has(key))batches.set(key,{material:m,geometries:[],cast:o.castShadow,receive:o.receiveShadow});batches.get(key).geometries.push(g);remove.push(o);
 });
 for(const b of batches.values()){
  const geo=mergeGeometries(b.geometries,false);if(!geo)throw new Error('Geometry merge failed');geo.computeBoundingSphere();geo.computeBoundingBox();
  const mesh=new THREE.Mesh(geo,b.material);mesh.name='Batched '+root.name+' / '+(b.material.name||b.material.type);mesh.castShadow=b.cast;mesh.receiveShadow=b.receive;root.add(mesh);for(const g of b.geometries)g.dispose();
 }
 for(const m of remove){m.removeFromParent();m.geometry.dispose();}
}
for(const [name,m] of Object.entries(M))m.name=name;
for(const root of [groundFloor,upperFloor,roof,building,garden])batchStatic(root);
const externalWindows=[];for(const root of [groundFloor,upperFloor])root.traverse(g=>{if(g.userData.glazing)externalWindows.push(g);});
block(7.35,16.8,14.2,7.6,0,'Pool water');block(-14.5,-.55,2.35,4.95,0,'Parked car');
block(18.66,23.5,2.75,1.12,0,'Outdoor sofa');block(19.8,21.64,1.15,2.2,0,'Outdoor chaise');
for(let x of [17,20.45])for(let z of [11.3,24.8])block(x,z,.18,.18,0,'Pergola post');
for(let x of [-18.1,-10.9])for(let z of [-5.5,5.45])block(x,z,.19,.20,0,'Carport post');
for(const [x,z] of [[-20,-10],[-20,6],[-19.5,25.8],[20,-12.8],[20.2,7],[19.9,27]])block(x,z,.45,.45,0,'Tree trunk');
const views={
 outside:{position:[22,9.4,26.5],target:[-.5,2.65,3.1],orbit:true,floor:0,label:'Hovli va fasad'},
 pool:{position:[10.8,3.5,25.2],target:[1.5,2.8,3.1],orbit:true,floor:0,label:'Basseyn'},
 aerial:{position:[1.2,32,24],target:[0,1.2,1.0],orbit:true,floor:0,label:'Uy rejasi'},
 living:{position:[2.05,FLOOR+1.62,3.15],target:[5.0,FLOOR+1.25,.18],floor:0,label:'Mehmonxona'},
 kitchen:{position:[7.75,FLOOR+1.62,-1.12],target:[3.6,FLOOR+1.0,-4.9],floor:0,label:'Oshxona'},
 bed1:{position:[-3.15,FLOOR+1.62,1.3],target:[-5.9,FLOOR+.8,3.7],floor:0,label:'1-qavat xona'},
 bed2:{position:[1.65,UPPER+1.62,.65],target:[5.1,UPPER+.8,3.6],floor:1,label:'2-qavat xona'},
 bath:{position:[-3.45,UPPER+1.62,-1.6],target:[-6.7,UPPER+.7,-4.3],floor:1,label:'Hammom'}
};
const pressed=new Set();let touchDirection='',dragPointer=null,activeView='outside',lastWalkLabel='';
function setCut(value){cut=value;roof.visible=!cut;upperFloor.visible=!(cut&&!floor2);for(const g of externalWindows)g.visible=!(cut&&mode==='orbit');$('#cutaway').classList.toggle('active',cut);lightingDirty=true;}
function setTime(value){
 timeOfDay=value;scene.background=value==='day'?outdoorBackground:null;sky.visible=!scene.background;scene.backgroundBlurriness=.015;const params={
 day:{sun:3.1,hemi:.85,color:'#fff0d7',pos:[-18,26,23],exposure:.95,top:'#7096b0',horizon:'#e5e7df',fog:'#bdcbd0',power:.42,env:.80},
 golden:{sun:2.5,hemi:.62,color:'#ffce9d',pos:[-30,11,19],exposure:.92,top:'#889aa8',horizon:'#e2c6a6',fog:'#bfb4a5',power:.84,env:.55},
 night:{sun:.18,hemi:.30,color:'#b8c9eb',pos:[-18,26,23],exposure:.95,top:'#17273d',horizon:'#4b5768',fog:'#2c3c50',power:3.7,env:.18}
 }[value];
 sun.intensity=params.sun;sun.color.set(params.color);sun.position.set(...params.pos);hemi.intensity=params.hemi;exposureBase=params.exposure;renderer.toneMappingExposure=exposureBase;
 skyUniforms.top.value.set(params.top);skyUniforms.horizon.value.set(params.horizon);skyUniforms.bottom.value.set(value==='night'?'#2b3238':'#a8aa99');skyUniforms.sunDir.value.copy(sun.position).normalize();skyUniforms.warm.value=value==='golden'?1:0;
 scene.fog.color.set(params.fog);
 for(const {light,power} of warmLights)light.intensity=power*params.power;
 const litMaterials=new Set();scene.traverse(o=>{if(o.isMesh&&o.material?.isMeshStandardMaterial)litMaterials.add(o.material);});for(const m of litMaterials){m.envMapIntensity=params.env;}
 pool.material.uniforms.sunDirection.value.copy(sun.position).normalize();pool.material.uniforms.sunColor.value.set(params.color).multiplyScalar(value==='night'?.15:1);
 pool.material.uniforms.waterColor.value.set(value==='night'?'#214a55':'#3d8e8a');
 M.light.emissiveIntensity=value==='night'?4.5:value==='golden'?2.8:1.7;
 $('#daynight').textContent=value==='day'?'◐ Oltin soat':value==='golden'?'☾ Tun':'☀ Kunduz';$('#daynight').classList.toggle('active',value!=='day');
 $('#light-label').textContent=value==='day'?'KUNDUZ':value==='golden'?'OLTIN SOAT':'TUN';lightingDirty=true;
}
function setQuality(value){
 quality=value;const params={fast:{ratio:1,shadow:1024,grass:10000},high:{ratio:1.6,shadow:2048,grass:26000},ultra:{ratio:2,shadow:4096,grass:36000}}[value];
 renderer.setPixelRatio(Math.min(devicePixelRatio,params.ratio));renderer.setSize(innerWidth,innerHeight);
 sun.shadow.mapSize.set(params.shadow,params.shadow);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}grassBlades.count=Math.min(ng,params.grass);leaves.castShadow=value!=='fast';
 $('#quality').value=value;lightingDirty=true;
}
function activateSpot(id,instant=false){
 const v=views[id];if(!v)return;const wasWalking=mode==='walk';activeView=id;pressed.clear();touchDirection='';stairActive=false;lastWalkLabel='';floor2=Boolean(v.floor);footY=floor2?UPPER:FLOOR;camera.fov=48;camera.updateProjectionMatrix();
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
 if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();
 $('#floor').textContent=floor2?'↓ 1-qavat':'↑ 2-qavat';$('#floor').classList.toggle('active',floor2);
 if(v.orbit){
  mode='orbit';orbit.enabled=true;document.body.classList.remove('walking');
  if(instant||wasWalking){camera.position.set(...v.position);orbit.target.set(...v.target);transition=null;orbit.update();}
  else transition={from:camera.position.clone(),to:new THREE.Vector3(...v.position),lookFrom:orbit.target.clone(),lookTo:new THREE.Vector3(...v.target),t:0};
 }else{
  mode='walk';orbit.enabled=false;transition=null;document.body.classList.add('walking');camera.position.set(...v.position);footY=v.floor?UPPER:FLOOR;
  const direction=new THREE.Vector3(...v.target).sub(camera.position).normalize();yaw=Math.atan2(-direction.x,-direction.z);pitch=Math.asin(direction.y);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);renderer.domElement.focus({preventScroll:true});
 }
 $('#orbit').classList.toggle('active',mode==='orbit');$('#walk').classList.toggle('active',mode==='walk');
 setCut(id==='aerial');updateWalkLabel();renderer.domElement.dataset.view=id;renderer.domElement.dataset.mode=mode;
}
function updateWalkLabel(){
 const label=stairActive?'Zinapoya':floor2?'2-qavat':'1-qavat';
 if(label!==lastWalkLabel){
  $('#walk-location').textContent=label;
  lastWalkLabel=label;
 }
 $('#floor').textContent=floor2?'↓ 1-qavat':'↑ 2-qavat';
 $('#floor').classList.toggle('active',floor2);
}
const PLAYER_RADIUS=.28,STEPS_PER_METRE=14;
const STAIR_START_Z=1.10,STAIR_END_Z=-5.58;
function onStairs(x,z){return x>-2.30&&x<-.56&&z>STAIR_END_Z&&z<STAIR_START_Z;}
function stairFloor(z){return FLOOR+clamp((.90-z)/6.42,0,1)*(UPPER-FLOOR);}
function walkHeight(x,z){
 if(onStairs(x,z)){stairActive=true;return stairFloor(z);}
 stairActive=false;
 // The previous physical height selects the landing at a staircase exit.
 // Do not select a floor solely from a stale toggle or from camera pitch.
 if(footY>(FLOOR+UPPER)/2)return UPPER;
 if(x>-9&&x<9&&z>-6.1&&z<6.15)return FLOOR;
 if(x>-3.4&&x<0&&z>6.1&&z<8.4)return clamp((8.25-z)/2.0,0,1)*FLOOR;
 return .11;
}
function isBlocked(x,z,level=footY>(FLOOR+UPPER)/2?1:0,fromX=camera.position.x,fromZ=camera.position.z){
 if(x<-21.35||x>21.35||z<-17.8||z>29.3)return true;
 const enteringStair=onStairs(x,z),leavingStair=onStairs(fromX,fromZ);
 // A ramp has two physical entrances. Side entrances would let the camera
 // pass through the balusters or change floor underneath the upper slab.
 if(enteringStair!==leavingStair){
  if(enteringStair){
   const fromBottom=fromZ>=STAIR_START_Z&&footY<FLOOR+.48;
   const fromTop=fromZ<=STAIR_END_Z&&footY>UPPER-.48;
   if(!fromBottom&&!fromTop)return true;
  }else{
   const throughBottom=z>=STAIR_START_Z&&stairFloor(fromZ)<FLOOR+.48;
   const throughTop=z<=STAIR_END_Z&&stairFloor(fromZ)>UPPER-.48;
   if(!throughBottom&&!throughTop)return true;
  }
 }
 if(enteringStair){
  // The space between the two continuous handrails is the walkable ramp.
  if(x<-2.02||x>-.84)return true;
  return false;
 }
 if(level===1){
  const indoors=x>-8.97&&x<8.97&&z>-6.02&&z<6.18;
  const balcony=x>.40&&x<9.65&&z>5.97&&z<8.34;
  if(!indoors&&!balcony)return true;
  // The upper level has a real opening over the staircase, not an invisible floor.
  if(x>-2.50&&x<-.36&&z>-5.57&&z<1.08)return true;
 }
 for(const c of colliders){
  if(c.level!==level)continue;
  if(x>c.minX-PLAYER_RADIUS&&x<c.maxX+PLAYER_RADIUS&&z>c.minZ-PLAYER_RADIUS&&z<c.maxZ+PLAYER_RADIUS)return true;
 }
 if(level===0&&doors[0].angle<.64&&x>-2.88&&x<-.52&&Math.abs(z-6.13)<.28)return true;
 return false;
}
const forward=new THREE.Vector3(),right=new THREE.Vector3();
function moveStep(dx,dz){
 const distance=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(distance*STEPS_PER_METRE));
 for(let i=0;i<steps;i++){
  const sx=dx/steps,sz=dz/steps;
  const oldX=camera.position.x,oldZ=camera.position.z;
  const nextX=oldX+sx;
  if(!isBlocked(nextX,oldZ,footY>(FLOOR+UPPER)/2?1:0,oldX,oldZ))camera.position.x=nextX;
  const nextZ=oldZ+sz;
  if(!isBlocked(camera.position.x,nextZ,footY>(FLOOR+UPPER)/2?1:0,camera.position.x,oldZ))camera.position.z=nextZ;
  footY=walkHeight(camera.position.x,camera.position.z);
  floor2=footY>(FLOOR+UPPER)/2;
 }
 // Snap the eye to the actual floor at each step, rather than letting a
 // smoothed camera momentarily drift through slabs and staircase treads.
 camera.position.y=footY+1.62;
 updateWalkLabel();
}
function move(dt){
 const f=Number(pressed.has('w')||pressed.has('arrowup')||touchDirection==='forward')-Number(pressed.has('s')||pressed.has('arrowdown')||touchDirection==='back');
 const s=Number(pressed.has('d')||pressed.has('arrowright')||touchDirection==='right')-Number(pressed.has('a')||pressed.has('arrowleft')||touchDirection==='left');
 if(!f&&!s)return;
 camera.getWorldDirection(forward);forward.y=0;forward.normalize();
 right.crossVectors(forward,THREE.Object3D.DEFAULT_UP).normalize();
 const speed=(pressed.has('shift')?4.3:2.15)*dt/Math.hypot(f,s);
 moveStep((forward.x*f+right.x*s)*speed,(forward.z*f+right.z*s)*speed);
}
function updateDoors(dt){
 for(const door of doors){const near=mode==='walk'&&Math.hypot(camera.position.x-door.x,camera.position.z-door.z)<2.8&&!floor2;
  if(elapsed>doorManualUntil)door.target=near?1.48:0;
  const old=door.angle;door.angle=THREE.MathUtils.damp(door.angle,door.target,5,dt);door.group.rotation.y=door.angle;
  if(Math.abs(old-door.angle)>.001)lightingDirty=true;
 }
 const near=mode==='walk'&&!floor2&&Math.hypot(camera.position.x+1.72,camera.position.z-6.13)<3;
 $('#door-hint').hidden=!near;
}
function look(dx,dy){yaw-=dx*.0025;pitch=clamp(pitch-dy*.0023,-1.22,1.22);}
window.addEventListener('keydown',e=>{
 if(e.target?.matches?.('input,textarea,select,[contenteditable]'))return;const k=e.key.toLowerCase();
 if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(k)){e.preventDefault();if(mode!=='walk'&&k!=='shift')activateSpot('living');pressed.add(k);}
 if(k==='escape'){if(photo)setPhoto(false);else if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();else if(mode==='walk')activateSpot('outside');}
 if(k==='e'&&mode==='walk'&&!e.repeat&&Math.hypot(camera.position.x+1.72,camera.position.z-6.13)<3){doors[0].target=doors[0].target>.5?0:1.48;doorManualUntil=elapsed+4;}
 if(k==='h'&&!e.repeat)setPhoto(!photo);
});
window.addEventListener('keyup',e=>pressed.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{pressed.clear();touchDirection='';dragPointer=null;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pressed.clear();touchDirection='';last=performance.now();}});
renderer.domElement.addEventListener('pointerdown',e=>{
 renderer.domElement.focus({preventScroll:true});if(mode!=='walk')return;
 dragPointer={id:e.pointerId,x:e.clientX,y:e.clientY};try{renderer.domElement.setPointerCapture(e.pointerId);}catch(err){}
 if(e.pointerType==='mouse'&&document.pointerLockElement!==renderer.domElement){try{const p=renderer.domElement.requestPointerLock?.();p?.catch?.(()=>{});}catch(err){}}
});
renderer.domElement.addEventListener('pointermove',e=>{if(mode!=='walk'||!dragPointer||document.pointerLockElement===renderer.domElement||e.pointerId!==dragPointer.id)return;look(e.clientX-dragPointer.x,e.clientY-dragPointer.y);dragPointer.x=e.clientX;dragPointer.y=e.clientY;});
document.addEventListener('mousemove',e=>{if(mode==='walk'&&document.pointerLockElement===renderer.domElement)look(e.movementX,e.movementY);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,()=>dragPointer=null);
for(const b of document.querySelectorAll('[data-move]')){b.addEventListener('pointerdown',e=>{e.preventDefault();if(mode!=='walk')activateSpot('living');touchDirection=b.dataset.move;try{b.setPointerCapture(e.pointerId);}catch(err){}});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>touchDirection='');}
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>activateSpot(b.dataset.view));
$('#orbit').onclick=()=>activateSpot('outside');$('#walk').onclick=()=>activateSpot(mode==='walk'?'outside':floor2?'bed2':'living');
$('#floor').onclick=()=>activateSpot(floor2?'living':'bed2');$('#cutaway').onclick=()=>setCut(!cut);
$('#daynight').onclick=()=>setTime(timeOfDay==='day'?'golden':timeOfDay==='golden'?'night':'day');
$('#reset').onclick=()=>{activateSpot('outside');setTime('day');setPhoto(false);};
$('#quality').onchange=e=>setQuality(e.target.value);
$('#zoom-in').onclick=()=>{if(mode==='orbit'){camera.position.lerp(orbit.target,.16);transition=null;}else{camera.fov=clamp(camera.fov-4,36,66);camera.updateProjectionMatrix();}};
$('#zoom-out').onclick=()=>{if(mode==='orbit'){camera.position.sub(orbit.target).multiplyScalar(1.16).add(orbit.target);transition=null;}else{camera.fov=clamp(camera.fov+4,36,66);camera.updateProjectionMatrix();}};
function setPhoto(value){photo=value;document.body.classList.toggle('photo-mode',photo);$('#photo').classList.toggle('active',photo);$('#photo').setAttribute('aria-pressed',String(photo));}
$('#photo').onclick=()=>setPhoto(!photo);$('#exit-photo').onclick=()=>setPhoto(false);
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){$('#fullscreen').textContent='F11';}};
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);lightingDirty=true;}window.addEventListener('resize',resize);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();showFailure('Grafik xotira band bo‘ldi. Sahifani yangilang va «Tez» sifatini tanlang.');});
setQuality(quality);setTime('day');activateSpot('outside',true);
// A compact public state supports automated geometry and navigation checks without UI clutter.
const qa={scene,camera,colliders,views,activateSpot,moveStep,isBlocked,walkHeight,setCut,setTime,setQuality,getState:()=>({mode,floor2,cut,timeOfDay,quality,footY}),doors,levels:{ground:FLOOR,upper:UPPER}};
if(new URLSearchParams(location.search).has('qa'))Object.defineProperty(window,'__houseQA',{value:qa});
function render(t){
 requestAnimationFrame(render);const dt=Math.min((t-last)*.001,.045);last=t;elapsed+=dt;frame++;
 if(document.hidden)return;
 if(transition){transition.t=Math.min(1,transition.t+dt*.86);const s=1-Math.pow(1-transition.t,3);camera.position.lerpVectors(transition.from,transition.to,s);orbit.target.lerpVectors(transition.lookFrom,transition.lookTo,s);if(transition.t===1)transition=null;}
 if(mode==='orbit')orbit.update();else{camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);move(dt);camera.position.y=footY+1.62;}
 updateDoors(dt);pool.material.uniforms.time.value+=dt*.28;for(const u of animatedLeaves)u.value=elapsed;
 renderer.shadowMap.needsUpdate=lightingDirty;renderer.render(scene,camera);lightingDirty=false;
}
$('#load-detail').textContent='Uy sayohatga tayyor';
// Compile first: a slow shader compile should never be mistaken for a fully loaded model.
renderer.compile(scene,camera);renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);lightingDirty=false;
setQuality(quality);
 $('#loading').style.opacity='0';setTimeout(()=>$('#loading')?.remove(),650);requestAnimationFrame(render);
if(embedded&&!new URLSearchParams(location.search).has('expanded'))document.body.classList.add('compact');

