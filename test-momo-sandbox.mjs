// test-momo-sandbox.mjs
// MTN MoMo Collection & Disbursement Sandbox Verification Test
import crypto from 'crypto';

const API_USER = '03dc7c1f-fced-482c-8310-5ba5b9b2f7e3';
const API_KEY = '380be0d67ac548719a36fcd1e11acf9c';

const COLLECTION_KEY = '43d221083a874eb2a97d00b6a099a3e4';
const DISBURSEMENT_KEY = '999cb903719a41eeb8a0d8b3ca11c3be';

const BASE_URL = 'https://sandbox.momodeveloper.mtn.com';

console.log('===========================================================');
console.log('🚀 MTN MoMo Sandbox API Diagnostics');
console.log('👤 API User (UUID):', API_USER);
console.log('🔑 API Key:         ', API_KEY.slice(0, 6) + '...' + API_KEY.slice(-4));
console.log('📦 Collection Key:  ', COLLECTION_KEY.slice(0, 6) + '...' + COLLECTION_KEY.slice(-4));
console.log('💸 Disbursement Key:', DISBURSEMENT_KEY.slice(0, 6) + '...' + DISBURSEMENT_KEY.slice(-4));
console.log('===========================================================\n');

async function testProduct(productName, subKey) {
  console.log(`\n--- [Testing ${productName}] ---`);
  const basicAuth = Buffer.from(`${API_USER}:${API_KEY}`).toString('base64');

  // 1. Request OAuth Bearer Token
  console.log(`[1] Requesting OAuth 2.0 Bearer Token for ${productName.toLowerCase()}...`);
  try {
    const tokenRes = await fetch(`${BASE_URL}/${productName.toLowerCase()}/token/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Ocp-Apim-Subscription-Key': subKey,
      },
    });

    console.log(` -> Token HTTP Status: ${tokenRes.status} ${tokenRes.statusText}`);

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error(`❌ Token Request Failed for ${productName}:`, err);
      return;
    }

    const tokenData = await tokenRes.json();
    console.log(`✅ ${productName} Token Granted!`);
    console.log(` -> Token Type: ${tokenData.token_type}`);
    console.log(` -> Expires in: ${tokenData.expires_in}s`);

    // 2. Query Account Balance
    console.log(`\n[2] Querying Account Balance for ${productName}...`);
    const balanceRes = await fetch(`${BASE_URL}/${productName.toLowerCase()}/v1_0/account/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': subKey,
      },
    });

    console.log(` -> Balance HTTP Status: ${balanceRes.status} ${balanceRes.statusText}`);
    if (balanceRes.ok) {
      const bal = await balanceRes.json();
      console.log(`✅ ${productName} Account Balance: ${bal.availableBalance} ${bal.currency}`);
    } else {
      const balErr = await balanceRes.text();
      console.log(`ℹ️ Balance response:`, balErr);
    }

    // 3. Test Request To Pay (if Collection)
    if (productName.toLowerCase() === 'collection') {
      console.log(`\n[3] Testing RequestToPay (Deposit) simulation...`);
      const xRef = crypto.randomUUID();
      const rtpRes = await fetch(`${BASE_URL}/collection/v1_0/requesttopay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'X-Reference-Id': xRef,
          'X-Target-Environment': 'sandbox',
          'Ocp-Apim-Subscription-Key': subKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: '50.00',
          currency: 'EUR',
          externalId: 'TXN_' + Date.now(),
          payer: {
            partyIdType: 'MSISDN',
            partyId: '46733123450', // MTN sandbox test number → SUCCESSFUL
          },
          payerMessage: 'MoMo Savings Deposit',
          payeeNote: 'Prize Linked Savings',
        }),
      });

      console.log(` -> RequestToPay HTTP Status: ${rtpRes.status} ${rtpRes.statusText}`);
      if (rtpRes.status === 202) {
        console.log(`✅ RequestToPay Accepted (202 Accepted)! Reference ID: ${xRef}`);
      } else {
        console.log(`ℹ️ RequestToPay response:`, await rtpRes.text());
      }
    }

  } catch (e) {
    console.error(`❌ Network error for ${productName}:`, e.message);
  }
}

async function main() {
  await testProduct('Collection', COLLECTION_KEY);
  await testProduct('Disbursement', DISBURSEMENT_KEY);
  console.log('\n===========================================================');
  console.log('🏁 Diagnostics Completed!');
  console.log('===========================================================\n');
}

main();
