let savingsBalance = 0; // replace with your real state source

function creditSavingsBalance(amount) {
    savingsBalance += Number(amount);
    renderBalance();
}

function renderBalance() {
    const el = document.getElementById('savings-balance');
    if (el) el.textContent = `R${savingsBalance.toFixed(2)}`;
}

function setDepositUIState(state, message = '') {
    const statusEl = document.getElementById('deposit-status');
    const submitBtn = document.getElementById('deposit-submit');

    if (submitBtn) submitBtn.disabled = state === 'pending';

    if (!statusEl) return;

    switch (state) {
        case 'pending':
            statusEl.textContent = 'Waiting for MoMo confirmation…';
            statusEl.className = 'status status-pending';
            break;
        case 'success':
            statusEl.textContent = 'Deposit confirmed! Balance updated.';
            statusEl.className = 'status status-success';
            break;
        case 'failed':
            statusEl.textContent = message || 'Payment was declined or cancelled.';
            statusEl.className = 'status status-failed';
            break;
        case 'pending-unconfirmed':
            statusEl.textContent = message || 'Still waiting on confirmation — check back shortly.';
            statusEl.className = 'status status-pending';
            break;
        case 'error':
            statusEl.textContent = message || 'Something went wrong. Try again.';
            statusEl.className = 'status status-error';
            break;
        default:
            statusEl.textContent = '';
            statusEl.className = 'status';
    }
}

async function handleDeposit(phone, amount) {
    setDepositUIState('pending');

    try {
        const result = await depositToMomo(phone, amount);

        if (result.status === 'SUCCESSFUL') {
            creditSavingsBalance(amount); // only touch the balance here
            setDepositUIState('success');
        } else if (result.status === 'FAILED') {
            setDepositUIState('failed');
        } else {
            // TIMEOUT or still PENDING after the server gave up polling
            setDepositUIState('pending-unconfirmed');
        }
    } catch (err) {
        setDepositUIState('error', err.message);
    }
}

// Hook up to your actual deposit form — adjust IDs to match your HTML
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('deposit-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = document.getElementById('deposit-phone').value.trim();
        const amount = document.getElementById('deposit-amount').value.trim();
        handleDeposit(phone, amount);
    });
});