const express=require("express");
const http=require("http");
const fs=require("fs");
const path=require("path");
const {Server}=require("socket.io");
const app=express(),server=http.createServer(app),io=new Server(server);
const PORT=process.env.PORT||3000;
const WEBHOOK=process.env.DISCORD_WEBHOOK_URL||"";
const ROUND_SECONDS=Math.max(15,Math.min(300,Number(process.env.ROUND_SECONDS)||60));
app.use(express.static("public"));
app.get("/health",(_,res)=>res.json({ok:true,game:"CSBK Birthday Party 2026",roundSeconds:ROUND_SECONDS}));
app.get("/api/championship",(_,res)=>res.json(championshipTop()));
const players={};let totalHorns=0,roundHorns=0,roundNumber="",roundEndsAt=0,lastAnnouncedRound="";
const SCORE_FILE=path.join(__dirname,"championship.json");
let championship={scores:{},roundWinners:{},lastUpdated:null};
try{if(fs.existsSync(SCORE_FILE))championship=JSON.parse(fs.readFileSync(SCORE_FILE,"utf8"));}catch(e){console.error("Could not load championship scores:",e.message)}
function saveChampionship(){championship.lastUpdated=new Date().toISOString();try{fs.writeFileSync(SCORE_FILE,JSON.stringify(championship,null,2));}catch(e){console.error("Could not save scores:",e.message)}}
function addChampionshipPoint(name,roundKey){
  const scoreKey=String(name).trim().toLowerCase();
  if(!championship.scores[scoreKey])championship.scores[scoreKey]={name:String(name).slice(0,18),points:0,roundWins:0};
  championship.scores[scoreKey].points+=1;
  championship.scores[scoreKey].roundWins+=1;
  championship.roundWinners[roundKey]=championship.roundWinners[roundKey]||[];
  if(!championship.roundWinners[roundKey].includes(scoreKey))championship.roundWinners[roundKey].push(scoreKey);
  saveChampionship();
}
function championshipTop(){return Object.values(championship.scores).sort((a,b)=>b.points-a.points||b.roundWins-a.roundWins||a.name.localeCompare(b.name)).slice(0,10);}

