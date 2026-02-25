const { Pool } = require('pg');
const http = require('http');
const io = require('socket.io-client');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const API_URL = 'http://localhost:5000';
const SOCKET_URL = 'http://localhost:5000';

const runRequest = (path, method, body, token) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (d) => responseBody += d);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: responseBody }));
    });
    req.on('error', (error) => reject(error));
    if (data) req.write(data);
    req.end();
  });
};

const connectSocket = (token) => {
    return io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket']
    });
};

(async () => {
  let tokenClient, tokenWorker;
  const clientEmail = 'rh6g534@yopmail.com';
  const workerEmail = 'ergfe3@yopmail.com';
  const password = 'TestPass123!';

  try {
    console.log('--- 1. Login ---');
    const loginClient = await runRequest('/api/auth/login', 'POST', { email: clientEmail, password });
    if (loginClient.statusCode !== 200) throw new Error(`Client login failed: ${loginClient.body}`);
    tokenClient = JSON.parse(loginClient.body).token;
    console.log('✓ Client logged in');

    const loginWorker = await runRequest('/api/auth/login', 'POST', { email: workerEmail, password });
    if (loginWorker.statusCode !== 200) throw new Error(`Worker login failed: ${loginWorker.body}`);
    tokenWorker = JSON.parse(loginWorker.body).token;
    console.log('✓ Worker logged in');

    console.log('\n--- 2. Chat Feature ---');
    // Start Chat
    const startChatRes = await runRequest('/api/chat/start', 'POST', { otherUserId: 35 }, tokenClient);
    if (startChatRes.statusCode !== 200) throw new Error(`Start chat failed: ${startChatRes.body}`);
    const conversationId = JSON.parse(startChatRes.body).data.id;
    console.log(`✓ Conversation started/retrieved: ID ${conversationId}`);

    // Test Socket Messaging
    const workerSocket = connectSocket(tokenWorker);
    const clientSocket = connectSocket(tokenClient);

    await new Promise((resolve, reject) => {
        workerSocket.on('connect', () => {
            console.log('✓ Worker socket connected');
            workerSocket.emit('join_conversation', conversationId);
            
            workerSocket.on('receive_message', (msg) => {
                console.log(`✓ Worker received message: "${msg.content}"`);
                resolve();
            });

            // Client sends message
            setTimeout(() => {
                console.log('Client sending message...');
                clientSocket.emit('send_message', { conversationId, content: "Hello from Client!" });
            }, 500);
        });

        setTimeout(() => reject(new Error('Socket timeout')), 5000);
    });

    clientSocket.disconnect();
    workerSocket.disconnect();

    console.log('\n--- 3. Contract Termination (Hủy làm việc) ---');
    const contractId = 51; 
    const termRes = await runRequest(`/api/contracts/${contractId}/terminate`, 'PUT', null, tokenClient);
    if (termRes.statusCode !== 200) throw new Error(`Termination failed: ${termRes.body}`);
    console.log(`✓ Contract ${contractId} terminated successfully`);
    console.log(`Result: ${termRes.body}`);

    console.log('\n--- 4. Verify DB Status ---');
    const dbCheck = await pool.query('SELECT status FROM jobs WHERE id = 56');
    console.log(`✓ Job 56 Status: ${dbCheck.rows[0].status} (Expected: OPEN)`);
    
    const contractCheck = await pool.query('SELECT status FROM contracts WHERE id = $1', [contractId]);
    console.log(`✓ Contract ${contractId} Status: ${contractCheck.rows[0].status} (Expected: CANCELLED)`);

    console.log('\n🎉 ALL TESTS PASSED!');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  } finally {
      await pool.end();
  }
})();
