# CSBK Birthday Rhythm — Guitar Hero

Game rhythm mobile-friendly berdurasi 3:21, menggunakan `public/song.mp3`.

## Deploy ke Railway
1. Upload semua isi folder ini ke repository GitHub Guitar Hero.
2. Railway akan menjalankan `npm start`.
3. Untuk pengumuman ke Discord, buka service Railway → Variables → tambah `DISCORD_WEBHOOK_URL` dengan URL webhook channel tujuan. Jangan membagikan URL webhook secara publik.
4. Deploy ulang jika diminta.

## Fitur
- Empat tombol warna, skor, akurasi, combo.
- Leaderboard 10 skor tertinggi; satu nama menyimpan skor terbaiknya.
- Discord mengumumkan ketika ada rekor skor tertinggi baru.
- Endpoint kesehatan: `/health`.

## Catatan penting
- Skor disimpan dalam `scores.json` pada filesystem service. Pada Railway, file lokal dapat hilang saat redeploy/restart kecuali persistent volume dipasang dan diarahkan ke lokasi data yang persisten. Untuk uji coba, ini bisa dipakai; untuk event resmi, gunakan Railway Volume atau database.
- Webhook Discord hanya mengumumkan rekor tertinggi baru, bukan pemenang ronde per jam. Sistem ini adalah leaderboard berdasarkan skor lagu.
- Nama peserta belum diverifikasi dengan akun Discord/Roblox; untuk permainan komunitas santai saja.
- Lagu harus boleh digunakan untuk eventmu; pastikan kamu punya hak/izin yang diperlukan.
