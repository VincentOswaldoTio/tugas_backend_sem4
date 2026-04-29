import express from 'express';
import { prisma } from './lib/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json());

// Setup multer dengan MEMORY STORAGE (gambar disimpan di RAM, bukan di disk)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Middleware untuk menangkap error Multer (misal ukuran terlalu besar)
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Ukuran gambar terlalu besar. Maksimal 10 MB.'
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// =================== ROUTES ===================

// GET all users (tanpa mengembalikan data binary avatar, hanya info)
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        joinDate: true,
        birthday: true,
        gender: true,
        avatar: true, // ambil untuk cek null, tapi tidak dikirim mentah
        createdAt: true
      }
    });
    // Ubah avatar menjadi URL endpoint jika ada
    const result = users.map(user => ({
      ...user,
      avatar: user.avatar ? `/api/avatar/${user.id}` : null
    }));
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ success: false, message: "Email, username, dan password wajib diisi" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password minimal 6 karakter" });
    }

    const existingUser = await prisma.users.findFirst({
      where: { OR: [{ email }, { username }] }
    });
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ success: false, message: "Email sudah digunakan" });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ success: false, message: "Username sudah digunakan" });
      }
    }

    const joinDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const createUser = await prisma.users.create({
      data: {
        email,
        username,
        password,
        joinDate,
        createdAt: new Date()
      }
    });
    res.json({ success: true, message: "User berhasil dibuat", data: createUser });
  } catch (err) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
  }
});

// Upload avatar (MENYIMPAN BUFFER KE DATABASE)
app.post('/api/upload-avatar', upload.single('avatar'), handleMulterError, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID diperlukan" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "File gambar diperlukan" });
    }

    // Simpan buffer gambar langsung ke field avatar (Bytes)
    await prisma.users.update({
      where: { id: userId },
      data: { avatar: req.file.buffer }
    });

    res.json({
      success: true,
      message: "Avatar berhasil diupload"
      // Frontend akan menggunakan endpoint /api/avatar/:userId untuk menampilkan gambar
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal upload avatar: " + err.message });
  }
});

// Endpoint untuk membaca avatar dari database
app.get('/api/avatar/:userId', async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.params.userId },
      select: { avatar: true }
    });

    if (!user || !user.avatar) {
      // Kirim gambar default jika tidak ada avatar
      // Asumsikan ada file default di folder asset (bisa disesuaikan)
      return res.sendFile('asset/profile.png', { root: '.' });
    }

    // Deteksi tipe konten (bisa disimpan di database jika perlu, untuk sekarang asumsikan jpeg)
    res.set('Content-Type', 'image/jpeg');
    res.send(user.avatar);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update profile
app.put('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, password, birthday, gender } = req.body;

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (birthday !== undefined) updateData.birthday = birthday;
    if (gender !== undefined) updateData.gender = gender;

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: updateData
    });

    res.json({
      success: true,
      message: "Profile berhasil diupdate",
      data: updatedUser
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal update profile: " + err.message });
  }
});

// Endpoint untuk mengambil Poin terbaru user dari Database
app.get('/api/points/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Cari user berdasarkan ID dan hanya ambil kolom 'points'
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { points: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan" });
    }

    res.json({ success: true, points: user.points });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal menarik data poin: " + err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username/Email dan Password wajib diisi" });
    }
    const user = await prisma.users.findFirst({
      where: { OR: [ { email: username }, { username: username }]}
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "Username/Email tidak ditemukan" });
    }
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: "Password salah" });
    }

    res.json({
      success: true,
      message: "Login berhasil",
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar ? `/api/avatar/${user.id}` : "/asset/profile.png",
        level: user.level || 1,
        joinDate: user.joinDate || new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        birthday: user.birthday || "-",
        gender: user.gender || "-"
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
  }
});


// ==========================================
// ENDPOINT TRANSAKSI & VOUCHER
// ==========================================

// 1. Simpan Transaksi Baru
app.post('/api/transaction', async (req, res) => {
  try {
    const { userId, targetAccount, purchaseDetails, billing } = req.body;

    // Buat invoice ID unik
    const invoiceId = "RAST7-" + Math.random().toString(36).slice(2, 11).toUpperCase();
    
    // Simpan ke database
    const newTransaction = await prisma.transactions.create({
      data: {
        invoiceId,
        userId,
        accountId: targetAccount.accountId,
        zoneId: targetAccount.zoneId,
        gameName: purchaseDetails.gameName,
        itemName: purchaseDetails.itemName,
        itemQty: purchaseDetails.itemQty,
        paymentMethod: purchaseDetails.paymentMethod,
        basePrice: billing.basePrice,
        taxAmount: billing.taxAmount,
        discountPoints: billing.pointsUsed,
        totalPaid: billing.totalPaid,
        waktu: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
        status: "SUCCESS"
      }
    });

    // Potong poin user jika digunakan
    if (billing.pointsUsed > 0) {
      await prisma.users.update({
        where: { id: userId },
        data: { points: { decrement: billing.pointsUsed } }
      });
    }

    res.json({ success: true, message: "Transaksi berhasil disimpan", data: newTransaction });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal menyimpan transaksi: " + err.message });
  }
});

// 2. Ambil Riwayat Transaksi per User
app.get('/api/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await prisma.transactions.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' } // Urutkan dari yang terbaru
    });
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengambil riwayat" });
  }
});

// 3. Redeem Voucher
app.post('/api/redeem', async (req, res) => {
  try {
    const { userId, code } = req.body;

    // Cari voucher
    const voucher = await prisma.vouchers.findUnique({ where: { code: code.toUpperCase() } });

    if (!voucher || !voucher.isActive) {
      return res.status(400).json({ success: false, message: "Kode voucher tidak valid atau sudah tidak aktif." });
    }
    if (voucher.usedCount >= voucher.quota) {
      return res.status(400).json({ success: false, message: "Kuota voucher sudah habis." });
    }

    // Tambah poin ke user & update voucher (menggunakan rewardValue)
    await prisma.$transaction([
      prisma.users.update({
        where: { id: userId },
        data: { points: { increment: voucher.rewardValue } } 
      }),
      prisma.vouchers.update({
        where: { id: voucher.id },
        data: { usedCount: { increment: 1 } }
      })
    ]);

    // Ambil data user terbaru untuk dikembalikan ke frontend
    const updatedUser = await prisma.users.findUnique({ where: { id: userId } });

    res.json({ 
      success: true, 
      message: `Berhasil! +${voucher.rewardValue} Poin ditambahkan.`,
      newPoints: updatedUser.points
    });
  } catch (err) {
    // Tampilkan pesan error asli di terminal untuk mempermudah debugging
    console.error("Error saat redeem voucher:", err); 
    res.status(500).json({ success: false, message: "Terjadi kesalahan sistem." });
  }
});

// Delete user
app.delete('/api/deleteUser/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const deletedUser = await prisma.users.delete({
      where: { id: userId }
    });
    res.json({ success: true, message: "User berhasil dihapus", data: deletedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
  }
});

app.listen(3000, () => {
  console.log("server berhasil dijalankan http://localhost:3000");
});