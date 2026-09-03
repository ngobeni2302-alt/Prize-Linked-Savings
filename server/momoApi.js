/**
 * momoApi.js
 * MTN MoMo (Mobile Money) Collections API client.
 *
 * Flow:
 *   1. getAccessToken()   -> POST /collection/token/
 *   2. requestToPay()     -> POST /collection/v1_0/requesttopay
 *   3. getTransactionStatus() -> GET /collection/v1_0/requesttopay/{referenceId}
 *
 * Requires Node.js 18+ (built-in fetch, crypto.randomUUID).
 *
 * Credentials are read from environment variables — never hardcode them.
 * Create a .env file (and load it with dotenv, or export vars in your shell):
 *
 *   MOMO_API_USER=c6aa9738-7e6b-4de5-ad8c-947fbdee032f
 *   MOMO_API_KEY=07069f088b8c4e48ade327c18289609a
 *   MOMO_SUBSCRIPTION_KEY=dbb663a2429e4d9ca84dbbcbe2bb59e6
 *   MOMO_TARGET_ENVIRONMENT=mtnsouthafrica
 *   MOMO_BASE_URL=https://proxy.momoapi.mtn.com
 */

const {
  MOMO_API_USER,
  MOMO_API_KEY,
  MOMO_SUBSCRIPTION_KEY,
  MOMO_TARGET_ENVIRONMENT = 'mtnsouthafrica',
  MOMO_BASE_URL = 'https://proxy.momoapi.mtn.com',
} = process.env;

function assertConfigured() {
  const missing = ['MOMO_API_USER', 'MOMO_API_KEY', 'MOMO_SUBSCRIPTION_KEY'].filter(
    (key) => !process.env[key]
  );
  if (missing.length) {
    throw new Error(`Missing MoMo API env vars: ${missing.join(', ')}`);
  }
}

/**
 * Step 1: Generate an access token using Basic Auth (apiUser:apiKey).
 * @returns {Promise<{accessToken: string, expiresIn: number}>}
 */
async function getAccessToken() {
  assertConfigured();

  const credentials = Buffer.from(`${MOMO_API_USER}:${MOMO_API_KEY}`).toString('base64');

  const res = await fetch(`${MOMO_BASE_URL}/collection/token/`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
      'X-Target-Environment': MOMO_TARGET_ENVIRONMENT,
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

/**
 * Step 2: Initiate a Request to Pay.
 * @param {object} params
 * @param {string} params.amount - e.g. "5"
 * @param {string} params.currency - e.g. "ZAR"
 * @param {string} params.msisdn - South African MSISDN, no leading "+" (e.g. "27788033288")
 * @param {string} [params.externalId] - your own reference for the payment
 * @param {string} [params.payerMessage]
 * @param {string} [params.payeeNote]
 * @returns {Promise<{referenceId: string}>} the X-Reference-Id to use for status checks
 */
async function requestToPay({
  amount,
  // NOTE: MTN's sandbox environment only accepts EUR, regardless of target
  // country/currency. Switch this default to 'ZAR' once you move to live
  // production credentials.
  currency = 'EUR',
  msisdn,
  externalId = String(Date.now()),
  payerMessage = 'MoMo Payment',
  payeeNote = 'MoMo Payment',
}) {
  assertConfigured();

  if (!amount || !msisdn) {
    throw new Error('requestToPay requires "amount" and "msisdn"');
  }

  const { accessToken } = await getAccessToken();
  const referenceId = crypto.randomUUID();

  const res = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      'X-Reference-Id': referenceId,
      'X-Target-Environment': MOMO_TARGET_ENVIRONMENT,
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      amount: String(amount),
      currency,
      externalId,
      payer: {
        partyIdType: 'MSISDN',
        partyId: msisdn,
      },
      payerMessage,
      payeeNote,
    }),
  });

  if (res.status !== 202) {
    throw new Error(`Request to pay failed: ${res.status} ${await res.text()}`);
  }

  return { referenceId };
}

/**
 * Step 3: Check the status of a Request to Pay transaction.
 * @param {string} referenceId - the X-Reference-Id returned by requestToPay()
 * @returns {Promise<object>} transaction status payload (status: PENDING | SUCCESSFUL | FAILED)
 */
async function getTransactionStatus(referenceId) {
  assertConfigured();

  if (!referenceId) {
    throw new Error('getTransactionStatus requires "referenceId"');
  }

  const { accessToken } = await getAccessToken();

  const res = await fetch(
    `${MOMO_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Target-Environment': MOMO_TARGET_ENVIRONMENT,
        'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Status check failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

module.exports = { getAccessToken, requestToPay, getTransactionStatus };

/**
 * Example usage:
 *
 * (async () => {
 *   const { referenceId } = await requestToPay({
 *     amount: '5',
 *     currency: 'ZAR',
 *     msisdn: '27788033288',
 *   });
 *   console.log('Transaction reference:', referenceId);
 *
 *   const status = await getTransactionStatus(referenceId);
 *   console.log('Status:', status);
 * })();
 */