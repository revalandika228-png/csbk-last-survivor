const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true, game: "CSBK MOBA ARENA 3D" }));

const players = {};
const bounds = 24;
const heroes = ["Knight", "Mage", "Ranger"];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

io.on("connection", socket => {
  socket.on("join", data => {
    const name = String(data?.name || "Player").trim().slice(0, 20) || "Player";
    const team = Object.values(players).filter(p => p.team === "blue").length <=
      Object.values(players).filter(p => p.team === "red").length ? "blue" : "red";
    const index = Object.keys(players).length;
    players[socket.id] = {
      id: socket.id, name, team, hero: heroes[index % heroes.length],
      x: team === "blue" ? -15 : 15, z: (Math.random() * 10) - 5,
      hp: 100, maxHp: 100, level: 1, alive: true, lastAttack: 0
    };
    socket.emit("joined", players[socket.id]);
    io.emit("state", { players, minions: [], bases: { blue: 1000, red: 1000 } });
  });

  socket.on("move", pos => {
    const p = players[socket.id];
    if (!p || !p.alive) return;
    p.x = clamp(Number(pos?.x) || p.x, -bounds, bounds);
    p.z = clamp(Number(pos?.z) || p.z, -bounds, bounds);
  });

  socket.on("attack", targetId => {
    const p = players[socket.id];
    const target = players[targetId];
    if (!p || !p.alive || !target || !target.alive || p.team === target.team) return;
    const now = Date.now();
    if (now - p.lastAttack < 700) return;
    const dist = Math.hypot(p.x - target.x, p.z - target.z);
    if (dist > 7) return;
    p.lastAttack = now;
    target.hp = Math.max(0, target.hp - 20);
    if (target.hp <= 0) {
      target.alive = false;
      p.level = Math.min(10, p.level + 1);
      setTimeout(() => {
        if (players[targetId]) {
          const t = players[targetId];
          t.hp = t.maxHp; t.alive = true;
          t.x = t.team === "blue" ? -15 : 15; t.z = 0;
        }
      }, 5000);
    }
  });

  socket.on("skill", targetId => {
    const p = players[socket.id], target = players[targetId];
    if (!p || !p.alive || !target || !target.alive || p.team === target.team) return;
    if (Math.hypot(p.x-target.x, p.z-target.z) > 11) return;
    target.hp = Math.max(0, target.hp - 35);
    if (target.hp <= 0) { target.alive = false; p.level = Math.min(10, p.level+1); }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("state", { players, minions: [], bases: { blue: 1000, red: 1000 } });
  });
});

setInterval(() => {
  io.emit("state", { players, minions: [], bases: { blue: 1000, red: 1000 } });
}, 100);

server.listen(PORT, "0.0.0.0", () => console.log(`CSBK MOBA ARENA 3D running on ${PORT}`));
