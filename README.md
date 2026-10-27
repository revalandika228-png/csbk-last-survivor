# CSBK LAST SURVIVOR 2026 — MVP

Game browser multiplayer untuk diuji. Target maksimal 20 pemain per server.

## Kontrol
- HP: tombol arah dan SERANG.
- PC: WASD/panah untuk bergerak, tahan spasi untuk menyerang.
- Zona ungu memberi damage di luar lingkaran.
- Minimal 2 pemain untuk memulai.

## Deploy dari HP
1. Buat repository GitHub bernama `csbk-last-survivor`.
2. Unggah semua isi folder proyek ini ke root repository. Pastikan `package.json`, `server.js`, dan folder `public` berada di root.
3. Di Railway, buat project baru dari repository GitHub tersebut.
4. Railway menjalankan `npm start` dan memasang dependency dari `package.json`.
5. Buka domain publik Railway lalu tambahkan `/health`. Hasil yang benar berupa JSON dengan `ok: true`.
6. Tes dengan dua browser/perangkat dan username berbeda sebelum dibagikan.

## Batasan versi awal
- Ini MVP untuk uji coba, belum turnamen siap pakai.
- Username hanya teks; tidak memverifikasi akun Roblox.
- Hasil juara tampil di game, belum otomatis dikirim ke Discord.
- Siapa pun yang sudah bergabung bisa menekan MULAI. Tambahkan host/admin control sebelum event resmi.
- Jangan pernah menaruh token Discord di frontend atau repository publik.
