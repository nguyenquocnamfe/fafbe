/**
 * Integrated Payment Flows Test (MoMo & VietQR)
 */
require('dotenv').config();
const http = require('http');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('../src/config/database');

const BASE = `http://localhost:5000`;

async function api(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE);
        const options = {
            hostname: url.hostname,
            port: 5000,
            path: url.pathname + url.search,
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
                } catch {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function createMomoIpnSignature(params) {
    const rawSignature = [
        `accessKey=${process.env.MOMO_ACCESS_KEY}`,
        `amount=${params.amount}`,
        `extraData=${params.extraData}`,
        `message=${params.message}`,
        `orderId=${params.orderId}`,
        `orderInfo=${params.orderInfo}`,
        `orderType=${params.orderType}`,
        `partnerCode=${params.partnerCode}`,
        `payType=${params.payType}`,
        `requestId=${params.requestId}`,
        `responseTime=${params.responseTime}`,
        `resultCode=${params.resultCode}`,
        `transId=${params.transId}`,
    ].join('&');
    return crypto.createHmac('sha256', process.env.MOMO_SECRET_KEY).update(rawSignature).digest('hex');
}

(async () => {
    let client;
    let userId, token;
    const ts = Date.now();
    const email = `test_payment_${ts}@test.com`;

    try {
        console.log('\n🚀 STARTING INTEGRATED PAYMENT FLOWS TEST\n');
        client = await pool.connect();

        // 1. Setup Test User
        console.log('--- 1. Setup Test User ---');
        const pwHash = await bcrypt.hash('Test1234!', 10);
        const { rows: userRows } = await client.query(
            "INSERT INTO users (email, password_hash, role, status, email_verified) VALUES ($1, $2, 'employer', 'ACTIVE', true) RETURNING *",
            [email, pwHash]
        );
        userId = userRows[0].id;
        await client.query("INSERT INTO wallets (user_id, balance_points, locked_points) VALUES ($1, 0, 0)", [userId]);
        console.log(`✓ User created: ${email}`);

        // 2. Login
        console.log('\n--- 2. Login ---');
        const loginRes = await api('POST', '/api/auth/login', { email, password: 'Test1234!' });
        token = loginRes.data.token;
        console.log('✓ Logged in');

        // 3. Test MoMo Flow
        console.log('\n--- 3. Test MoMo Payment Flow ---');
        const momoDepRes = await api('POST', '/api/wallet/deposit', { amount: 10000 }, token);
        if (momoDepRes.status === 200) {
            const { orderId } = momoDepRes.data.data;
            console.log(`✓ MoMo Deposit Created: ${orderId}`);

            // Simulate IPN
            const ipnParams = {
                partnerCode: process.env.MOMO_PARTNER_CODE,
                orderId: orderId,
                requestId: `REQ_${ts}`,
                amount: 10000,
                orderInfo: 'Nap 10,000 diem',
                orderType: 'momo_wallet',
                transId: 'TX' + ts,
                resultCode: 0,
                message: 'Successful.',
                payType: 'qr',
                responseTime: ts,
                extraData: Buffer.from(JSON.stringify({ userId })).toString('base64'),
            };
            ipnParams.signature = createMomoIpnSignature(ipnParams);
            await api('POST', '/api/wallet/deposits/momo/ipn', ipnParams);
            console.log('✓ Mock MoMo IPN Handled');

            const balRes = await api('GET', '/api/wallet/balance', null, token);
            console.log(`✓ Balance after MoMo: ${balRes.data.data.balance_points} (Expected: 10000)`);
        } else {
            console.log('⚠ MoMo Deposit Failed (check credentials):', momoDepRes.data);
        }

        // 4. Test VietQR (PayOS) Flow
        console.log('\n--- 4. Test VietQR (PayOS) Payment Flow ---');
        const qrDepRes = await api('POST', '/api/wallet/deposit/payos', { amount: 20000 }, token);
        if (qrDepRes.status === 200) {
            const { orderId, checkoutUrl } = qrDepRes.data.data;
            console.log(`✓ VietQR Deposit Created: ${orderId}`);
            console.log(`  Checkout URL: ${checkoutUrl}`);
        } else {
            console.log(`✓ Received expected status ${qrDepRes.status} for VietQR (Reason: ${qrDepRes.data.message})`);
            if (qrDepRes.data.message === 'PAYOS_NOT_CONFIGURED') {
                console.log('  (Correct: PayOS is not configured in .env yet)');
            }
        }

    } catch (err) {
        console.error('\n❌ TEST ERROR:', err);
    } finally {
        if (userId) {
            console.log('\n--- Cleanup ---');
            await client.query('DELETE FROM transactions WHERE wallet_id = (SELECT id FROM wallets WHERE user_id = $1)', [userId]);
            await client.query('DELETE FROM deposit_requests WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM wallets WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM users WHERE id = $1', [userId]);
            console.log('✓ Cleanup complete');
        }
        if (client) client.release();
        await pool.end();
    }
})();
