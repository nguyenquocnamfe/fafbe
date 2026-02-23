/**
 * Wallet Service
 * Xử lý logic nạp tiền qua MoMo, xem số dư, lịch sử giao dịch
 */
const pool = require('../../config/database');
const sql = require('./wallet.sql');
const momoService = require('../../services/momo.service');
const payosService = require('../../services/payos.service');

/**
 * Tạo yêu cầu nạp tiền (deposit) qua MoMo
 */
exports.createDeposit = async (userId, amount) => {
    if (!amount || amount < 1000) {
        throw new Error('INVALID_AMOUNT'); // MoMo tối thiểu 1000 VND
    }
    if (amount > 50000000) {
        throw new Error('AMOUNT_TOO_LARGE'); // MoMo tối đa 50tr VND
    }

    const timestamp = Date.now();
    const orderId = `FAF_${userId}_${timestamp}`;
    const requestId = `REQ_${userId}_${timestamp}`;
    const orderInfo = `Nap ${amount.toLocaleString('vi-VN')} diem vao vi FAF`;

    // 1. Gọi MoMo API
    const momoResponse = await momoService.createPayment({
        orderId,
        requestId,
        amount: Math.round(amount),
        orderInfo,
        extraData: Buffer.from(JSON.stringify({ userId })).toString('base64'),
    });

    if (momoResponse.resultCode !== 0) {
        throw new Error(`MOMO_ERROR: ${momoResponse.message} (code: ${momoResponse.resultCode})`);
    }

    // 2. Lưu deposit request vào DB
    const { rows } = await pool.query(sql.createDeposit, [
        userId,
        orderId,
        requestId,
        amount,
        momoResponse.payUrl,
        'MOMO',
        null
    ]);

    return {
        deposit: rows[0],
        payUrl: momoResponse.payUrl,
        deeplink: momoResponse.deeplink,
        qrCodeUrl: momoResponse.qrCodeUrl,
    };
};

/**
 * Xử lý IPN callback từ MoMo
 * Được gọi khi user thanh toán xong (hoặc hủy)
 */
exports.handleMomoIPN = async (ipnData) => {
    // 1. Verify chữ ký
    const isValid = momoService.verifyIpnSignature(ipnData);
    if (!isValid) {
        console.error('❌ MoMo IPN: Invalid signature', ipnData.orderId);
        throw new Error('INVALID_SIGNATURE');
    }

    const { orderId, resultCode, transId, message, amount } = ipnData;

    // 2. Tìm deposit request
    const { rows: deposits } = await pool.query(sql.getByOrderId, [orderId]);
    const deposit = deposits[0];

    if (!deposit) {
        console.error('❌ MoMo IPN: Deposit not found', orderId);
        throw new Error('DEPOSIT_NOT_FOUND');
    }

    // 3. Kiểm tra đã xử lý chưa (idempotent)
    if (deposit.status === 'SUCCESS') {
        console.log('⚠️ MoMo IPN: Already processed', orderId);
        return deposit;
    }

    // 4. Cập nhật trạng thái
    const status = resultCode === 0 ? 'SUCCESS' : 'FAILED';
    await pool.query(sql.updateStatus, [
        orderId,
        status,
        transId ? transId.toString() : null,
        resultCode,
        message,
    ]);

    // 5. Nếu thành công → cộng tiền vào wallet
    if (resultCode === 0) {
        const depositAmount = Number(deposit.amount);

        // Cộng balance
        await pool.query(sql.addBalance, [depositAmount, deposit.user_id]);

        // Ghi transaction
        const { rows: walletRows } = await pool.query(sql.getWalletByUserId, [deposit.user_id]);
        if (walletRows[0]) {
            await pool.query(sql.createTransaction, [
                walletRows[0].id,
                'DEPOSIT',
                depositAmount,
                'DEPOSIT',
                deposit.id,
                `Nạp tiền qua MoMo - ${orderId}`,
            ]);
        }

        console.log(`✅ MoMo IPN: Deposit SUCCESS - ${orderId} - ${depositAmount} points → user ${deposit.user_id}`);
    } else {
        console.log(`❌ MoMo IPN: Deposit FAILED - ${orderId} - code: ${resultCode} - ${message}`);
    }

    return { orderId, status, amount };
};

/**
 * Kiểm tra trạng thái deposit
 */
exports.getDepositStatus = async (orderId, userId) => {
    const { rows } = await pool.query(sql.getByOrderIdAndUser, [orderId, userId]);
    if (!rows[0]) throw new Error('DEPOSIT_NOT_FOUND');
    return rows[0];
};

