/* ================================================
   MTN MoMo Enhanced Mini App - JavaScript
   Pockets (Group Savings), Personal Savings, Referrals & The Ruler Game
   ================================================ */

// --- Universal Toast Notification ---
function showToast(message, type = 'success') {
  let toast = document.querySelector('.momo-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'momo-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'momo-toast momo-toast--show';
  setTimeout(() => {
    toast.className = 'momo-toast';
  }, 3500);
}

// --- Page Navigation ---
function navigateTo(pageName) {
  const mapping = {
    'home': 'index.html',
    'savings': 'savings.html',
    'game': 'game.html',
    'referrals': 'referrals.html'
  };
  window.location.href = mapping[pageName] || 'index.html';
}

// --- Current User State ---
const CURRENT_USER_KEY = 'momo_current_user';
function getCurrentUser() {
  let user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
  if (!user) {
    user = {
      id: 'usr_' + Math.random().toString(36).slice(2, 8),
      name: 'Nkosana Dlamini',
      phone: '+27 83 *** 4921',
      kyc_status: 'verified'
    };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }
  return user;
}

// --- Wallet Balance State ---
const WALLET_KEY = 'momo_wallet_balance';
function getWalletBalance() {
  const bal = localStorage.getItem(WALLET_KEY);
  if (bal === null) {
    localStorage.setItem(WALLET_KEY, '5450.00');
    return 5450.00;
  }
  return parseFloat(bal) || 0.00;
}

function setWalletBalance(amount) {
  localStorage.setItem(WALLET_KEY, amount.toFixed(2));
  updateWalletUI();
}

function updateWalletUI() {
  const bal = getWalletBalance();
  const formatted = `R${bal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const headerWalletAmount = document.getElementById('header-wallet-amount');
  if (headerWalletAmount) headerWalletAmount.textContent = formatted;
  
  const walletEls = document.querySelectorAll('.wallet-amount');
  walletEls.forEach(el => el.textContent = formatted);

  const homeWalletEl = document.querySelector('#card-wallet-summary .card-value');
  if (homeWalletEl) homeWalletEl.textContent = formatted;

  const contribBalEl = document.getElementById('contribute-momo-balance');
  if (contribBalEl) contribBalEl.textContent = formatted;

  const personalDepositBalEl = document.getElementById('personal-deposit-wallet-balance');
  if (personalDepositBalEl) personalDepositBalEl.textContent = formatted;
}


// --- Universal MoMo 4-Digit PIN Security Modal ---
let activePinCallback = null;
let currentPinBuffer = '';

const pinModal = document.getElementById('modal-momo-pin');
const pinDotsContainer = document.getElementById('pin-dots');
const pinPromptAction = document.getElementById('pin-prompt-action');
const closePinBtn = document.getElementById('btn-close-pin-modal');
const pinClearBtn = document.getElementById('btn-pin-clear');
const pinBackspaceBtn = document.getElementById('btn-pin-backspace');

function requestPinAuth(actionDescription, onSuccess) {
  activePinCallback = onSuccess;
  currentPinBuffer = '';
  updatePinDots();
  
  if (pinPromptAction) pinPromptAction.textContent = actionDescription;
  if (pinModal) pinModal.classList.add('modal-overlay--active');
}

function closePinModal() {
  if (pinModal) pinModal.classList.remove('modal-overlay--active');
  activePinCallback = null;
  currentPinBuffer = '';
}

function updatePinDots() {
  if (!pinDotsContainer) return;
  const dots = pinDotsContainer.querySelectorAll('.pin-dot');
  dots.forEach((dot, index) => {
    if (index < currentPinBuffer.length) {
      dot.classList.add('pin-dot--filled');
    } else {
      dot.classList.remove('pin-dot--filled');
    }
  });
}

function handlePinDigit(digit) {
  if (currentPinBuffer.length < 4) {
    currentPinBuffer += digit;
    updatePinDots();

    if (currentPinBuffer.length === 4) {
      setTimeout(() => {
        const callback = activePinCallback;
        closePinModal();
        if (typeof callback === 'function') {
          callback();
        }
      }, 200);
    }
  }
}

if (pinModal) {
  const keyBtns = pinModal.querySelectorAll('.key-btn[data-num]');
  keyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      handlePinDigit(btn.getAttribute('data-num'));
    });
  });

  if (closePinBtn) closePinBtn.addEventListener('click', closePinModal);
  if (pinClearBtn) {
    pinClearBtn.addEventListener('click', () => {
      currentPinBuffer = '';
      updatePinDots();
    });
  }
  if (pinBackspaceBtn) {
    pinBackspaceBtn.addEventListener('click', () => {
      currentPinBuffer = currentPinBuffer.slice(0, -1);
      updatePinDots();
    });
  }

  // Allow keyboard PIN typing when modal active
  window.addEventListener('keydown', (e) => {
    if (!pinModal.classList.contains('modal-overlay--active')) return;
    if (e.key >= '0' && e.key <= '9') {
      handlePinDigit(e.key);
    } else if (e.key === 'Backspace') {
      currentPinBuffer = currentPinBuffer.slice(0, -1);
      updatePinDots();
    } else if (e.key === 'Escape') {
      closePinModal();
    }
  });
}


// --- Ticket State ---
const AVAILABLE_TICKETS_KEY = 'momo_available_tickets';
let availableTickets = parseInt(localStorage.getItem(AVAILABLE_TICKETS_KEY) || '3');

function saveAvailableTickets() {
  localStorage.setItem(AVAILABLE_TICKETS_KEY, availableTickets.toString());
}

function updateTicketUI() {
  const gameTicketsEl = document.getElementById('game-tickets-count');
  const homeTicketsEl = document.getElementById('home-tickets-count');
  const homeCardValue = document.querySelector('#card-tickets-summary .card-value');

  if (gameTicketsEl) gameTicketsEl.textContent = availableTickets;
  if (homeTicketsEl) homeTicketsEl.textContent = availableTickets;
  if (homeCardValue) homeCardValue.textContent = availableTickets;
}

updateTicketUI();

const addTicketBtn = document.getElementById('btn-add-ticket');
if (addTicketBtn) {
  addTicketBtn.addEventListener('click', () => {
    availableTickets++;
    saveAvailableTickets();
    updateTicketUI();
    showToast("+1 Game Ticket added!");
  });
}


// ============================================================================
// GROUP SAVINGS ("POCKETS") ENGINE & DATA STORE
// ============================================================================
const POCKETS_STORAGE_KEY = 'momo_pockets_data';

const CATEGORY_MAP = {
  travel: { label: 'Travel & Holidays', iconSvg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.6.3-1.8 1.1-.2.8.2 1.6 1 1.9l6 3.5-3.5 3.5-2.8-.7c-.4-.1-.8.1-1.1.4l-.6.6c-.3.3-.3.8 0 1.1l3 2.5 2.5 3c.3.3.8.3 1.1 0l.6-.6c.3-.3.5-.7.4-1.1l-.7-2.8 3.5-3.5 3.5 6c.3.8 1.1 1.2 1.9 1 .8-.2 1.3-1 1.1-1.8z"/></svg>' },
  wedding: { label: 'Wedding & Celebrations', iconSvg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' },
  education: { label: 'Education / School Fees', iconSvg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>' },
  emergency: { label: 'Emergency Fund', iconSvg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
  housing: { label: 'Rent / Housing Deposit', iconSvg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
  business: { label: 'Business & Investment', iconSvg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' },
  asset_purchase: { label: 'Gadget / Asset Purchase', iconSvg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>' },
  other: { label: 'Other Goal', iconSvg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>' }
};

function getSeedPockets(currentUser) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  return [
    {
      id: 'pock_capetown_2026',
      name: 'December Cape Town Trip',
      purpose_category: 'travel',
      purpose_note: 'Holiday villa booking & car rental',
      goal_amount: 30000,
      lock_period_days: 90,
      interest_rate: 0.055,
      created_by: currentUser.id,
      created_at: new Date(now - 28 * dayMs).toISOString(),
      lock_end_date: new Date(now + 62 * dayMs).toISOString(),
      status: 'active',
      transparency_level: 'full',
      member_cap: 20,
      join_code: 'POCK-7492-TRVL',
      members: [
        { id: currentUser.id, name: currentUser.name, phone: currentUser.phone, role: 'admin', joined_at: new Date(now - 28 * dayMs).toISOString() },
        { id: 'usr_thabo', name: 'Thabo Mthembu', phone: '+27 82 *** 1102', role: 'member', joined_at: new Date(now - 26 * dayMs).toISOString() },
        { id: 'usr_zanele', name: 'Zanele Khumalo', phone: '+27 71 *** 8831', role: 'member', joined_at: new Date(now - 22 * dayMs).toISOString() },
        { id: 'usr_sipho', name: 'Sipho Dlamini', phone: '+27 83 *** 4419', role: 'member', joined_at: new Date(now - 15 * dayMs).toISOString() }
      ],
      contributions: [
        { id: 'cnt_1', user_id: currentUser.id, user_name: currentUser.name, amount: 2500, contributed_at: new Date(now - 28 * dayMs).toISOString() },
        { id: 'cnt_2', user_id: 'usr_thabo', user_name: 'Thabo Mthembu', amount: 5000, contributed_at: new Date(now - 25 * dayMs).toISOString() },
        { id: 'cnt_3', user_id: 'usr_zanele', user_name: 'Zanele Khumalo', amount: 4000, contributed_at: new Date(now - 20 * dayMs).toISOString() },
        { id: 'cnt_4', user_id: currentUser.id, user_name: currentUser.name, amount: 3000, contributed_at: new Date(now - 14 * dayMs).toISOString() },
        { id: 'cnt_5', user_id: 'usr_sipho', user_name: 'Sipho Dlamini', amount: 4000, contributed_at: new Date(now - 10 * dayMs).toISOString() }
      ],
      audit_log: [
        { id: 'aud_1', actor_name: currentUser.name, action: 'Created Pocket "December Cape Town Trip"', time: new Date(now - 28 * dayMs).toISOString() },
        { id: 'aud_2', actor_name: 'Thabo Mthembu', action: 'Joined group via invite code', time: new Date(now - 26 * dayMs).toISOString() },
        { id: 'aud_3', actor_name: 'Thabo Mthembu', action: 'Deposited R5,000.00', time: new Date(now - 25 * dayMs).toISOString() },
        { id: 'aud_4', actor_name: 'Zanele Khumalo', action: 'Deposited R4,000.00', time: new Date(now - 20 * dayMs).toISOString() },
        { id: 'aud_5', actor_name: currentUser.name, action: 'Deposited R3,000.00', time: new Date(now - 14 * dayMs).toISOString() },
        { id: 'aud_6', actor_name: 'Sipho Dlamini', action: 'Deposited R4,000.00', time: new Date(now - 10 * dayMs).toISOString() }
      ]
    },
    {
      id: 'pock_family_emergency',
      name: 'Family Emergency Fund',
      purpose_category: 'emergency',
      purpose_note: 'Rainy day pool for medical & household emergencies',
      goal_amount: 25000,
      lock_period_days: 90,
      interest_rate: 0.055,
      created_by: 'usr_mama',
      created_at: new Date(now - 95 * dayMs).toISOString(),
      lock_end_date: new Date(now - 5 * dayMs).toISOString(), // MATURED
      status: 'active',
      transparency_level: 'full',
      member_cap: 10,
      join_code: 'POCK-3310-EMRG',
      members: [
        { id: 'usr_mama', name: 'Mama Khumalo', phone: '+27 82 *** 9012', role: 'admin', joined_at: new Date(now - 95 * dayMs).toISOString() },
        { id: currentUser.id, name: currentUser.name, phone: currentUser.phone, role: 'member', joined_at: new Date(now - 92 * dayMs).toISOString() },
        { id: 'usr_nomvula', name: 'Nomvula K.', phone: '+27 76 *** 3321', role: 'member', joined_at: new Date(now - 90 * dayMs).toISOString() }
      ],
      contributions: [
        { id: 'cnt_e1', user_id: 'usr_mama', user_name: 'Mama Khumalo', amount: 10000, contributed_at: new Date(now - 95 * dayMs).toISOString() },
        { id: 'cnt_e2', user_id: currentUser.id, user_name: currentUser.name, amount: 8000, contributed_at: new Date(now - 91 * dayMs).toISOString() },
        { id: 'cnt_e3', user_id: 'usr_nomvula', user_name: 'Nomvula K.', amount: 7000, contributed_at: new Date(now - 88 * dayMs).toISOString() }
      ],
      audit_log: [
        { id: 'aud_e1', actor_name: 'Mama Khumalo', action: 'Created Pocket "Family Emergency Fund"', time: new Date(now - 95 * dayMs).toISOString() },
        { id: 'aud_e2', actor_name: currentUser.name, action: 'Deposited R8,000.00', time: new Date(now - 91 * dayMs).toISOString() },
        { id: 'aud_e3', actor_name: 'System', action: 'Lock period completed (90 Days). 5.5% p.a. interest unlocked!', time: new Date(now - 5 * dayMs).toISOString() }
      ]
    },
    {
      id: 'pock_stokvel_grocery',
      name: 'Stokvel Bulk Grocery 2026',
      purpose_category: 'business',
      purpose_note: 'Bulk purchase discounts at Shoprite & Pick n Pay',
      goal_amount: 50000,
      lock_period_days: 180,
      interest_rate: 0.055,
      created_by: currentUser.id,
      created_at: new Date(now - 40 * dayMs).toISOString(),
      lock_end_date: new Date(now + 140 * dayMs).toISOString(),
      status: 'active',
      transparency_level: 'full',
      member_cap: 25,
      join_code: 'POCK-8841-GROC',
      members: [
        { id: currentUser.id, name: currentUser.name, phone: currentUser.phone, role: 'admin', joined_at: new Date(now - 40 * dayMs).toISOString() },
        { id: 'usr_bheki', name: 'Bheki Ndlovu', phone: '+27 84 *** 9901', role: 'member', joined_at: new Date(now - 38 * dayMs).toISOString() },
        { id: 'usr_lerato', name: 'Lerato Moloi', phone: '+27 72 *** 4120', role: 'member', joined_at: new Date(now - 35 * dayMs).toISOString() },
        { id: 'usr_sibongile', name: 'Sibongile Sithole', phone: '+27 83 *** 5543', role: 'member', joined_at: new Date(now - 30 * dayMs).toISOString() },
        { id: 'usr_ayanda', name: 'Ayanda Zulu', phone: '+27 79 *** 1290', role: 'member', joined_at: new Date(now - 25 * dayMs).toISOString() }
      ],
      contributions: [
        { id: 'cnt_g1', user_id: currentUser.id, user_name: currentUser.name, amount: 6000, contributed_at: new Date(now - 40 * dayMs).toISOString() },
        { id: 'cnt_g2', user_id: 'usr_bheki', user_name: 'Bheki Ndlovu', amount: 8000, contributed_at: new Date(now - 38 * dayMs).toISOString() },
        { id: 'cnt_g3', user_id: 'usr_lerato', user_name: 'Lerato Moloi', amount: 6000, contributed_at: new Date(now - 35 * dayMs).toISOString() },
        { id: 'cnt_g4', user_id: 'usr_sibongile', user_name: 'Sibongile Sithole', amount: 6000, contributed_at: new Date(now - 30 * dayMs).toISOString() },
        { id: 'cnt_g5', user_id: 'usr_ayanda', user_name: 'Ayanda Zulu', amount: 6000, contributed_at: new Date(now - 25 * dayMs).toISOString() }
      ],
      audit_log: [
        { id: 'aud_g1', actor_name: currentUser.name, action: 'Created Pocket "Stokvel Bulk Grocery 2026"', time: new Date(now - 40 * dayMs).toISOString() },
        { id: 'aud_g2', actor_name: currentUser.name, action: 'Deposited R6,000.00', time: new Date(now - 40 * dayMs).toISOString() }
      ]
    }
  ];
}

function getPockets() {
  const stored = localStorage.getItem(POCKETS_STORAGE_KEY);
  if (!stored) {
    const user = getCurrentUser();
    const seed = getSeedPockets(user);
    localStorage.setItem(POCKETS_STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    const user = getCurrentUser();
    const seed = getSeedPockets(user);
    localStorage.setItem(POCKETS_STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

function savePockets(pockets) {
  localStorage.setItem(POCKETS_STORAGE_KEY, JSON.stringify(pockets));
  updateActiveTicketOptionsFromPockets();
}

function calculatePocketMetrics(pocket, user) {
  const now = Date.now();
  const createdTime = new Date(pocket.created_at).getTime();
  const lockEndTime = new Date(pocket.lock_end_date).getTime();
  const elapsedDays = Math.max(0, Math.floor((now - createdTime) / (24 * 60 * 60 * 1000)));
  const daysRemaining = Math.max(0, Math.ceil((lockEndTime - now) / (24 * 60 * 60 * 1000)));
  const isMatured = now >= lockEndTime;

  // Group Total
  const groupTotal = (pocket.contributions || []).reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  
  // User Contribution
  const myContributions = (pocket.contributions || []).filter(c => c.user_id === user.id);
  const myTotal = myContributions.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

  // My % of group
  const myPct = groupTotal > 0 ? ((myTotal / groupTotal) * 100).toFixed(1) : '0.0';

  // Goal Progress %
  const goal = parseFloat(pocket.goal_amount) || 1;
  const progressPct = Math.min(100, Math.round((groupTotal / goal) * 100));
  const remainingToGoal = Math.max(0, goal - groupTotal);

  // Interest calculation (5.5% p.a.)
  const annualRate = pocket.interest_rate || 0.055;
  const accruedDays = Math.min(elapsedDays, pocket.lock_period_days || 90);
  const myInterest = myTotal * annualRate * (accruedDays / 365);

  // User membership role
  const membership = (pocket.members || []).find(m => m.id === user.id);
  const isAdmin = membership ? membership.role === 'admin' : (pocket.created_by === user.id);

  return {
    groupTotal,
    myTotal,
    myPct,
    progressPct,
    goal,
    remainingToGoal,
    myInterest,
    elapsedDays,
    daysRemaining,
    isMatured,
    isAdmin,
    memberCount: (pocket.members || []).length
  };
}


// --- Pockets UI Rendering ---
let currentSelectedPocketId = null;

function renderPocketsHub() {
  const user = getCurrentUser();
  const pockets = getPockets();
  
  let globalGroupTotal = 0;
  let globalMyTotal = 0;

  pockets.forEach(p => {
    const metrics = calculatePocketMetrics(p, user);
    globalGroupTotal += metrics.groupTotal;
    globalMyTotal += metrics.myTotal;
  });

  // Update summary banner
  const totalGroupAmountEl = document.getElementById('pockets-total-group-amount');
  const myTotalContribEl = document.getElementById('pockets-my-total-contributions');
  const countBadgeEl = document.getElementById('pockets-count-badge');

  if (totalGroupAmountEl) totalGroupAmountEl.textContent = `R${globalGroupTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  if (myTotalContribEl) myTotalContribEl.textContent = `R${globalMyTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  if (countBadgeEl) countBadgeEl.textContent = pockets.length;

  // Render Grid
  const grid = document.getElementById('pockets-grid');
  if (!grid) return;

  if (pockets.length === 0) {
    grid.innerHTML = `
      <div class="card" style="text-align: center; padding: var(--space-xl); grid-column: 1 / -1;">
        <span style="display: inline-flex; width: 48px; height: 48px; margin: 0 auto var(--space-sm); color: var(--black);">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </span>
        <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 4px;">No Savings Pockets Yet</h3>
        <p class="text-muted" style="margin-bottom: var(--space-md);">Create a shared goal with friends or enter an invite code to start pooling funds.</p>
        <div style="display: flex; gap: var(--space-sm); justify-content: center;">
          <button class="btn btn--primary" id="btn-open-create-pocket-empty">Create Pocket</button>
          <button class="btn btn--outline" id="btn-open-join-pocket-empty">Join with Code</button>
        </div>
      </div>
    `;
    const btnEmptyCreate = document.getElementById('btn-open-create-pocket-empty');
    if (btnEmptyCreate) btnEmptyCreate.addEventListener('click', openCreatePocketModal);
    const btnEmptyJoin = document.getElementById('btn-open-join-pocket-empty');
    if (btnEmptyJoin) btnEmptyJoin.addEventListener('click', openJoinPocketModal);
    return;
  }

  grid.innerHTML = pockets.map(pocket => {
    const metrics = calculatePocketMetrics(pocket, user);
    const cat = CATEGORY_MAP[pocket.purpose_category] || CATEGORY_MAP.other;

    const lockBadge = metrics.isMatured 
      ? `<span class="status-badge status-badge--verified">Matured</span>`
      : `<span class="status-badge status-badge--locked">Lock: ${metrics.daysRemaining}d Left</span>`;

    const roleBadge = metrics.isAdmin
      ? `<span class="pocket-role-pill">Admin</span>`
      : `<span class="pocket-status-pill">Member</span>`;

    return `
      <div class="pocket-card" data-pocket-id="${pocket.id}" style="cursor: pointer;">
        <div>
          <div class="pocket-card-top">
            <div class="pocket-card-icon">${cat.iconSvg}</div>
            <div class="pocket-card-header-info">
              <div class="pocket-card-tags">
                <span class="pocket-category-pill">${cat.label}</span>
                ${roleBadge}
                ${lockBadge}
              </div>
              <h4 class="pocket-card-title">${escapeHtml(pocket.name)}</h4>
              <p class="pocket-card-note">${escapeHtml(pocket.purpose_note || '')}</p>
            </div>
          </div>

          <div class="pocket-card-progress">
            <div class="pocket-progress-bar">
              <div class="pocket-progress-fill" style="width: ${metrics.progressPct}%;"></div>
            </div>
            <div class="pocket-card-progress-labels">
              <span>Goal: ${metrics.progressPct}%</span>
              <span>R${metrics.groupTotal.toLocaleString('en-ZA')} / R${metrics.goal.toLocaleString('en-ZA')}</span>
            </div>
          </div>

          <div class="pocket-card-stats-row">
            <div>
              <span class="pocket-stat-item-label">My Contribution</span>
              <span class="pocket-stat-item-val" style="color: #047857;">R${metrics.myTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span class="pocket-stat-item-label">Group Pot</span>
              <span class="pocket-stat-item-val">R${metrics.groupTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div class="pocket-card-footer">
          <span class="pocket-card-lock-hint">${metrics.memberCount} Members</span>
          <span class="btn-back-link btn-view-dashboard" data-pocket-id="${pocket.id}" style="padding: 4px 8px; font-size: 0.75rem;">View Dashboard →</span>
        </div>
      </div>
    `;
  }).join('');

  // Attach click events directly to cards and buttons
  grid.querySelectorAll('.pocket-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const pId = card.getAttribute('data-pocket-id');
      if (pId) {
        window.location.href = `pocket-detail.html?id=${encodeURIComponent(pId)}`;
      }
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


// --- Pocket Detail View (Dashboard) ---
function openPocketDashboard(pocketId) {
  // If called from another page (like savings.html), navigate to dedicated pocket-detail.html page
  if (!window.location.pathname.includes('pocket-detail')) {
    window.location.href = `pocket-detail.html?id=${encodeURIComponent(pocketId)}`;
    return;
  }

  const pockets = getPockets();
  const pocket = pockets.find(p => p.id === pocketId);
  if (!pocket) return;

  currentSelectedPocketId = pocketId;
  const user = getCurrentUser();
  const metrics = calculatePocketMetrics(pocket, user);
  const cat = CATEGORY_MAP[pocket.purpose_category] || CATEGORY_MAP.other;

  // Swap containers if present on same page
  const pocketsViewContainer = document.getElementById('pockets-view-container');
  const pocketDetailView = document.getElementById('pocket-detail-view');
  if (pocketsViewContainer) pocketsViewContainer.style.display = 'none';
  if (pocketDetailView) pocketDetailView.style.display = 'block';

  // Fill Hero Card
  const iconEl = document.getElementById('pocket-detail-icon');
  const catEl = document.getElementById('pocket-detail-category');
  const roleEl = document.getElementById('pocket-detail-role');
  const statusEl = document.getElementById('pocket-detail-status');
  const nameEl = document.getElementById('pocket-detail-name');
  const noteEl = document.getElementById('pocket-detail-note');

  if (iconEl) iconEl.innerHTML = cat.iconSvg;
  if (catEl) catEl.textContent = cat.label;
  if (roleEl) roleEl.textContent = metrics.isAdmin ? 'Admin' : 'Member';
  if (statusEl) {
    statusEl.textContent = metrics.isMatured ? '90-Day Lock Matured (5.5% Yield Ready)' : `${metrics.daysRemaining} Days Lock Remaining`;
    statusEl.className = metrics.isMatured ? 'pocket-status-pill pocket-status-pill--matured' : 'pocket-status-pill';
  }
  if (nameEl) nameEl.textContent = pocket.name;
  if (noteEl) noteEl.textContent = pocket.purpose_note || 'Shared Savings Goal';

  // Goal Progress
  const progressPercentEl = document.getElementById('pocket-progress-percent');
  const pooledEl = document.getElementById('pocket-detail-pooled');
  const goalEl = document.getElementById('pocket-detail-goal');
  const fillEl = document.getElementById('pocket-progress-fill');
  const remainingTextEl = document.getElementById('pocket-remaining-text');
  const membersCountEl = document.getElementById('pocket-members-count-text');

  if (progressPercentEl) progressPercentEl.textContent = `${metrics.progressPct}%`;
  if (pooledEl) pooledEl.textContent = `R${metrics.groupTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  if (goalEl) goalEl.textContent = `R${metrics.goal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  if (fillEl) fillEl.style.width = `${metrics.progressPct}%`;
  if (remainingTextEl) {
    remainingTextEl.textContent = metrics.remainingToGoal > 0 
      ? `R${metrics.remainingToGoal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} remaining to reach goal`
      : 'Target goal achieved!';
  }
  if (membersCountEl) {
    membersCountEl.innerHTML = `
      <span class="btn-icon" style="width: 14px; height: 14px; vertical-align: middle; display: inline-flex;">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      </span>
      ${metrics.memberCount} Members (${pocket.member_cap || 20} max)
    `;
  }

  // 4 Metrics Grid
  const statGroupPotEl = document.getElementById('pocket-stat-group-pot');
  const statMyShareEl = document.getElementById('pocket-stat-my-share');
  const statMyPctEl = document.getElementById('pocket-stat-my-pct');
  const statInterestEl = document.getElementById('pocket-stat-interest');
  const statInterestNoteEl = document.getElementById('pocket-stat-interest-note');
  const statLockDaysEl = document.getElementById('pocket-stat-lock-days');
  const statMaturityDateEl = document.getElementById('pocket-stat-maturity-date');

  if (statGroupPotEl) statGroupPotEl.textContent = `R${metrics.groupTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  if (statMyShareEl) statMyShareEl.textContent = `R${metrics.myTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  if (statMyPctEl) statMyPctEl.textContent = `${metrics.myPct}% of group pot`;
  if (statInterestEl) statInterestEl.textContent = `+R${metrics.myInterest.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  if (statInterestNoteEl) {
    statInterestNoteEl.textContent = metrics.isMatured ? 'Unlocked & ready for payout' : 'Forfeited on early withdrawal';
  }
  if (statLockDaysEl) {
    statLockDaysEl.textContent = metrics.isMatured ? 'Matured' : `${metrics.daysRemaining} Days`;
  }
  if (statMaturityDateEl) {
    const matDate = new Date(pocket.lock_end_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
    statMaturityDateEl.textContent = `Matures: ${matDate}`;
  }

  // Admin Controls Bar
  const adminControlsContainer = document.getElementById('pocket-admin-controls');
  if (adminControlsContainer) {
    if (metrics.isAdmin) {
      adminControlsContainer.innerHTML = `
        <button class="btn-back-link" onclick="togglePocketTransparency('${pocket.id}')" title="Toggle Transparency">
          Visibility: ${pocket.transparency_level === 'full' ? 'Full' : 'Totals Only'}
        </button>
      `;
    } else {
      adminControlsContainer.innerHTML = '';
    }
  }

  // Transparency Ledger
  renderTransparencyLedger(pocket, user, metrics);

  // Audit Trail
  renderAuditTrail(pocket);

  // Scroll to top of pocket detail
  pocketDetailView.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closePocketDashboard() {
  currentSelectedPocketId = null;
  const pocketsViewContainer = document.getElementById('pockets-view-container');
  const pocketDetailView = document.getElementById('pocket-detail-view');
  if (pocketsViewContainer) pocketsViewContainer.style.display = 'block';
  if (pocketDetailView) pocketDetailView.style.display = 'none';
  renderPocketsHub();
}

const backToPocketsBtn = document.getElementById('btn-back-to-pockets');
if (backToPocketsBtn) {
  backToPocketsBtn.addEventListener('click', closePocketDashboard);
}


// --- Transparency Ledger Table ---
function renderTransparencyLedger(pocket, user, metrics) {
  const container = document.getElementById('transparency-table-container');
  const badgeEl = document.getElementById('pocket-transparency-badge');
  if (!container) return;

  if (badgeEl) {
    badgeEl.textContent = pocket.transparency_level === 'full' ? 'Full Visibility' : 'Totals Only';
  }

  if (pocket.transparency_level === 'totals_only') {
    container.innerHTML = `
      <div style="padding: var(--space-md); background-color: var(--white-off); border-radius: var(--radius-sm); border: 1px solid #CBD5E1; text-align: center;">
        <p style="font-weight: 700; font-size: 0.9rem; margin-bottom: 4px;">Privacy Mode Enabled</p>
        <p class="text-muted" style="font-size: 0.8rem;">The Admin has set this Pocket to Totals-Only mode. Individual member deposit amounts are private. Group total is verified by MTN MoMo: <strong>R${metrics.groupTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</strong>.</p>
      </div>
    `;
    return;
  }

  // Group members contributions
  const members = pocket.members || [];
  const contributions = pocket.contributions || [];

  const memberContribMap = {};
  contributions.forEach(c => {
    memberContribMap[c.user_id] = (memberContribMap[c.user_id] || 0) + (parseFloat(c.amount) || 0);
  });

  let rowsHtml = members.map(m => {
    const totalContributed = memberContribMap[m.id] || 0;
    const sharePct = metrics.groupTotal > 0 ? ((totalContributed / metrics.groupTotal) * 100).toFixed(1) : 0;
    const isMe = m.id === user.id;
    const initials = m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return `
      <tr>
        <td>
          <div class="table-member-cell">
            <div class="member-avatar-circle">${initials}</div>
            <div>
              <span class="member-name-text">${escapeHtml(m.name)} ${isMe ? '<strong style="color: #047857;">(You)</strong>' : ''}</span>
              <span class="member-phone-text">${m.phone}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="status-badge ${m.role === 'admin' ? 'status-badge--verified' : 'status-badge--pending'}" style="font-size: 0.65rem;">
            ${m.role === 'admin' ? 'Admin' : 'Member'}
          </span>
        </td>
        <td style="font-size: 0.8rem; color: #64748B;">
          ${new Date(m.joined_at).toLocaleDateString('en-ZA')}
        </td>
        <td style="font-weight: 800; color: var(--black);">
          R${totalContributed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
        </td>
        <td>
          <div class="table-share-bar">
            <div class="share-mini-bar">
              <div class="share-mini-fill" style="width: ${sharePct}%;"></div>
            </div>
            <span style="font-size: 0.75rem; font-weight: 700; color: #334155;">${sharePct}%</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="transparency-table">
      <thead>
        <tr>
          <th>Member</th>
          <th>Role</th>
          <th>Joined</th>
          <th>Total Saved</th>
          <th>Pot Share</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

function togglePocketTransparency(pocketId) {
  const pockets = getPockets();
  const pocket = pockets.find(p => p.id === pocketId);
  if (!pocket) return;

  pocket.transparency_level = pocket.transparency_level === 'full' ? 'totals_only' : 'full';
  pocket.audit_log = pocket.audit_log || [];
  pocket.audit_log.unshift({
    id: 'aud_' + Date.now(),
    actor_name: getCurrentUser().name,
    action: `Updated transparency visibility to "${pocket.transparency_level}"`,
    time: new Date().toISOString()
  });

  savePockets(pockets);
  openPocketDashboard(pocketId);
  showToast(`Transparency level updated to ${pocket.transparency_level}`);
}


// --- Audit Trail List ---
function renderAuditTrail(pocket) {
  const listEl = document.getElementById('pocket-audit-list');
  if (!listEl) return;

  const logs = pocket.audit_log || [];
  if (logs.length === 0) {
    listEl.innerHTML = '<p class="text-muted" style="padding: var(--space-sm);">No logged activity yet.</p>';
    return;
  }

  listEl.innerHTML = logs.map(log => {
    const timeStr = new Date(log.time).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' });
    let iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
    if (log.action.includes('Deposited') || log.action.includes('Contributed')) {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>';
    } else if (log.action.includes('Joined')) {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 2l-2 2m-1.5 1.5L19 7l-2 2-1.5-1.5M15 11l-3 3m0 0l-3-3m3 3V3"/><circle cx="7.5" cy="16.5" r="4.5"/></svg>';
    } else if (log.action.includes('Created')) {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>';
    } else if (log.action.includes('Withdrawal') || log.action.includes('Withdrew')) {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    } else if (log.action.includes('Lock') || log.action.includes('Matured')) {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    }

    return `
      <div class="pocket-audit-item">
        <div class="audit-icon-box">${iconSvg}</div>
        <div class="audit-content">
          <p class="audit-text"><strong>${escapeHtml(log.actor_name)}</strong>: ${escapeHtml(log.action)}</p>
          <span class="audit-time">${timeStr} • Verified by MoMo</span>
        </div>
      </div>
    `;
  }).join('');
}


// ============================================================================
// CREATE POCKET FLOW
// ============================================================================
const modalCreatePocket = document.getElementById('modal-create-pocket');
const btnCreateGroup = document.getElementById('btn-create-group');
const btnCloseCreateModal = document.getElementById('btn-close-create-modal');
const btnCancelCreatePocket = document.getElementById('btn-cancel-create-pocket');
const formCreatePocket = document.getElementById('form-create-pocket');

function openCreatePocketModal() {
  if (modalCreatePocket) modalCreatePocket.classList.add('modal-overlay--active');
}
function closeCreatePocketModal() {
  if (modalCreatePocket) modalCreatePocket.classList.remove('modal-overlay--active');
  if (formCreatePocket) formCreatePocket.reset();
}

if (btnCreateGroup) btnCreateGroup.addEventListener('click', openCreatePocketModal);
if (btnCloseCreateModal) btnCloseCreateModal.addEventListener('click', closeCreatePocketModal);
if (btnCancelCreatePocket) btnCancelCreatePocket.addEventListener('click', closeCreatePocketModal);if (formCreatePocket) {
  formCreatePocket.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    const name = document.getElementById('create-pocket-name').value.trim();
    const category = document.getElementById('create-pocket-category').value;
    const note = document.getElementById('create-pocket-note').value.trim();
    const goal = parseFloat(document.getElementById('create-pocket-goal').value) || 10000;
    const lockDays = parseInt(document.getElementById('create-pocket-lock').value, 10) || 90;
    const transparency = document.getElementById('create-pocket-transparency').value;
    const initialDeposit = parseFloat(document.getElementById('create-pocket-initial-deposit').value) || 0;

    if (!name) {
      alert("Please provide a Pocket Name.");
      return;
    }

    if (initialDeposit > 0) {
      const walletBal = getWalletBalance();
      if (initialDeposit > walletBal) {
        alert(`Insufficient MoMo wallet balance (R${walletBal.toFixed(2)}) for initial deposit of R${initialDeposit.toFixed(2)}.`);
        return;
      }
    }

    closeCreatePocketModal();

    // Authenticate with MoMo PIN
    const promptMsg = initialDeposit > 0 
      ? `Authorize creation of "${name}" with initial deposit of R${initialDeposit.toFixed(2)}`
      : `Authorize creation of "${name}" Pocket`;

    requestPinAuth(promptMsg, () => {
      const now = Date.now();
      const catCode = (category || 'GEN').slice(0, 4).toUpperCase();
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const joinCode = `POCK-${randomCode}-${catCode}`;

      const newPocket = {
        id: 'pock_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        name,
        purpose_category: category,
        purpose_note: note,
        goal_amount: goal,
        lock_period_days: lockDays,
        interest_rate: 0.055,
        created_by: user.id,
        created_at: new Date(now).toISOString(),
        lock_end_date: new Date(now + lockDays * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        transparency_level: transparency,
        member_cap: 20,
        join_code: joinCode,
        members: [
          { id: user.id, name: user.name, phone: user.phone, role: 'admin', joined_at: new Date(now).toISOString() }
        ],
        contributions: [],
        audit_log: [
          { id: 'aud_' + Date.now(), actor_name: user.name, action: `Created Pocket "${name}" with ${lockDays}-day lock (Join Code: ${joinCode})`, time: new Date(now).toISOString() }
        ]
      };

      if (initialDeposit > 0) {
        setWalletBalance(getWalletBalance() - initialDeposit);
        newPocket.contributions.push({
          id: 'cnt_' + Date.now(),
          user_id: user.id,
          user_name: user.name,
          amount: initialDeposit,
          contributed_at: new Date(now).toISOString()
        });
        newPocket.audit_log.push({
          id: 'aud_init_' + Date.now(),
          actor_name: user.name,
          action: `Deposited initial contribution of R${initialDeposit.toFixed(2)}`,
          time: new Date(now).toISOString()
        });
        availableTickets++;
        saveAvailableTickets();
        updateTicketUI();
      }

      const pockets = getPockets();
      pockets.unshift(newPocket);
      savePockets(pockets);

      renderPocketsHub();
      updateActiveTicketOptionsFromPockets();
      showToast(`Pocket "${name}" created! Join Code: ${joinCode}`);

      // Open in dedicated pocket-detail page
      setTimeout(() => {
        window.location.href = `pocket-detail.html?id=${encodeURIComponent(newPocket.id)}`;
      }, 400);
    });
  });
}


// ============================================================================
// JOIN POCKET FLOW
// ============================================================================
const modalJoinPocket = document.getElementById('modal-join-pocket');
const btnJoinGroup = document.getElementById('btn-join-group');
const btnCloseJoinModal = document.getElementById('btn-close-join-modal');
const btnCancelJoinPocket = document.getElementById('btn-cancel-join-pocket');
const inputJoinCode = document.getElementById('input-join-code');
const btnVerifyJoinCode = document.getElementById('btn-verify-join-code');
const joinPreviewCard = document.getElementById('join-preview-card');
const btnConfirmJoinPocket = document.getElementById('btn-confirm-join-pocket');
const joinCodeStatus = document.getElementById('join-code-status');

let verifiedPocketToJoin = null;

function openJoinPocketModal() {
  if (modalJoinPocket) modalJoinPocket.classList.add('modal-overlay--active');
  if (joinPreviewCard) joinPreviewCard.style.display = 'none';
  if (btnConfirmJoinPocket) btnConfirmJoinPocket.disabled = true;
  if (joinCodeStatus) joinCodeStatus.textContent = '';
  if (inputJoinCode) inputJoinCode.value = '';
  verifiedPocketToJoin = null;
}

function closeJoinPocketModal() {
  if (modalJoinPocket) modalJoinPocket.classList.remove('modal-overlay--active');
  verifiedPocketToJoin = null;
}

if (btnJoinGroup) btnJoinGroup.addEventListener('click', openJoinPocketModal);
if (btnCloseJoinModal) btnCloseJoinModal.addEventListener('click', closeJoinPocketModal);
if (btnCancelJoinPocket) btnCancelJoinPocket.addEventListener('click', closeJoinPocketModal);

function verifyJoinCode() {
  if (!inputJoinCode) return;
  const raw = inputJoinCode.value.trim().toUpperCase();
  if (!raw) {
    if (joinCodeStatus) {
      joinCodeStatus.textContent = 'Please enter a valid Pocket join code.';
      joinCodeStatus.style.color = '#E11D48';
    }
    return;
  }

  const pockets = getPockets();
  const pocket = pockets.find(p => (p.join_code || '').toUpperCase() === raw);

  if (!pocket) {
    if (joinCodeStatus) {
      joinCodeStatus.textContent = "Pocket not found. Check the join code with your group admin.";
      joinCodeStatus.style.color = '#E11D48';
    }
    if (joinPreviewCard) joinPreviewCard.style.display = 'none';
    if (btnConfirmJoinPocket) btnConfirmJoinPocket.disabled = true;
    return;
  }

  const user = getCurrentUser();
  const alreadyMember = (pocket.members || []).some(m => m.id === user.id);
  if (alreadyMember) {
    if (joinCodeStatus) {
      joinCodeStatus.textContent = "You are already a member of this Pocket!";
      joinCodeStatus.style.color = '#D97706';
    }
    if (joinPreviewCard) joinPreviewCard.style.display = 'none';
    if (btnConfirmJoinPocket) btnConfirmJoinPocket.disabled = true;
    return;
  }

  // Populate Preview
  verifiedPocketToJoin = pocket;
  const metrics = calculatePocketMetrics(pocket, user);
  const cat = CATEGORY_MAP[pocket.purpose_category] || CATEGORY_MAP.other;

  const joinPreviewIcon = document.getElementById('join-preview-icon');
  if (joinPreviewIcon) joinPreviewIcon.innerHTML = cat.iconSvg;
  
  const joinPreviewName = document.getElementById('join-preview-name');
  if (joinPreviewName) joinPreviewName.textContent = pocket.name;
  
  const joinPreviewCategory = document.getElementById('join-preview-category');
  if (joinPreviewCategory) joinPreviewCategory.textContent = `${cat.label} • ${pocket.purpose_note || ''}`;
  
  const joinPreviewGoal = document.getElementById('join-preview-goal');
  if (joinPreviewGoal) joinPreviewGoal.textContent = `R${metrics.goal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  
  const joinPreviewPooled = document.getElementById('join-preview-pooled');
  if (joinPreviewPooled) joinPreviewPooled.textContent = `R${metrics.groupTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  
  const joinPreviewLock = document.getElementById('join-preview-lock');
  if (joinPreviewLock) joinPreviewLock.textContent = `${pocket.lock_period_days || 90} Days (${metrics.daysRemaining}d remaining)`;
  
  const joinPreviewMembers = document.getElementById('join-preview-members');
  if (joinPreviewMembers) joinPreviewMembers.textContent = `${metrics.memberCount} / ${pocket.member_cap || 20}`;

  if (joinPreviewCard) joinPreviewCard.style.display = 'block';
  if (joinCodeStatus) {
    joinCodeStatus.textContent = 'Valid join code verified!';
    joinCodeStatus.style.color = '#059669';
  }
  if (btnConfirmJoinPocket) btnConfirmJoinPocket.disabled = false;
}

if (btnVerifyJoinCode) btnVerifyJoinCode.addEventListener('click', verifyJoinCode);

if (inputJoinCode) {
  inputJoinCode.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      verifyJoinCode();
    }
  });
}

if (btnConfirmJoinPocket) {
  btnConfirmJoinPocket.addEventListener('click', () => {
    if (!verifiedPocketToJoin) return;
    const user = getCurrentUser();
    const targetPocket = verifiedPocketToJoin;

    closeJoinPocketModal();

    requestPinAuth(`Confirm joining "${targetPocket.name}"`, () => {
      const pockets = getPockets();
      const pocket = pockets.find(p => p.id === targetPocket.id);
      if (!pocket) return;

      pocket.members = pocket.members || [];
      pocket.members.push({
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: 'member',
        joined_at: new Date().toISOString()
      });

      pocket.audit_log = pocket.audit_log || [];
      pocket.audit_log.unshift({
        id: 'aud_' + Date.now(),
        actor_name: user.name,
        action: 'Joined Pocket via join code',
        time: new Date().toISOString()
      });

      savePockets(pockets);
      renderPocketsHub();
      updateActiveTicketOptionsFromPockets();
      showToast(`Successfully joined "${pocket.name}"!`);

      // Open in dedicated pocket-detail page
      setTimeout(() => {
        window.location.href = `pocket-detail.html?id=${encodeURIComponent(pocket.id)}`;
      }, 400);
    });
  });
}


// ============================================================================
// CONTRIBUTE TO POCKET FLOW
// ============================================================================
const modalContribute = document.getElementById('modal-pocket-contribute');
const btnPocketContribute = document.getElementById('btn-pocket-contribute');
const btnCloseContributeModal = document.getElementById('btn-close-contribute-modal');
const btnCancelContribute = document.getElementById('btn-cancel-contribute');
const inputContributeAmount = document.getElementById('input-contribute-amount');
const btnProceedContribute = document.getElementById('btn-proceed-contribute');

function openContributeModal() {
  if (!currentSelectedPocketId) return;
  const pockets = getPockets();
  const pocket = pockets.find(p => p.id === currentSelectedPocketId);
  if (!pocket) return;

  const user = getCurrentUser();
  const metrics = calculatePocketMetrics(pocket, user);

  const pocketNameEl = document.getElementById('contribute-modal-pocket-name');
  if (pocketNameEl) pocketNameEl.textContent = pocket.name;

  const walletBal = getWalletBalance();
  const contribBalEl = document.getElementById('contribute-momo-balance');
  if (contribBalEl) contribBalEl.textContent = `R${walletBal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;

  if (inputContributeAmount) inputContributeAmount.value = '';
  updateContributePreviews(0, metrics);

  if (modalContribute) modalContribute.classList.add('modal-overlay--active');
}

function closeContributeModal() {
  if (modalContribute) modalContribute.classList.remove('modal-overlay--active');
}

function updateContributePreviews(amount, metrics) {
  const walletBal = getWalletBalance();
  const remainingWallet = Math.max(0, walletBal - amount);
  const newPersonal = (metrics.myTotal || 0) + amount;
  const newGroup = (metrics.groupTotal || 0) + amount;

  const prevDeductionEl = document.getElementById('preview-wallet-deduction');
  const prevRemainingEl = document.getElementById('preview-remaining-wallet');
  const prevPersonalEl = document.getElementById('preview-new-personal-total');
  const prevGroupEl = document.getElementById('preview-new-group-total');

  if (prevDeductionEl) prevDeductionEl.textContent = `-R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  if (prevRemainingEl) {
    prevRemainingEl.textContent = `R${remainingWallet.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
    prevRemainingEl.style.color = amount > walletBal ? '#E11D48' : 'var(--black)';
  }
  if (prevPersonalEl) prevPersonalEl.textContent = `R${newPersonal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  if (prevGroupEl) prevGroupEl.textContent = `R${newGroup.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

if (btnPocketContribute) btnPocketContribute.addEventListener('click', openContributeModal);
if (btnCloseContributeModal) btnCloseContributeModal.addEventListener('click', closeContributeModal);
if (btnCancelContribute) btnCancelContribute.addEventListener('click', closeContributeModal);

if (inputContributeAmount) {
  inputContributeAmount.addEventListener('input', () => {
    const val = parseFloat(inputContributeAmount.value) || 0;
    const pockets = getPockets();
    const pocket = pockets.find(p => p.id === currentSelectedPocketId);
    if (pocket) {
      const metrics = calculatePocketMetrics(pocket, getCurrentUser());
      updateContributePreviews(val, metrics);
    }
  });
}

// Quick Chip buttons
const chipBtns = document.querySelectorAll('.chip-btn');
chipBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const amt = parseFloat(btn.getAttribute('data-amt')) || 0;
    if (inputContributeAmount) {
      inputContributeAmount.value = amt.toFixed(2);
      const pockets = getPockets();
      const pocket = pockets.find(p => p.id === currentSelectedPocketId);
      if (pocket) {
        const metrics = calculatePocketMetrics(pocket, getCurrentUser());
        updateContributePreviews(amt, metrics);
      }
    }
  });
});

if (btnProceedContribute) {
  btnProceedContribute.addEventListener('click', () => {
    const amt = parseFloat(inputContributeAmount.value) || 0;
    if (amt <= 0) {
      alert("Please enter a valid deposit amount (min R10).");
      return;
    }

    const walletBal = getWalletBalance();
    if (amt > walletBal) {
      alert(`Insufficient MoMo wallet funds (R${walletBal.toFixed(2)}). Please top up your wallet first.`);
      return;
    }

    const pockets = getPockets();
    const pocket = pockets.find(p => p.id === currentSelectedPocketId);
    if (!pocket) return;
    const user = getCurrentUser();

    closeContributeModal();

    requestPinAuth(`Confirm deposit of R${amt.toFixed(2)} to "${pocket.name}"`, () => {
      // Deduct wallet
      setWalletBalance(getWalletBalance() - amt);

      // Add Contribution
      pocket.contributions = pocket.contributions || [];
      pocket.contributions.push({
        id: 'cnt_' + Date.now(),
        user_id: user.id,
        user_name: user.name,
        amount: amt,
        contributed_at: new Date().toISOString()
      });

      // Audit Log
      pocket.audit_log = pocket.audit_log || [];
      pocket.audit_log.unshift({
        id: 'aud_' + Date.now(),
        actor_name: user.name,
        action: `Contributed R${amt.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        time: new Date().toISOString()
      });

      // Award game ticket
      availableTickets++;
      saveAvailableTickets();
      updateTicketUI();

      savePockets(pockets);
      openPocketDashboard(pocket.id);
      showToast(`Deposited R${amt.toFixed(2)} to "${pocket.name}"! +1 Game Ticket earned`);
    });
  });
}


// ============================================================================
// WITHDRAW FROM POCKET FLOW (WITH 90-DAY LOCK CHECK)
// ============================================================================
const modalWithdraw = document.getElementById('modal-pocket-withdraw');
const btnPocketWithdraw = document.getElementById('btn-pocket-withdraw');
const btnCloseWithdrawModal = document.getElementById('btn-close-withdraw-modal');
const btnCancelWithdraw = document.getElementById('btn-cancel-withdraw');
const inputWithdrawAmount = document.getElementById('input-withdraw-amount');
const btnProceedWithdraw = document.getElementById('btn-proceed-withdraw');

function openWithdrawModal() {
  if (!currentSelectedPocketId) return;
  const pockets = getPockets();
  const pocket = pockets.find(p => p.id === currentSelectedPocketId);
  if (!pocket) return;

  const user = getCurrentUser();
  const metrics = calculatePocketMetrics(pocket, user);

  if (metrics.myTotal <= 0) {
    alert("You do not have any contributed funds in this Pocket to withdraw.");
    return;
  }

  const nameEl = document.getElementById('withdraw-modal-pocket-name');
  if (nameEl) nameEl.textContent = pocket.name;

  const principalEl = document.getElementById('withdraw-principal-val');
  if (principalEl) principalEl.textContent = `R${metrics.myTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;

  const interestEl = document.getElementById('withdraw-interest-val');
  if (interestEl) interestEl.textContent = `+R${metrics.myInterest.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;

  const maxTextEl = document.getElementById('withdraw-max-text');
  if (maxTextEl) maxTextEl.textContent = `R${metrics.myTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  
  if (inputWithdrawAmount) {
    inputWithdrawAmount.value = metrics.myTotal.toFixed(2);
    inputWithdrawAmount.max = metrics.myTotal;
  }

  const lockBanner = document.getElementById('withdraw-lock-banner');
  const penaltyRow = document.getElementById('withdraw-penalty-row');
  const forfeitVal = document.getElementById('withdraw-forfeit-val');
  const payoutTotalEl = document.getElementById('withdraw-payout-total');

  if (metrics.isMatured) {
    // MATURED: Full principal + interest
    if (lockBanner) {
      lockBanner.className = 'withdrawal-lock-banner withdrawal-lock-banner--success';
      lockBanner.innerHTML = '<strong>90-Day Lock Period Met!</strong> You qualify for 100% of your contributed principal PLUS full accrued interest at 5.5% p.a.';
    }
    if (penaltyRow) penaltyRow.style.display = 'none';
    const totalPayout = metrics.myTotal + metrics.myInterest;
    if (payoutTotalEl) payoutTotalEl.textContent = `R${totalPayout.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  } else {
    // EARLY: Principal only, interest forfeited
    if (lockBanner) {
      lockBanner.className = 'withdrawal-lock-banner withdrawal-lock-banner--warning';
      lockBanner.innerHTML = `<strong>Early Withdrawal Warning:</strong> This Pocket has ${metrics.daysRemaining} days remaining on its 3-month lock. Withdrawing early returns <strong>principal only</strong>. All accrued interest (+R${metrics.myInterest.toFixed(2)}) is permanently forfeited.`;
    }
    if (penaltyRow) penaltyRow.style.display = 'flex';
    if (forfeitVal) forfeitVal.textContent = `-R${metrics.myInterest.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
    if (payoutTotalEl) payoutTotalEl.textContent = `R${metrics.myTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  }

  if (modalWithdraw) modalWithdraw.classList.add('modal-overlay--active');
}

function closeWithdrawModal() {
  if (modalWithdraw) modalWithdraw.classList.remove('modal-overlay--active');
}

if (btnPocketWithdraw) btnPocketWithdraw.addEventListener('click', openWithdrawModal);
if (btnCloseWithdrawModal) btnCloseWithdrawModal.addEventListener('click', closeWithdrawModal);
if (btnCancelWithdraw) btnCancelWithdraw.addEventListener('click', closeWithdrawModal);

if (btnProceedWithdraw) {
  btnProceedWithdraw.addEventListener('click', () => {
    const withdrawAmt = parseFloat(inputWithdrawAmount.value) || 0;
    const pockets = getPockets();
    const pocket = pockets.find(p => p.id === currentSelectedPocketId);
    if (!pocket) return;

    const user = getCurrentUser();
    const metrics = calculatePocketMetrics(pocket, user);

    if (withdrawAmt <= 0 || withdrawAmt > metrics.myTotal) {
      alert(`Please enter an amount between R1.00 and R${metrics.myTotal.toFixed(2)}.`);
      return;
    }

    const isFullExit = withdrawAmt >= metrics.myTotal;
    const interestPayout = (metrics.isMatured && isFullExit) ? metrics.myInterest : 0;
    const totalCreditToWallet = withdrawAmt + interestPayout;

    closeWithdrawModal();

    requestPinAuth(`Authorize withdrawal of R${totalCreditToWallet.toFixed(2)} to MoMo Wallet`, () => {
      // Credit wallet
      setWalletBalance(getWalletBalance() + totalCreditToWallet);

      // Reduce/remove member contributions
      let remainingToDeduct = withdrawAmt;
      pocket.contributions = (pocket.contributions || []).filter(c => {
        if (c.user_id !== user.id || remainingToDeduct <= 0) return true;
        const amt = parseFloat(c.amount) || 0;
        if (amt <= remainingToDeduct) {
          remainingToDeduct -= amt;
          return false; // Remove this contribution
        } else {
          c.amount = amt - remainingToDeduct;
          remainingToDeduct = 0;
          return true;
        }
      });

      // Audit Log
      const earlyNotice = metrics.isMatured ? 'Matured payout (+ 5.5% interest)' : 'Early withdrawal (Principal only, interest forfeited)';
      pocket.audit_log = pocket.audit_log || [];
      pocket.audit_log.unshift({
        id: 'aud_' + Date.now(),
        actor_name: user.name,
        action: `Withdrew R${withdrawAmt.toFixed(2)} (${earlyNotice})`,
        time: new Date().toISOString()
      });

      savePockets(pockets);
      openPocketDashboard(pocket.id);
      showToast(`Withdrew R${totalCreditToWallet.toFixed(2)} to your MoMo account!`);
    });
  });
}


// ============================================================================
// INVITE FRIENDS / JOIN CODE MODAL & SOCIAL SHARING
// ============================================================================
const modalInvite = document.getElementById('modal-pocket-invite');
const btnPocketInvite = document.getElementById('btn-pocket-invite');
const btnCloseInviteModal = document.getElementById('btn-close-invite-modal');
const btnDoneInvite = document.getElementById('btn-done-invite');
const btnCopyPocketCode = document.getElementById('btn-copy-pocket-code');
const btnCopyPocketLink = document.getElementById('btn-copy-pocket-link');

function openInviteModal() {
  if (!currentSelectedPocketId) return;
  const pockets = getPockets();
  const pocket = pockets.find(p => p.id === currentSelectedPocketId);
  if (!pocket) return;

  const user = getCurrentUser();
  const metrics = calculatePocketMetrics(pocket, user);

  const pocketNameLabel = document.getElementById('invite-pocket-name-label');
  const codeBox = document.getElementById('display-pocket-join-code');
  const capacityText = document.getElementById('invite-capacity-text');
  const linkInput = document.getElementById('pocket-share-link-input');

  if (pocketNameLabel) pocketNameLabel.textContent = pocket.name;
  if (codeBox) codeBox.textContent = pocket.join_code;
  if (capacityText) capacityText.textContent = `${metrics.memberCount} / ${pocket.member_cap || 20} Members`;

  const shareText = `Join my MTN MoMo Savings Pocket "${pocket.name}" to pool funds with 5.5% p.a. interest! Use Join Code: ${pocket.join_code}`;
  const shareUrl = `https://www.mtn.co.za/momo/pockets/?code=${pocket.join_code}`;

  if (linkInput) {
    linkInput.value = shareUrl;
  }

  // Social Sharing Links
  const whatsapp = document.getElementById('pocket-share-whatsapp');
  if (whatsapp) whatsapp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;

  const facebook = document.getElementById('pocket-share-facebook');
  if (facebook) facebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;

  const twitter = document.getElementById('pocket-share-x');
  if (twitter) twitter.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  const telegram = document.getElementById('pocket-share-telegram');
  if (telegram) telegram.href = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;

  const sms = document.getElementById('pocket-share-sms');
  if (sms) sms.href = `sms:?body=${encodeURIComponent(shareText + ' ' + shareUrl)}`;

  if (modalInvite) modalInvite.classList.add('modal-overlay--active');
}

function closeInviteModal() {
  if (modalInvite) modalInvite.classList.remove('modal-overlay--active');
}

if (btnPocketInvite) btnPocketInvite.addEventListener('click', openInviteModal);
if (btnCloseInviteModal) btnCloseInviteModal.addEventListener('click', closeInviteModal);
if (btnDoneInvite) btnDoneInvite.addEventListener('click', closeInviteModal);

if (btnCopyPocketCode) {
  btnCopyPocketCode.addEventListener('click', () => {
    const codeEl = document.getElementById('display-pocket-join-code');
    if (codeEl) {
      navigator.clipboard.writeText(codeEl.textContent.trim()).then(() => {
        btnCopyPocketCode.innerHTML = '<span class="btn-icon"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="20 6 9 17 4 12"/></svg></span> Copied Code!';
        setTimeout(() => {
          btnCopyPocketCode.innerHTML = '<span class="btn-icon"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></span> Copy Join Code';
        }, 1500);
      });
    }
  });
}

if (btnCopyPocketLink) {
  btnCopyPocketLink.addEventListener('click', () => {
    const linkInput = document.getElementById('pocket-share-link-input');
    if (linkInput) {
      navigator.clipboard.writeText(linkInput.value.trim()).then(() => {
        btnCopyPocketLink.textContent = 'Copied Link!';
        setTimeout(() => {
          btnCopyPocketLink.textContent = 'Copy Link';
        }, 1500);
      });
    }
  });
}


// ============================================================================
// AUDIT STATEMENT & EXPORT CSV
// ============================================================================
const modalStatement = document.getElementById('modal-pocket-statement');
const btnPocketStatement = document.getElementById('btn-pocket-statement');
const btnCloseStatementModal = document.getElementById('btn-close-statement-modal');
const btnCloseStatementView = document.getElementById('btn-close-statement-view');
const btnDownloadStatementCSV = document.getElementById('btn-download-statement-csv');

function openStatementModal() {
  if (!currentSelectedPocketId) return;
  const pockets = getPockets();
  const pocket = pockets.find(p => p.id === currentSelectedPocketId);
  if (!pocket) return;

  const user = getCurrentUser();
  const metrics = calculatePocketMetrics(pocket, user);

  document.getElementById('statement-pocket-name').textContent = `${pocket.name} (Code: ${pocket.join_code})`;

  const contentEl = document.getElementById('statement-preview-content');
  if (contentEl) {
    let text = `=======================================================\n`;
    text += `MTN MOMO ENHANCED - GROUP SAVINGS AUDIT STATEMENT\n`;
    text += `=======================================================\n`;
    text += `Pocket Name   : ${pocket.name}\n`;
    text += `Purpose       : ${CATEGORY_MAP[pocket.purpose_category]?.label || 'General'}\n`;
    text += `Lock Period   : ${pocket.lock_period_days} Days (Created: ${new Date(pocket.created_at).toLocaleDateString()})\n`;
    text += `Yield Rate    : 5.50% p.a. (Stokvel Commercial Benchmark)\n`;
    text += `Group Pot     : R${metrics.groupTotal.toFixed(2)}\n`;
    text += `My Balance    : R${metrics.myTotal.toFixed(2)} (${metrics.myPct}% Share)\n`;
    text += `=======================================================\n`;
    text += `TRANSACTION AUDIT LEDGER:\n`;
    text += `-------------------------------------------------------\n`;
    (pocket.audit_log || []).forEach((log, i) => {
      text += `[${i+1}] ${new Date(log.time).toLocaleString()} | ${log.actor_name}: ${log.action}\n`;
    });
    text += `=======================================================\n`;
    text += `Certified Authentic by MTN MoMo & African Bank Infrastructure\n`;

    contentEl.textContent = text;
  }

  if (modalStatement) modalStatement.classList.add('modal-overlay--active');
}

function closeStatementModal() {
  if (modalStatement) modalStatement.classList.remove('modal-overlay--active');
}

if (btnPocketStatement) btnPocketStatement.addEventListener('click', openStatementModal);
if (btnCloseStatementModal) btnCloseStatementModal.addEventListener('click', closeStatementModal);
if (btnCloseStatementView) btnCloseStatementView.addEventListener('click', closeStatementModal);

if (btnDownloadStatementCSV) {
  btnDownloadStatementCSV.addEventListener('click', () => {
    if (!currentSelectedPocketId) return;
    const pockets = getPockets();
    const pocket = pockets.find(p => p.id === currentSelectedPocketId);
    if (!pocket) return;

    let csv = 'Timestamp,Actor,Action,Pocket,JoinCode\n';
    (pocket.audit_log || []).forEach(log => {
      const cleanAction = (log.action || '').replace(/"/g, '""');
      csv += `"${log.time}","${log.actor_name}","${cleanAction}","${pocket.name}","${pocket.join_code}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MoMo_Pocket_Statement_${pocket.name.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Statement CSV downloaded!");
  });
}


// ============================================================================
// CLOSE & SETTLE POCKET FLOW
// ============================================================================
const modalClosePocket = document.getElementById('modal-close-pocket');
const btnPocketClose = document.getElementById('btn-pocket-close');
const btnCloseClosePocketModal = document.getElementById('btn-close-close-pocket-modal');
const btnCancelClosePocket = document.getElementById('btn-cancel-close-pocket');
const btnConfirmClosePocket = document.getElementById('btn-confirm-close-pocket');

function openClosePocketModal() {
  if (!currentSelectedPocketId) return;
  const pockets = getPockets();
  const pocket = pockets.find(p => p.id === currentSelectedPocketId);
  if (!pocket) return;

  const user = getCurrentUser();
  const metrics = calculatePocketMetrics(pocket, user);

  const nameEl = document.getElementById('close-pocket-name-val');
  const lockEl = document.getElementById('close-pocket-lock-status');
  const princEl = document.getElementById('close-pocket-principal-val');
  const intEl = document.getElementById('close-pocket-interest-val');
  const payoutEl = document.getElementById('close-pocket-payout-total');
  const subtitleEl = document.getElementById('close-pocket-modal-subtitle');

  if (nameEl) nameEl.textContent = pocket.name;
  if (princEl) princEl.textContent = `R${metrics.myTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;

  const interestPayout = metrics.isMatured ? metrics.myInterest : 0;
  const totalPayout = metrics.myTotal + interestPayout;

  if (lockEl) {
    lockEl.textContent = metrics.isMatured ? 'Matured (100% Principal + 5.5% Interest)' : `Active (${metrics.daysRemaining}d lock remaining - Early Exit)`;
    lockEl.style.color = metrics.isMatured ? '#059669' : '#D97706';
  }

  if (intEl) {
    intEl.textContent = metrics.isMatured 
      ? `+R${metrics.myInterest.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
      : 'R0.00 (Forfeited on early closure)';
    intEl.className = metrics.isMatured ? 'text-success' : 'text-danger';
  }

  if (payoutEl) {
    payoutEl.textContent = `R${totalPayout.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  }

  if (subtitleEl) {
    subtitleEl.textContent = metrics.myTotal > 0
      ? `Closing "${pocket.name}" will settle your remaining balance of R${totalPayout.toFixed(2)} directly into your MoMo wallet.`
      : `Are you sure you want to close and archive the "${pocket.name}" pocket?`;
  }

  if (modalClosePocket) modalClosePocket.classList.add('modal-overlay--active');
}

function closeClosePocketModal() {
  if (modalClosePocket) modalClosePocket.classList.remove('modal-overlay--active');
}

if (btnPocketClose) btnPocketClose.addEventListener('click', openClosePocketModal);
if (btnCloseClosePocketModal) btnCloseClosePocketModal.addEventListener('click', closeClosePocketModal);
if (btnCancelClosePocket) btnCancelClosePocket.addEventListener('click', closeClosePocketModal);

if (btnConfirmClosePocket) {
  btnConfirmClosePocket.addEventListener('click', () => {
    if (!currentSelectedPocketId) return;
    const pockets = getPockets();
    const pocket = pockets.find(p => p.id === currentSelectedPocketId);
    if (!pocket) return;

    const user = getCurrentUser();
    const metrics = calculatePocketMetrics(pocket, user);
    const interestPayout = metrics.isMatured ? metrics.myInterest : 0;
    const totalPayout = metrics.myTotal + interestPayout;

    closeClosePocketModal();

    requestPinAuth(`Authorize closure and final settlement of "${pocket.name}"`, () => {
      // 1. Credit wallet with remaining balance & interest
      if (totalPayout > 0) {
        setWalletBalance(getWalletBalance() + totalPayout);
      }

      // 2. Remove pocket from active pockets list in localStorage
      const remainingPockets = pockets.filter(p => p.id !== pocket.id);
      savePockets(remainingPockets);

      if (totalPayout > 0) {
        showToast(`Pocket "${pocket.name}" closed! R${totalPayout.toFixed(2)} refunded to your MoMo wallet.`);
      } else {
        showToast(`Pocket "${pocket.name}" successfully closed.`);
      }

      // Return to All Pockets Hub page
      setTimeout(() => {
        window.location.href = 'savings.html';
      }, 400);
    });
  });
}


// ============================================================================
// PERSONAL SAVINGS FLOW
// ============================================================================
const SAVINGS_KEY = 'momo_savings_balance';

function getPersonalSavingsBalance(userId) {
  try {
    const balance = JSON.parse(localStorage.getItem(SAVINGS_KEY) || '{}');
    if (balance[userId] === undefined) {
      balance[userId] = 1500.00; // default initial demo personal balance
    }
    return balance[userId];
  } catch (e) {
    return 1500.00;
  }
}

function setPersonalSavingsBalance(userId, amount) {
  try {
    const balance = JSON.parse(localStorage.getItem(SAVINGS_KEY) || '{}');
    balance[userId] = amount;
    localStorage.setItem(SAVINGS_KEY, JSON.stringify(balance));
  } catch (e) {
    const balance = {};
    balance[userId] = amount;
    localStorage.setItem(SAVINGS_KEY, JSON.stringify(balance));
  }
}

function updatePersonalSavingsUI() {
  const user = getCurrentUser();
  const personalBal = getPersonalSavingsBalance(user.id);
  const formattedPersonal = `R${personalBal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  
  const mySavingsBalanceEl = document.getElementById('my-personal-savings-val');
  if (mySavingsBalanceEl) mySavingsBalanceEl.textContent = formattedPersonal;

  const accruedPersonalInterest = personalBal * 0.045 * (30 / 365);
  const mySavingsInterestEl = document.getElementById('my-personal-savings-interest');
  if (mySavingsInterestEl) mySavingsInterestEl.textContent = `+R${accruedPersonalInterest.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;

  // Total Combined Savings (Personal + All Group Pockets) on Home Overview
  const pockets = getPockets();
  let totalGroupContributions = 0;
  pockets.forEach(p => {
    const metrics = calculatePocketMetrics(p, user);
    totalGroupContributions += metrics.myTotal;
  });

  const totalCombinedSavings = personalBal + totalGroupContributions;
  const savingsSummaryEl = document.querySelector('#card-savings-summary .card-value');
  if (savingsSummaryEl) {
    savingsSummaryEl.textContent = `R${totalCombinedSavings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  }
}

// ============================================================================
// PERSONAL SAVINGS FLOW
// ============================================================================
const modalPersonalDeposit = document.getElementById('modal-personal-deposit');
const btnClosePersonalDepositModal = document.getElementById('btn-close-personal-deposit-modal');
const btnCancelPersonalDeposit = document.getElementById('btn-cancel-personal-deposit');
const inputPersonalDepositAmount = document.getElementById('input-personal-deposit-amount');
const btnProceedPersonalDeposit = document.getElementById('btn-proceed-personal-deposit');

const modalPersonalWithdraw = document.getElementById('modal-personal-withdraw');
const btnClosePersonalWithdrawModal = document.getElementById('btn-close-personal-withdraw-modal');
const btnCancelPersonalWithdraw = document.getElementById('btn-cancel-personal-withdraw');
const inputPersonalWithdrawAmount = document.getElementById('input-personal-withdraw-amount');
const btnProceedPersonalWithdraw = document.getElementById('btn-proceed-personal-withdraw');

function updatePersonalDepositPreviews(amount) {
  const user = getCurrentUser();
  const walletBal = getWalletBalance();
  const currentSavings = getPersonalSavingsBalance(user.id);
  const remainingWallet = Math.max(0, walletBal - amount);
  const newSavings = currentSavings + amount;

  const prevDeductionEl = document.getElementById('preview-personal-deduction');
  const prevRemainingEl = document.getElementById('preview-personal-remaining-wallet');
  const prevSavingsEl = document.getElementById('preview-personal-new-savings');

  if (prevDeductionEl) prevDeductionEl.textContent = `-R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  if (prevRemainingEl) {
    prevRemainingEl.textContent = `R${remainingWallet.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
    prevRemainingEl.style.color = amount > walletBal ? '#E11D48' : 'var(--black)';
  }
  if (prevSavingsEl) prevSavingsEl.textContent = `R${newSavings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

function openPersonalDepositModal() {
  const walletBal = getWalletBalance();
  const walletDisplay = document.getElementById('personal-deposit-wallet-balance');
  if (walletDisplay) walletDisplay.textContent = `R${walletBal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  if (inputPersonalDepositAmount) inputPersonalDepositAmount.value = '';
  updatePersonalDepositPreviews(0);
  if (modalPersonalDeposit) modalPersonalDeposit.classList.add('modal-overlay--active');
}

function closePersonalDepositModal() {
  if (modalPersonalDeposit) modalPersonalDeposit.classList.remove('modal-overlay--active');
}

if (inputPersonalDepositAmount) {
  inputPersonalDepositAmount.addEventListener('input', () => {
    const val = parseFloat(inputPersonalDepositAmount.value) || 0;
    updatePersonalDepositPreviews(val);
  });
}

function openPersonalWithdrawModal() {
  const user = getCurrentUser();
  const currentBalance = getPersonalSavingsBalance(user.id);
  const accruedInterest = currentBalance * 0.045 * (30 / 365);

  const balDisplay = document.getElementById('personal-withdraw-balance-display');
  const intDisplay = document.getElementById('personal-withdraw-interest-display');
  const availDisplay = document.getElementById('personal-withdraw-available-display');

  if (balDisplay) balDisplay.textContent = `R${currentBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  if (intDisplay) intDisplay.textContent = `+R${accruedInterest.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  if (availDisplay) availDisplay.textContent = `R${currentBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  if (inputPersonalWithdrawAmount) inputPersonalWithdrawAmount.value = currentBalance.toFixed(2);

  if (modalPersonalWithdraw) modalPersonalWithdraw.classList.add('modal-overlay--active');
}

function closePersonalWithdrawModal() {
  if (modalPersonalWithdraw) modalPersonalWithdraw.classList.remove('modal-overlay--active');
}

const depositPersonalBtn = document.getElementById('btn-deposit-personal');
if (depositPersonalBtn) depositPersonalBtn.addEventListener('click', openPersonalDepositModal);
if (btnClosePersonalDepositModal) btnClosePersonalDepositModal.addEventListener('click', closePersonalDepositModal);
if (btnCancelPersonalDeposit) btnCancelPersonalDeposit.addEventListener('click', closePersonalDepositModal);

// Chips for personal deposit
document.querySelectorAll('.personal-deposit-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const amt = parseFloat(btn.getAttribute('data-amt')) || 0;
    if (inputPersonalDepositAmount) {
      inputPersonalDepositAmount.value = amt.toFixed(2);
      updatePersonalDepositPreviews(amt);
    }
  });
});

if (btnProceedPersonalDeposit) {
  btnProceedPersonalDeposit.addEventListener('click', () => {
    const amount = parseFloat(inputPersonalDepositAmount.value) || 0;
    if (amount <= 0) {
      alert("Please enter a valid deposit amount (minimum R10.00).");
      return;
    }

    const walletBal = getWalletBalance();
    if (amount > walletBal) {
      alert(`Insufficient MoMo wallet balance (R${walletBal.toFixed(2)}). Please top up first.`);
      return;
    }

    closePersonalDepositModal();

    requestPinAuth(`Confirm Personal Deposit of R${amount.toFixed(2)}`, () => {
      const user = getCurrentUser();
      setWalletBalance(getWalletBalance() - amount);
      const currentBalance = getPersonalSavingsBalance(user.id);
      setPersonalSavingsBalance(user.id, currentBalance + amount);
      updatePersonalSavingsUI();

      // Trigger referral verification if linked
      const referrals = getReferrals();
      const r = referrals.find(ref => ref.referredId === user.id && ref.status === 'linked');
      if (r) {
        completeReferral(user.id);
      }

      availableTickets++;
      saveAvailableTickets();
      updateTicketUI();
      showToast(`Deposited R${amount.toFixed(2)} to Personal Savings! +1 Ticket earned`);
    });
  });
}

const withdrawPersonalBtn = document.getElementById('btn-withdraw-personal');
if (withdrawPersonalBtn) withdrawPersonalBtn.addEventListener('click', openPersonalWithdrawModal);
if (btnClosePersonalWithdrawModal) btnClosePersonalWithdrawModal.addEventListener('click', closePersonalWithdrawModal);
if (btnCancelPersonalWithdraw) btnCancelPersonalWithdraw.addEventListener('click', closePersonalWithdrawModal);

if (btnProceedPersonalWithdraw) {
  btnProceedPersonalWithdraw.addEventListener('click', () => {
    const user = getCurrentUser();
    const currentBalance = getPersonalSavingsBalance(user.id);
    const amount = parseFloat(inputPersonalWithdrawAmount.value) || 0;

    if (amount <= 0 || amount > currentBalance) {
      alert(`Please enter an amount between R1.00 and R${currentBalance.toFixed(2)}.`);
      return;
    }

    closePersonalWithdrawModal();

    requestPinAuth(`Authorize Personal Savings Withdrawal of R${amount.toFixed(2)}`, () => {
      setPersonalSavingsBalance(user.id, currentBalance - amount);
      setWalletBalance(getWalletBalance() + amount);
      updatePersonalSavingsUI();
      showToast(`Withdrew R${amount.toFixed(2)} to your MoMo wallet!`);
    });
  });
}


// ============================================================================
// SYNC ACTIVE POCKETS WITH THE RULER GAME SELECTOR
// ============================================================================
const ticketCodeSelect = document.getElementById('ticket-code-select');
const activePoolTypeEl = document.getElementById('active-pool-type');
const activeTicketTextEl = document.getElementById('active-ticket-text');

function updateActiveTicketOptionsFromPockets() {
  if (!ticketCodeSelect) return;
  const pockets = getPockets();
  const user = getCurrentUser();

  // Save current selection value
  const currentVal = ticketCodeSelect.value;

  let optionsHtml = `
    <option value="IND-8492" data-type="IND" data-name="Personal Savings">IND-8492 (Individual Personal Savings)</option>
    <option value="IND-9921" data-type="IND" data-name="Referral Reward">IND-9921 (Individual Referral Reward)</option>
  `;

  pockets.forEach(p => {
    const metrics = calculatePocketMetrics(p, user);
    optionsHtml += `
      <option value="${p.join_code}" data-type="GRP" data-name="${escapeHtml(p.name)}" data-members="${metrics.memberCount}">
        ${p.join_code} (Group: ${escapeHtml(p.name)} - ${metrics.memberCount} members)
      </option>
    `;
  });

  ticketCodeSelect.innerHTML = optionsHtml;
  if (currentVal && ticketCodeSelect.querySelector(`option[value="${currentVal}"]`)) {
    ticketCodeSelect.value = currentVal;
  }
  updateActiveTicketInfo();
}

function updateActiveTicketInfo() {
  if (!ticketCodeSelect) return;
  const selectedOpt = ticketCodeSelect.options[ticketCodeSelect.selectedIndex];
  if (!selectedOpt) return;

  const type = selectedOpt.getAttribute('data-type');
  const code = selectedOpt.value;
  const name = selectedOpt.getAttribute('data-name');
  const members = selectedOpt.getAttribute('data-members') || 1;

  if (activePoolTypeEl) {
    activePoolTypeEl.textContent = type === 'GRP' ? `GROUP (${members} MEMBERS)` : 'INDIVIDUAL';
  }

  if (activeTicketTextEl) {
    if (type === 'GRP') {
      activeTicketTextEl.textContent = `Using: GROUP TICKET for '${name}' (${code})`;
    } else {
      activeTicketTextEl.textContent = `Using: INDIVIDUAL TICKET (${code})`;
    }
  }
}

if (ticketCodeSelect) {
  ticketCodeSelect.addEventListener('change', updateActiveTicketInfo);
}


// ============================================================================
// THE RULER 3-CARD REWARDS GAME ENGINE
// ============================================================================
const IND_REWARDS = [
  { tier: "SMALL WIN", category: "Data Top-up", prob: 17.5, badgeClass: "win-badge--small", prizes: ["100MB MTN Data", "500MB MTN Data", "1GB MTN Data"] },
  { tier: "SMALL WIN", category: "Airtime Top-up", prob: 12.5, badgeClass: "win-badge--small", prizes: ["R5 MTN Airtime", "R10 MTN Airtime", "R20 MTN Airtime"] },
  { tier: "SMALL WIN", category: "Minutes Top-up", prob: 5.0, badgeClass: "win-badge--small", prizes: ["20 Mins MTN Calls", "50 Mins MTN Calls", "100 Mins MTN Calls"] },
  { tier: "MEDIUM WIN", category: "Retail Voucher", prob: 7.5, badgeClass: "win-badge--medium", prizes: ["R20 Retail Voucher (Shoprite)", "R50 Retail Voucher (Pick n Pay)", "R100 KFC Voucher", "R200 Nando's Voucher", "R300 Uber Eats Voucher"] },
  { tier: "MEDIUM WIN", category: "Bundle Perks", prob: 3.0, badgeClass: "win-badge--medium", prizes: ["R50 Airtime Bundle", "R100 Airtime Bundle", "2GB Data Bundle", "5GB Data Bundle"] },
  { tier: "MEDIUM WIN", category: "Fee Waiver", prob: 2.0, badgeClass: "win-badge--medium", prizes: ["1 Month Free MoMo Transactions (Mo Fee Waiver)"] },
  { tier: "BIG WIN", category: "Fuel Voucher", prob: 1.0, badgeClass: "win-badge--big", prizes: ["Up to R300 Fuel Voucher (Engen/Shell)"] },
  { tier: "BIG WIN", category: "Bill Discount", prob: 0.75, badgeClass: "win-badge--big", prizes: ["15% Off Electricity/Water/DStv Bill (Max R300)"] },
  { tier: "BIG WIN", category: "Tech Discount", prob: 0.5, badgeClass: "win-badge--big", prizes: ["15% Off MTN Device/Accessory Purchase (Max R300)"] },
  { tier: "BIG WIN", category: "Home Discount", prob: 0.2, badgeClass: "win-badge--big", prizes: ["15% Off Furniture/Appliances (Max R1,000)"] },
  { tier: "BIG WIN", category: "Streaming Voucher", prob: 0.05, badgeClass: "win-badge--big", prizes: ["1 Month Netflix, Showmax, or DStv Voucher"] },
  { tier: "JACKPOT", category: "Wow Prize", prob: 0.00005, badgeClass: "win-badge--jackpot", prizes: ["JACKPOT: R50,000 MoMo Cash + Ultimate MTN Device Pack"] }
];

const GRP_REWARDS = [
  { tier: "GROUP SMALL WIN", category: "Group Data Pot", prob: 25.0, badgeClass: "win-badge--small", type: "pot_data", pots: ["1GB", "5GB", "10GB"] },
  { tier: "GROUP SMALL WIN", category: "Group Airtime Pot", prob: 10.0, badgeClass: "win-badge--small", type: "pot_airtime", pots: ["R50", "R100", "R200"] },
  { tier: "GROUP SMALL WIN", category: "Group Minutes Pot", prob: 5.0, badgeClass: "win-badge--small", type: "pot_minutes", pots: ["500 mins", "1000 mins"] },
  { tier: "GROUP MEDIUM WIN", category: "Group Grocery Voucher", prob: 5.0, badgeClass: "win-badge--medium", type: "per_member_cash", amountPerMember: 20, maxCap: 1000, vendor: "Shoprite/PnP" },
  { tier: "GROUP MEDIUM WIN", category: "Group Takeaway Voucher", prob: 3.0, badgeClass: "win-badge--medium", type: "per_member_cash", amountPerMember: 30, maxCap: 1500, vendor: "KFC/Nando's/Uber Eats" },
  { tier: "GROUP MEDIUM WIN", category: "Group Data Bundle", prob: 1.5, badgeClass: "win-badge--medium", type: "per_member_data", dataPerMember: "2GB" },
  { tier: "GROUP MEDIUM WIN", category: "Group MoMo Fee Waiver", prob: 0.4, badgeClass: "win-badge--medium", type: "group_waiver", text: "1 Month Free MoMo Transactions for ALL Members" },
  { tier: "GROUP MEDIUM WIN", category: "Group Celebration Voucher", prob: 0.1, badgeClass: "win-badge--medium", type: "per_member_cash", amountPerMember: 50, maxCap: 2000, vendor: "Braai/Event Pool" }
];

function drawRulerReward(ticketCode, type, groupName, groupMembers) {
  const roll = Math.random() * 100;
  let cumulative = 0;

  if (type === 'GRP') {
    for (const item of GRP_REWARDS) {
      cumulative += item.prob;
      if (roll < cumulative) {
        let prizeStr = "";
        let splitStr = "";

        if (item.type === "per_member_cash") {
          const totalVal = Math.min(item.amountPerMember * groupMembers, item.maxCap);
          const perMemberActual = Math.floor(totalVal / groupMembers);
          prizeStr = `Total: R${totalVal} ${item.category} (${item.vendor})`;
          splitStr = `Split: R${perMemberActual} per member for ${groupMembers} members`;
        } else if (item.type === "per_member_data") {
          prizeStr = `Total: ${groupMembers * 2}GB Data Bundle`;
          splitStr = `Split: ${item.dataPerMember} per member for ${groupMembers} members (Cap: 100GB)`;
        } else if (item.type === "group_waiver") {
          prizeStr = item.text;
          splitStr = `Applied to all ${groupMembers} members of '${groupName}'`;
        } else if (item.type.startsWith("pot_")) {
          const potVal = item.pots[Math.floor(Math.random() * item.pots.length)];
          prizeStr = `${item.category}: ${potVal} Shared Pot`;
          splitStr = `Split equally across ${groupMembers} members of '${groupName}'`;
        }

        return {
          isWin: true,
          type: "GRP",
          code: ticketCode,
          tier: item.tier,
          category: item.category,
          badgeClass: item.badgeClass,
          prize: prizeStr,
          splitDetails: splitStr
        };
      }
    }

    return {
      isWin: false,
      type: "GRP",
      code: ticketCode,
      tier: "NO WIN",
      category: "Better Luck Next Time",
      badgeClass: "win-badge--nowin",
      prize: "No group prize drawn on this play.",
      splitDetails: `Ticket ${ticketCode} used on Group Pool '${groupName}'`
    };
  } else {
    for (const item of IND_REWARDS) {
      cumulative += item.prob;
      if (roll < cumulative) {
        const prizeVal = item.prizes[Math.floor(Math.random() * item.prizes.length)];
        return {
          isWin: true,
          type: "IND",
          code: ticketCode,
          tier: item.tier,
          category: item.category,
          badgeClass: item.badgeClass,
          prize: prizeVal,
          splitDetails: "Direct to your personal MoMo wallet"
        };
      }
    }

    return {
      isWin: false,
      type: "IND",
      code: ticketCode,
      tier: "NO WIN",
      category: "Better Luck Next Time",
      badgeClass: "win-badge--nowin",
      prize: "No prize won on this draw.",
      splitDetails: `Ticket ${ticketCode} used on Individual Pool.`
    };
  }
}

// Game interactions
const gameCards = document.querySelectorAll('.game-card');
const winResultBox = document.getElementById('win-result-box');
const winBadge = document.getElementById('win-badge');
const winTitle = document.getElementById('win-title');
const winPrize = document.getElementById('win-prize');
const winSplitDetails = document.getElementById('win-split-details');
const deliveryStatusCard = document.getElementById('delivery-status-card');
const winPhoneText = document.getElementById('win-phone-text');
const winSmsText = document.getElementById('win-sms-text');
const playAgainBtn = document.getElementById('btn-play-again');

let gameActive = true;

gameCards.forEach(card => {
  card.addEventListener('click', () => {
    if (!gameActive) return;

    if (availableTickets <= 0) {
      alert("No tickets remaining! Save money in Personal Savings or a Pocket to earn tickets.");
      return;
    }

    if (card.classList.contains('game-card--flipped')) return;
    gameActive = false;

    availableTickets--;
    saveAvailableTickets();
    updateTicketUI();

    const selectedOpt = ticketCodeSelect ? ticketCodeSelect.options[ticketCodeSelect.selectedIndex] : null;
    const ticketCode = selectedOpt ? selectedOpt.value : "IND-8492";
    const type = selectedOpt ? selectedOpt.getAttribute('data-type') : "IND";
    const groupName = selectedOpt ? selectedOpt.getAttribute('data-name') : "Default Pool";
    const groupMembers = selectedOpt ? parseInt(selectedOpt.getAttribute('data-members') || "5", 10) : 5;

    const reward = drawRulerReward(ticketCode, type, groupName, groupMembers);

    const backText = card.querySelector('.reward-text');
    if (backText) backText.textContent = reward.isWin ? (reward.type === "GRP" ? "GROUP WIN" : "WIN") : "NO PRIZE";

    card.classList.add('game-card--flipped');

    gameCards.forEach(c => {
      if (c !== card) c.disabled = true;
    });

    setTimeout(() => {
      if (winBadge) {
        winBadge.textContent = reward.tier;
        winBadge.className = `win-badge ${reward.badgeClass}`;
      }
      if (winTitle) winTitle.textContent = reward.category;
      if (winPrize) winPrize.textContent = reward.prize;
      if (winSplitDetails) winSplitDetails.textContent = reward.splitDetails;

      if (deliveryStatusCard) {
        if (reward.isWin) {
          deliveryStatusCard.style.display = 'block';
          if (winPhoneText) {
            winPhoneText.textContent = reward.type === "GRP"
              ? `Recipients: Group '${groupName}' (${groupMembers} MoMo Wallets)`
              : `Recipient: +27 83 *** 4921 (MTN MoMo Wallet)`;
          }
          if (winSmsText) {
            winSmsText.textContent = `"MTN MoMo Alert: You won ${reward.prize}! Ref: ${reward.code}."`;
          }
        } else {
          deliveryStatusCard.style.display = 'none';
        }
      }

      if (winResultBox) winResultBox.style.display = 'block';
    }, 400);
  });
});

if (playAgainBtn) {
  playAgainBtn.addEventListener('click', () => {
    gameActive = true;
    gameCards.forEach(card => {
      card.classList.remove('game-card--flipped');
      card.disabled = false;
      const backText = card.querySelector('.reward-text');
      if (backText) backText.textContent = '';
    });
    if (winResultBox) winResultBox.style.display = 'none';
  });
}


// ============================================================================
// REFERRALS ENGINE
// ============================================================================
const REFCODE_KEY = 'momo_referral_codes';
const REFERRAL_KEY = 'momo_referrals';
const TICKETS_KEY = 'momo_tickets';

function getReferralCodes() { return JSON.parse(localStorage.getItem(REFCODE_KEY) || '{}'); }
function saveReferralCodes(c) { localStorage.setItem(REFCODE_KEY, JSON.stringify(c)); }
function getReferrals() { return JSON.parse(localStorage.getItem(REFERRAL_KEY) || '[]'); }
function saveReferrals(r) { localStorage.setItem(REFERRAL_KEY, JSON.stringify(r)); }

function createNewReferralCode(userId, last4) {
  const codes = getReferralCodes();
  let code = `MOMO-${last4}-${Math.floor(100 + Math.random() * 900)}`;
  codes[code] = { userId, last4, status: 'active' };
  saveReferralCodes(codes);
  return code;
}

function getActiveReferralCode(user) {
  const codes = getReferralCodes();
  const active = Object.entries(codes).find(([, v]) => v.userId === user.id && v.status === 'active');
  if (active) return active[0];
  return createNewReferralCode(user.id, user.phone.slice(-4));
}

function submitReferralCode(rawCode, user) {
  const statusEl = document.getElementById('enter-code-status');
  const code = (rawCode || '').trim().toUpperCase();
  const codes = getReferralCodes();
  let entry = codes[code];

  if (!entry && code.startsWith('MOMO-')) {
    entry = { userId: 'usr_ref_' + Math.random().toString(36).slice(2, 6), status: 'active' };
    codes[code] = entry;
    saveReferralCodes(codes);
  }

  if (!entry) {
    if (statusEl) {
      statusEl.textContent = "That code doesn't look right — check with whoever sent it.";
      statusEl.className = 'text-danger';
    }
    return;
  }

  const referrals = getReferrals();
  referrals.push({
    code,
    referrerId: entry.userId,
    referredId: user.id,
    status: 'linked',
    createdAt: new Date().toISOString()
  });
  saveReferrals(referrals);

  if (statusEl) {
    statusEl.textContent = 'Code applied! Make your first deposit to unlock tickets for both.';
    statusEl.className = 'text-success';
  }
}

function completeReferral(referredUserId) {
  const referrals = getReferrals();
  const r = referrals.find(ref => ref.referredId === referredUserId && ref.status === 'linked');
  if (!r) return;

  r.status = 'completed';
  r.completedAt = new Date().toISOString();
  saveReferrals(referrals);
}

function renderReferralPage() {
  const user = getCurrentUser();
  const code = getActiveReferralCode(user);
  const codeEl = document.getElementById('my-referral-code');
  if (codeEl) codeEl.textContent = code;

  const referrals = getReferrals().filter(r => r.referrerId === user.id);
  const verifiedCount = referrals.filter(r => r.status === 'completed').length;
  const pct = Math.min((verifiedCount / 10) * 100, 100);

  const fillEl = document.getElementById('milestone-fill');
  if (fillEl) fillEl.style.width = pct + '%';

  const labelEl = document.getElementById('milestone-label');
  if (labelEl) labelEl.textContent = `${verifiedCount} / 10 verified referrals to earn bonus ticket`;
}

// Copy referral code
const copyRefBtn = document.getElementById('btn-copy-code');
if (copyRefBtn) {
  copyRefBtn.addEventListener('click', () => {
    const codeEl = document.getElementById('my-referral-code');
    if (codeEl) {
      navigator.clipboard.writeText(codeEl.textContent).then(() => {
        copyRefBtn.textContent = 'Copied!';
        setTimeout(() => { copyRefBtn.textContent = 'Copy Code'; }, 1500);
      });
    }
  });
}

// Submit code button
const submitRefBtn = document.getElementById('btn-submit-code');
if (submitRefBtn) {
  submitRefBtn.addEventListener('click', () => {
    const input = document.getElementById('input-referral-code');
    if (input && input.value.trim()) {
      submitReferralCode(input.value, getCurrentUser());
      renderReferralPage();
    }
  });
}


// --- Navigation Drawer ---
const openMenuBtn = document.getElementById('btn-open-menu');
const closeMenuBtn = document.getElementById('btn-close-menu');
const drawerOverlay = document.getElementById('drawer-overlay');
const navDrawer = document.getElementById('nav-drawer');

function openDrawer() { if (navDrawer) navDrawer.classList.add('nav-drawer--active'); }
function closeDrawer() { if (navDrawer) navDrawer.classList.remove('nav-drawer--active'); }

if (openMenuBtn) openMenuBtn.addEventListener('click', openDrawer);
if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeDrawer);
if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);


// --- Expose Global Handlers on window for HTML and External Access ---
window.openPocketDashboard = openPocketDashboard;
window.closePocketDashboard = closePocketDashboard;
window.openCreatePocketModal = openCreatePocketModal;
window.closeCreatePocketModal = closeCreatePocketModal;
window.openJoinPocketModal = openJoinPocketModal;
window.closeJoinPocketModal = closeJoinPocketModal;
window.openContributeModal = openContributeModal;
window.closeContributeModal = closeContributeModal;
window.openWithdrawModal = openWithdrawModal;
window.closeWithdrawModal = closeWithdrawModal;
window.openInviteModal = openInviteModal;
window.closeInviteModal = closeInviteModal;
window.openStatementModal = openStatementModal;
window.closeStatementModal = closeStatementModal;
window.openClosePocketModal = openClosePocketModal;
window.closeClosePocketModal = closeClosePocketModal;
window.openPersonalDepositModal = openPersonalDepositModal;
window.closePersonalDepositModal = closePersonalDepositModal;
window.openPersonalWithdrawModal = openPersonalWithdrawModal;
window.closePersonalWithdrawModal = closePersonalWithdrawModal;
window.requestPinAuth = requestPinAuth;
window.closePinModal = closePinModal;
window.togglePocketTransparency = togglePocketTransparency;
window.switchTransparencyTab = switchTransparencyTab;
window.navigateTo = navigateTo;
window.showToast = showToast;


// --- Initialize Page ---
function initApp() {
  updateWalletUI();
  renderPocketsHub();
  updateActiveTicketOptionsFromPockets();
  renderReferralPage();
  updatePersonalSavingsUI();

  // If on pocket-detail.html page, load the pocket from query param or storage
  if (window.location.pathname.includes('pocket-detail')) {
    const urlParams = new URLSearchParams(window.location.search);
    const pocketId = urlParams.get('id');
    const pockets = getPockets();
    const targetId = pocketId || (pockets[0] ? pockets[0].id : null);
    if (targetId) {
      openPocketDashboard(targetId);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
