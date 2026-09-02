// server.js
// Stash Draw (Prize-Linked Savings) — Personal Savings backend
// Built with Node.js core modules only: http, https, fs, path, crypto
// No express, no axios, no dotenv, no uuid.

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const STATIC_ROOT = __dirname;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

// -----------------------------------------------------------------------
// 1. Hand-rolled .env loader (replaces dotenv)
// -----------------------------------------------------------------------
function loadEnv(envPath = path.join(__dirname, '.env')) {
    if (!fs.existsSync(envPath)) {
        console.warn(`No .env file found at ${envPath}`);
        return;
    }

    const contents = fs.readFileSync(envPath, 'utf-8');

    contents.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) return;

        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();

        // strip surrounding quotes if present
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        process.env[key] = value;
    });
}

loadEnv();

const {
    MOMO_SUBSCRIPTION_KEY,
    MOMO_API_USER,
    MOMO_API_KEY,
    MOMO_BASE_URL, // e.g. proxy.momoapi.mtn.com
} = process.env;

// -----------------------------------------------------------------------
// Small helper: run an HTTPS request and resolve with { statusCode, body }
// -----------------------------------------------------------------------
function httpsRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
            });
        });

        req.on('error', reject);

        if (body) req.write(body);
        req.end();
    });
}

// -----------------------------------------------------------------------
// 2. Get a MoMo Collections access token
// -----------------------------------------------------------------------
function getMomoToken() {
    return new Promise((resolve, reject) => {
        const basicAuth = Buffer.from(`${MOMO_API_USER}:${MOMO_API_KEY}`).toString('base64');

        const options = {
            hostname: MOMO_BASE_URL,
            path: '/collection/token/',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
                'X-Target-Environment': 'mtnsouthafrica',
                'Content-Length': 0,
            },
        };

        httpsRequest(options)
            .then(({ statusCode, body }) => {
                if (statusCode !== 200) {
                    reject(new Error(`Token request failed (${statusCode}): ${body}`));
                    return;
                }
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed.access_token);
                } catch (err) {
                    reject(new Error(`Failed to parse token response: ${body}`));
                }
            })
            .catch(reject);
    });
}

// -----------------------------------------------------------------------
// 3. Request a payment (deposit) from a MoMo user
// -----------------------------------------------------------------------
function requestToPay(token, phone, amount) {
    return new Promise((resolve, reject) => {
        const referenceId = crypto.randomUUID();

        const payload = JSON.stringify({
            amount: String(amount),
            currency: 'ZAR',
            externalId: referenceId,
            payer: {
                partyIdType: 'MSISDN',
                partyId: phone,
            },
            payerMessage: 'Stash Draw savings deposit',
            payeeNote: 'Personal Savings deposit',
        });

        const options = {
            hostname: MOMO_BASE_URL,
            path: '/collection/v1_0/requesttopay',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
                'X-Target-Environment': 'mtnsouthafrica',
                'X-Reference-Id': referenceId,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
        };

        httpsRequest(options, payload)
            .then(({ statusCode, body }) => {
                if (statusCode !== 202) {
                    reject(new Error(`requestToPay failed (${statusCode}): ${body}`));
                    return;
                }
                resolve(referenceId);
            })
            .catch(reject);
    });
}

// -----------------------------------------------------------------------
// 4. Check the status of a payment
// -----------------------------------------------------------------------
function checkPaymentStatus(token, referenceId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: MOMO_BASE_URL,
            path: `/collection/v1_0/requesttopay/${referenceId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
                'X-Target-Environment': 'mtnsouthafrica',
            },
        };

        httpsRequest(options)
            .then(({ statusCode, body }) => {
                if (statusCode !== 200) {
                    reject(new Error(`Status check failed (${statusCode}): ${body}`));
                    return;
                }
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed); // { status: 'PENDING' | 'SUCCESSFUL' | 'FAILED', ... }
                } catch (err) {
                    reject(new Error(`Failed to parse status response: ${body}`));
                }
            })
            .catch(reject);
    });
}

// -----------------------------------------------------------------------
// 5. Poll status until SUCCESSFUL / FAILED, or give up after maxAttempts
// -----------------------------------------------------------------------
function pollPaymentStatus(token, referenceId, { intervalMs = 3000, maxAttempts = 10 } = {}) {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        const attempt = () => {
            attempts++;
            checkPaymentStatus(token, referenceId)
                .then((result) => {
                    if (result.status === 'SUCCESSFUL' || result.status === 'FAILED') {
                        resolve(result);
                    } else if (attempts >= maxAttempts) {
                        resolve({ status: 'TIMEOUT', raw: result });
                    } else {
                        setTimeout(attempt, intervalMs);
                    }
                })
                .catch(reject);
        };

        attempt();
    });
}

// -----------------------------------------------------------------------
// Request body reader (replaces express's body parsing)
// -----------------------------------------------------------------------
function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
}

// -----------------------------------------------------------------------
// Static file serving (index.html, css, js, images)
// -----------------------------------------------------------------------
function serveStatic(req, res) {
    let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    filePath = path.join(STATIC_ROOT, decodeURIComponent(filePath));

    // prevent path traversal outside the project root
    if (!filePath.startsWith(STATIC_ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(content);
    });
}

// -----------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------
async function handleDeposit(req, res) {
    try {
        const { phone, amount } = await readRequestBody(req);

        if (!phone || !amount || Number(amount) <= 0) {
            sendJson(res, 400, { error: 'Valid phone and amount are required' });
            return;
        }

        const token = await getMomoToken();
        const referenceId = await requestToPay(token, phone, amount);
        const result = await pollPaymentStatus(token, referenceId);

        sendJson(res, 200, { referenceId, status: result.status });
    } catch (err) {
        console.error('Deposit error:', err);
        sendJson(res, 500, { error: 'Deposit failed', detail: err.message });
    }
}

// Kept for manual testing — hits the same flow with a fixed test phone/amount
async function handleTestDeposit(req, res) {
    try {
        const testPhone = process.env.MOMO_TEST_PHONE || '46733123454';
        const testAmount = 5;

        const token = await getMomoToken();
        const referenceId = await requestToPay(token, testPhone, testAmount);
        const result = await pollPaymentStatus(token, referenceId);

        sendJson(res, 200, { referenceId, status: result.status });
    } catch (err) {
        console.error('Test deposit error:', err);
        sendJson(res, 500, { error: 'Test deposit failed', detail: err.message });
    }
}

// -----------------------------------------------------------------------
// Server
// -----------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/api/deposit') {
        await handleDeposit(req, res);
        return;
    }

    if (req.method === 'GET' && req.url === '/api/test-deposit') {
        await handleTestDeposit(req, res);
        return;
    }

    if (req.method === 'GET') {
        serveStatic(req, res);
        return;
    }

    sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
    console.log(`Stash Draw server running at http://localhost:${PORT}`);
});