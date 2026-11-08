# IG Data Tracker (Tanpa Login — 100% Aman)

Aplikasi web **Instagram Followers & Unfollowers Tracker** berbasis file data resmi dari **Meta Accounts Center (Download Your Information)**.
Semua proses dilakukan **100% lokal di browser (client-side)** — tanpa perlu login akun Instagram dan tanpa mengirim data ke server mana pun, sehingga bebas risiko terkena *checkpoint*, *shadowban*, atau *suspend*.

## Fitur Utama

- **Langsung Upload `.ZIP` Tanpa Ekstrak** — Mendukung file `.zip` langsung dari email/notifikasi Instagram, folder ekstrak, maupun file satuan (`.json` & `.html`).
- **Kompatibel Format IG Terbaru (2022–2026)** — Mendukung struktur `following.json` terbaru (`title` + `_u/username`), *split files* (`followers_1.json`, `followers_2.json`, dst.), serta **fallback otomatis ke `.html`** jika terlanjur mengunduh format HTML.
- **Analisis Lengkap Koneksi**:
  - **Tidak Follback** (*Following* tapi tidak *Follow* balik)
  - **Fans / Belum Kamu Follback**
  - **Mutualan** (*Saling Follow*)
  - **Digantung / Pending Follow Requests** (`pending_follow_requests.json`)
  - **Close Friends**, **Baru Di-unfollow**, **Blocked**, **Restricted**, & **Hide Story**
- **Fitur Whitelist & Checklist Unfollow** — Tandai akun seleb/brand agar tidak mengotori daftar *Tidak Follback*, serta centang akun yang sudah selesai kamu unfollow.
- **Tracker Riwayat Antar Waktu (Snapshot Diff)** — Bandingkan 2 data export (Lama vs Baru) untuk melihat **siapa yang baru saja unfollow kamu**.
- **Deteksi Kesalahan Rentang Tanggal** — Memberi peringatan otomatis jika file export terindikasi hanya menggunakan rentang *Tahun lalu* (bukan *Sepanjang waktu / All time*).

## Cara Menjalankan

```bash
npm install
npm run dev
```

Lalu buka URL lokal yang muncul di terminal (biasanya `http://localhost:5173`).

## Cara Minta Data di Instagram Terlebih Dahulu

1. Buka aplikasi **Instagram** → **Profil** → ketuk menu **☰** → **Pusat Akun (Accounts Center)**.
2. Pilih **Informasi dan izin Anda** → **Unduh informasi Anda** → **Mengunduh atau mentransfer informasi**.
3. Pilih akun Instagram → pilih **Beberapa informasi Anda**.
4. Scroll ke bagian *Koneksi*, centang **Pengikut dan mengikuti** (*Followers and following*), lalu ketuk **Berikutnya**.
5. Pilih **Unduh ke perangkat**, lalu atur:
   - **Rentang tanggal**: `Sepanjang waktu (All time)` *(Penting!)*
   - **Format**: `JSON` *(Format HTML juga tetap didukung otomatis)*
6. Ketuk **Buat file**, tunggu 2–15 menit hingga file siap diunduh, lalu upload file `.zip`-nya ke aplikasi ini.
