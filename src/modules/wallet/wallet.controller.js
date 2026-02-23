/**
 * Wallet Controller
 */
const walletService = require('./wallet.service');

/**
 * POST /api/wallet/deposit
 * Tạo nạp tiền qua MoMo
 */
exports.createDeposit = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        if (!amount || isNaN(amount)) {
            return res.status(400).json({ message: 'Amount is required and must be a number' });
        }

        const result = await walletService.createDeposit(userId, Number(amount));

        return res.json({
            message: 'Deposit request created',
            data: {
                orderId: result.deposit.order_id,
                amount: result.deposit.amount,
                payUrl: result.payUrl,
                deeplink: result.deeplink,
                qrCodeUrl: result.qrCodeUrl,
            },
        });
    } catch (error) {
        console.error('Deposit error:', error);
        if (error.message === 'INVALID_AMOUNT') {
            return res.status(400).json({ message: 'Số tiền tối thiểu 1,000 VND' });
        }
        return res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

/**
 * POST /api/wallet/deposit/payos
 * Tạo nạp tiền qua PayOS (VietQR)
 */
exports.createPayOSDeposit = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        if (!amount || isNaN(amount)) {
            return res.status(400).json({ message: 'Amount is required and must be a number' });
        }

        const result = await walletService.createPayOSDeposit(userId, Number(amount));

        return res.json({
            message: 'PayOS deposit request created',
            data: {
                orderId: result.deposit.order_id,
                amount: result.deposit.amount,
                checkoutUrl: result.checkoutUrl,
                qrCode: result.qrCode,
            },
        });
    } catch (error) {
        console.error('PayOS Deposit error:', error);
        return res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

/**
 * POST /api/wallet/deposits/momo/ipn
 */
exports.handleMomoIPN = async (req, res) => {
    try {
        await walletService.handleMomoIPN(req.body);
        return res.status(204).send();
    } catch (error) {
        console.error('MoMo IPN error:', error);
        return res.status(204).send();
    }
};

/**
 * POST /api/wallet/deposits/payos/webhook
 */
exports.handlePayOSWebhook = async (req, res) => {
    try {
        console.log('📥 PayOS Webhook received:', JSON.stringify(req.body));
        await walletService.handlePayOSWebhook(req.body);
        return res.status(200).json({ message: 'OK' });
    } catch (error) {
        console.error('PayOS Webhook error:', error);
        return res.status(200).json({ message: 'Acknowledged' });
    }
};

/**
 * GET /api/wallet/deposit/status/:orderId
 */
exports.getDepositStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;
        const deposit = await walletService.getDepositStatus(orderId, userId);
        return res.json({ data: deposit });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

/**
 * GET /api/wallet/balance
 */
exports.getBalance = async (req, res) => {
    try {
        const balance = await walletService.getBalance(req.user.id);
        return res.json({ data: balance });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * GET /api/wallet/transactions
 */
exports.getTransactions = async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const transactions = await walletService.getTransactions(req.user.id, parseInt(limit), parseInt(offset));
        return res.json({ data: transactions });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * GET /api/wallet/deposits
 */
exports.getDepositHistory = async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const deposits = await walletService.getDepositHistory(req.user.id, parseInt(limit), parseInt(offset));
        return res.json({ data: deposits });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};
