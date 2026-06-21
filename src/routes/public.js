import express from 'express';

const router = express.Router();

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean' }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Game'
 */
router.get('/games', async (req, res) => {
  try {
    const games = await req.prisma.games.findMany({
      select: { id: true, name: true, slug: true, logoUrl: true, bgUrl: true }
    });
    res.json({ success: true, data: games });
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
    const game = await req.prisma.games.findUnique({ where: { slug } });

    if (!game) {
      return res.status(404).json({ success: false, message: "Game tidak ditemukan" });
    }

    res.json({ success: true, data: game });
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean' }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PaymentMethod'
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

export default router;