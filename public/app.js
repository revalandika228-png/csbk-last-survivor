const socket=io();
const $=id=>document.getElementById(id);
let joined=false,myId=null,myHorns=0,audioCtx=null,musicOn=false,musicTimer=null;
const canvas=$("fx"),ctx=canvas.getContext("2d");let bits=[],popTexts=[];
function resize(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;canvas.style.width=innerWidth+"px";canvas.style.height=innerHeight+"px";ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}addEventListener("resize",resize);resize();
function audio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx}
function tone(freq,duration=.15,type="sine",volume=.08,when=0){const a=audio(),o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,a.currentTime+when);g.gain.setValueAtTime(.001,a.currentTime+when);g.gain.exponentialRampToValueAtTime(volume,a.currentTime+when+.015);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+when+duration);o.connect(g);g.connect(a.destination);o.start(a.currentTime+when);o.stop(a.currentTime+when+duration+.03)}
function hornSound(){[392,523,659].forEach((f,i)=>tone(f,.22,"sawtooth",.055,i*.045))}
function birthdayJingle(){const notes=[523,523,587,523,698,659,523,523,587,523,784,698,523,523,1047,880,698,659,587,932,932,880,698,784,698];notes.forEach((n,i)=>tone(n,.22,"triangle",.055,i*.24))}
function startMusic(){audio();musicOn=!musicOn;if(musicOn){$("music").textContent="♫ MATIKAN MUSIK";birthdayJingle();musicTimer=setInterval(birthdayJingle,6500);$("soundNote").textContent="🔊 Musik pesta aktif — tekan tombol lagi untuk mematikan."}else{clearInterval(musicTimer);$("music").textContent="♫ NYALAKAN MUSIK ULANG TAHUN";$("soundNote").textContent="🔊 Musik mati. Tombol terompet tetap punya suara."}}
function confetti(x,y,color){for(let i=0;i<24;i++)bits.push({x,y,vx:(Math.random()-.5)*8,vy:-Math.random()*7-1,life:55+Math.random()*35,size:3+Math.random()*5,color:color??`hsl(${Math.random()*360},95%,65%)`,rot:Math.random()*6})}
function hornFx(e){confetti(innerWidth*e.x/100,innerHeight*e.y/100,`hsl(${e.color},95%,65%)`);popTexts.push({x:innerWidth*e.x/100,y:innerHeight*e.y/100,text:"PAAARRTYYY!",life:45,color:`hsl(${e.color},95%,70%)`})}
function animate(){requestAnimationFrame(animate);ctx.clearRect(0,0,innerWidth,innerHeight);bits=bits.filter(b=>b.life-->0);for(const b of bits){b.x+=b.vx;b.y+=b.vy;b.vy+=.16;b.rot+=.1;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.rot);ctx.fillStyle=b.color;ctx.fillRect(-b.size/2,-b.size/2,b.size,b.size*1.5);ctx.restore()}popTexts=popTexts.filter(p=>p.life-->0);for(const p of popTexts){ctx.globalAlpha=Math.min(1,p.life/12);ctx.fillStyle=p.color;ctx.font="bold 20px Fredoka,Arial";ctx.textAlign="center";ctx.fillText(p.text,p.x,p.y-(45-p.life)*1.1)}ctx.globalAlpha=1}animate();
$("join").onclick=()=>{const name=$("name").value.trim();if(!name){$("name").focus();return}socket.emit("join",{name})};$("name").addEventListener("keydown",e=>{if(e.key==="Enter")$("join").click()});
socket.on("joined",p=>{myId=p.id;joined=true;$("joinCard").hidden=true;$("controls").hidden=false;toast(`Selamat datang, ${p.name}!`);});
socket.on("connect",()=>{if(joined)myId=socket.id});
socket.on("partyState",s=>{
 $("online").textContent=Object.keys(s.players).length;$("hornCount").textContent=s.totalHorns;
 const list=$("guests");list.innerHTML="";const ps=Object.values(s.players);$("guestCount").textContent=ps.length+" orang";
 if(!ps.length)list.innerHTML='<span class="empty">Belum ada yang datang. Jadi yang pertama!</span>';
 ps.forEach(p=>{const el=document.createElement("span");el.className="guest";const avatar=document.createElement("i");avatar.className="avatar";avatar.style.background=`hsl(${p.color},85%,62%)`;const label=document.createElement("span");label.textContent=p.name;el.append(avatar,label);list.append(el)});
 const me=s.players[myId];$("myCount").textContent=me?me.horns:0;
 $("roundTime").textContent=s.active?`RONDE ${s.roundKey.split("-").pop()}:00 WIB`:`RONDE ${s.roundKey.split("-").pop()} SELESAI`;
 $("roundHint").textContent=s.active?`Waktu tap tersisa ${s.remaining} detik. Skor tertinggi menang!`:"Ronde ditutup. Tunggu jam berikutnya.";
 $("horn").disabled=!s.active;$("horn").style.opacity=s.active?"1":".45";
 const lb=$("leaderboard");lb.innerHTML="";if(!s.leaderboard.length||s.leaderboard.every(p=>p.roundHorns===0)){lb.innerHTML='<span class="empty">Belum ada terompet di ronde ini.</span>'}else{s.leaderboard.filter(p=>p.roundHorns>0).slice(0,10).forEach((p,i)=>{const row=document.createElement("div");row.className="rankRow";const rank=document.createElement("span");rank.className="rankNo";rank.textContent=["🥇","🥈","🥉"][i]||`#${i+1}`;const name=document.createElement("span");name.className="rankName";name.textContent=p.name;const score=document.createElement("span");score.className="rankScore";score.textContent=`${p.roundHorns} terompet`;row.append(rank,name,score);lb.append(row)})}
 const champ=$("championship");champ.innerHTML="";if(!s.championship||!s.championship.length){champ.innerHTML='<span class="empty">Belum ada poin juara.</span>'}else{s.championship.forEach((p,i)=>{const row=document.createElement("div");row.className="rankRow";const rank=document.createElement("span");rank.className="rankNo";rank.textContent=["👑","🥈","🥉"][i]||`#${i+1}`;const name=document.createElement("span");name.className="rankName";name.textContent=p.name;const score=document.createElement("span");score.className="rankScore";score.textContent=`${p.points} poin`;row.append(rank,name,score);champ.append(row)})}
});
socket.on("hornPop",hornFx);
socket.on("roundClosed",()=>toast("Ronde jam ini sudah ditutup. Tunggu jam berikutnya!"));
socket.on("newRound",r=>{toast(`RONDE BARU ${r.key.replace(/.*-/,"")}:00 WIB! GAS TEROMPET!`);confetti(innerWidth/2,innerHeight*.35)});
socket.on("roundResult",r=>{if(r.winner)toast(`🏆 Pemenang ronde: ${r.winner.name} (${r.winner.roundHorns} terompet)`);else toast("Ronde selesai, belum ada pemenang.")});
socket.on("toast",t=>toast(t));
function toast(t){const el=$("toast");el.textContent=t;el.style.display="block";clearTimeout(el.timer);el.timer=setTimeout(()=>el.style.display="none",2500)}
$("horn").onclick=()=>{if(!joined)return;audio();socket.emit("horn");hornSound();confetti(innerWidth*(.2+Math.random()*.6),innerHeight*(.25+Math.random()*.5));if(navigator.vibrate)navigator.vibrate(25)};
$("music").onclick=startMusic;
