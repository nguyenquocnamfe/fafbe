/**
 * PayOS Payment Service (v2 SDK)
 * Tích hợp PayOS - VietQR
 */
const { PayOS } = require('@payos/node');

let payos = null;

try {
    if (process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY) {
        payos = new PayOS({
            clientId: process.env.PAYOS_CLIENT_ID,
            apiKey: process.env.PAYOS_API_KEY,
            checksumKey: process.env.PAYOS_CHECKSUM_KEY
        });
    } else {
        console.warn('⚠️ PayOS credentials missing. VietQR functionality will be disabled.');
    }
} catch (error) {
    console.error('❌ Failed to initialize PayOS SDK:', error.message);
}

/**
 * Tạo link thanh toán VietQR
 */
async function createPaymentLink({ orderCode, amount, description, returnUrl, cancelUrl }) {
    if (!payos) {
        throw new Error('PAYOS_NOT_CONFIGURED');
    }

    const body = {
        orderCode: Number(orderCode),
        amount: Number(amount),
        description,
        returnUrl,
        cancelUrl,
    };

    try {
        // v2 SDK uses paymentRequests.create
        const paymentLinkResponse = await payos.paymentRequests.create(body);
        return paymentLinkResponse;
    } catch (error) {
        console.error('PayOS createPaymentLink error:', error);
        throw error;
    }
}

/**
 * Verify webhook data từ PayOS
 */
function verifyWebhookData(webhookBody) {
    if (!payos) return null;
    // v2 SDK uses webhooks.verify
    return payos.webhooks.verify(webhookBody);
}

module.exports = {
    createPaymentLink,
    verifyWebhookData,
    payos
};
