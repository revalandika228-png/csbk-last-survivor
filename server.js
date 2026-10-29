const express=require("express"),http=require("http"),WebSocket=require("ws"),fs=require("fs"),path=require("path");
const app=express(),server=http.createServer(app),wss=new WebSocket.Server({server}),PORT=process.env.PORT||3000,ADMIN_PIN=process.env.ADMIN_PIN||"CSBK2026",DISCORD_WEBHOOK_URL=process.env.DISCORD_WEBHOOK_URL||"",DATA_DIR=(fs.existsSync("/app/data")?"/app/data":__dirname),FILE=path.join(DATA_DIR,"data.json");
const defaults=[
["zonk1","ZONK",14.228571428571429,"#64748b",false],["zonk2","ZONK",14.228571428571429,"#475569",false],["zonk3","ZONK",14.228571428571429,"#334155",false],
["robux5","5 ROBUX",14.228571428571429,"#22c55e",false],["rp1000","Rp1.000",14.228571428571429,"#38bdf8",false],["robux10","10 ROBUX",14.228571428571429,"#16a34a",false],
["rp2000","Rp2.000",14.228571428571429,"#a78bfa",false],["indo","JAJAN INDOMARET maks Rp10rb",0.1,"#ef4444",false],
["alfa","JAJAN ALFAMART maks Rp10rb",0.1,"#f97316",false],["token","TOKEN LISTRIK Rp10rb",0.1,"#facc15",false],["rp10000","Rp10.000",0.1,"#ec4899",true]];
const fresh=()=>({prizes:defaults.map(([id,name,weight,color,limited])=>({id,name,weight,color,limited,active:true})),participants:{},history:[],spin:null,nextDrawId:1});
let state=fresh();
try {
  // Railway Volume migration: if /app/data/data.json is absent, seed it from the bundled
  // backup data.json. This preserves the known 13 draw records on first deployment.
  if (DATA_DIR === "/app/data" && !fs.existsSync(FILE)) {
    const legacyFile = path.join(__dirname, "data.json");
    if (fs.existsSync(legacyFile)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.copyFileSync(legacyFile, FILE);
      console.log("Migrated bundled data.json to Railway Volume.");
    }
  }
  if (fs.existsSync(FILE)) {
    const x = JSON.parse(fs.readFileSync(FILE, "utf8"));
    if (x.prizes && x.participants && x.history) state = x;
  }
} catch (e) { console.error("Failed to load data.json:", e); }
// Safe cleanup requested by owner: remove nantacomel only if they have never drawn.
if(state.participants && !Array.isArray(state.participants)){
  const nk=Object.keys(state.participants).find(k=>k.toLowerCase()==="nantacomel");
  if(nk && Number(state.participants[nk].usedTickets||0)===0 && !state.history.some(h=>String(h.name||"").toLowerCase()==="nantacomel")){
    delete state.participants[nk];
  }
}
// V6 migration: update rates in existing Railway data without touching history or used tickets.
const equalWeight=99.6/7;
const v6Weights={zonk1:equalWeight,zonk2:equalWeight,zonk3:equalWeight,robux5:equalWeight,rp1000:equalWeight,robux10:equalWeight,rp2000:equalWeight,indo:0.1,alfa:0.1,token:0.1,rp10000:0.1};
if(Array.isArray(state.prizes)){
  state.prizes.forEach(p=>{if(Object.prototype.hasOwnProperty.call(v6Weights,p.id))p.weight=v6Weights[p.id]});
}
const save=()=>{try{fs.mkdirSync(DATA_DIR,{recursive:true});fs.writeFileSync(FILE,JSON.stringify(state,null,2))}catch(e){console.error("Gagal menyimpan data:",e)}};
const pub=()=>({prizes:state.prizes.map(({id,name,weight,color,active})=>({id,name,weight,color,active})),participants:Object.values(state.participants).map(p=>({name:p.name,tier:p.tier,tickets:p.tickets,usedTickets:p.usedTickets})),history:state.history.slice(0,100),spin:state.spin,nextDrawId:state.nextDrawId});
function sendAll(type,extra={}){let packet=JSON.stringify({type,state:pub(),...extra});wss.clients.forEach(c=>{if(c.readyState===1)c.send(packet)})}
function pick(){let ps=state.prizes.filter(p=>p.active&&Number(p.weight)>0);let total=ps.reduce((s,p)=>s+Number(p.weight),0);if(!total)return null;let r=Math.random()*total;for(const p of ps){r-=Number(p.weight);if(r<0)return p}return ps[ps.length-1]}

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
if(m.type==="adminAddParticipant"){if(!ws.isAdmin)return reply("error",{message:"Login admin diperlukan."});let name=String(m.name||"").trim().replace(/\s+/g," "),discordName=String(m.discordName||"").trim().replace(/\s+/g," "),pin=String(m.participantPin||"").trim(),tier=String(m.tier||"Rookie"),nums={Rookie:1,Hunter:2,Grinder:3,Investor:4,Elite:5,Sultan:6,Overlord:7};if(!name||!discordName||!pin)return reply("error",{message:"Isi nama peserta, username Discord, dan PIN peserta yang kamu buat sendiri."});if(pin.length<4)return reply("error",{message:"PIN peserta minimal 4 karakter."});const key=name.toLowerCase(),existing=state.participants[key],newTickets=nums[tier]||1;
state.participants[key]={name,discordName,pin,tier,tickets:existing?Math.max(Number(existing.tickets)||newTickets,newTickets):newTickets,usedTickets:existing?Math.min(Number(existing.usedTickets)||0,Math.max(Number(existing.tickets)||newTickets,newTickets)):0};
save();sendAll("state");reply("adminMessage",{message:existing?`${name} diperbarui. Riwayat dan tiket yang sudah digunakan dipertahankan.`:`${name} ditambahkan dengan ${newTickets} tiket dan PIN peserta tersimpan.`});return}
if(m.type==="adminResetTickets"){if(!ws.isAdmin)return reply("error",{message:"Login admin diperlukan."});Object.values(state.participants).forEach(p=>p.usedTickets=0);save();sendAll("state");reply("adminMessage",{message:"Semua tiket direset."});return}
})});
server.listen(PORT,"0.0.0.0",()=>console.log("CSBK Lucky Wheel on "+PORT));