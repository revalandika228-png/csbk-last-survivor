const express=require("express"),http=require("http"),WebSocket=require("ws"),fs=require("fs"),path=require("path");
const app=express(),server=http.createServer(app),wss=new WebSocket.Server({server}),PORT=process.env.PORT||3000,ADMIN_PIN=process.env.ADMIN_PIN||"CSBK2026",DISCORD_WEBHOOK_URL=process.env.DISCORD_WEBHOOK_URL||"",FILE=path.join(__dirname,"data.json");
const defaults=[
["zonk1","ZONK",35,"#64748b",false],["zonk2","ZONK",20,"#475569",false],["zonk3","ZONK",15,"#334155",false],
["robux5","5 ROBUX",8,"#22c55e",false],["rp1000","Rp1.000",7,"#38bdf8",false],["robux10","10 ROBUX",5,"#16a34a",false],
["rp2000","Rp2.000",4,"#a78bfa",false],["indo","JAJAN INDOMARET maks Rp10rb",2,"#ef4444",false],
["alfa","JAJAN ALFAMART maks Rp10rb",2,"#f97316",false],["token","TOKEN LISTRIK Rp10rb",1.8,"#facc15",false],["rp10000","Rp10.000",0.2,"#ec4899",true]];
const fresh=()=>({prizes:defaults.map(([id,name,weight,color,limited])=>({id,name,weight,color,limited,active:true})),participants:{},history:[],spin:null,nextDrawId:1});
let state=fresh();try{if(fs.existsSync(FILE)){let x=JSON.parse(fs.readFileSync(FILE));if(x.prizes&&x.participants&&x.history)state=x}}catch(e){}
const save=()=>{try{fs.writeFileSync(FILE,JSON.stringify(state,null,2))}catch(e){console.error(e)}};
const pub=()=>({prizes:state.prizes.map(({id,name,weight,color,active})=>({id,name,weight,color,active})),participants:Object.values(state.participants).map(p=>({name:p.name,tier:p.tier,tickets:p.tickets,usedTickets:p.usedTickets})),history:state.history.slice(0,100),spin:state.spin,nextDrawId:state.nextDrawId});
function sendAll(type,extra={}){let packet=JSON.stringify({type,state:pub(),...extra});wss.clients.forEach(c=>{if(c.readyState===1)c.send(packet)})}
function pick(){let ps=state.prizes.filter(p=>p.active);return ps[Math.floor(Math.random()*ps.length)]}