function jakartaParts(date=new Date()){
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
 const o={};for(const p of parts)o[p.type]=p.value;
 return {year:o.year,month:o.month,day:o.day,hour:Number(o.hour),minute:Number(o.minute),second:Number(o.second)};
}
function roundKey(p){return `${p.year}-${p.month}-${p.day}-${String(p.hour).padStart(2,"0")}`;}
function nextHourStart(now){const p=jakartaParts(now);return Date.now()+((59-p.minute)*60+(60-p.second))*1000;}
function currentRound(){
 const now=new Date(),p=jakartaParts(now),key=roundKey(p);
 // Each hourly round runs for the first ROUND_SECONDS of the hour.
 const secondsIntoHour=p.minute*60+p.second;
 const active=secondsIntoHour<ROUND_SECONDS;
 const startMs=Date.now()-secondsIntoHour*1000;
 return {key,p,active,remaining:active?ROUND_SECONDS-secondsIntoHour:0,startMs,nextStartMs:startMs+3600000};
}
async function discordAnnounce(content){
 if(!WEBHOOK){console.log("[Discord webhook not set]",content);return;}
 try{
  const r=await fetch(WEBHOOK,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content,allowed_mentions:{parse:[]}})});
  if(!r.ok)console.error("Discord webhook error",r.status,await r.text());
 }catch(e){console.error("Discord announcement failed",e.message);}
}
function sortedScores(){return Object.values(players).map(p=>({id:p.id,name:p.name,horns:p.horns,roundHorns:p.roundHorns})).sort((a,b)=>b.roundHorns-a.roundHorns||a.horns-b.horns);}
function snapshot(){
 const r=currentRound();
 return {players,totalHorns,roundHorns,roundKey:r.key,active:r.active,remaining:r.remaining,roundSeconds:ROUND_SECONDS,leaderboard:sortedScores().slice(0,10),championship:championshipTop()};
}
function broadcast(){io.emit("partyState",snapshot());}
async function finishRound(key){
 if(lastAnnouncedRound===key)return;lastAnnouncedRound=key;
 const scores=sortedScores().filter(p=>p.roundHorns>0);
 let message;
 if(!scores.length){
  message=`🎂 **CSBK BIRTHDAY PARTY — HASIL RONDE ${key} WIB**\nBelum ada peserta yang meniup terompet di ronde ini. Ronde berikutnya dimulai tepat jam berikutnya!`;
 }else{
  const max=scores[0].roundHorns, winners=scores.filter(p=>p.roundHorns===max);
  for(const w of winners)addChampionshipPoint(w.name,key);
  const top=championshipTop();
  const topText=top.slice(0,5).map((p,i)=>`${["🥇","🥈","🥉"][i]||"🏅"} ${p.name}: **${p.points} poin**`).join("\\n");
  message=`🎺 **CSBK BIRTHDAY PARTY — PEMENANG RONDE ${key} WIB**\\n🏆 Pemenang ronde: ${winners.map(w=>`**${w.name}**`).join(", ")}\\n🎉 Skor ronde: **${max} terompet**\\n\\n👑 **KLASEMEN CHAMPIONSHIP**\\n${topText}\\n\\nSetiap kemenangan ronde bernilai 1 poin. Juara keseluruhan ditentukan dari total poin ronde selama event. Ronde berikutnya dimulai pada jam tepat berikutnya.`;
 }
 await discordAnnounce(message);
 io.emit("roundResult",{key,scores:scores.slice(0,10),winner:scores[0]||null,message});
 for(const p of Object.values(players))p.roundHorns=0;
 broadcast();
}
io.on("connection",socket=>{
 socket.emit("partyState",snapshot());
 socket.on("join",data=>{
  const name=String(data?.name||"Guest").trim().slice(0,18)||"Guest";
  players[socket.id]={id:socket.id,name,joinedAt:Date.now(),horns:0,roundHorns:0,color:Math.floor(Math.random()*360)};
  socket.emit("joined",{id:socket.id,name});
  broadcast();io.emit("toast",`${name} masuk ke pesta!`);
 });
 socket.on("horn",()=>{
  const p=players[socket.id];if(!p)return;
  const r=currentRound();
  if(!r.active){socket.emit("roundClosed");return;}
  p.horns++;p.roundHorns++;totalHorns++;roundHorns++;
  io.emit("hornPop",{id:socket.id,name:p.name,x:Math.random()*80+10,y:Math.random()*60+15,color:p.color});
  broadcast();
 });
 socket.on("disconnect",()=>{if(players[socket.id]){delete players[socket.id];broadcast()}});
});
let lastKey="",lastFinalDay="";
setInterval(async()=>{
 const r=currentRound();
 const jp=jakartaParts();
 if(jp.hour===23&&jp.minute===59&&jp.second>=50&&lastFinalDay!==`${jp.year}-${jp.month}-${jp.day}`){
   lastFinalDay=`${jp.year}-${jp.month}-${jp.day}`;
   const top=championshipTop();
   const dayLabel=`${jp.day}-${jp.month}-${jp.year}`;
   const finalMsg=top.length
     ? `👑 **CSBK BIRTHDAY CHAMPION — ${dayLabel} WIB**\\n🎂 Juara keseluruhan berdasarkan poin kemenangan ronde:\\n${top.slice(0,10).map((p,i)=>`${["🥇","🥈","🥉"][i]||"🏅"} **${p.name}** — ${p.points} poin (${p.roundWins} kemenangan ronde)`).join("\\n")}\\n\\nTerima kasih sudah meramaikan CSBK Birthday Fest!`
     : `👑 **CSBK BIRTHDAY CHAMPION — ${dayLabel} WIB**\\nBelum ada poin kemenangan yang tercatat hari ini. Terima kasih sudah ikut pesta!`;
   await discordAnnounce(finalMsg);
 }
 if(r.key!==lastKey){
  lastKey=r.key;roundHorns=0;
  io.emit("newRound",{key:r.key,active:r.active,remaining:r.remaining});
  await discordAnnounce(`🎉 **CSBK BIRTHDAY PARTY — RONDE BARU!**\n⏰ Ronde **${r.key} WIB** sudah dimulai!\nBuka link game dan tap tombol terompet selama ${ROUND_SECONDS} detik pertama setiap jam.`);
 }
 if(!r.active&&lastAnnouncedRound!==r.key)await finishRound(r.key);
 broadcast();
},1000);
server.listen(PORT,"0.0.0.0",()=>console.log(`CSBK Birthday Party running on ${PORT}; round=${ROUND_SECONDS}s; Discord webhook=${WEBHOOK?"configured":"not configured"}`));
