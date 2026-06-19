import express from 'express';
import { prisma } from './lib/prisma';
import multer from 'multer';
import path from 'path';
import { UserService, TransactionService, PointConfigService } from './src/services/index.js';
import { requestLogger } from './src/middleware/logger.js';
import { authenticate, ensureSelf, authorizeAdmin } from './src/middleware/auth.js';
import { validateRegister, validateLogin, validateResetPassword, validateTransaction } from './src/middleware/validate.js';

const app = express();

// Global request logger
app.use(requestLogger);

app.get('/api/test', (req, res) => res.json({ ok: true }));

// Inisialisasi service class
const userService = new UserService(prisma);
const transactionService = new TransactionService(prisma);
const pointConfigService = new PointConfigService(prisma);
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

// GET all users (admin only)
app.get('/api/users', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    userService.handleError(res, err, "Gagal mengambil data users");
  }
});

// Register
app.post('/api/register', validateRegister, async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const newUser = await userService.register(email, username, password);
    res.json({ success: true, message: "User berhasil dibuat", data: newUser });
  } catch (err) {
    userService.errorResponse(res, err.message);
  }
});

// Upload avatar (MENYIMPAN BUFFER KE DATABASE)
app.post('/api/upload-avatar', authenticate, ensureSelf, upload.single('avatar'), handleMulterError, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID diperlukan" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "File gambar diperlukan" });
    }

    // Simpan buffer gambar langsung ke field avatar (Bytes)
    await userService.uploadAvatar(userId, req.file.buffer);

    res.json({
      success: true,
      message: "Avatar berhasil diupload"
      // Frontend akan menggunakan endpoint /api/avatar/:userId untuk menampilkan gambar
    });
  } catch (err) {
    userService.handleError(res, err, "Gagal upload avatar");
  }
});

// Endpoint untuk membaca avatar dari database (public - used in <img> tags)
app.get('/api/avatar/:userId', async (req, res) => {
  try {
    const user = await userService.getAvatar(req.params.userId);

    if (!user || !user.avatar) {
      // Kirim gambar default jika tidak ada avatar
      // Asumsikan ada file default di folder asset (bisa disesuaikan)
      return res.sendFile('asset/profile.png', { root: '.' });
    }

    // Deteksi tipe konten (bisa disimpan di database jika perlu, untuk sekarang asumsikan jpeg)
    res.set('Content-Type', 'image/jpeg');
    res.send(user.avatar);
  } catch (err) {
    userService.handleError(res, err, "Gagal mengambil avatar");
  }
});

// Update profile
app.put('/api/profile/:userId', authenticate, ensureSelf, async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, password, birthday, gender } = req.body;

    const updatedUser = await userService.updateProfile(userId, { username, email, password, birthday, gender });

    res.json({
      success: true,
      message: "Profile berhasil diupdate",
      data: updatedUser
    });
  } catch (err) {
    userService.handleError(res, err, "Gagal update profile");
  }
});

// Endpoint untuk mengambil Poin terbaru user dari Database
app.get('/api/points/:userId', authenticate, ensureSelf, async (req, res) => {
  try {
    const { userId } = req.params;
    const points = await userService.getPoints(userId);
    res.json({ success: true, points });
  } catch (err) {
    userService.errorResponse(res, err.message, 404);
  }
});

// Login
app.post('/api/login', validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;
    const userData = await userService.login(username, password);
    res.json({
      success: true,
      message: "Login berhasil",
      data: userData
    });
  } catch (err) {
    userService.errorResponse(res, err.message, 401);
  }
});

// Reset password
app.post('/api/reset-password', validateResetPassword, async (req, res) => {
  try {
    const { emailOrUsername, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return userService.errorResponse(res, "Konfirmasi password tidak cocok");
    }
    if (newPassword.length < 6) {
      return userService.errorResponse(res, "Password minimal 6 karakter");
    }

    await userService.resetPassword(emailOrUsername, newPassword);

    res.json({ success: true, message: "Password berhasil direset" });
  } catch (err) {
    userService.errorResponse(res, err.message);
  }
});


