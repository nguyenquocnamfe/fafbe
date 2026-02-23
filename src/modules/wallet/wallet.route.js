const express = require('express');
const router = express.Router();
const controller = require('./wallet.controller');
const auth = require('../../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Wallet management & MoMo deposit
 */

/**
 * @swagger
 * /api/wallet/deposit:
 *   post:
 *     summary: Tạo yêu cầu nạp tiền qua MoMo
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Số tiền nạp (VND), tối thiểu 1000
 *                 example: 50000
 *     responses:
 *       200:
 *         description: Trả về payUrl để redirect user tới MoMo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     payUrl:
 *                       type: string
 *                       description: URL redirect tới trang thanh toán MoMo
 *                     deeplink:
 *                       type: string
 *                     qrCodeUrl:
 *                       type: string
 *       400:
 *         description: Invalid amount
 *       502:
 *         description: MoMo API error
 */
router.post('/deposit', auth, controller.createDeposit);

/**
 * @swagger
 * /api/wallet/deposit/payos:
 *   post:
 *     summary: Tạo yêu cầu nạp tiền qua PayOS (VietQR)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Số tiền nạp (VND), tối thiểu 1000
 *                 example: 50000
 *     responses:
 *       200:
 *         description: Trả về checkoutUrl để redirect user tới PayOS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     checkoutUrl:
 *                       type: string
 *                     qrCode:
 *                       type: string
 */
router.post('/deposit/payos', auth, controller.createPayOSDeposit);

/**
 * @swagger
 * /api/wallet/deposits/momo/ipn:
 *   post:
 *     summary: MoMo IPN callback (internal — MoMo gọi tự động)
 *     tags: [Wallet]
 *     description: >
 *       Endpoint nhận thông báo kết quả thanh toán từ MoMo.
 *       KHÔNG cần auth — MoMo gọi trực tiếp.
 *       Verify bằng HMAC-SHA256 signature.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       204:
 *         description: Processed
 */
router.post('/deposits/momo/ipn', controller.handleMomoIPN);

/**
 * @swagger
 * /api/wallet/deposits/payos/webhook:
 *   post:
 *     summary: PayOS Webhook callback (internal — PayOS gọi tự động)
 *     tags: [Wallet]
 *     description: >
 *       Endpoint nhận thông báo kết quả thanh toán từ PayOS.
 *       KHÔNG cần auth — PayOS gọi trực tiếp.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Processed
 */
router.post('/deposits/payos/webhook', controller.handlePayOSWebhook);

/**
 * @swagger
 * /api/wallet/deposit/status/{orderId}:
 *   get:
 *     summary: Kiểm tra trạng thái nạp tiền
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deposit status
 *       404:
 *         description: Deposit not found
 */
router.get('/deposit/status/:orderId', auth, controller.getDepositStatus);

/**
 * @swagger
 * /api/wallet/balance:
 *   get:
 *     summary: Xem số dư wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance_points:
 *                       type: number
 *                     locked_points:
 *                       type: number
 */
router.get('/balance', auth, controller.getBalance);

/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Lịch sử giao dịch
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Transaction list
 */
router.get('/transactions', auth, controller.getTransactions);

/**
 * @swagger
 * /api/wallet/deposits:
 *   get:
 *     summary: Lịch sử nạp tiền
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Deposit history
 */
router.get('/deposits', auth, controller.getDepositHistory);

module.exports = router;
