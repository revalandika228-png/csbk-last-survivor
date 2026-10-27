const express=require("express"),http=require("http");
const {Server}=require("socket.io");
const app=express(),server=http.createServer(app),io=new Server(server);
app.use(express.static("public"));
app.get("/health",(_,res)=>res.json({ok:true,game:"CSBK LAST SURVIVOR 2026"}));
const PORT=process.env.PORT||3000,W=1000,H=700,MAX=20,players=new Map();
let running=false,zone={x:500,y:350,r:320},shots=[],elapsed=0,last=0;
function clean(n){return String(n||"").trim().replace(/[^a-zA-Z0-9_]/g,"").slice(0,20)}
function spawn(){let a=Math.random()*Math.PI*2,r=Math.random()*210;return{x:500+Math.cos(a)*r,y:350+Math.sin(a)*r}}
function alive(){return [...players.values()].filter(p=>p.alive)}
function state(){return{width:W,height:H,running,zone,players:[...players.values()].map(({id,name,x,y,hp,alive,color})=>({id,name,x,y,hp,alive,color})),shots,aliveCount:alive().length,maxPlayers:MAX}}
function notice(t){io.emit("notice",t)}
function endRound(p){running=false;let message=p?`🏆 JUARA: ${p.name}`:"Ronde berakhir tanpa pemenang.";io.emit("roundEnd",{winner:p?.name||null,message});notice(message)}
io.on("connection",s=>{
 s.emit("state",state());
 s.on("join",raw=>{if(players.has(s.id))return;if(running)return s.emit("errorMessage","Ronde sedang berlangsung.");
 if(players.size>=MAX)return s.emit("errorMessage","Arena penuh (maksimal 20 pemain).");
 let name=clean(raw);if(name.length<3)return s.emit("errorMessage","Username minimal 3 karakter.");
 if([...players.values()].some(p=>p.name.toLowerCase()===name.toLowerCase()))return s.emit("errorMessage","Username sudah dipakai.");
 let pos=spawn();players.set(s.id,{id:s.id,name,...pos,hp:100,alive:true,color:`hsl(${Math.random()*360} 75% 58%)`,input:{},cooldown:0});
 s.emit("joined",{id:s.id,name});notice(`${name} bergabung (${players.size}/${MAX}).`);io.emit("state",state())});
 s.on("input",d=>{let p=players.get(s.id);if(!p||!p.alive||!running)return;p.input={up:!!d.up,down:!!d.down,left:!!d.left,right:!!d.right,attack:!!d.attack,aimX:Number(d.aimX)||p.x+1,aimY:Number(d.aimY)||p.y}});
 s.on("startRound",()=>{if(running)return;if(!players.has(s.id))return s.emit("errorMessage","Gabung arena dulu.");if(players.size<2)return s.emit("errorMessage","Minimal 2 pemain untuk mulai.");
 for(let p of players.values()){p.alive=true;p.hp=100;p.cooldown=0;Object.assign(p,spawn())}zone={x:500,y:350,r:320};shots=[];elapsed=0;running=true;notice("⚔️ PERTANDINGAN DIMULAI! Bertahan sampai akhir!")});
 s.on("nextRound",()=>{if(running)return;shots=[];zone={x:500,y:350,r:320};for(let p of players.values()){Object.assign(p,spawn());p.hp=100;p.alive=true;p.cooldown=0}io.emit("state",state());notice("Arena direset. Tunggu pemain, lalu mulai ronde.")});
 s.on("disconnect",()=>{let p=players.get(s.id);if(p){players.delete(s.id);notice(`${p.name} keluar dari arena.`);if(running&&alive().length<=1)endRound(alive()[0]);io.emit("state",state())}})
});
setInterval(()=>{let dt=1/30;if(running){elapsed+=dt;zone.r=Math.max(65,320-elapsed*2.4);
 for(let p of players.values()){if(!p.alive)continue;let i=p.input||{},dx=(i.right?1:0)-(i.left?1:0),dy=(i.down?1:0)-(i.up?1:0),m=Math.hypot(dx,dy)||1;p.x=Math.max(18,Math.min(W-18,p.x+dx/m*190*dt));p.y=Math.max(18,Math.min(H-18,p.y+dy/m*190*dt));p.cooldown=Math.max(0,p.cooldown-dt);
 if(i.attack&&p.cooldown<=0){let ax=i.aimX-p.x,ay=i.aimY-p.y,l=Math.hypot(ax,ay)||1;shots.push({owner:p.id,x:p.x,y:p.y,vx:ax/l*420,vy:ay/l*420,life:1.2});p.cooldown=.42}
 if(Math.hypot(p.x-zone.x,p.y-zone.y)>zone.r){p.hp-=13*dt;if(p.hp<=0){p.hp=0;p.alive=false;notice(`${p.name} tereliminasi oleh zona!`)}}}
 shots=shots.filter(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.life<=0||b.x<0||b.y<0||b.x>W||b.y>H)return false;for(let p of players.values()){if(!p.alive||p.id===b.owner)continue;if(Math.hypot(p.x-b.x,p.y-b.y)<18){p.hp-=35;if(p.hp<=0){p.hp=0;p.alive=false;notice(`${p.name} tereliminasi!`)}return false}}return true});
 let a=alive();if(a.length<=1)endRound(a[0])}
 if(Date.now()-last>50){io.emit("state",state());last=Date.now()}
},1000/30);
app.get("/api/result",(_,res)=>res.json({running,players:players.size,alive:alive().length}));
server.listen(PORT,"0.0.0.0",()=>console.log("CSBK Last Survivor on "+PORT));
