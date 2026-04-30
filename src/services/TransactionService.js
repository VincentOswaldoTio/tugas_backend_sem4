import BaseService from './BaseService.js';

class TransactionService extends BaseService {

  async createTransaction({ userId, targetAccount, purchaseDetails, billing }) {
    // Cek user & saldo poin
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User tidak ditemukan");
    if (billing.pointsUsed > user.points) throw new Error("Poin tidak cukup");

    const invoiceId = `RAST7-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const newTransaction = await this.prisma.transactions.create({
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

    // Potong poin jika digunakan
    if (billing.pointsUsed > 0) {
      await this.prisma.users.update({
        where: { id: userId },
        data: { points: { decrement: billing.pointsUsed } }
      });
    }

    // Tambah poin reward (1% dari total pembayaran)
    const rewardPoints = Math.floor(billing.totalPaid * 0.01);
    if (rewardPoints > 0) {
      await this.prisma.users.update({
        where: { id: userId },
        data: { points: { increment: rewardPoints } }
      });
    }

    return newTransaction;
  }

  async getHistory(userId) {
    return await this.prisma.transactions.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async redeemVoucher(userId, code) {
    const voucher = await this.prisma.vouchers.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!voucher || !voucher.isActive) {
      throw new Error("Kode voucher tidak valid atau sudah tidak aktif.");
    }
    if (voucher.usedCount >= voucher.quota) {
      throw new Error("Kuota voucher sudah habis.");
    }

    // Update poin user & voucher dalam satu transaksi atomik
    await this.prisma.$transaction([
      this.prisma.users.update({
        where: { id: userId },
        data: { points: { increment: voucher.rewardValue } }
      }),
      this.prisma.vouchers.update({
        where: { id: voucher.id },
        data: { usedCount: { increment: 1 } }
      })
    ]);

    const updatedUser = await this.prisma.users.findUnique({ where: { id: userId } });
    return { newPoints: updatedUser.points, rewardValue: voucher.rewardValue };
  }
}

export default TransactionService;
