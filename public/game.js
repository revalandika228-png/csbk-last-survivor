import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const socket = io();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91b8d2);
scene.fog = new THREE.Fog(0x91b8d2, 35, 95);
const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, .1, 180);
camera.position.set(0, 29, 36);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:"high-performance"});
renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xd9f2ff,0x32462c,2.0));
const sun = new THREE.DirectionalLight(0xfff1d1,2.5); sun.position.set(-15,30,10); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);
const mat = (color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const groundMat=mat(0x47764c), laneMat=mat(0x8c9b9c), stoneMat=mat(0x657581), goldMat=mat(0xf2c45e,.35,.55);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(100,100),groundMat); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
function box(x,y,z,sx,sy,sz,material){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m}
function cylinder(x,y,z,r1,r2,h,material,segments=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material);m.position.set(x,y,z);m.castShadow=true;scene.add(m);return m}
// Three-lane arena and readable paths
box(0,.02,0,12,.08,60,laneMat);box(0,.03,0,60,.08,12,laneMat);
for(let i=-24;i<=24;i+=4){box(i,.08,0,.18,.05,11,mat(0xb9c5c2));box(0,.08,i,11,.05,.18,mat(0xb9c5c2))}
for(const x of [-25,25]) for(const z of [-25,25]){cylinder(x,.6,z,3.1,3.7,1.2,mat(0x2f4f3a));cylinder(x,1.3,z,1.6,2.4,1.2,mat(0x426a49));}
function tower(x,z,color){cylinder(x,.65,z,1.45,1.8,1.3,mat(0x3b4854));cylinder(x,1.9,z,.8,1.1,1.4,mat(color,.35,.35));cylinder(x,2.75,z,.28,.5,.5,goldMat);const ring=new THREE.Mesh(new THREE.TorusGeometry(1.05,.12,8,20),mat(color,.35,.3));ring.rotation.x=Math.PI/2;ring.position.set(x,1.4,z);scene.add(ring)}
for(const z of [-15,0,15]){tower(-16,z,0x35bfff);tower(16,z,0xff536a)}
tower(-24,0,0x35bfff);tower(24,0,0xff536a);
// Decorative trees and rocks around the playable arena
for(let i=0;i<60;i++){let x=(Math.random()-.5)*86,z=(Math.random()-.5)*86;if(Math.abs(x)<29&&Math.abs(z)<29)continue;const trunk=cylinder(x,.55,z,.25,.35,1.1,mat(0x5d4530),7);const crown=new THREE.Mesh(new THREE.ConeGeometry(1.15,2.7,7),mat(i%2?0x285f42:0x39754b));crown.position.set(x,2.1,z);crown.castShadow=true;scene.add(crown)}
const models={};
let myId=null,myPlayer=null,joined=false;
const colors={blue:0x27baff,red:0xff536a};
function createHero(p){
 const g=new THREE.Group();const teamMat=mat(colors[p.team],.42,.12), skin=mat(0xffcba1), dark=mat(0x202c3a), armor=mat(p.hero==="Mage"?0x754de0:p.hero==="Ranger"?0x287b5e:0x54758e,.45,.2);
 const torso=new THREE.Mesh(new THREE.BoxGeometry(1.05,1.05,.58),armor);torso.position.y=1.45;torso.castShadow=true;g.add(torso);
 const head=new THREE.Mesh(new THREE.BoxGeometry(.72,.72,.72),skin);head.position.y=2.35;head.castShadow=true;g.add(head);
 const hair=new THREE.Mesh(new THREE.BoxGeometry(.76,.22,.76),dark);hair.position.y=2.76;g.add(hair);
 for(const side of [-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.35,.8,.4),dark);leg.position.set(side*.27,.48,0);leg.castShadow=true;g.add(leg);const arm=new THREE.Mesh(new THREE.BoxGeometry(.3,.9,.35),teamMat);arm.position.set(side*.72,1.45,0);arm.castShadow=true;g.add(arm)}
 const badge=new THREE.Mesh(new THREE.TorusGeometry(.78,.08,6,24),teamMat);badge.rotation.x=Math.PI/2;badge.position.y=.12;g.add(badge);
 const label=document.createElement("canvas");label.width=256;label.height=64;const ctx=label.getContext("2d");ctx.fillStyle="#07121ddd";ctx.fillRect(5,5,246,54);ctx.fillStyle=p.team==="blue"?"#60d7ff":"#ff8191";ctx.font="bold 28px Arial";ctx.textAlign="center";ctx.fillText((p.name||"PLAYER").slice(0,16),128,40);
 const tex=new THREE.CanvasTexture(label);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));sprite.scale.set(4,1,1);sprite.position.y=3.65;g.add(sprite);
 const hpBack=new THREE.Mesh(new THREE.BoxGeometry(1.5,.12,.05),mat(0x391f2b));hpBack.position.y=3.25;g.add(hpBack);
 const hpFill=new THREE.Mesh(new THREE.BoxGeometry(1.45,.08,.06),mat(0x4cff9b));hpFill.position.set(0,3.25,.04);g.add(hpFill);
 scene.add(g);return {g,hpFill,p};
}
function updateHero(p){
 let o=models[p.id];if(!o){o=createHero(p);models[p.id]=o}
 o.p=p;o.g.position.set(p.x,0,p.z);o.g.visible=p.alive;
 o.hpFill.scale.x=Math.max(.001,p.hp/p.maxHp);o.hpFill.position.x=-(1.45-o.hpFill.scale.x*1.45)/2;
 o.g.rotation.y=p.team==="blue"?Math.PI/2:-Math.PI/2;
}
socket.on("joined",p=>{myId=p.id;myPlayer=p;joined=true;document.getElementById("joinScreen").style.display="none";document.getElementById("myName").textContent=p.name.toUpperCase();document.getElementById("myHero").textContent=p.hero.toUpperCase();document.getElementById("notice").style.display="block";document.getElementById("notice").textContent="KAMU TIM "+p.team.toUpperCase();setTimeout(()=>document.getElementById("notice").style.display="none",2200)});
socket.on("state",s=>{const ids=new Set(Object.keys(s.players));for(const id in models)if(!ids.has(id)){scene.remove(models[id].g);delete models[id]}let b=0,r=0;for(const p of Object.values(s.players)){updateHero(p);if(p.team==="blue")b++;else r++;if(p.id===myId){myPlayer=p;document.getElementById("hpBar").style.width=(p.hp/p.maxHp*100)+"%";document.getElementById("hpText").textContent=`${p.hp} / ${p.maxHp} HP`;document.getElementById("myHero").textContent=p.hero.toUpperCase()+" • LV "+p.level}}document.getElementById("blueCount").textContent=b;document.getElementById("redCount").textContent=r});
document.getElementById("joinBtn").onclick=()=>{const name=document.getElementById("playerName").value.trim();if(!name){document.getElementById("playerName").focus();return}socket.emit("join",{name})};
document.getElementById("playerName").addEventListener("keydown",e=>{if(e.key==="Enter")document.getElementById("joinBtn").click()});
const keys={};addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true});addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false});
let joy={x:0,z:0};const joystick=document.getElementById("joystick"),stick=document.getElementById("stick");let touching=false;
function joyMove(e){const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const len=Math.hypot(dx,dy),max=38;if(len>max){dx=dx/len*max;dy=dy/len*max}joy.x=dx/max;joy.z=dy/max;stick.style.transform=`translate(${dx}px,${dy}px)`}
joystick.addEventListener("pointerdown",e=>{touching=true;joystick.setPointerCapture(e.pointerId);joyMove(e)});joystick.addEventListener("pointermove",e=>{if(touching)joyMove(e)});function joyEnd(){touching=false;joy.x=joy.z=0;stick.style.transform=""}joystick.addEventListener("pointerup",joyEnd);joystick.addEventListener("pointercancel",joyEnd);
document.getElementById("attackBtn").onclick=()=>attackNearest(false);document.getElementById("skillBtn").onclick=()=>attackNearest(true);
function attackNearest(skill){if(!myPlayer)return;let target=null,dist=skill?11:7;for(const p of Object.values(models).map(o=>o.p)){if(!p||p.id===myId||p.team===myPlayer.team||!p.alive)continue;let d=Math.hypot(p.x-myPlayer.x,p.z-myPlayer.z);if(d<dist){dist=d;target=p}}if(target)socket.emit(skill?"skill":"attack",target.id);else toast("LAWAN TERLALU JAUH")}
let lastMove=0;function toast(t){const n=document.getElementById("notice");n.textContent=t;n.style.display="block";clearTimeout(toast.timer);toast.timer=setTimeout(()=>n.style.display="none",1200)}
function loop(){requestAnimationFrame(loop);if(joined&&myPlayer){let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joy.x;let dz=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joy.z;let l=Math.hypot(dx,dz);if(l>0){dx/=l;dz/=l;const speed=.16;const x=Math.max(-24,Math.min(24,myPlayer.x+dx*speed)),z=Math.max(-24,Math.min(24,myPlayer.z+dz*speed));const now=performance.now();if(now-lastMove>45){socket.emit("move",{x,z});lastMove=now}}camera.position.x+=(myPlayer.x-camera.position.x)*.035;camera.position.z+=(myPlayer.z+29-camera.position.z)*.035;camera.lookAt(myPlayer.x,0,myPlayer.z)}
renderer.render(scene,camera)}
loop();addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6))});