async function notifyDiscord(result){
  if(!DISCORD_WEBHOOK_URL)return;
  const isZonk=String(result.prize).toUpperCase().includes("ZONK");
  const payload={
    username:"CSBK Lucky Wheel",
    embeds:[{
      title:isZonk?"🎡 Hasil Lucky Wheel — ZONK":"🎉 Hasil Lucky Wheel — Dapat Hadiah!",
      description:isZonk?`**${result.participant}** mendapatkan **ZONK**. Semoga beruntung di putaran berikutnya!`:`Selamat kepada **${result.participant}** yang mendapatkan **${result.prize}**!`,
      color:isZonk?0x64748b:0xff5db1,
      fields:[{name:"Peserta",value:String(result.participant).slice(0,100),inline:true},{name:"Tier",value:String(result.tier||"Peserta"),inline:true},{name:"Hasil",value:String(result.prize).slice(0,200),inline:false}],
      footer:{text:"CSBK Birthday Fest 2026 • Lucky Wheel"},
      timestamp:result.at||new Date().toISOString()
    }]
  };
  const response=await fetch(DISCORD_WEBHOOK_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
}
app.use(express.static(path.join(__dirname,"public")));app.get("/api/state",(q,r)=>r.json(pub()));app.get("/health",(q,r)=>r.json({ok:true}));
wss.on("connection",ws=>{ws.isAdmin=false;ws.send(JSON.stringify({type:"state",state:pub()}));ws.on("message",raw=>{let m;try{m=JSON.parse(raw)}catch{return}const reply=(type,x={})=>ws.send(JSON.stringify({type,state:pub(),...x}));
if(m.type==="adminAuth"){ws.isAdmin=String(m.pin||"")===ADMIN_PIN;reply("adminAuth",{ok:ws.isAdmin,message:ws.isAdmin?"Admin aktif.":"PIN admin salah."});return}
if(m.type==="join"){let name=String(m.name||"").trim().replace(/\s+/g," "),discordName=String(m.discordName||"").trim().replace(/\s+/g," "),participantPin=String(m.participantPin||"").trim();if(!name||name.length<2||!discordName||!participantPin||!m.accepted)return reply("error",{message:"Isi username Discord, nama peserta, PIN peserta, dan centang pernyataan identitas."});let key=name.toLowerCase(),p=state.participants[key];if(!p)return reply("error",{message:"Nama belum ada di daftar peserta. Hubungi owner CSBK."});if(p.discordName.toLowerCase()!==discordName.toLowerCase())return reply("error",{message:"Username Discord tidak cocok dengan daftar peserta."});if(!p.pin||p.pin!==participantPin)return reply("error",{message:"PIN peserta salah. Minta atau konfirmasi PIN kepada owner CSBK melalui japri."});ws.participantKey=key;reply("joined",{ok:true,participant:{name:p.name,tickets:p.tickets,usedTickets:p.usedTickets,tier:p.tier},message:"Identitas dan PIN terverifikasi."});return}
if(m.type==="spin"){if(!ws.participantKey)return reply("error",{message:"Verifikasi nama terlebih dahulu."});if(state.spin&&state.spin.status==="spinning")return reply("error",{message:"Roda sedang berputar."});let p=state.participants[ws.participantKey];if(!p||p.usedTickets>=p.tickets)return reply("error",{message:"Tiket kamu sudah habis."});let prize=pick();if(!prize)return reply("error",{message:"Tidak ada hadiah aktif."});p.usedTickets++;let id=state.nextDrawId++;state.spin={id,status:"spinning",participant:p.name,prizeId:prize.id,startedAt:Date.now(),duration:6500};save();sendAll("spinStart",{spin:state.spin});setTimeout(()=>{if(prize.limited)prize.active=false;state.spin={...state.spin,status:"done",finishedAt:Date.now()};state.history.unshift({id,name:p.name,prize:prize.name,prizeId:prize.id,at:new Date().toISOString(),tier:p.tier,ticketUsed:p.usedTickets});save();const result={id,participant:p.name,prize:prize.name,prizeId:prize.id,tier:p.tier,at:new Date().toISOString()};sendAll("spinResult",{result});notifyDiscord(result).catch(err=>console.error("Discord webhook gagal:",err.message))},6500);return}
if(m.type==="adminAddParticipant"){if(!ws.isAdmin)return reply("error",{message:"Login admin diperlukan."});let name=String(m.name||"").trim().replace(/\s+/g," "),discordName=String(m.discordName||"").trim().replace(/\s+/g," "),pin=String(m.participantPin||"").trim(),tier=String(m.tier||"Rookie"),nums={Rookie:1,Hunter:2,Grinder:3,Investor:4,Elite:5,Sultan:6,Overlord:7};if(!name||!discordName||!pin)return reply("error",{message:"Isi nama peserta, username Discord, dan PIN peserta yang kamu buat sendiri."});if(pin.length<4)return reply("error",{message:"PIN peserta minimal 4 karakter."});state.participants[name.toLowerCase()]={name,discordName,pin,tier,tickets:nums[tier]||1,usedTickets:0};save();sendAll("state");reply("adminMessage",{message:`${name} ditambahkan dengan ${nums[tier]||1} tiket dan PIN peserta tersimpan.`});return}
if(m.type==="adminResetTickets"){if(!ws.isAdmin)return reply("error",{message:"Login admin diperlukan."});Object.values(state.participants).forEach(p=>p.usedTickets=0);save();sendAll("state");reply("adminMessage",{message:"Semua tiket direset."});return}
})});
server.listen(PORT,"0.0.0.0",()=>console.log("CSBK Lucky Wheel on "+PORT));