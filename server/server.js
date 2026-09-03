/**
 * server.js
 * Small Express backend that exposes safe HTTP routes for the frontend
 * to call, wrapping the MTN MoMo logic in momoApi.js.
 *
 * The frontend NEVER talks to proxy.momoapi.mtn.com directly — it only
 * calls these local routes, so your API keys stay server-side.
 *
 * Setup:
 *   npm install express dotenv cors
 *   node server/server.js
 *
 * Expects momoApi.js in the same folder, and a .env file (see momoApi.js
 * header comment for the required variables).
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { requestToPay, getTransactionStatus } = require('./momoApi');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

/**
 * POST /api/pay
 * Body: { amount: "5", currency: "ZAR", msisdn: "27788033288", externalId?: "..." }
 * Kicks off a Request to Pay and returns the transaction reference to poll.
 */
app.post('/api/pay', async (req, res) => {
  const { amount, currency, msisdn, externalId, payerMessage, payeeNote } = req.body;

  if (!amount || !msisdn) {
    return res.status(400).json({ error: 'amount and msisdn are required' });
  }

  try {
    const { referenceId } = await requestToPay({
      amount,
      currency,
      msisdn,
      externalId,
      payerMessage,
      payeeNote,
    });
    res.status(202).json({ referenceId });
  } catch (err) {
    console.error('Request to pay error:', err.message);
    res.status(502).json({ error: 'Failed to initiate payment', details: err.message });
  }
});

/**
 * GET /api/status/:referenceId
 * Returns the current status of a transaction (PENDING | SUCCESSFUL | FAILED).
 */
app.get('/api/status/:referenceId', async (req, res) => {
  const { referenceId } = req.params;

  try {
    const status = await getTransactionStatus(referenceId);
    res.json(status);
  } catch (err) {
    console.error('Status check error:', err.message);
    res.status(502).json({ error: 'Failed to fetch transaction status', details: err.message });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`MoMo backend listening on http://localhost:${PORT}`);
});

/**
 * Example frontend usage (in app.js):
 *
 * async function payWithMomo(amount, msisdn) {
 *   const payRes = await fetch('http://localhost:4000/api/pay', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ amount, currency: 'ZAR', msisdn }),
 *   });
 *   const { referenceId } = await payRes.json();
 *
 *   // Poll for status every few seconds
 *   const statusRes = await fetch(`http://localhost:4000/api/status/${referenceId}`);
 *   const status = await statusRes.json();
 *   console.log(status.status); // PENDING | SUCCESSFUL | FAILED
 * }
 */