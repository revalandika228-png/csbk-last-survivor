const socket=io(),canvas=document.getElementById("game"),ctx=canvas.getContext("2d"),username=document.getElementById("username"),joinBtn=document.getElementById("joinBtn"),statusEl=document.getElementById("status"),aliveCount=document.getElementById("aliveCount"),playerCount=document.getElementById("playerCount"),keys={up:false,down:false,left:false,right:false,attack:false};
let state={width:1000,height:700,players:[],shots:[],zone:{x:500,y:350,r:320},running:false},myId=null,joined=false,pointer={x:700,y:350};
function status(t){statusEl.textContent=t}
socket.on("connect",()=>status("Terhubung. Masukkan username lalu gabung arena."));
socket.on("disconnect",()=>status("Koneksi terputus. Muat ulang halaman."));
socket.on("state",s=>{state=s;aliveCount.textContent=s.aliveCount;playerCount.textContent=`${s.players.length}/${s.maxPlayers} pemain`;draw()});
socket.on("joined",d=>{myId=d.id;joined=true;joinBtn.textContent="SUDAH GABUNG";joinBtn.disabled=true;status(`Kamu masuk sebagai ${d.name}. Tunggu pemain lain lalu tekan MULAI.`)});
socket.on("notice",status);socket.on("errorMessage",m=>{status(m);alert(m)});socket.on("roundEnd",r=>{status(r.message);alert(r.message+"\nAdmin perlu memverifikasi pemenang dan hadiah.")});
joinBtn.onclick=()=>{if(!joined)socket.emit("join",username.value)};
document.getElementById("startBtn").onclick=()=>socket.emit("startRound");document.getElementById("resetBtn").onclick=()=>socket.emit("nextRound");
function key(k,v){keys[k]=v}
document.querySelectorAll("[data-key]").forEach(b=>{let k=b.dataset.key;b.addEventListener("pointerdown",e=>{e.preventDefault();key(k,true)});["pointerup","pointerleave","pointercancel"].forEach(ev=>b.addEventListener(ev,()=>key(k,false)))});
let atk=document.getElementById("attackBtn");atk.addEventListener("pointerdown",e=>{e.preventDefault();keys.attack=true});["pointerup","pointerleave","pointercancel"].forEach(ev=>atk.addEventListener(ev,()=>keys.attack=false));
const map={w:"up",ArrowUp:"up",s:"down",ArrowDown:"down",a:"left",ArrowLeft:"left",d:"right",ArrowRight:"right"," ":"attack"};
window.addEventListener("keydown",e=>{if(map[e.key]){keys[map[e.key]]=true;e.preventDefault()}});window.addEventListener("keyup",e=>{if(map[e.key])keys[map[e.key]]=false});
canvas.addEventListener("pointermove",e=>{let r=canvas.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width*canvas.width,y:(e.clientY-r.top)/r.height*canvas.height}});
canvas.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"){let r=canvas.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width*canvas.width,y:(e.clientY-r.top)/r.height*canvas.height};keys.attack=true}});window.addEventListener("pointerup",()=>keys.attack=false);
setInterval(()=>{if(joined&&state.running)socket.emit("input",{...keys,aimX:pointer.x,aimY:pointer.y})},33);
function draw(){let w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle="#10152a";ctx.fillRect(0,0,w,h);ctx.strokeStyle="#1d2542";for(let x=0;x<w;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
let z=state.zone;ctx.fillStyle="rgba(129,75,220,.2)";ctx.beginPath();ctx.rect(0,0,w,h);ctx.arc(z.x,z.y,z.r,0,Math.PI*2,true);ctx.fill("evenodd");ctx.strokeStyle="#b38cff";ctx.lineWidth=4;ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,Math.PI*2);ctx.stroke();
for(let b of state.shots){ctx.fillStyle="#ffd166";ctx.beginPath();ctx.arc(b.x,b.y,6,0,Math.PI*2);ctx.fill()}
for(let p of state.players){ctx.globalAlpha=p.alive?1:.3;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,15,0,Math.PI*2);ctx.fill();if(p.id===myId){ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,20,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;ctx.fillStyle="#fff";ctx.font="bold 14px system-ui";ctx.textAlign="center";ctx.fillText(p.name,p.x,p.y-25);ctx.fillStyle="#3b1f32";ctx.fillRect(p.x-18,p.y+20,36,5);ctx.fillStyle=p.hp>50?"#8ef0bb":"#ff647c";ctx.fillRect(p.x-18,p.y+20,36*Math.max(0,p.hp)/100,5)}
if(!state.running){ctx.fillStyle="rgba(5,7,16,.55)";ctx.fillRect(0,0,w,h);ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="900 38px system-ui";ctx.fillText("CSBK LAST SURVIVOR",w/2,h/2-12);ctx.font="18px system-ui";ctx.fillStyle="#d7dcf6";ctx.fillText(joined?"Menunggu ronde dimulai":"Gabung arena untuk bermain",w/2,h/2+25)}}
draw();