// ==========================================
// ENDPOINT TRANSAKSI & VOUCHER
// ==========================================

// 1. Simpan Transaksi Baru
app.post('/api/transaction', authenticate, ensureSelf, validateTransaction, async (req, res) => {
  try {
    const { userId, targetAccount, purchaseDetails, billing } = req.body;

    const newTransaction = await transactionService.createTransaction({
      userId, targetAccount, purchaseDetails, billing
    });

    res.json({ success: true, message: "Transaksi berhasil disimpan", data: newTransaction });
  } catch (err) {
    transactionService.handleError(res, err, "Gagal menyimpan transaksi");
  }
});

// 2. Ambil Riwayat Transaksi per User
app.get('/api/history/:userId', authenticate, ensureSelf, async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await transactionService.getHistory(userId);
    res.json({ success: true, data: history });
  } catch (err) {
    transactionService.handleError(res, err, "Gagal mengambil riwayat");
  }
});

// 3. Redeem Voucher
app.post('/api/redeem', authenticate, ensureSelf, async (req, res) => {
  try {
    const { userId, code } = req.body;
    const result = await transactionService.redeemVoucher(userId, code);

    res.json({
      success: true,
      message: `Berhasil! +${result.rewardValue} Poin ditambahkan.`,
      newPoints: result.newPoints
    });
  } catch (err) {
    transactionService.errorResponse(res, err.message);
  }
});

// Get leaderboard (top spenders last 30 days)
app.get('/api/leaderboard', async (req, res) => {
  try {
    const data = await transactionService.getLeaderboard();
    res.json({ success: true, data });
  } catch (err) {
    transactionService.handleError(res, err, "Gagal mengambil leaderboard");
  }
});

// Get user's point tier config
app.get('/api/points/config/:userId', authenticate, ensureSelf, async (req, res) => {
  try {
    const { userId } = req.params;
    const config = await pointConfigService.getConfigForUser(userId);
    res.json({ success: true, data: config });
  } catch (err) {
    pointConfigService.handleError(res, err, "Gagal mengambil konfigurasi poin");
  }
});

// Get user's mileage progress to next tier
app.get('/api/points/mileage/:userId', authenticate, ensureSelf, async (req, res) => {
  try {
    const { userId } = req.params;
    const mileage = await pointConfigService.getMileage(userId);
    res.json({ success: true, data: mileage });
  } catch (err) {
    pointConfigService.handleError(res, err, "Gagal mengambil data mileage");
  }
});

// Delete user
app.delete('/api/deleteUser/:userId', authenticate, ensureSelf, async (req, res) => {
  try {
    const { userId } = req.params;
    const deletedUser = await userService.deleteUser(userId);
    res.json({ success: true, message: "User berhasil dihapus", data: deletedUser });
  } catch (err) {
    userService.handleError(res, err, "Gagal menghapus user");
  }
});

// ==========================================
// GAMES & PAYMENT METHODS ENDPOINTS
// ==========================================

// Get all games
app.get('/api/games', async (req, res) => {
  try {
    const games = await prisma.games.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        bgUrl: true
      }
    });
    res.json({ success: true, data: games });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get specific game by slug (includes items)
app.get('/api/games/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const game = await prisma.games.findUnique({
      where: { slug }
    });

    if (!game) {
      return res.status(404).json({ success: false, message: "Game tidak ditemukan" });
    }

    res.json({ success: true, data: game });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all payment methods
app.get('/api/payment-methods', async (req, res) => {
  try {
    const paymentMethods = await prisma.payment_methods.findMany();
    res.json({ success: true, data: paymentMethods });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(3000, () => {
  console.log("server berhasil dijalankan http://localhost:3000");
});