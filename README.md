# Rast7 - Cyberpunk Game Top-Up Platform

Platform full-stack top-up game (Rast7) yang dibangun menggunakan React pada frontend, Express.js pada backend, dan Prisma ORM dengan database MongoDB.

---

## 🎨 Desain & Tema (Cyberpunk / Gamer Aesthetic)

Aplikasi ini mengusung visual **Cyberpunk / Gamer Theme** modern dengan elemen desain premium:
- **Color Palette**: Layout dasar dark-mode (`#1a1a2e`, `#151523`) dengan aksen neon kontras: **electric cyan** (`#00f2ff`) untuk tombol interaktif, hover, borders, dan highlight, serta **neon magenta/red** (`#ff0055`) untuk pesan error, alerts, atau warning.
- **Typography**: Judul, banner, logo, dan tulisan branding menggunakan font futuristik **Audiowide** (Google Fonts). Sementara text konten umum, label, dan data input menggunakan font modern **Inter** atau **Roboto**.
- **Glassmorphism**: Layout dashboard, panel card, form input, dan tabel menggunakan glassmorphism (latar belakang semi-transparan `rgba(30, 30, 54, 0.45)`, filter blur `backdrop-filter: blur(16px)`, dan garis tepi tipis berwarna cyan transparan `1px solid rgba(0, 242, 255, 0.12)`).
- **Glow & Shadow Effects**: Efek glowing teks (`text-shadow`) dan neon drop-shadows (`box-shadow`) pada tombol aktif, badge status, judul promo, dan border input yang sedang aktif/fokus.
- **Micro-animations**: Animasi hover yang halus, pembesaran skala kartu (scale rise `transform: translateY(-2px)`), dan icon berkedip/berdenyut.

---

## 🚀 Fitur Utama

### 👤 Manajemen User & Autentikasi
- **Registrasi & Login**: Keamanan dengan enkripsi password (bcrypt) dan JWT token untuk autentikasi user session.
- **Profile User**: Melihat dan memperbarui data profil (username, email, tanggal lahir, gender), upload avatar secara langsung (disimpan sebagai binary blob di database), serta reset password dengan verifikasi kecocokan.
- **User Progression**: Sistem Leveling dan Points (Rast Coins) yang bertambah setiap kali melakukan transaksi top-up (cashback 1%).

### 🎮 Catalog Game & Top-Up
- **Games Catalog**: Menampilkan koleksi game populer berdasarkan kategori (Mobile, PC, RPG, FPS, MOBA, dll.).
- **Top-Up System**: Form pembelian diamond/vp/robux dengan dynamic input fields (User ID, Zone ID) sesuai game yang dipilih, serta integrasi input diskon dan poin loyalitas.
- **Payment Methods**: Pilihan metode pembayaran modern (QRIS, Gopay, Dana, dll.) dengan kalkulasi otomatis pajak (tax rate) dan diskon poin.

### 🎟️ Voucher & Promo
- **Sistem Promo**: Halaman promo dinamis yang menampilkan banner promo terkini, promo cashback khusus (seperti cashback Weekly Diamond Pass 100%), dan tabel detail periode waktu promo.
- **Redeem Voucher**: Tukarkan kode voucher secara instan untuk mendapatkan saldo atau poin.

### 🛡️ Dashboard Admin (Admin-Only)
- **User Manager**: Melihat daftar user terdaftar dan mengelola hak akses administrator (`isAdmin`).
- **Games CRUD**: Menambah, mengedit, dan menghapus game serta konfigurasi item top-up (jumlah qty, harga asli, persen diskon, dan harga final).
- **Promo & Banner Configuration**: Pengaturan banner utama promo page dan list promo yang aktif.
- **Voucher Generator**: Membuat voucher promo baru dengan limit tertentu.

---

## 🛠️ Tech Stack

