import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, ensureSelf } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes in this file
router.use(authenticate);

// Multer setup for avatar upload (memory storage)
const avatarStorage = multer.memoryStorage();
const avatarUpload = multer({
  storage: avatarStorage,
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

/**
 * @openapi
 * /api/upload-avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar, userId]
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *               userId:
 *                 type: string
 *     responses:
 *       200: { description: Avatar uploaded }
 *       400: { description: File required / User ID required }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden - not your avatar }
 */
router.post('/upload-avatar', ensureSelf, avatarUpload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID diperlukan" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "File gambar diperlukan" });
    }

    await req.userService.uploadAvatar(userId, req.file.buffer);
    res.json({ success: true, message: "Avatar berhasil diupload" });
  } catch (err) {
    req.userService.handleError(res, err, "Gagal upload avatar");
  }
});

/**
 * @openapi
 * /api/avatar/{userId}:
 *   get:
 *     summary: Get user avatar (public)
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Avatar image, content: image/jpeg }
 *       404: { description: Default avatar served if none exists }
 */
router.get('/avatar/:userId', async (req, res) => {
  try {
    const user = await req.userService.getAvatar(req.params.userId);

    if (!user || !user.avatar) {
      return res.sendFile('asset/profile.png', { root: '.' });
    }

    res.set('Content-Type', 'image/jpeg');
    res.send(user.avatar);
  } catch (err) {
    req.userService.handleError(res, err, "Gagal mengambil avatar");
  }
});

/**
 * @openapi
 * /api/profile/{userId}:
 *   put:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               birthday: { type: string }
 *               gender: { type: string }
 *     responses:
 *       200: { description: Profile updated }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden - not your profile }
 */
router.put('/profile/:userId', ensureSelf, async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, password, birthday, gender } = req.body;

    const updatedUser = await req.userService.updateProfile(userId, { username, email, password, birthday, gender });
    res.json({ success: true, message: "Profile berhasil diupdate", data: updatedUser });
  } catch (err) {
    req.userService.handleError(res, err, "Gagal update profile");
  }
});

/**
 * @openapi
 * /api/points/{userId}:
 *   get:
 *     summary: Get user points
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User points }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get('/points/:userId', ensureSelf, async (req, res) => {
  try {
    const { userId } = req.params;
    const points = await req.userService.getPoints(userId);
    res.json({ success: true, points });
  } catch (err) {
    req.userService.errorResponse(res, err.message, 404);
  }
});

/**
 * @openapi
 * /api/points/config/{userId}:
 *   get:
 *     summary: Get user point tier config
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Tier configuration }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get('/points/config/:userId', ensureSelf, async (req, res) => {
  try {
    const { userId } = req.params;
    const config = await req.pointConfigService.getConfigForUser(userId);
    res.json({ success: true, data: config });
  } catch (err) {
    req.pointConfigService.handleError(res, err, "Gagal mengambil konfigurasi poin");
  }
});

/**
 * @openapi
 * /api/points/mileage/{userId}:
 *   get:
 *     summary: Get user mileage progress
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Mileage progress }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get('/points/mileage/:userId', ensureSelf, async (req, res) => {
  try {
    const { userId } = req.params;
    const mileage = await req.pointConfigService.getMileage(userId);
    res.json({ success: true, data: mileage });
  } catch (err) {
    req.pointConfigService.handleError(res, err, "Gagal mengambil data mileage");
  }
});

/**
 * @openapi
 * /api/deleteUser/{userId}:
 *   delete:
 *     summary: Delete user account
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User deleted }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden - not your account }
 */
router.delete('/deleteUser/:userId', ensureSelf, async (req, res) => {
  try {
    const { userId } = req.params;
    const deletedUser = await req.userService.deleteUser(userId);
    res.json({ success: true, message: "User berhasil dihapus", data: deletedUser });
  } catch (err) {
    req.userService.handleError(res, err, "Gagal menghapus user");
  }
});

export default router;