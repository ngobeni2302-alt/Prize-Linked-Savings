/* ================================================
   MTN MoMo Enhanced Mini App - JavaScript
   Page navigation and placeholder interactions
   ================================================ */

// --- Page Navigation ---
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

function navigateTo(pageName) {
    pages.forEach(page => {
        page.classList.remove('page--active');
    });

    navItems.forEach(item => {
        item.classList.remove('nav-item--active');
    });

    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
        targetPage.classList.remove('page--active');
        void targetPage.offsetWidth;
        targetPage.classList.add('page--active');
    }

    const targetNav = document.querySelector(`[data-target="${pageName}"]`);
    if (targetNav) {
        targetNav.classList.add('nav-item--active');
    }
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        navigateTo(target);
    });
});


// --- Game Card Placeholder Interaction ---
const gameCards = document.querySelectorAll('.game-card');

gameCards.forEach(card => {
    card.addEventListener('click', () => {
        card.style.backgroundColor = '#000';
        card.querySelector('.game-card-front').style.color = '#FFCB05';
        card.querySelector('.game-card-front').textContent = '!';

        setTimeout(() => {
            card.style.backgroundColor = '#FFCB05';
            card.querySelector('.game-card-front').style.color = '#000';
            card.querySelector('.game-card-front').textContent = '?';
        }, 800);
    });
});


// --- Copy Referral Code Placeholder ---
const copyBtn = document.getElementById('btn-copy-code');
if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        const codeEl = document.querySelector('.referral-code');
        if (codeEl) {
            navigator.clipboard.writeText(codeEl.textContent).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy Code';
                }, 1500);
            }).catch(() => {
                copyBtn.textContent = 'Copy Code';
            });
        }
    });
}


// --- Placeholder Button Alerts ---
const placeholderButtons = [
    'btn-send-money',
    'btn-buy-airtime',
    'btn-pay-bills',
    'btn-cash-in',
    'btn-deposit-personal',
    'btn-withdraw-personal',
    'btn-create-group',
    'btn-join-group',
    'btn-share-code'
];

placeholderButtons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
        btn.addEventListener('click', () => {
            const label = btn.querySelector('.action-btn-label')?.textContent || btn.textContent;
            console.log(`[Placeholder] "${label}" action triggered. To be implemented.`);
        });
    }
});


console.log('MTN MoMo Enhanced Mini App loaded.');
console.log('Pages: Home | Savings | The Ruler | Referrals');
console.log('All interactions are placeholders for future implementation.');

let state = {
    walletBalance:2450.00,
    savingsBalance: 0,
    tickets: 0,
};
console.log(state);

function formatCurrency(amount){
    return "R" + amount;
}
console.log(formatCurrency(state.walletBalance));