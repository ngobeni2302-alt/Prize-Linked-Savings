// Frontend helper — talks to our own backend, never directly to MoMo.

async function depositToMomo(phone, amount) {
    const response = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, amount }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Deposit request failed (${response.status})`);
    }

    return response.json(); // { referenceId, status }
}