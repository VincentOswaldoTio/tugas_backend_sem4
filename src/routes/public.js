import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sendImageResponse } from '../utils/imageUtils.js';

const router = express.Router();
const BASE = process.env.BASE_URL || '';

/**
 * @openapi
 * /api/test:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: 'boolean', example: true }
 */
router.get('/test', (req, res) => res.json({ ok: true }));

/**
 * @openapi
 * /api/games:
 *   get:
 *     summary: Get all games
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of games
 */
router.get('/games', async (req, res) => {
  try {
    const games = await req.prisma.games.findMany({
      select: { id: true, name: true, slug: true, badge: true, categoryId: true, hasZone: true, bgPosition: true, updatedAt: true, logo: true, bg: true, category: { select: { id: true, name: true, slug: true } } }
    });
    const BASE = process.env.BASE_URL || '';
    const ts = Date.now();
    const data = games.map(g => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      badge: g.badge,
      category: g.category,
      hasZone: g.hasZone,
      bgPosition: g.bgPosition,
      updatedAt: g.updatedAt,
      logo: g.logo ? `${BASE}/api/game-media/${g.id}/logo?v=${g.updatedAt?.getTime() || ts}` : null,
      bg: g.bg ? `${BASE}/api/game-media/${g.id}/bg?v=${g.updatedAt?.getTime() || ts}` : null
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/games/{slug}:
 *   get:
 *     summary: Get specific game by slug
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Game details with items
 *       404:
 *         description: Game not found
 */
router.get('/games/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const game = await req.prisma.games.findUnique({ where: { slug }, include: { category: true } });

    if (!game) {
      return res.status(404).json({ success: false, message: "Game tidak ditemukan" });
    }

    const data = {
      id: game.id,
      name: game.name,
      slug: game.slug,
      badge: game.badge,
      category: game.category,
      logoUrl: game.logo ? `${BASE}/api/game-media/${game.id}/logo?v=${game.updatedAt?.getTime() || Date.now()}` : null,
      itemIconUrl: game.itemIcon ? `${BASE}/api/game-media/${game.id}/icon?v=${game.updatedAt?.getTime() || Date.now()}` : null,
      bgUrl: game.bg ? `${BASE}/api/game-media/${game.id}/bg?v=${game.updatedAt?.getTime() || Date.now()}` : null,
      bgPosition: game.bgPosition,
      hasZone: game.hasZone,
      userIdLabel: game.userIdLabel,
      userIdPlaceholder: game.userIdPlaceholder,
      zoneIdLabel: game.zoneIdLabel,
      zoneIdPlaceholder: game.zoneIdPlaceholder,
      zoneIdHint: game.zoneIdHint,
      zoneIdMaxLength: game.zoneIdMaxLength,
      items: game.items,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt
    };

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/game-media/{id}/{type}:
 *   get:
 *     summary: Get game image (logo, bg, or icon)
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [logo, bg, icon] }
 *     responses:
 *       200:
 *         description: Binary image data
 *       404:
 *         description: Image not found
 */
router.get('/game-media/:id/:type', async (req, res) => {
  try {
    const { id, type } = req.params;

    const fieldMap = { logo: 'logo', bg: 'bg', icon: 'itemIcon' };
    const field = fieldMap[type];
    if (!field) return res.status(400).json({ success: false, message: "Tipe media tidak valid" });

    const game = await req.prisma.games.findUnique({
      where: { id },
      select: { [field]: true }
    });

    if (!game || !game[field]) {
      return res.status(404).json({ success: false, message: "Media tidak ditemukan" });
    }

    sendImageResponse(res, game[field]);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/payment-methods:
 *   get:
 *     summary: Get all payment methods
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of payment methods
 */
router.get('/payment-methods', async (req, res) => {
  try {
    const paymentMethods = await req.prisma.payment_methods.findMany();
    res.json({ success: true, data: paymentMethods });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/leaderboard:
 *   get:
 *     summary: Get leaderboard (top spenders last 30 days)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Leaderboard data
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const data = await req.transactionService.getLeaderboard();
    res.json({ success: true, data });
  } catch (err) {
    req.transactionService.handleError(res, err, "Gagal mengambil leaderboard");
  }
});

/**
 * @openapi
 * /api/categories:
 *   get:
 *     summary: Get all game categories
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await req.prisma.categories.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/carousel-slides:
 *   get:
 *     summary: Get active carousel slides
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Array of slides
 */
router.get('/carousel-slides', async (req, res) => {
  try {
    const slides = await req.prisma.carousel_slides.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    const ts = Date.now();
    const data = slides.map(s => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      cta: s.cta,
      link: s.link,
      sortOrder: s.sortOrder,
      imageUrl: s.image ? `${BASE}/api/carousel-media/${s.id}?v=${ts}` : null
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/carousel-media/{id}:
 *   get:
 *     summary: Serve carousel slide image (public)
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Binary image data
 *       404:
 *         description: Slide or image not found
 */
router.get('/carousel-media/:id', async (req, res) => {
  try {
    const slide = await req.prisma.carousel_slides.findUnique({
      where: { id: req.params.id },
      select: { image: true }
    });
    if (!slide || !slide.image) {
      return res.status(404).json({ success: false, message: "Gambar tidak ditemukan" });
    }

    sendImageResponse(res, slide.image);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/promo-media/banner/{id}:
 *   get:
 *     summary: Serve page promo banner image (public)
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Binary image data
 *       404:
 *         description: Banner or image not found
 */
router.get('/promo-media/banner/:id', async (req, res) => {
  try {
    const banner = await req.prisma.promo_banners.findUnique({
      where: { id: req.params.id },
      select: { image: true }
    });
    if (!banner || !banner.image) {
      return res.status(404).json({ success: false, message: "Gambar banner tidak ditemukan" });
    }

    sendImageResponse(res, banner.image);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/promo-page:
 *   get:
 *     summary: Get page banner config
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Active banner config
 */
router.get('/promo-page', async (req, res) => {
  try {
    const banner = await req.prisma.promo_banners.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    if (!banner) {
      return res.json({ success: true, data: null });
    }
    const ts = Date.now();
    const data = {
      id: banner.id,
      title: banner.title,
      periodText: banner.periodText,
      regionText: banner.regionText,
      categoryText: banner.categoryText,
      subheading: banner.subheading,
      isActive: banner.isActive,
      imageUrl: banner.image ? `${BASE}/api/promo-media/banner/${banner.id}?v=${ts}` : null
    };
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/promos:
 *   get:
 *     summary: Get all active promotions
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of active promotions
 */
router.get('/promos', async (req, res) => {
  try {
    const promos = await req.prisma.promos.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    });
    const data = promos.map(p => ({
      id: p.id,
      category: p.category,
      gameName: p.gameName,
      periodText: p.periodText,
      timeText: p.timeText,
      cashbackText: p.cashbackText,
      notes: p.notes,
      isActive: p.isActive
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/contact:
 *   post:
 *     summary: Submit a contact message/complaint
 *     tags: [Public]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pesan]
 *             properties:
 *               nama: { type: string }
 *               pesan: { type: string }
 *     responses:
 *       201:
 *         description: Message successfully submitted
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 */
router.post('/contact', authenticate, async (req, res) => {
  try {
    const { pesan } = req.body;
    if (!pesan) {
      return res.status(400).json({ success: false, message: "Field pesan wajib diisi" });
    }

    // Retrieve the authenticated user's details from database to verify existence
    const user = await req.prisma.users.findUnique({
      where: { id: req.user.userId }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan" });
    }

    // UserId-based Rate Limiting (max 3 messages per 24 hours per user account)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const messageCount = await req.prisma.contact_messages.count({
      where: {
        userId: req.user.userId,
        createdAt: { gte: oneDayAgo }
      }
    });

    if (messageCount >= 3) {
      return res.status(429).json({
        success: false,
        message: "Batas pengiriman pesan harian telah tercapai. Maksimal 3 pesan per hari."
      });
    }

    await req.prisma.contact_messages.create({
      data: {
        userId: req.user.userId,
        message: pesan
      }
    });

    res.status(201).json({ success: true, message: "Pesan Anda berhasil dikirim. Terima kasih!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/vouchers/active:
 *   get:
 *     summary: Get active vouchers with available quota
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of active vouchers
 */
router.get('/vouchers/active', async (req, res) => {
  try {
    const vouchers = await req.prisma.vouchers.findMany({
      where: { isActive: true },
      select: {
        code: true,
        rewardValue: true,
        rewardType: true,
        usedCount: true,
        quota: true,
        validUntil: true
      }
    });

    // Filter: only vouchers with remaining quota and not expired
    const now = new Date();
    const available = vouchers.filter(v =>
      v.usedCount < v.quota &&
      (!v.validUntil || new Date(v.validUntil) > now)
    );

    res.json({ success: true, data: available });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @openapi
 * /api/avatar/{userId}:
 *   get:
 *     summary: Get user avatar (public)
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Avatar image }
 *       404: { description: Default avatar served if none exists }
 */
router.get('/avatar/:userId', async (req, res) => {
  try {
    const user = await req.userService.getAvatar(req.params.userId);

    if (!user || !user.avatar) {
      return res.sendFile('asset/profile.png', { root: '.' });
    }

    sendImageResponse(res, user.avatar);
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengambil avatar" });
  }
});

export default router;
