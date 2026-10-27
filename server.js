const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'scores.json');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true }));

function readScores() {
  try { const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); return Array.isArray(data) ? data : []; }
  catch { return []; }
}
function writeScores(scores) { fs.writeFileSync(DATA_FILE, JSON.stringify(scores, null, 2)); }
async function sendDiscord(text) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text }) });
    if (!response.ok) console.error('Discord webhook returned', response.status);
    return response.ok;
  } catch (err) { console.error('Discord webhook error:', err.message); return false; }
}
app.get('/api/scores', (_req, res) => {
  const scores = readScores().sort((a,b) => b.score - a.score || b.accuracy - a.accuracy).slice(0, 10);
  res.json({ scores });
});
app.post('/api/scores', async (req, res) => {
  const name = String(req.body?.name || '').trim().replace(/[\r\n<>@]/g, '').slice(0, 24) || 'Peserta';
  const score = Number(req.body?.score);
  const accuracy = Math.max(0, Math.min(100, Number(req.body?.accuracy) || 0));
  const maxCombo = Math.max(0, Math.floor(Number(req.body?.maxCombo) || 0));
  if (!Number.isFinite(score) || score < 0 || score > 1000000) return res.status(400).json({ error: 'Skor tidak valid.' });
  const scores = readScores();
  const existing = scores.find(s => s.name.toLowerCase() === name.toLowerCase());
  const oldTop = [...scores].sort((a,b) => b.score-a.score)[0];
  let isNewRecord = false;
  if (existing) {
    if (score > existing.score) { existing.name = name; existing.score = Math.floor(score); existing.accuracy = accuracy; existing.maxCombo = maxCombo; existing.updatedAt = new Date().toISOString(); isNewRecord = !oldTop || score > oldTop.score; }
  } else {
    scores.push({ name, score: Math.floor(score), accuracy, maxCombo, updatedAt: new Date().toISOString() });
    isNewRecord = !oldTop || score > oldTop.score;
  }
  scores.sort((a,b) => b.score-a.score || b.accuracy-a.accuracy);
  writeScores(scores);
  if (isNewRecord) {
    const top = scores[0];
    await sendDiscord(`🎉 **CSBK BIRTHDAY RHYTHM — REKOR BARU!**\n\n🏆 **Peringkat teratas:** ${top.name}\n🎵 **Skor:** ${top.score} poin\n🎯 **Akurasi:** ${top.accuracy}%\n🔥 **Combo terbaik:** ${top.maxCombo}×\n\n👑 **PEROLEHAN POIN**\n🥇 ${top.name} — ${top.score} poin\n\n📌 Skor tertinggi saat ini memimpin papan peringkat CSBK Guitar Hero.`);
  }
  res.json({ ok: true, isNewRecord, scores: scores.slice(0,10) });
});
app.listen(PORT, '0.0.0.0', () => console.log(`CSBK Guitar Hero running on ${PORT}`));
