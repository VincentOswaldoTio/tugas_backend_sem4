import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorizeAdmin);

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 */
router.get('/users', async (req, res) => {
  try {
    const users = await req.userService.getAllUsers();
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    req.userService.handleError(res, err, "Gagal mengambil data users");
  }
});

export default router;