/**
 * Lấy số dư wallet
 */
exports.getBalance = async (userId) => {
    const { rows } = await pool.query(sql.getBalance, [userId]);
    if (!rows[0]) {
        // Tạo wallet nếu chưa có
        await pool.query(
            'INSERT INTO wallets (user_id, balance_points, locked_points, updated_at) VALUES ($1, 0, 0, NOW()) ON CONFLICT (user_id) DO NOTHING',
            [userId]
        );
        return { balance_points: 0, locked_points: 0 };
    }
    return rows[0];
};

/**
 * Tạo yêu cầu nạp tiền (deposit) qua PayOS (VietQR)
 */
exports.createPayOSDeposit = async (userId, amount) => {
    if (!amount || amount < 1000) {
        throw new Error('INVALID_AMOUNT');
    }

    // PayOS orderCode must be a number (max 2^53 - 1)
    const orderCode = Number(String(Date.now()).slice(-9)); // Use last 9 digits of timestamp
    const orderId = `FAF_QR_${userId}_${Date.now()}`;
    const description = `Nap diem FAF #${userId}`;

    // 1. Gọi PayOS API
    const payosResponse = await payosService.createPaymentLink({
        orderCode,
        amount: Math.round(amount),
        description,
        returnUrl: process.env.PAYOS_RETURN_URL || 'http://localhost:5173/wallet/success',
        cancelUrl: process.env.PAYOS_CANCEL_URL || 'http://localhost:5173/wallet/cancel',
    });

    // 2. Lưu deposit request vào DB
    const { rows } = await pool.query(sql.createDeposit, [
        userId,
        orderId,
        'PAYOS_REQ',
        amount,
        payosResponse.checkoutUrl,
        'PAYOS',
        orderCode
    ]);

    return {
        deposit: rows[0],
        checkoutUrl: payosResponse.checkoutUrl,
        qrCode: payosResponse.qrCode,
    };
};

/**
 * Xử lý Webhook từ PayOS
 */
exports.handlePayOSWebhook = async (webhookData) => {
    // 1. Verify data
    const verifiedData = payosService.verifyWebhookData(webhookData);
    if (!verifiedData) {
        throw new Error('INVALID_WEBHOOK_DATA');
    }

    const { orderCode, success } = verifiedData;

    // 2. Tìm deposit request
    const { rows: deposits } = await pool.query(sql.getByPayOSOrderCode, [orderCode]);
    const deposit = deposits[0];

    if (!deposit) {
        console.error('❌ PayOS Webhook: Deposit not found', orderCode);
        throw new Error('DEPOSIT_NOT_FOUND');
    }

    // 3. Kiểm tra đã xử lý chưa
    if (deposit.status === 'SUCCESS') {
        return deposit;
    }

    // 4. Cập nhật trạng thái
    const status = success ? 'SUCCESS' : 'FAILED';
    await pool.query(sql.updateStatusByPayOSCode, [
        orderCode,
        status,
        success ? 0 : 1,
        success ? 'Success' : 'Failed'
    ]);

    // 5. Nếu thành công → cộng tiền vào wallet
    if (success) {
        const depositAmount = Number(deposit.amount);
        await pool.query(sql.addBalance, [depositAmount, deposit.user_id]);

        const { rows: walletRows } = await pool.query(sql.getWalletByUserId, [deposit.user_id]);
        if (walletRows[0]) {
            await pool.query(sql.createTransaction, [
                walletRows[0].id,
                'DEPOSIT',
                depositAmount,
                'DEPOSIT',
                deposit.id,
                `Nạp tiền qua VietQR - ${deposit.order_id}`,
            ]);
        }
        console.log(`✅ PayOS Webhook: Deposit SUCCESS - ${deposit.order_id} - ${depositAmount} points → user ${deposit.user_id}`);
    }

    return { orderId: deposit.order_id, status };
};

/**
 * Lấy lịch sử giao dịch
 */
exports.getTransactions = async (userId, limit = 20, offset = 0) => {
    const { rows } = await pool.query(sql.getTransactions, [userId, limit, offset]);
    return rows;
};

/**
 * Lấy lịch sử nạp tiền
 */
exports.getDepositHistory = async (userId, limit = 20, offset = 0) => {
    const { rows } = await pool.query(sql.getDepositHistory, [userId, limit, offset]);
    return rows;
};
