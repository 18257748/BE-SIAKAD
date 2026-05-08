# Backend SIAKAD SMAN 1 Cikalong 🏫

Sistem Informasi Akademik (SIAKAD) SMAN 1 Cikalong dibangun untuk memodernisasi proses manajemen akademik sekolah. Repositori ini berisi **Backend Service** yang menyediakan seluruh RESTful API untuk melayani kebutuhan frontend berbasis web dan mobile.

Backend ini dibangun di atas arsitektur Node.js dan Express, menggunakan ORM Prisma untuk manajemen database PostgreSQL tingkat lanjut.

---

## Fitur Utama

- **User Authentication (JWT):** Manajemen peran pengguna dengan hak akses (*Role-Based Access Control*) untuk Administrator, Kurikulum, Wali Kelas, Guru Mapel, dan Siswa.
- **Master Data Management:** Pengelolaan data inti sekolah seperti Tahun Ajaran, Semester, Data Kelas, Mata Pelajaran, dan Guru.
- **Manajemen Akademik:** Penetapan Rombel (Rombongan Belajar) Siswa, sinkronisasi Jadwal Pelajaran otomatis, dan Migrasi Kelas antar tahun ajaran.
- **Kehadiran & Jurnal Mengajar:** API pencatatan absensi harian dan pengisian Jurnal Kelas oleh guru.
- **Penilaian & E-Rapor:** Input nilai terpusat dengan dukungan generasi E-Rapor format PDF otomatis (menggunakan `pdfkit`). Penentuan status naik/tinggal kelas otomatis.
- **CMS (Content Management System) Publik:** Layanan manajemen konten dinamis untuk Berita, Prestasi, dan Video Profil yang ditampilkan di Portal Tamu (*Guest*).
- **Import Data Massal:** Dukungan untuk impor data Siswa, Guru, dan Nilai dalam jumlah besar melalui format CSV/Excel.
- **Security & Audit System:** Tracking aktivitas pengguna melalui *Audit Logs* dan *Security Events*. Manajemen sesi aman dengan *JWT Refresh Tokens* dan *Session Versioning*.
- **Dynamic QR Attendance:** Sistem absensi real-time berbasis token QR yang berubah secara dinamis untuk mencegah kecurangan.

---

## 🛠️ Tech Stack & Architecture

- **Runtime:** [Node.js](https://nodejs.org/)
- **Web Framework:** [Express.js](https://expressjs.com/)
- **Database:** [PostgreSQL](https://www.postgresql.org/) (Compatible with Supabase/Railway)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Media Management:** [Cloudinary](https://cloudinary.com/) (Aset Gambar & Profil)
- **PDF Generation:** [PDFKit](https://pdfkit.org/)
- **File Uploads:** [Multer](https://www.npmjs.com/package/multer)
- **Security:** `bcrypt` (Hashing), `jsonwebtoken` (Auth Tokens), CORS, Express Rate Limiter, Helmet (Security Headers).

Arsitektur aplikasi menggunakan pola desain MVC yang disempurnakan dengan *Middleware-first approach* untuk memastikan sanitasi, validasi, dan otorisasi API terpusat secara konsisten di direktori `src/middlewares/`.

---

## ⚙️ Persiapan & Instalasi (Getting Started)

### Prasyarat (Prerequisites)
Pastikan sistem Anda sudah terinstal:
- Node.js (v18.0 atau yang lebih baru)
- PostgreSQL (database berjalan lokal atau di *cloud*)

### 1. Kloning Repositori
```bash
git clone https://github.com/fawwazv/BE-SIAKAD.git
cd BE-SIAKAD
```

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Buat file bernama `.env` di direktori *root* (sejajar dengan `package.json`). Contoh konfigurasi:
```env
# Koneksi PostgreSQL (Sesuaikan credential Anda)
DATABASE_URL="postgresql://user:password@localhost:5432/siakad_db?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/siakad_db?schema=public"

# Konfigurasi Token Auth
JWT_SECRET="rahasia_super_aman_anda"
ACCESS_TOKEN_EXPIRES_IN="1h"
REFRESH_TOKEN_EXPIRES_DAYS=30

# Konfigurasi Cloudinary (Opsional untuk fitur Upload)
CLOUDINARY_CLOUD_NAME="your_name"
CLOUDINARY_API_KEY="your_key"
CLOUDINARY_API_SECRET="your_secret"

# Konfigurasi Port Server
PORT=3001
```

### 4. Migrasi & Sinkronisasi Database
Inisialisasi tabel database PostgreSQL dan siapkan status awal menggunakan Prisma:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

*(Opsional)* Jalankan proses *seeding* untuk mengisi database dengan data dasar atau data uji:
```bash
# Seed Master Data (Role, User Awal)
npx prisma db seed

# Seed Data Spesifik (Opsional)
npm run seed:jurnal         # Mengisi data contoh Jurnal Mengajar
npm run seed:data-xi1      # Mengisi data master kelas XI-1
npm run seed:kehadiran-x1  # Mengisi data kehadiran kelas X-1
```

### 5. Menjalankan Server
Untuk *development mode* (dengan *auto-reload* berkat Nodemon):
```bash
npm run dev
```
Untuk *production mode*:
```bash
npm start
```
Server akan aktif secara default di `http://localhost:3001`. Anda bisa mengakses `http://localhost:3001/api/health` untuk memastikan API berjalan sehat.

---

## 📁 Struktur Direktori

```text
BE-SIAKAD/
├── prisma/
│   ├── schema.prisma       # Definisi model & skema database utama
│   ├── seed.js             # Skrip awal untuk mengisi database
│   └── migrations/         # Jejak migrasi riwayat database
├── src/
│   ├── config/             # Pengaturan konfigurasi koneksi (seperti prisma client)
│   ├── controllers/        # Logika utama (pemrosesan permintaan HTTP & validasi bisnis)
│   ├── middlewares/        # Lapisan keamanan (Auth, Role Guard, Rate Limiter, Validasi Error)
│   ├── routes/             # Pemetaan endpoint URI API ke Controller spesifik
│   ├── utils/              # Fungsi helper global (seperti Mailer, Generator PDF)
│   └── app.js              # Entry point utama (Registrasi CORS, Body Parser, Routing Utama)
├── uploads/                # Direktori aset statis (CMS, Foto Profil)
├── package.json
└── README.md
```

---

## Perintah Tambahan (*Scripts*)

- **Testing Unit:** `npm run test` (Menggunakan Jest)
- **Reset DB:** `npx prisma migrate reset` (Berguna jika skema sangat berantakan di *development*)
- **Prisma Studio:** `npx prisma studio` (UI *built-in* untuk melihat dan mengedit data langsung dari browser)
