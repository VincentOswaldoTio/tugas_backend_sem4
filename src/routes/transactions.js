import express from 'express';
import { authenticate, ensureSelf } from '../middleware/auth.js';
import { validateTransaction } from '../middleware/validate.js';

const router = express.Router();

// Apply authentication to all routes in this file
router.use(authenticate);

/**
 * @openapi
 * /api/transaction:
 *   post:
 *     summary: Create new transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionRequest'
 *     responses:
 *       200: { description: Transaction created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.post('/transaction', ensureSelf, validateTransaction, async (req, res) => {
  try {
    const { userId, targetAccount, purchaseDetails, billing } = req.body;

    const newTransaction = await req.transactionService.createTransaction({
      userId, targetAccount, purchaseDetails, billing
    });

    res.json({ success: true, message: "Transaksi berhasil disimpan", data: newTransaction });
  } catch (err) {
    req.transactionService.handleError(res, err, "Gagal menyimpan transaksi");
  }
});

/**
 * @openapi
 * /api/history/{userId}:
 *   get:
 *     summary: Get user transaction history
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Transaction history }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get('/history/:userId', ensureSelf, async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await req.transactionService.getHistory(userId);
    res.json({ success: true, data: history });
  } catch (err) {
    req.transactionService.handleError(res, err, "Gagal mengambil riwayat");
  }
});

/**
 * @openapi
 * /api/redeem:
 *   post:
 *     summary: Redeem voucher code
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RedeemRequest'
 *     responses:
 *       200: { description: Voucher redeemed, points added }
 *       400: { description: Invalid code }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.post('/redeem', ensureSelf, async (req, res) => {
  try {
    const { userId, code } = req.body;
    const result = await req.transactionService.redeemVoucher(userId, code);

    res.json({
      success: true,
      message: `Berhasil! +${result.rewardValue} Poin ditambahkan.`,
      newPoints: result.newPoints
    });
  } catch (err) {
    req.transactionService.errorResponse(res, err.message);
  }
});

export default router;