### Frontend (Client)
- **React.js** (Vite build tool)
- **React Router DOM** (Single Page Application routing)
- **Vanilla CSS** (Custom cyberpunk styling)
- **Bootstrap Icons** & Custom SVG Icons

### Backend (Server)
- **Node.js** & **Express.js** (Web framework)
- **Prisma ORM** (Database modeling & operations)
- **Multer** (Avatar & media upload buffer handling)
- **MongoDB** (Database utama)
- **jsonwebtoken** & **bcrypt** (Keamanan & JWT authentication)
- **tsx** (Runtime execution engine untuk script development)
- **Swagger UI Express** & **swagger-jsdoc** (Dokumentasi API interaktif)

---

## ⚙️ Prerequisites

Pastikan perangkat Anda sudah terinstal:
- **Node.js** >= 18.x
- **npm** (biasanya langsung terpasang bersama Node.js)
- Database **MongoDB** yang sedang berjalan (Local atau MongoDB Atlas)

---

## 🔌 Cara Instalasi & Menjalankan Aplikasi

1. **Clone dan Install Dependencies**:
   ```bash
   npm install
   ```

2. **Konfigurasi Environment Variables**:
   Buat file `.env` di root directory (gunakan `.env.example` sebagai referensi):
   ```env
   DATABASE_URL="mongodb+srv://..."
   JWT_SECRET="your-secret-here"
   ```

3. **Generate Prisma Client**:
   Jalankan perintah ini setiap kali ada perubahan pada file schema prisma:
   ```bash
   npx prisma generate
   ```

4. **Seed Database (Opsional)**:
   Untuk mengisi database dengan data dummy awal (kategori, game default, promo default, dan banner):
   ```bash
   npx tsx prisma/seed.js
   ```

5. **Jalankan Aplikasi secara Lokal**:
   - **Backend Server** (berjalan pada port `3000`):
     ```bash
     npx tsx index
     ```
   - **Frontend Dev Server** (berjalan pada port `5173`, proxy `/api` otomatis mengarah ke backend):
     ```bash
     npm run dev
     ```

Akses website melalui browser di: `http://localhost:5173`

---

## 📖 Dokumentasi API (Swagger UI)

Proyek ini telah dilengkapi dengan dokumentasi API interaktif menggunakan **Swagger UI** (OpenAPI 3.0).

Setelah menjalankan backend server (`npx tsx index`), Anda dapat mengakses visualisasi dan mencoba seluruh endpoint API (Public, User, & Admin) secara langsung di:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

### Ringkasan Endpoint Utama

#### 🔓 Public Endpoints (Tanpa Login)
- `POST /api/register` - Mendaftarkan user baru
- `POST /api/login` - Login dengan JWT token response
- `POST /api/reset-password` - Reset password user
- `GET /api/games` - Mendapatkan catalog game aktif
- `GET /api/promo-page` - Konfigurasi dan banner promo utama
- `GET /api/promos` - Mengambil list promo aktif
- `GET /api/leaderboard` - Papan peringkat level user tertinggi

#### 🔒 User Endpoints (Butuh JWT Token)
- `GET /api/profile/:userId` - Profil pribadi user
- `PUT /api/profile/:userId` - Memperbarui biodata profil
- `POST /api/upload-avatar` - Upload gambar profil (Avatar)
- `POST /api/transaction` - Melakukan checkout pembelian top-up
- `GET /api/history/:userId` - Riwayat pembelian transaksi pribadi
- `POST /api/redeem` - Tukarkan kode voucher promo

#### 👑 Admin Endpoints (Butuh JWT Token & Role Admin)
- `GET /api/admin/users` - Mengambil daftar seluruh user terdaftar
- `POST /api/admin/games` - Menambah game baru beserta katalog harga item
- `PUT /api/admin/games/:id` - Mengubah game / list item katalog harga
- `POST /api/admin/vouchers` - Generate kode voucher baru
- `POST /api/admin/promo-banners` - Membuat / memperbarui banner promo utama page
