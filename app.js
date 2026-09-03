/* ================================================
   Prized Linked Savings — Powered by MTN MoMo
   Full App Logic: Savings Goals, Group/Stokvel,
   Tickets, Referrals, Interest Calculation
   MTN Fintech Summit 2026 Hackathon
   ================================================ */

'use strict';

/* ================================================
   CONSTANTS & STORAGE KEYS
   ================================================ */
const KEYS = {
  USER:          'pls_current_user',
  WALLET:        'pls_wallet_balance',
  GOALS:         'pls_savings_goals',
  GROUPS:        'pls_savings_groups',
  TICKETS:       'pls_tickets',
  REFERRAL_CODES:'pls_referral_codes',
  REFERRALS:     'pls_referrals',
  TRANSACTIONS:  'pls_transactions',
};

// Annual interest rates (before −2% offset)
const RATES = {
  PERSONAL_MIN: 4.00,
  PERSONAL_MAX: 7.50,
  GROUP_MIN:    4.50,
  GROUP_MAX:    8.00,
  OFFSET:       2.00,
};

// Ticket tier thresholds
const PERSONAL_TIERS = {
  GOLD:   15000,
  SILVER:  5000,
  BRONZE:  1000,
};

const GROUP_TIERS = {
  GOLD:   50000,
  SILVER: 10000,
  BRONZE:  1000,
};

/* ================================================
   UTILITY: localStorage helpers
   ================================================ */
function load(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.warn('Storage error', e); }
}

/* ================================================
   UTILITY: Toast notifications
   ================================================ */
function showToast(msg, type = 'default', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s var(--ease-out) both';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ================================================
   UTILITY: Format currency
   ================================================ */
function fmt(n) {
  return 'R' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtShort(n) {
  n = Number(n || 0);
  if (n >= 1000) return 'R' + (n / 1000).toFixed(1) + 'k';
  return fmt(n);
}

/* ================================================
   UTILITY: Date helpers
   ================================================ */
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function daysBetween(a, b) {
  return Math.max(0, Math.floor((new Date(b) - new Date(a)) / 86400000));
}
function daysRemaining(endDate) {
  return Math.max(0, daysBetween(new Date(), endDate));
}
function isLockComplete(goal) {
  return new Date() >= new Date(goal.endDate);
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}
function countdown(endDate) {
  const ms = new Date(endDate) - new Date();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0 };
  const days    = Math.floor(ms / 86400000);
  const hours   = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return { days, hours, minutes };
}

/* ================================================
   USER MANAGEMENT
   ================================================ */
function getCurrentUser() {
  let user = load(KEYS.USER);
  if (!user) {
    const id = 'usr_' + Math.random().toString(36).slice(2, 10);
    const phone = '082' + Math.floor(1000000 + Math.random() * 9000000);
    user = { id, phone, name: 'MoMo User', createdAt: new Date().toISOString() };
    save(KEYS.USER, user);
  }
  return user;
}

/* ================================================
   WALLET
   ================================================ */
function getWalletBalance() { return load(KEYS.WALLET, 2450.00); }
function setWalletBalance(n) { save(KEYS.WALLET, Math.max(0, n)); }
function addToWallet(amount) { setWalletBalance(getWalletBalance() + amount); }
function deductFromWallet(amount) {
  const bal = getWalletBalance();
  if (amount > bal) return false;
  setWalletBalance(bal - amount);
  return true;
}

/* ================================================
   TRANSACTIONS
   ================================================ */
function getTransactions() { return load(KEYS.TRANSACTIONS, []); }
function addTransaction(type, amount, description, goalId = null) {
  const txns = getTransactions();
  txns.unshift({
    id: 'tx_' + Date.now(),
    type, // 'credit' | 'debit' | 'interest' | 'prize' | 'referral'
    amount,
    description,
    goalId,
    date: new Date().toISOString(),
  });
  save(KEYS.TRANSACTIONS, txns.slice(0, 100)); // keep latest 100
}

/* ================================================
   SAVINGS GOALS
   ================================================ */
function getGoals() { return load(KEYS.GOALS, []); }
function saveGoals(goals) { save(KEYS.GOALS, goals); }

function getGoalTier(amount) {
  if (amount >= PERSONAL_TIERS.GOLD)   return 'gold';
  if (amount >= PERSONAL_TIERS.SILVER) return 'silver';
  if (amount >= PERSONAL_TIERS.BRONZE) return 'bronze';
  return 'none';
}
function getGroupTier(amount) {
  if (amount >= GROUP_TIERS.GOLD)   return 'gold';
  if (amount >= GROUP_TIERS.SILVER) return 'silver';
  if (amount >= GROUP_TIERS.BRONZE) return 'bronze';
  return 'none';
}
function tierLabel(tier) {
  return { gold: 'Gold', silver: 'Silver', bronze: 'Bronze', flat: 'Flat Rate', none: 'Below minimum', group_gold: 'Gold Group', group_silver: 'Silver Group', group_bronze: 'Bronze Group' }[tier] || tier;
}
function tierBadgeClass(tier) {
  return { gold: 'tier-badge--gold', silver: 'tier-badge--silver', bronze: 'tier-badge--bronze', flat: 'tier-badge--flat', none: 'tier-badge--locked' }[tier] || 'tier-badge--locked';
}

function calcInterest(goal) {
  // Simple daily accrual using effective rate (standard - 2% offset)
  const standardRate = RATES.PERSONAL_MIN + (RATES.PERSONAL_MAX - RATES.PERSONAL_MIN) * 0.5; // midpoint ~5.75%
  const effectiveRate = standardRate - RATES.OFFSET; // ~3.75%
  const daysHeld = daysBetween(goal.startDate, new Date());
  const balance = goal.currentBalance || 0;
  return balance * (effectiveRate / 100) * (daysHeld / 365);
}

function calcGroupInterest(group) {
  const standardRate = RATES.GROUP_MIN + (RATES.GROUP_MAX - RATES.GROUP_MIN) * 0.5; // midpoint ~6.25%
  const effectiveRate = standardRate - RATES.OFFSET; // ~4.25%
  const daysHeld = daysBetween(group.startDate, new Date());
  const balance = group.pooledBalance || 0;
  return balance * (effectiveRate / 100) * (daysHeld / 365);
}

function createGoal(userId, name, targetAmount, months, initialDeposit) {
  const goals = getGoals();
  const startDate = new Date();
  const endDate   = addMonths(startDate, months);
  const monthlyContribution = Math.ceil((targetAmount - (initialDeposit || 0)) / months);

  const goal = {
    id: 'goal_' + Date.now(),
    userId,
    type: 'personal',
    name,
    targetAmount: parseFloat(targetAmount),
    currentBalance: parseFloat(initialDeposit || 0),
    monthlyContribution,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    months,
    isWithdrawnEarly: false,
    isCompleted: false,
    scratchCardsEarned: [],
    createdAt: startDate.toISOString(),
  };

  goals.push(goal);
  saveGoals(goals);

  if (initialDeposit > 0) {
    deductFromWallet(initialDeposit);
    addTransaction('debit', initialDeposit, `Initial deposit → ${name}`, goal.id);
    checkReferralDepositTrigger(userId, initialDeposit);
  }

  return goal;
}

function depositToGoal(goalId, amount, userId) {
  const goals = getGoals();
  const idx = goals.findIndex(g => g.id === goalId && g.userId === userId);
  if (idx === -1) return { ok: false, msg: 'Goal not found.' };

  const goal = goals[idx];
  if (goal.isWithdrawnEarly || goal.isCompleted) return { ok: false, msg: 'Goal is closed.' };

  const walletBal = getWalletBalance();
  if (amount > walletBal) return { ok: false, msg: `Insufficient wallet balance. Available: ${fmt(walletBal)}` };

  deductFromWallet(amount);
  goals[idx].currentBalance += amount;

  // Check deposit trigger for referral qualification (> R50 deposit)
  checkReferralDepositTrigger(userId, amount);

  // Check for goal completion
  let completionMsg = null;
  if (goals[idx].currentBalance >= goals[idx].targetAmount && isLockComplete(goals[idx])) {
    completionMsg = completeGoal(goals, idx, userId);
  }

  saveGoals(goals);
  addTransaction('debit', amount, `Deposit → ${goal.name}`, goalId);
  return { ok: true, completionMsg };
}

function withdrawFromGoal(goalId, amount, userId) {
  const goals = getGoals();
  const idx = goals.findIndex(g => g.id === goalId && g.userId === userId);
  if (idx === -1) return { ok: false, msg: 'Goal not found.' };

  const goal = goals[idx];
  if (goal.isCompleted) return { ok: false, msg: 'Goal already completed — funds released.' };
  if (goal.isWithdrawnEarly) return { ok: false, msg: 'Goal already withdrawn.' };
  if (amount > goal.currentBalance) return { ok: false, msg: `Cannot withdraw more than ${fmt(goal.currentBalance)}.` };

  const isEarly = !isLockComplete(goal);
  const forfeited = [];

  if (isEarly) {
    goals[idx].isWithdrawnEarly = true;
    goals[idx].scratchCardsEarned = []; // forfeit pending cards
    // Forfeit pending referral card for referrer
    forfeitReferralForUser(userId);
    forfeited.push('interest', 'scratch cards');
  }

  addToWallet(amount);
  goals[idx].currentBalance -= amount;
  saveGoals(goals);
  addTransaction('credit', amount, `Withdrawal ← ${goal.name}${isEarly ? ' (EARLY — penalties applied)' : ''}`, goalId);
  return { ok: true, isEarly, forfeited };
}

function completeGoal(goals, idx, userId) {
  const goal = goals[idx];
  if (goal.isCompleted) return null;

  goals[idx].isCompleted = true;
  goals[idx].completedAt = new Date().toISOString();

  // Determine tier and issue scratch card
  const tier = getGoalTier(goal.targetAmount);
  if (tier !== 'none') {
    const card = issueTicket(userId, 'personal_savings', tier, goal.id);
    goals[idx].scratchCardsEarned.push(card.id);

    // Complete any pending referral (referrer earns a card — single-sided)
    completeReferralForUser(userId);

    return `Goal "${goal.name}" completed! You earned a ${tierLabel(tier)} scratch card!`;
  }
  return null;
}

/* ================================================
   GROUP / STOKVEL SAVINGS
   ================================================ */
function getGroups() { return load(KEYS.GROUPS, []); }
function saveGroups(groups) { save(KEYS.GROUPS, groups); }

function generateGroupCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'GRP-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createGroup(userId, name, targetAmount, months, initialContribution, reason = 'General Savings') {
  const groups = getGroups();

  // Ensure unique code across all groups
  let code;
  let attempts = 0;
  do {
    code = generateGroupCode();
    attempts++;
  } while (groups.find(g => g.code === code) && attempts < 1000);

  const startDate = new Date();
  const endDate   = addMonths(startDate, months);

  const group = {
    id: 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    code,
    createdBy: userId,
    name,
    reason: reason || 'School & University Fees',
    targetAmount: parseFloat(targetAmount),
    pooledBalance: parseFloat(initialContribution || 0),
    months,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    members: [{
      userId,
      contribution: parseFloat(initialContribution || 0),
      joinedAt: startDate.toISOString(),
      role: 'admin',
    }],
    isCompleted: false,
    isWithdrawnEarly: false,
    scratchCardsEarned: [],
    createdAt: startDate.toISOString(),
  };

  groups.push(group);
  saveGroups(groups);

  if (initialContribution > 0) {
    deductFromWallet(initialContribution);
    addTransaction('debit', initialContribution, `Group contribution → ${name}`, group.id);
  }

  return group;
}

function joinGroup(userId, code, contribution) {
  const groups = getGroups();
  const idx = groups.findIndex(g => g.code === code.toUpperCase().trim());
  if (idx === -1) return { ok: false, msg: 'Group code not found. Double-check with your group admin.' };

  const group = groups[idx];
  if (group.isCompleted || group.isWithdrawnEarly) return { ok: false, msg: 'This group is no longer active.' };
  if (group.members.find(m => m.userId === userId)) return { ok: false, msg: 'You are already a member of this group.' };

  const walletBal = getWalletBalance();
  if (contribution > walletBal) return { ok: false, msg: `Insufficient wallet balance. Available: ${fmt(walletBal)}` };

  deductFromWallet(contribution);
  groups[idx].pooledBalance += contribution;
  groups[idx].members.push({
    userId,
    contribution,
    joinedAt: new Date().toISOString(),
    role: 'member',
  });

  saveGroups(groups);
  addTransaction('debit', contribution, `Join group → ${group.name}`, group.id);
  return { ok: true, group: groups[idx] };
}

function depositToGroup(groupId, amount, userId) {
  const groups = getGroups();
  const idx = groups.findIndex(g => g.id === groupId);
  if (idx === -1) return { ok: false, msg: 'Group not found.' };

  const group = groups[idx];
  if (!group.members.find(m => m.userId === userId)) return { ok: false, msg: 'You are not a member of this group.' };
  if (group.isCompleted || group.isWithdrawnEarly) return { ok: false, msg: 'Group is closed.' };

  const walletBal = getWalletBalance();
  if (amount > walletBal) return { ok: false, msg: `Insufficient wallet balance. Available: ${fmt(walletBal)}` };

  deductFromWallet(amount);
  groups[idx].pooledBalance += amount;
  const memberIdx = groups[idx].members.findIndex(m => m.userId === userId);
  if (memberIdx >= 0) groups[idx].members[memberIdx].contribution += amount;

  // Check group completion
  let completionMsg = null;
  if (groups[idx].pooledBalance >= groups[idx].targetAmount && isLockComplete(groups[idx])) {
    completionMsg = completeGroup(groups, idx);
  }

  saveGroups(groups);
  addTransaction('debit', amount, `Group contribution → ${group.name}`, groupId);
  return { ok: true, completionMsg };
}

function completeGroup(groups, idx) {
  const group = groups[idx];
  if (group.isCompleted) return null;

  groups[idx].isCompleted = true;
  groups[idx].completedAt = new Date().toISOString();

  const tier = getGroupTier(group.pooledBalance);
  const memberIds = group.members.map(m => m.userId);

  // Issue a group-type scratch card to each member
  memberIds.forEach(uid => {
    const card = issueTicket(uid, 'group_savings', tier, group.id, {
      groupName: group.name,
      memberCount: memberIds.length,
      totalPool: group.pooledBalance,
    });
    groups[idx].scratchCardsEarned.push(card.id);
  });

  return `Group "${group.name}" completed! All ${memberIds.length} members earned a ${tierLabel('group_' + tier)} voucher!`;
}

/* ================================================
   SCRATCH TICKETS
   ================================================ */
function getTickets() { return load(KEYS.TICKETS, []); }
function saveTickets(t) { save(KEYS.TICKETS, t); }
function getUserTickets(userId) {
  return getTickets().filter(t => t.userId === userId && !t.isScratched);
}

function issueTicket(userId, source, tier, sourceId, groupMeta = null) {
  const tickets = getTickets();
  const ticket = {
    id: 'tkt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    userId,
    source, // 'personal_savings' | 'group_savings' | 'referral'
    tier,   // 'bronze' | 'silver' | 'gold' | 'flat'
    sourceId,
    groupMeta,
    isScratched: false,
    reward: null,
    createdAt: new Date().toISOString(),
    scratchedAt: null,
  };
  tickets.push(ticket);
  saveTickets(tickets);
  return ticket;
}

function scratchTicket(ticketId, userId) {
  const tickets = getTickets();
  const idx = tickets.findIndex(t => t.id === ticketId && t.userId === userId && !t.isScratched);
  if (idx === -1) return null;

  const ticket = tickets[idx];
  const reward = generateReward(ticket);

  tickets[idx].isScratched = true;
  tickets[idx].reward = reward;
  tickets[idx].scratchedAt = new Date().toISOString();
  saveTickets(tickets);

  addTransaction('prize', reward.valueZar || 0,
    `Ticket won: ${reward.prize} (${tierLabel(ticket.tier)})`, ticketId);

  return { ticket: tickets[idx], reward };
}

/* ================================================
   REWARD ENGINE — 100% GUARANTEED WIN
   ================================================ */
const PERSONAL_PRIZES = {
  bronze: [
    { icon: 'DATA', prize: '100MB MTN Data', value: 15, type: 'data' },
    { icon: 'DATA', prize: '250MB MTN Data', value: 18, type: 'data' },
    { icon: 'AIR', prize: 'R15 MTN Airtime', value: 15, type: 'airtime' },
    { icon: 'AIR', prize: 'R20 MTN Airtime', value: 20, type: 'airtime' },
    { icon: 'MIN', prize: '20 MTN Voice Minutes', value: 16, type: 'minutes' },
  ],
  silver: [
    { icon: 'DATA', prize: '500MB MTN Data', value: 25, type: 'data' },
    { icon: 'DATA', prize: '1GB MTN Data', value: 30, type: 'data' },
    { icon: 'AIR', prize: 'R25 MTN Airtime', value: 25, type: 'airtime' },
    { icon: 'AIR', prize: 'R30 MTN Airtime', value: 30, type: 'airtime' },
    { icon: 'MIN', prize: '50 MTN Voice Minutes', value: 28, type: 'minutes' },
  ],
  gold: [
    { icon: 'DATA', prize: '2GB MTN Data', value: 40, type: 'data' },
    { icon: 'DATA', prize: '3GB MTN Data', value: 45, type: 'data' },
    { icon: 'AIR', prize: 'R40 MTN Airtime', value: 40, type: 'airtime' },
    { icon: 'AIR', prize: 'R45 MTN Airtime', value: 45, type: 'airtime' },
    { icon: 'MIN', prize: '100 MTN Voice Minutes', value: 42, type: 'minutes' },
  ],
  flat: [
    { icon: 'DATA', prize: '200MB MTN Data', value: 18, type: 'data' },
    { icon: 'DATA', prize: '500MB MTN Data', value: 22, type: 'data' },
    { icon: 'AIR', prize: 'R20 MTN Airtime', value: 20, type: 'airtime' },
    { icon: 'AIR', prize: 'R25 MTN Airtime', value: 25, type: 'airtime' },
    { icon: 'MIN', prize: '30 MTN Voice Minutes', value: 20, type: 'minutes' },
  ],
};

const GROUP_PRIZES = {
  bronze: {
    icon: 'VCHR',
    prize: '5% Off Retail Category',
    discount: 5,
    vendor: 'Shoprite / Pick n Pay',
    type: 'retail_discount',
  },
  silver: {
    icon: 'VCHR',
    prize: '10% Off Retail Category',
    discount: 10,
    vendor: 'Shoprite / Pick n Pay / Checkers',
    type: 'retail_discount',
  },
  gold: {
    icon: 'VCHR',
    prize: '20% Off Retail Category',
    discount: 20,
    vendor: 'All Partner Retail Stores',
    type: 'retail_discount',
  },
  none: {
    icon: 'VCHR',
    prize: '5% Off Retail Category',
    discount: 5,
    vendor: 'Shoprite / Pick n Pay',
    type: 'retail_discount',
  },
};

function generateReward(ticket) {
  if (ticket.source === 'group_savings') {
    const tier = ticket.tier in GROUP_PRIZES ? ticket.tier : 'bronze';
    const p = GROUP_PRIZES[tier];
    const meta = ticket.groupMeta || {};
    const memberCount = meta.memberCount || 1;
    return {
      type: 'retail_discount',
      prize: p.prize,
      icon: p.icon,
      discount: p.discount,
      vendor: p.vendor,
      splitDetails: `Applied to all ${memberCount} members of '${meta.groupName || 'your group'}'`,
      valueZar: 0,
      tier: ticket.tier,
      badgeClass: `win-badge--${tier === 'gold' ? 'jackpot' : tier === 'silver' ? 'medium' : 'small'}`,
      tierLabel: tierLabel('group_' + tier),
    };
  }

  // Personal / Referral prizes
  const pool = PERSONAL_PRIZES[ticket.tier] || PERSONAL_PRIZES.bronze;
  const p = pool[Math.floor(Math.random() * pool.length)];
  return {
    type: p.type,
    prize: p.prize,
    icon: p.icon,
    valueZar: p.value,
    splitDetails: 'Credited directly to your MTN MoMo wallet & SIM',
    tier: ticket.tier,
    badgeClass: `win-badge--${ticket.tier === 'gold' ? 'big' : ticket.tier === 'silver' ? 'medium' : 'small'}`,
    tierLabel: tierLabel(ticket.tier),
  };
}

function generateSmsAlert(reward, phone) {
  phone = phone || '+27 8X XXX XXXX';
  if (reward.type === 'retail_discount') {
    return `"MTN MoMo Group Alert: Your group won ${reward.prize} at ${reward.vendor}! ${reward.splitDetails}."`;
  }
  if (reward.type === 'data') {
    return `"MTN MoMo: ${reward.prize} credited to ${phone}. Valid 30 days. Enjoy!"`;
  }
  if (reward.type === 'airtime') {
    return `"MTN MoMo: ${reward.prize} top-up applied to ${phone}. Use it well!"`;
  }
  if (reward.type === 'minutes') {
    return `"MTN MoMo: ${reward.prize} added to ${phone}. Valid 30 days."`;
  }
  return `"MTN MoMo: Prize credited to ${phone}."`;
}

/* ================================================
   REFERRAL SYSTEM (SINGLE-SIDED)
   ================================================ */
function getReferralCodes() { return load(KEYS.REFERRAL_CODES, {}); }
function saveReferralCodes(c) { save(KEYS.REFERRAL_CODES, c); }
function getReferrals() { return load(KEYS.REFERRALS, []); }
function saveReferrals(r) { save(KEYS.REFERRALS, r); }

function generateReferralCode(userId, last4) {
  const codes = getReferralCodes();
  // Retire existing active codes for this user
  Object.values(codes).forEach(e => {
    if (e.userId === userId && e.status === 'active') e.status = 'retired';
  });
  const suffix = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  const code = `MOMO-${last4}-${suffix}`;
  codes[code] = { userId, last4, status: 'active', createdAt: new Date().toISOString() };
  saveReferralCodes(codes);
  return code;
}

function getActiveCode(user) {
  const codes = getReferralCodes();
  const active = Object.entries(codes).find(([, v]) => v.userId === user.id && v.status === 'active');
  if (active) return active[0];
  return generateReferralCode(user.id, user.phone.slice(-4));
}

function normalizeCode(input) {
  return (input || '').trim().toUpperCase().replace(/\s+/g, '');
}

function submitReferralCode(rawCode, user) {
  const code = normalizeCode(rawCode);
  const codes = getReferralCodes();
  let entry = codes[code];

  // Auto-register external MOMO codes for cross-device demo
  if (!entry && code.startsWith('MOMO-')) {
    const parts = code.split('-');
    entry = { userId: 'usr_ext_' + Math.random().toString(36).slice(2, 8), last4: parts[1] || '0000', status: 'active' };
    codes[code] = entry;
    saveReferralCodes(codes);
  }

  if (!entry)          return { ok: false, msg: "Code not recognized. Ask your friend to double-check." };
  if (entry.status === 'used') return { ok: false, msg: "This code has already been used." };
  if (entry.userId === user.id) return { ok: false, msg: "You can't use your own referral code." };
  if (getReferrals().some(r => r.referredId === user.id)) return { ok: false, msg: "You've already applied a referral code." };

  // Mark code as used
  codes[code].status = 'used';
  saveReferralCodes(codes);

  const referrals = getReferrals();
  referrals.push({
    id: 'ref_' + Date.now(),
    code,
    referrerId: entry.userId,
    referredId: user.id,
    status: 'registered', // registered -> deposit_pending -> active (after 1 mo & >R50) -> verified (goal complete)
    firstDepositAmount: 0,
    firstDepositDate: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  });
  saveReferrals(referrals);

  return { ok: true, msg: "Code applied! Deposit >R50 and complete your savings goal to reward your referrer." };
}

// Check deposit conditions when the referred user deposits to a goal or group
function checkReferralDepositTrigger(userId, depositAmount) {
  const referrals = getReferrals();
  const ref = referrals.find(r => r.referredId === userId && (r.status === 'registered' || r.status === 'deposit_pending'));
  if (!ref) return;

  if (depositAmount > 50) {
    ref.firstDepositAmount = depositAmount;
    ref.firstDepositDate = new Date().toISOString();
    ref.status = 'activated'; // Activated after deposit of > R50
    saveReferrals(referrals);
  } else if (ref.status === 'registered') {
    ref.status = 'deposit_pending';
    saveReferrals(referrals);
  }
}

// Called when the referred user completes a goal (completing their set amount & set months)
// SINGLE-SIDED: only the REFERRER gets a ticket
function completeReferralForUser(referredUserId) {
  const referrals = getReferrals();
  const ref = referrals.find(r => r.referredId === referredUserId && (r.status === 'activated' || r.status === 'pending' || r.status === 'linked' || r.status === 'registered'));
  if (!ref) return;

  ref.status = 'verified';
  ref.completedAt = new Date().toISOString();
  saveReferrals(referrals);

  // Award ticket to REFERRER ONLY
  issueTicket(ref.referrerId, 'referral', 'flat', ref.id);

  // Generate fresh code for referrer
  const codes = getReferralCodes();
  const codeEntry = codes[ref.code];
  if (codeEntry) {
    generateReferralCode(ref.referrerId, codeEntry.last4);
  }
}

function forfeitReferralForUser(userId) {
  const referrals = getReferrals();
  const ref = referrals.find(r => r.referredId === userId && r.status !== 'verified' && r.status !== 'forfeited');
  if (!ref) return;
  ref.status = 'forfeited';
  ref.forfeitedAt = new Date().toISOString();
  saveReferrals(referrals);
}

/* ================================================
   UI RENDERING
   ================================================ */

function updateAllUI() {
  updateHeaderWallet();
  updateDrawerCode();
  renderHomePage();
  renderSavingsPage();
  renderGamePage();
  renderReferralsPage();
}

function updateHeaderWallet() {
  const els = document.querySelectorAll('#header-wallet-amount, .wallet-amount');
  const val = fmt(getWalletBalance());
  els.forEach(el => { el.textContent = val; });
}

function updateDrawerCode() {
  const el = document.getElementById('drawer-user-code');
  if (!el) return;
  const user = getCurrentUser();
  el.textContent = getActiveCode(user);
}

/* ---- HOME PAGE ---- */
function renderHomePage() {
  const user = getCurrentUser();
  const goals = getGoals().filter(g => g.userId === user.id && !g.isWithdrawnEarly);
  const groups = getGroups().filter(g => g.members.some(m => m.userId === user.id) && !g.isWithdrawnEarly);
  const tickets = getUserTickets(user.id);
  const referrals = getReferrals();
  const verifiedRefs = referrals.filter(r => r.referrerId === user.id && r.status === 'verified');

  // Hero stats
  const totalSavings = goals.reduce((s, g) => s + g.currentBalance, 0)
    + groups.reduce((s, g) => {
        const me = g.members.find(m => m.userId === user.id);
        return s + (me ? me.contribution : 0);
      }, 0);
  const totalInterest = goals.reduce((s, g) => s + calcInterest(g), 0)
    + groups.reduce((s, g) => s + calcGroupInterest(g) / g.members.length, 0);

  // Top Bar & Stat Cards
  setEl('header-wallet-amount', fmt(getWalletBalance()));
  setEl('wallet-balance-card', fmt(getWalletBalance()));
  setEl('total-savings-card', fmt(totalSavings));
  setEl('tickets-count-card', tickets.length);
  setEl('referrals-count-card', `${verifiedRefs.length} / 10`);

  // Group Savings progress card
  const groupNameEl = document.getElementById('home-group-name');
  if (groupNameEl) {
    if (groups.length > 0) {
      const topGroup = groups[0];
      const pooled = topGroup.members.reduce((sum, m) => sum + m.contribution, 0);
      const pct = Math.min(100, Math.round((pooled / topGroup.targetAmount) * 100));
      const remaining = Math.max(0, topGroup.targetAmount - pooled);

      setEl('home-group-name', topGroup.name);
      setEl('home-group-status', `${pct}% of Target Reached`);
      setEl('home-group-balance', fmt(pooled));
      setEl('home-group-target', `Target: ${fmt(topGroup.targetAmount)}`);
      const fillEl = document.getElementById('home-group-fill');
      if (fillEl) fillEl.style.width = `${pct}%`;
      setEl('home-group-members', `${topGroup.members.length} Active Members Contributed`);
      setEl('home-group-remaining', `${fmt(remaining)} remaining`);
    } else {
      // Default showcased fund per requirements
      setEl('home-group-name', 'Family Holiday Fund');
      setEl('home-group-status', '65% of Target Reached');
      setEl('home-group-balance', 'R6 500,00');
      setEl('home-group-target', 'Target: R10 000,00');
      const fillEl = document.getElementById('home-group-fill');
      if (fillEl) fillEl.style.width = '65%';
      setEl('home-group-members', '5 Active Members Contributed');
      setEl('home-group-remaining', 'R3 500,00 remaining');
    }
  }

  // Recent activity
  const activityEl = document.getElementById('home-activity-list');
  if (activityEl) {
    const txns = getTransactions().slice(0, 5);
    if (txns.length === 0) {
      activityEl.innerHTML = `
        <div class="activity-item">
          <div class="activity-icon">TX</div>
          <div class="activity-info">
            <div class="activity-desc">No recent transactions</div>
            <div class="activity-date">Your deposits, prizes, and group contributions will appear here.</div>
          </div>
          <div class="activity-amount">--</div>
        </div>`;
    } else {
      activityEl.innerHTML = txns.map(t => {
        const icons = { debit: 'OUT', credit: 'IN', prize: 'TKT', referral: 'REF', interest: 'INT' };
        const isPos = t.type === 'credit' || t.type === 'prize' || t.type === 'referral';
        return `
          <div class="activity-item">
            <div class="activity-icon">${icons[t.type] || 'TX'}</div>
            <div class="activity-info">
              <div class="activity-desc">${t.description}</div>
              <div class="activity-date">${formatDate(t.date)}</div>
            </div>
            <div class="activity-amount ${isPos ? 'positive' : 'negative'}">${isPos ? '+' : '-'}${fmt(t.amount)}</div>
          </div>`;
      }).join('');
    }
  }
}

/* ---- SAVINGS PAGE ---- */
function renderSavingsPage() {
  const user = getCurrentUser();
  const goals = getGoals().filter(g => g.userId === user.id);
  const groups = getGroups().filter(g => g.members.some(m => m.userId === user.id));

  // Personal Goals
  const personalEl = document.getElementById('personal-goals-list');
  const personalEmpty = document.getElementById('personal-goals-empty');
  if (personalEl) {
    const active = goals.filter(g => !g.isWithdrawnEarly);
    if (active.length === 0) {
      if (personalEmpty) personalEmpty.style.display = '';
    } else {
      if (personalEmpty) personalEmpty.style.display = 'none';
      const goalsHtml = active.map(g => renderGoalCard(g)).join('');
      // Insert before empty state
      const existing = personalEl.querySelectorAll('.goal-card');
      existing.forEach(el => el.remove());
      personalEl.insertAdjacentHTML('afterbegin', goalsHtml);
      // Re-attach action buttons
      attachGoalCardButtons(active, user);
    }
  }

  // Group Goals
  const groupEl = document.getElementById('group-list');
  const groupEmpty = document.getElementById('group-goals-empty');
  if (groupEl) {
    const active = groups.filter(g => !g.isWithdrawnEarly);
    if (active.length === 0) {
      if (groupEmpty) groupEmpty.style.display = '';
    } else {
      if (groupEmpty) groupEmpty.style.display = 'none';
      const groupsHtml = active.map(g => renderGroupCard(g, user.id)).join('');
      const existing = groupEl.querySelectorAll('.group-card');
      existing.forEach(el => el.remove());
      groupEl.insertAdjacentHTML('afterbegin', groupsHtml);
      attachGroupCardButtons(active, user);
    }
  }
}

function renderGoalCard(goal) {
  const pct = Math.min(100, (goal.currentBalance / goal.targetAmount) * 100);
  const tier = getGoalTier(goal.targetAmount);
  const interest = calcInterest(goal);
  const cd = countdown(goal.endDate);
  const locked = !isLockComplete(goal);
  const completed = goal.isCompleted;

  return `
    <div class="goal-card" id="goal-card-${goal.id}">
      <div class="goal-card-header">
        <div>
          <div class="goal-card-title">${goal.name}</div>
          <div class="goal-card-type" style="margin-top:4px;">
            <span class="tier-badge ${tierBadgeClass(tier)}">${tierLabel(tier)}</span>
            ${completed ? '<span class="status-badge status-badge--verified" style="margin-left:4px;">✓ Complete</span>' : ''}
          </div>
        </div>
        <div class="goal-card-amount">
          <span>${fmt(goal.currentBalance)}</span>
          <small style="font-size:0.7rem;font-weight:500;color:var(--text-secondary);">of ${fmt(goal.targetAmount)}</small>
        </div>
      </div>

      <div class="goal-progress-bar">
        <div class="goal-progress-fill ${completed ? 'complete' : ''}" style="width:${pct}%;"></div>
      </div>
      <div class="goal-progress-labels">
        <span>${pct.toFixed(0)}% saved</span>
        <span>${completed ? 'Completed' : (locked ? `Locked — ${cd.days}d ${cd.hours}h remaining` : 'Lock period done')}</span>
      </div>

      <div class="goal-meta">
        <div class="goal-meta-item">
          <div class="goal-meta-label">End Date</div>
          <div class="goal-meta-value" style="font-size:0.75rem;">${formatDate(goal.endDate)}</div>
        </div>
        <div class="goal-meta-item">
          <div class="goal-meta-label">Monthly</div>
          <div class="goal-meta-value">${fmtShort(goal.monthlyContribution)}</div>
        </div>
        <div class="goal-meta-item">
          <div class="goal-meta-label">Interest</div>
          <div class="goal-meta-value" style="color:var(--success);">${fmt(interest)}</div>
        </div>
      </div>

      ${!completed && !goal.isWithdrawnEarly ? `
        <div class="goal-card-actions">
          <button class="btn btn--primary btn--sm" data-action="deposit" data-goal-id="${goal.id}">+ Deposit</button>
          <button class="btn btn--outline btn--sm" data-action="withdraw" data-goal-id="${goal.id}" style="color:var(--danger);border-color:var(--danger);">Withdraw</button>
          ${pct >= 100 && !locked ? `<button class="btn btn--primary btn--sm" data-action="complete" data-goal-id="${goal.id}" style="background:var(--success);">Claim Ticket</button>` : ''}
        </div>` : ''}
      ${completed ? `<div class="info-box info-box--success" style="margin-top:var(--space-md);"><span class="info-box-icon">+</span><span>Ticket earned! Go to <a href="game.html" style="color:#065F46;font-weight:700;">Tickets</a> to play.</span></div>` : ''}
      ${goal.isWithdrawnEarly ? `<div class="info-box info-box--warning" style="margin-top:var(--space-md);"><span class="info-box-icon">!</span><span>Early withdrawal — interest &amp; tickets forfeited.</span></div>` : ''}
    </div>`;
}

function attachGoalCardButtons(goals, user) {
  goals.forEach(goal => {
    const card = document.getElementById(`goal-card-${goal.id}`);
    if (!card) return;
    card.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        const gId = btn.getAttribute('data-goal-id');
        if (action === 'deposit') openGoalDepositModal(gId, user);
        if (action === 'withdraw') openGoalWithdrawModal(gId, user);
        if (action === 'complete') forceCompleteGoal(gId, user);
      });
    });
  });
}

function renderGroupCard(group, userId) {
  const pct = Math.min(100, (group.pooledBalance / group.targetAmount) * 100);
  const tier = getGroupTier(group.pooledBalance);
  const myContribution = group.members.find(m => m.userId === userId)?.contribution || 0;
  const interest = calcGroupInterest(group);
  const cd = countdown(group.endDate);
  const locked = !isLockComplete(group);
  const completed = group.isCompleted;

  const discountInfo = { bronze: '5%', silver: '10%', gold: '20%', none: '—' };

  return `
    <div class="group-card" id="group-card-${group.id}">
      <div class="group-card-header">
        <div>
          <div class="group-name">${group.name}</div>
          <div style="margin-top:2px;">
            <span class="group-code-reason" style="font-size:0.7rem; padding:2px 8px;">Reason: ${group.reason || 'General Savings'}</span>
          </div>
          <div class="group-members-avatars" style="margin-top:6px;">
            ${group.members.slice(0, 5).map(m => `<div class="member-avatar">${m.role === 'admin' ? 'ADM' : 'MBR'}</div>`).join('')}
            ${group.members.length > 5 ? `<div class="member-avatar member-avatar--overflow">+${group.members.length - 5}</div>` : ''}
          </div>
          <div style="margin-top:8px;">
            <button class="btn-group-code" data-gaction="view-code" data-group-id="${group.id}" title="Click to view code and invite members">
              <span>Code: ${group.code}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </button>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="group-pooled-label">Pooled Balance</div>
          <div class="group-pooled-balance">${fmt(group.pooledBalance)}</div>
          <div style="font-size:0.7rem;color:var(--text-secondary);margin-top:2px;">of ${fmt(group.targetAmount)}</div>
          ${completed ? '<span class="status-badge status-badge--verified" style="margin-top:4px;display:inline-flex;">✓ Complete</span>' : ''}
        </div>
      </div>

      <div class="goal-progress-bar">
        <div class="goal-progress-fill ${completed ? 'complete' : ''}" style="width:${pct}%;"></div>
      </div>
      <div class="goal-progress-labels">
        <span>${pct.toFixed(0)}% pooled • ${group.members.length} members</span>
        <span>${locked ? `Locked — ${cd.days}d left` : 'Unlocked'}</span>
      </div>

      <div class="goal-meta">
        <div class="goal-meta-item">
          <div class="goal-meta-label">Your Share</div>
          <div class="goal-meta-value">${fmt(myContribution)}</div>
        </div>
        <div class="goal-meta-item">
          <div class="goal-meta-label">Voucher Tier</div>
          <div class="goal-meta-value">${discountInfo[tier] || '—'} Off</div>
        </div>
        <div class="goal-meta-item">
          <div class="goal-meta-label">Interest</div>
          <div class="goal-meta-value" style="color:var(--success);">${fmt(interest / group.members.length)}</div>
        </div>
      </div>

      ${completed ? `
        <div class="discount-voucher-card" style="margin-top:var(--space-md);">
          <div class="discount-percentage">${discountInfo[tier]}</div>
          <div class="discount-label">Retail Category Discount</div>
          <div class="discount-vendor">${GROUP_PRIZES[tier]?.vendor || 'Partner Retail Stores'}</div>
        </div>` : ''}

      ${!completed && !group.isWithdrawnEarly ? `
        <div class="goal-card-actions">
          <button class="btn btn--primary btn--sm" data-gaction="deposit" data-group-id="${group.id}">+ Contribute</button>
          ${pct >= 100 && !locked ? `<button class="btn btn--primary btn--sm" data-gaction="complete" data-group-id="${group.id}" style="background:var(--success);">Claim Voucher</button>` : ''}
        </div>` : ''}
    </div>`;
}

let _activeGroupForCode = null;

function openGroupCodePopup(groupId) {
  const groups = getGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return;

  _activeGroupForCode = group;
  setEl('popup-group-title', `${group.name} - Group Code`);
  setEl('popup-group-code', group.code);
  setEl('popup-group-reason', `Reason: ${group.reason || 'General Savings'}`);

  const phoneInput = document.getElementById('popup-invite-phone');
  const statusEl = document.getElementById('popup-invite-status');
  if (phoneInput) phoneInput.value = '';
  if (statusEl) { statusEl.textContent = ''; statusEl.className = 'enter-code-status'; }

  openModal('modal-group-code');
}

function attachGroupCardButtons(groups, user) {
  groups.forEach(group => {
    const card = document.getElementById(`group-card-${group.id}`);
    if (!card) return;
    card.querySelectorAll('[data-gaction]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-gaction');
        const gId = btn.getAttribute('data-group-id');
        if (action === 'deposit') openGroupDepositModal(gId, user);
        if (action === 'complete') forceCompleteGroup(gId, user);
        if (action === 'view-code') openGroupCodePopup(gId);
      });
    });
  });
}

/* ---- GAME PAGE ---- */
let activeTicketId = null;
let gameActive = true;

function renderGamePage() {
  const user = getCurrentUser();
  const tickets = getUserTickets(user.id);

  const select = document.getElementById('ticket-code-select');
  if (select) {
    const prev = select.value;
    select.innerHTML = '<option value="" disabled>— Select a card —</option>';
    if (tickets.length === 0) {
      select.innerHTML += '<option value="" disabled>No cards available — complete a savings goal or group pool!</option>';
    } else {
      tickets.forEach(t => {
        const src = { personal_savings: 'Personal Savings', group_savings: 'Group / Stokvel', referral: 'Referral' }[t.source] || t.source;
        const groupSuffix = t.source === 'group_savings' ? ` (Group: ${t.groupMeta?.groupName || 'Fund'})` : '';
        select.innerHTML += `<option value="${t.id}">[${src}] ${tierLabel(t.tier)} Ticket #${t.id.slice(-6)}${groupSuffix}</option>`;
      });
      if (prev && tickets.find(t => t.id === prev)) select.value = prev;
      else select.value = tickets[0].id;
    }
    updateActiveTicketBanner();
  }

  const countEl = document.getElementById('game-tickets-count');
  if (countEl) countEl.textContent = tickets.length;

  // Prize history
  const allTickets = getTickets().filter(t => t.userId === user.id && t.isScratched);
  const histEl = document.getElementById('prize-history-list');
  if (histEl) {
    const emptyEl = document.getElementById('prize-history-empty');
    if (allTickets.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
    } else {
      if (emptyEl) emptyEl.style.display = 'none';
      const existing = histEl.querySelectorAll('.activity-item:not(#prize-history-empty)');
      existing.forEach(el => el.remove());
      allTickets.slice(0, 10).reverse().forEach(t => {
        const r = t.reward;
        if (!r) return;
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
          <div class="activity-icon">${r.icon || 'TKT'}</div>
          <div class="activity-info">
            <div class="activity-desc">${r.prize}</div>
            <div class="activity-date">${formatDate(t.scratchedAt)} · ${tierLabel(t.tier)} (${t.source === 'group_savings' ? 'Group Pool' : 'Personal'})</div>
          </div>
          <div class="activity-amount positive">${r.type === 'retail_discount' ? r.discount + '% Off' : fmt(r.valueZar)}</div>`;
        histEl.insertAdjacentElement('afterbegin', item);
      });
    }
  }
}

function updateActiveTicketBanner() {
  const select = document.getElementById('ticket-code-select');
  const bannerEl = document.getElementById('active-ticket-banner');
  const poolTypeEl = document.getElementById('active-pool-type');
  const tierBadgeEl = document.getElementById('scratch-tier-badge');

  if (!select || !select.value) {
    if (bannerEl) bannerEl.textContent = 'Select a scratch card above to begin';
    if (poolTypeEl) poolTypeEl.textContent = '—';
    if (tierBadgeEl) tierBadgeEl.innerHTML = `<span class="tier-badge tier-badge--locked">No Card Selected</span>`;
    return;
  }

  activeTicketId = select.value;
  const user = getCurrentUser();
  const ticket = getUserTickets(user.id).find(t => t.id === activeTicketId);
  if (!ticket) return;

  const srcLabels = { personal_savings: 'Personal Savings', group_savings: 'Group / Stokvel', referral: 'Referral' };
  const badgeClass = ticket.tier === 'gold' ? 'tier-badge--gold' : ticket.tier === 'silver' ? 'tier-badge--silver' : 'tier-badge--bronze';

  if (bannerEl) bannerEl.textContent = `Selected: ${tierLabel(ticket.tier)} Ticket #${ticket.id.slice(-6)}`;
  if (poolTypeEl) poolTypeEl.textContent = srcLabels[ticket.source] || ticket.source;
  if (tierBadgeEl) {
    tierBadgeEl.innerHTML = `<span class="tier-badge ${badgeClass}">${srcLabels[ticket.source] || ''} • ${tierLabel(ticket.tier)} Ticket</span>`;
  }
}

/* ---- REFERRALS PAGE ---- */
function renderReferralsPage() {
  const user = getCurrentUser();
  const code = getActiveCode(user);

  setEl('my-referral-code', code);
  if (document.getElementById('drawer-user-code')) {
    document.getElementById('drawer-user-code').textContent = code;
  }

  const referrals = getReferrals();
  const myReferrals = referrals.filter(r => r.referrerId === user.id);
  const verified = myReferrals.filter(r => r.status === 'verified');
  const pending = myReferrals.filter(r => r.status === 'pending');
  const total = myReferrals.length;

  // Update stats summary pills
  const totalStatEl = document.getElementById('stat-total-referred');
  const verifiedStatEl = document.getElementById('stat-verified-referred');
  const pendingStatEl = document.getElementById('stat-pending-referred');
  if (totalStatEl) totalStatEl.textContent = total;
  if (verifiedStatEl) verifiedStatEl.textContent = verified.length;
  if (pendingStatEl) pendingStatEl.textContent = pending.length;

  const pct = Math.min((verified.length / 10) * 100, 100);

  const fillEl = document.getElementById('milestone-fill');
  if (fillEl) fillEl.style.width = pct + '%';
  const labelEl = document.getElementById('milestone-label');
  if (labelEl) labelEl.textContent = `${verified.length} / 10 verified referrals to earn a bonus ticket`;

  const ticketCountEl = document.getElementById('my-ticket-count');
  if (ticketCountEl) {
    const n = getUserTickets(user.id).length;
    ticketCountEl.textContent = `You have ${n} ticket${n !== 1 ? 's' : ''} available`;
  }

  const listEl = document.getElementById('referral-list');
  if (listEl) {
    if (myReferrals.length === 0) {
      listEl.innerHTML = `
        <div class="activity-item">
          <div class="activity-icon">--</div>
          <div class="activity-info">
            <div class="activity-desc">No referrals yet</div>
            <div class="activity-date">Share your code or direct link to invite friends</div>
          </div>
          <div class="activity-amount">0</div>
        </div>`;
    } else {
      const statusBadge = {
        verified:        '<span class="status-badge status-badge--verified">Goal Completed - Ticket Earned</span>',
        activated:       '<span class="status-badge status-badge--verified" style="background:#DBEAFE;color:#1D4ED8;">Active (>R50 Saved)</span>',
        deposit_pending: '<span class="status-badge status-badge--pending">Deposit Required (>R50)</span>',
        registered:      '<span class="status-badge status-badge--pending">Signed Up</span>',
        pending:         '<span class="status-badge status-badge--pending">Pending Goal</span>',
        forfeited:       '<span class="status-badge status-badge--forfeited">Forfeited</span>',
        linked:          '<span class="status-badge status-badge--pending">Active</span>',
      };
      listEl.innerHTML = myReferrals.map(r => `
        <div class="referral-list-item">
          <div class="referral-info">
            <div class="referral-avatar">REF</div>
            <div>
              <div class="activity-desc">Invited Friend (${r.code})</div>
              <div class="referral-date">${formatDate(r.createdAt)}</div>
            </div>
          </div>
          <div>${statusBadge[r.status] || statusBadge.pending}</div>
        </div>`).join('');
    }
  }
}

/* ================================================
   MODAL HELPERS
   ================================================ */
let _goalDepositTarget = null;
let _goalWithdrawTarget = null;
let _groupDepositTarget = null;

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('modal-overlay--active');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('modal-overlay--active');
}

function openGoalDepositModal(goalId, user) {
  _goalDepositTarget = goalId;
  const goal = getGoals().find(g => g.id === goalId);
  if (!goal) return;
  setEl('deposit-goal-name-label', `Depositing into: <strong>${goal.name}</strong>`);
  const el = document.getElementById('deposit-amount');
  if (el) { el.value = goal.monthlyContribution || ''; }
  openModal('modal-goal-deposit');
}
function openGoalWithdrawModal(goalId, user) {
  _goalWithdrawTarget = goalId;
  const goal = getGoals().find(g => g.id === goalId);
  if (!goal) return;
  setEl('withdraw-goal-name-label', `Withdrawing from: <strong>${goal.name}</strong>`);
  setEl('withdraw-balance-hint', `Available: ${fmt(goal.currentBalance)}`);
  openModal('modal-goal-withdraw');
}
function openGroupDepositModal(groupId, user) {
  _groupDepositTarget = groupId;
  const group = getGroups().find(g => g.id === groupId);
  if (!group) return;
  setEl('group-deposit-name-label', `Group: <strong>${group.name}</strong>`);
  openModal('modal-group-deposit');
}

function forceCompleteGoal(goalId, user) {
  const goals = getGoals();
  const idx = goals.findIndex(g => g.id === goalId && g.userId === user.id);
  if (idx === -1) return;
  const msg = completeGoal(goals, idx, user.id);
  saveGoals(goals);
  if (msg) showToast(msg, 'success', 4000);
  updateAllUI();
}

function forceCompleteGroup(groupId, user) {
  const groups = getGroups();
  const idx = groups.findIndex(g => g.id === groupId);
  if (idx === -1) return;
  const msg = completeGroup(groups, idx);
  saveGroups(groups);
  if (msg) showToast(msg, 'success', 4000);
  updateAllUI();
}

/* ================================================
   GAME LOGIC
   ================================================ */
function setupGamePage() {
  const winResultBox = document.getElementById('win-result-box');
  const winBadge = document.getElementById('win-badge');
  const winTitle = document.getElementById('win-title');
  const winPrize = document.getElementById('win-prize');
  const winSplitDetails = document.getElementById('win-split-details');
  const deliveryStatusCard = document.getElementById('delivery-status-card');
  const deliveryBadge = document.getElementById('delivery-status-badge');
  const winPhoneText = document.getElementById('win-phone-text');
  const winSmsText = document.getElementById('win-sms-text');
  const playAgainBtn = document.getElementById('btn-play-again');
  const gameInstruction = document.getElementById('game-instruction');
  const scratchArea = document.getElementById('scratch-card-area');
  const scratchOverlay = document.getElementById('scratch-overlay');
  const scratchWrapper = document.getElementById('scratch-card-wrapper');
  const ticketSelect = document.getElementById('ticket-code-select');
  const addTicketBtn = document.getElementById('btn-add-ticket');

  let isScratchedCurrent = false;

  function resetScratchCardUI() {
    if (winResultBox) winResultBox.style.display = 'none';
    if (scratchOverlay) scratchOverlay.classList.remove('scratched');
    if (gameInstruction) gameInstruction.textContent = 'Tap or swipe the silver card below to scratch and reveal your prize!';
    isScratchedCurrent = false;
  }

  function handleScratchAction() {
    if (isScratchedCurrent) return;

    const user = getCurrentUser();
    const tickets = getUserTickets(user.id);

    if (tickets.length === 0) {
      showToast('No tickets available. Complete a personal goal or group target to earn tickets!', 'warning', 4000);
      return;
    }

    if (!activeTicketId || !tickets.find(t => t.id === activeTicketId)) {
      activeTicketId = tickets[0].id;
    }

    const ticket = tickets.find(t => t.id === activeTicketId) || tickets[0];

    isScratchedCurrent = true;

    // Execute scratch
    const result = scratchTicket(ticket.id, user.id);
    if (!result) {
      showToast('Error scratching ticket. Please refresh.', 'error');
      return;
    }

    const { reward } = result;

    // Populate revealed reward content
    setEl('scratch-prize-icon', reward.icon || 'WIN');
    setEl('scratch-prize-text', reward.prize);
    setEl('scratch-prize-sub', reward.splitDetails || '');
    const tierBadgeEl = document.getElementById('scratch-tier-badge');
    if (tierBadgeEl) {
      tierBadgeEl.innerHTML = `<span class="tier-badge ${reward.badgeClass.replace('win-badge', 'tier-badge')}">${reward.tierLabel}</span>`;
    }

    // Scratch animation
    if (scratchOverlay) scratchOverlay.classList.add('scratched');
    if (gameInstruction) gameInstruction.textContent = 'Scratching... Revealed!';

    setTimeout(() => {
      // Display result box
      if (winBadge) { winBadge.textContent = reward.tierLabel; winBadge.className = `win-badge ${reward.badgeClass}`; }
      if (winTitle) winTitle.textContent = reward.prize;
      if (winPrize) winPrize.textContent = reward.type === 'retail_discount' ? `${reward.discount}% off at ${reward.vendor}` : `Value: ~${fmt(reward.valueZar)}`;
      if (winSplitDetails) winSplitDetails.textContent = reward.splitDetails;

      if (deliveryStatusCard) {
        deliveryStatusCard.style.display = 'block';
        if (deliveryBadge) { deliveryBadge.textContent = 'DELIVERED'; deliveryBadge.className = 'delivery-status-badge delivery-status-badge--delivered'; }
        if (winPhoneText) {
          winPhoneText.textContent = reward.type === 'retail_discount'
            ? `Recipients: All group members (${reward.vendor})`
            : `Recipient: ${user.phone} (MTN MoMo SIM)`;
        }
        if (winSmsText) winSmsText.textContent = generateSmsAlert(reward, user.phone);
      }

      if (winResultBox) winResultBox.style.display = 'block';
      if (gameInstruction) gameInstruction.textContent = 'Congratulations! Your prize has been verified and issued.';

      showToast(`Congratulations! You won: ${reward.prize}!`, 'success', 5000);

      // Refresh tickets list & header
      activeTicketId = null;
      renderGamePage();
      updateHeaderWallet();
    }, 650);
  }

  // Listeners for scratch interaction
  if (scratchWrapper) {
    scratchWrapper.addEventListener('click', handleScratchAction);
    scratchWrapper.addEventListener('touchstart', handleScratchAction, { passive: true });
  }

  // Play again / scratch another button
  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
      resetScratchCardUI();
      const user = getCurrentUser();
      const remaining = getUserTickets(user.id);
      if (remaining.length > 0) {
        activeTicketId = remaining[0].id;
        updateActiveTicketBanner();
      } else {
        showToast('No more tickets available. Complete another goal to earn more!', 'default');
      }
    });
  }

  // Dropdown selector
  if (ticketSelect) {
    ticketSelect.addEventListener('change', () => {
      activeTicketId = ticketSelect.value || null;
      resetScratchCardUI();
      updateActiveTicketBanner();
    });
  }

  // Add demo ticket helper button
  if (addTicketBtn) {
    addTicketBtn.addEventListener('click', () => {
      const user = getCurrentUser();
      // Alternate between personal and group demo cards
      const existing = getUserTickets(user.id);
      const isGroup = existing.length % 2 === 1;
      if (isGroup) {
        issueTicket(user.id, 'group_savings', 'silver', 'demo_group', {
          groupName: 'Family Stokvel',
          memberCount: 4,
          totalPool: 15000
        });
        showToast('Demo Silver Group ticket added! (Retail discount voucher)', 'success');
      } else {
        issueTicket(user.id, 'personal_savings', 'bronze', 'demo_personal');
        showToast('Demo Bronze Personal ticket added! (Airtime/Data)', 'success');
      }
      renderGamePage();
      resetScratchCardUI();
    });
  }
}

/* ================================================
   SHARE MODAL
   ================================================ */
function openShareModal() {
  const modal = document.getElementById('modal-share');
  if (!modal) return;
  const user = getCurrentUser();
  const code = getActiveCode(user);
  const shareUrl = `${window.location.origin}${window.location.pathname}?ref=${code}`;
  const shareText = `Join me on MTN MoMo Prize-Linked Savings! Use my code ${code} to start saving:`;

  const linkInput = document.getElementById('share-link-input');
  if (linkInput) linkInput.value = shareUrl;

  const links = {
    'share-whatsapp': `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
    'share-telegram': `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    'share-x':        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    'share-facebook': `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    'share-sms':      `sms:?body=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
  };
  Object.entries(links).forEach(([id, href]) => {
    const el = document.getElementById(id);
    if (el) el.href = href;
  });

  modal.classList.add('modal-overlay--active');
}

function closeShareModal() {
  const modal = document.getElementById('modal-share');
  if (modal) modal.classList.remove('modal-overlay--active');
}

/* ================================================
   URL REFERRAL DETECTION & ONBOARDING
   ================================================ */
function checkUrlReferral() {
  const params = new URLSearchParams(window.location.search);

  // Group invite link handling: ?joinGroup=GRP-XXXXXX
  const groupJoinCode = params.get('joinGroup');
  if (groupJoinCode) {
    const cleanGroupCode = groupJoinCode.trim().toUpperCase();
    const joinInput = document.getElementById('join-group-code');
    if (joinInput) joinInput.value = cleanGroupCode;
    openModal('modal-join-group');
    showToast(`Joining group code: ${cleanGroupCode}`, 'default', 4000);
    clearUrlParams();
    return;
  }

  const refCode = params.get('ref') || params.get('code');
  if (!refCode) return;

  const user = getCurrentUser();
  const normalized = normalizeCode(refCode);

  const codes = getReferralCodes();
  const entry = codes[normalized];
  if (entry && entry.userId === user.id) { clearUrlParams(); return; }
  if (getReferrals().some(r => r.referredId === user.id)) { clearUrlParams(); return; }

  const welcomeModal = document.getElementById('modal-welcome');
  const welcomeCode  = document.getElementById('welcome-referral-code');
  if (welcomeModal && welcomeCode) {
    welcomeCode.textContent = normalized;
    welcomeModal.classList.add('modal-overlay--active');

    // CTA 1: Download MTN MoMo App
    const downloadBtn = document.getElementById('btn-welcome-download');
    if (downloadBtn) {
      const nbDownload = downloadBtn.cloneNode(true);
      downloadBtn.parentNode.replaceChild(nbDownload, downloadBtn);
      nbDownload.addEventListener('click', () => {
        // Detect OS or redirect to MTN MoMo App store page
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const storeUrl = isIOS
          ? 'https://apps.apple.com/za/app/mtn-momo-south-africa/id1494883464'
          : 'https://play.google.com/store/apps/details?id=za.co.mtn.momo';
        window.open(storeUrl, '_blank', 'noopener');
        showToast('Redirecting to MTN MoMo in the App Store...', 'default');
      });
    }

    // CTA 2: Register / Sign Up with Referral Code
    const signupBtn = document.getElementById('btn-welcome-signup');
    if (signupBtn) {
      const nbSignup = signupBtn.cloneNode(true);
      signupBtn.parentNode.replaceChild(nbSignup, signupBtn);
      nbSignup.addEventListener('click', () => {
        welcomeModal.classList.remove('modal-overlay--active');
        openRegisterModal(normalized);
      });
    }

    // Secondary CTA / Close: Maybe Later
    const closeBtn = document.getElementById('btn-close-welcome-modal');
    if (closeBtn) {
      const nc = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(nc, closeBtn);
      nc.addEventListener('click', () => {
        welcomeModal.classList.remove('modal-overlay--active');
        clearUrlParams();
      });
    }
  }
}

function openRegisterModal(prefillCode) {
  const regModal = document.getElementById('modal-register');
  const regCodeInput = document.getElementById('reg-referral-code');
  if (regCodeInput) regCodeInput.value = prefillCode || '';
  if (regModal) regModal.classList.add('modal-overlay--active');
}

function closeRegisterModal() {
  const regModal = document.getElementById('modal-register');
  if (regModal) regModal.classList.remove('modal-overlay--active');
}

function handleRegistrationWithCode() {
  const nameInput = document.getElementById('reg-full-name');
  const phoneInput = document.getElementById('reg-phone-number');
  const codeInput = document.getElementById('reg-referral-code');

  const fullName = nameInput?.value.trim() || 'MoMo User';
  const phone = phoneInput?.value.trim() || '083' + Math.floor(1000000 + Math.random() * 9000000);
  const rawCode = codeInput?.value.trim();

  // Create new registered user
  const newUser = {
    id: 'usr_' + Math.random().toString(36).slice(2, 10),
    phone: phone,
    name: fullName,
    createdAt: new Date().toISOString(),
  };
  save(KEYS.USER, newUser);

  // Auto issue initial referral code for this new user
  generateReferralCode(newUser.id, phone.slice(-4));

  // Automatically bind to the referrer
  let bindResult = null;
  if (rawCode) {
    bindResult = submitReferralCode(rawCode, newUser);
  }

  closeRegisterModal();
  clearUrlParams();
  updateAllUI();

  if (bindResult && bindResult.ok) {
    showToast(`Welcome, ${fullName}! Account created and bound to code ${normalizeCode(rawCode)}.`, 'success', 5000);
  } else if (bindResult) {
    showToast(`Account registered for ${fullName}! Note: ${bindResult.msg}`, 'warning', 4000);
  } else {
    showToast(`Welcome to Prized Linked Savings, ${fullName}!`, 'success');
  }
}

function clearUrlParams() {
  const url = new URL(window.location);
  url.searchParams.delete('ref');
  url.searchParams.delete('code');
  url.searchParams.delete('joinGroup');
  window.history.replaceState({}, document.title, url.pathname + (url.search === '?' ? '' : url.search));
}

/* ================================================
   HELPER: Set element content
   ================================================ */
function setEl(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

/* ================================================
   NAVIGATION DRAWER
   ================================================ */
function setupDrawer() {
  const navDrawer = document.getElementById('nav-drawer');
  const openBtn   = document.getElementById('btn-open-menu');
  const closeBtn  = document.getElementById('btn-close-menu');
  const overlay   = document.getElementById('drawer-overlay');

  const open  = () => navDrawer?.classList.add('nav-drawer--active');
  const close = () => navDrawer?.classList.remove('nav-drawer--active');

  if (openBtn)  openBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (overlay)  overlay.addEventListener('click', close);
}

/* ================================================
   MODAL EVENT BINDINGS
   ================================================ */
function setupModals() {
  const user = getCurrentUser();

  // --- Transfer Funds to Savings (Home) ---
  const addFundsModal       = document.getElementById('modal-add-funds');
  const addFundsAmountEl    = document.getElementById('add-funds-amount');
  const addFundsTypeEl      = document.getElementById('add-funds-destination-type');
  const addFundsTargetEl    = document.getElementById('add-funds-target-select');
  const addFundsTargetLbl   = document.getElementById('add-funds-target-label');
  const addFundsAvailHint   = document.getElementById('add-funds-wallet-available');

  function populateAddFundsTargets() {
    if (!addFundsTargetEl || !addFundsTypeEl) return;
    const destType = addFundsTypeEl.value;
    const user = getCurrentUser();

    if (addFundsAvailHint) {
      addFundsAvailHint.textContent = `Available in MoMo Wallet: ${fmt(getWalletBalance())}`;
    }

    if (destType === 'personal') {
      if (addFundsTargetLbl) addFundsTargetLbl.textContent = 'Select Personal Goal';
      const goals = getGoals().filter(g => g.userId === user.id && !g.isCompleted && !g.isWithdrawnEarly);
      if (goals.length === 0) {
        addFundsTargetEl.innerHTML = '<option value="" disabled selected>No active goals — create one first!</option>';
      } else {
        addFundsTargetEl.innerHTML = goals.map(g => `<option value="${g.id}">${g.name} (${fmt(g.currentBalance)} / ${fmt(g.targetAmount)})</option>`).join('');
      }
    } else {
      if (addFundsTargetLbl) addFundsTargetLbl.textContent = 'Select Group / Stokvel';
      const groups = getGroups().filter(g => g.members.some(m => m.userId === user.id) && !g.isCompleted && !g.isWithdrawnEarly);
      if (groups.length === 0) {
        addFundsTargetEl.innerHTML = '<option value="" disabled selected>No active groups — join or create one first!</option>';
      } else {
        addFundsTargetEl.innerHTML = groups.map(g => `<option value="${g.id}">${g.name} (${fmt(g.pooledBalance)} / ${fmt(g.targetAmount)})</option>`).join('');
      }
    }
  }

  addFundsTypeEl?.addEventListener('change', populateAddFundsTargets);

  window.showAddFundsModal = function() {
    populateAddFundsTargets();
    if (addFundsAmountEl) addFundsAmountEl.value = '';
    openModal('modal-add-funds');
  };

  document.getElementById('btn-close-add-funds')?.addEventListener('click',  () => closeModal('modal-add-funds'));
  document.getElementById('btn-cancel-add-funds')?.addEventListener('click', () => closeModal('modal-add-funds'));

  document.getElementById('btn-confirm-add-funds')?.addEventListener('click', () => {
    const amount = parseFloat(addFundsAmountEl?.value || 0);
    const destType = addFundsTypeEl?.value || 'personal';
    const targetId = addFundsTargetEl?.value;

    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount to transfer.', 'warning');
      return;
    }
    if (!targetId) {
      showToast('Please select a target goal or group.', 'warning');
      return;
    }

    const walletBal = getWalletBalance();
    if (amount > walletBal) {
      showToast(`Insufficient MoMo wallet balance. Available: ${fmt(walletBal)}`, 'warning');
      return;
    }

    if (destType === 'personal') {
      const res = depositToGoal(targetId, amount, user.id);
      if (!res.ok) { showToast(res.msg, 'error'); return; }
      showToast(`Successfully transferred ${fmt(amount)} from MoMo wallet to your personal goal!`, 'success');
    } else {
      const res = depositToGroup(targetId, amount, user.id);
      if (!res.ok) { showToast(res.msg, 'error'); return; }
      showToast(`Successfully transferred ${fmt(amount)} from MoMo wallet to group pool!`, 'success');
      if (res.completionMsg) setTimeout(() => showToast(res.completionMsg, 'success', 5000), 500);
    }

    closeModal('modal-add-funds');
    updateAllUI();
  });

  if (addFundsModal) addFundsModal.addEventListener('click', e => { if (e.target === addFundsModal) closeModal('modal-add-funds'); });

  // --- Personal Goal Creation ---
  const goalNameEl     = document.getElementById('goal-name');
  const goalTargetEl   = document.getElementById('goal-target');
  const goalMonthsEl   = document.getElementById('goal-months');
  const goalMonthlyEl  = document.getElementById('goal-monthly');
  const goalInitialEl  = document.getElementById('goal-initial');
  const tierPreviewEl  = document.getElementById('goal-tier-preview');
  const yieldPreview   = document.getElementById('goal-yield-preview');
  const projTotalEl    = document.getElementById('goal-projected-total');
  const projInterestEl = document.getElementById('goal-projected-interest');

  function updateGoalPreview() {
    const target  = parseFloat(goalTargetEl?.value || 0);
    const months  = parseInt(goalMonthsEl?.value || 12);
    const initial = parseFloat(goalInitialEl?.value || 0);
    if (goalMonthlyEl) goalMonthlyEl.value = target > 0 ? Math.ceil(Math.max(0, target - initial) / months) : '';
    if (tierPreviewEl) {
      const tier = getGoalTier(target);
      tierPreviewEl.innerHTML = tier !== 'none'
        ? `<span class="tier-badge ${tierBadgeClass(tier)}">${tierLabel(tier)}</span>`
        : '(below R1,000 minimum)';
    }
    if (target >= 1000 && yieldPreview) {
      yieldPreview.style.display = 'block';
      const effectiveRate = 3.75 / 100;
      const interest = target * effectiveRate * (months / 12);
      if (projTotalEl)    projTotalEl.textContent    = fmt(target + interest);
      if (projInterestEl) projInterestEl.textContent = fmt(interest);
    } else if (yieldPreview) {
      yieldPreview.style.display = 'none';
    }
  }

  goalTargetEl?.addEventListener('input', updateGoalPreview);
  goalMonthsEl?.addEventListener('change', updateGoalPreview);
  goalInitialEl?.addEventListener('input', updateGoalPreview);

  document.getElementById('btn-create-personal-goal')?.addEventListener('click', () => openModal('modal-personal-goal'));
  document.getElementById('btn-close-personal-goal')?.addEventListener('click',  () => closeModal('modal-personal-goal'));
  document.getElementById('btn-cancel-personal-goal')?.addEventListener('click', () => closeModal('modal-personal-goal'));
  document.getElementById('modal-personal-goal')?.addEventListener('click', e => { if (e.target.id === 'modal-personal-goal') closeModal('modal-personal-goal'); });

  document.getElementById('btn-confirm-personal-goal')?.addEventListener('click', () => {
    const name    = goalNameEl?.value.trim();
    const target  = parseFloat(goalTargetEl?.value || 0);
    const months  = parseInt(goalMonthsEl?.value || 12);
    const initial = parseFloat(goalInitialEl?.value || 0);

    if (!name)          { showToast('Please enter a goal name.', 'warning'); return; }
    if (target < 1000)  { showToast('Minimum goal target is R1,000.', 'warning'); return; }
    if (months < 3)     { showToast('Minimum lock-up period is 3 months.', 'warning'); return; }
    if (initial > getWalletBalance()) { showToast(`Insufficient wallet balance. Available: ${fmt(getWalletBalance())}`, 'warning'); return; }

    createGoal(user.id, name, target, months, initial);
    showToast(`Goal "${name}" created! ${initial > 0 ? fmt(initial) + ' deposited.' : ''}`, 'success');
    if (goalNameEl)    goalNameEl.value    = '';
    if (goalTargetEl)  goalTargetEl.value  = '';
    if (goalMonthsEl)  goalMonthsEl.value  = '12';
    if (goalInitialEl) goalInitialEl.value = '';
    closeModal('modal-personal-goal');
    updateAllUI();
  });

  // --- Goal Deposit ---
  document.getElementById('btn-close-goal-deposit')?.addEventListener('click',  () => closeModal('modal-goal-deposit'));
  document.getElementById('btn-cancel-goal-deposit')?.addEventListener('click', () => closeModal('modal-goal-deposit'));
  document.getElementById('btn-confirm-goal-deposit')?.addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('deposit-amount')?.value || 0);
    if (!amount || amount <= 0) { showToast('Enter a valid deposit amount.', 'warning'); return; }
    const result = depositToGoal(_goalDepositTarget, amount, user.id);
    if (!result.ok) { showToast(result.msg, 'error'); return; }
    showToast(`${fmt(amount)} deposited! 💰`, 'success');
    if (result.completionMsg) setTimeout(() => showToast(result.completionMsg, 'success', 5000), 500);
    closeModal('modal-goal-deposit');
    updateAllUI();
  });

  // --- Goal Withdraw ---
  document.getElementById('btn-close-goal-withdraw')?.addEventListener('click',  () => closeModal('modal-goal-withdraw'));
  document.getElementById('btn-cancel-goal-withdraw')?.addEventListener('click', () => closeModal('modal-goal-withdraw'));
  document.getElementById('btn-confirm-goal-withdraw')?.addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('withdraw-amount')?.value || 0);
    if (!amount || amount <= 0) { showToast('Enter a valid withdrawal amount.', 'warning'); return; }
    const result = withdrawFromGoal(_goalWithdrawTarget, amount, user.id);
    if (!result.ok) { showToast(result.msg, 'error'); return; }
    if (result.isEarly) {
      showToast(`⚠️ ${fmt(amount)} withdrawn. Interest & scratch cards forfeited (early withdrawal).`, 'warning', 5000);
    } else {
      showToast(`${fmt(amount)} returned to your wallet.`, 'success');
    }
    closeModal('modal-goal-withdraw');
    updateAllUI();
  });

  // --- Create Group ---
  const groupNameEl    = document.getElementById('group-name');
  const groupTargetEl  = document.getElementById('group-target');
  const groupTierPrvEl = document.getElementById('group-tier-preview');
  const groupDurEl     = document.getElementById('group-duration');
  const groupInitEl    = document.getElementById('group-initial');

  function updateGroupPreview() {
    const target = parseFloat(groupTargetEl?.value || 0);
    if (groupTierPrvEl) {
      const tier = getGroupTier(target);
      const discounts = { gold: '20%', silver: '10%', bronze: '5%', none: 'Below minimum' };
      groupTierPrvEl.textContent = discounts[tier];
    }
  }
  groupTargetEl?.addEventListener('input', updateGroupPreview);

  document.getElementById('btn-create-group')?.addEventListener('click', () => openModal('modal-create-group'));
  document.getElementById('btn-close-create-group')?.addEventListener('click',  () => closeModal('modal-create-group'));
  document.getElementById('btn-cancel-create-group')?.addEventListener('click', () => closeModal('modal-create-group'));
  document.getElementById('modal-create-group')?.addEventListener('click', e => { if (e.target.id === 'modal-create-group') closeModal('modal-create-group'); });

  document.getElementById('btn-confirm-create-group')?.addEventListener('click', () => {
    const name    = groupNameEl?.value.trim();
    const reason  = document.getElementById('group-reason')?.value || 'School & University Fees';
    const target  = parseFloat(groupTargetEl?.value || 0);
    const months  = parseInt(groupDurEl?.value || 6);
    const initial = parseFloat(groupInitEl?.value || 0);

    if (!name)         { showToast('Please enter a group name.', 'warning'); return; }
    if (target < 1000) { showToast('Minimum pool target is R1,000.', 'warning'); return; }
    if (initial > getWalletBalance()) { showToast(`Insufficient wallet balance. Available: ${fmt(getWalletBalance())}`, 'warning'); return; }

    const group = createGroup(user.id, name, target, months, initial, reason);
    showToast(`Group "${name}" created! Code: ${group.code}`, 'success', 5000);
    if (groupNameEl)   groupNameEl.value   = '';
    if (groupTargetEl) groupTargetEl.value = '';
    if (groupInitEl)   groupInitEl.value   = '';
    closeModal('modal-create-group');
    updateAllUI();

    // Automatically open code popup so user can immediately invite or copy code
    setTimeout(() => openGroupCodePopup(group.id), 400);
  });

  // --- Group Code & Invite Popup Controls ---
  document.getElementById('btn-close-group-code')?.addEventListener('click', () => closeModal('modal-group-code'));
  document.getElementById('btn-popup-close-code')?.addEventListener('click', () => closeModal('modal-group-code'));
  document.getElementById('modal-group-code')?.addEventListener('click', e => {
    if (e.target.id === 'modal-group-code') closeModal('modal-group-code');
  });

  // Option 1: Copy Code
  document.getElementById('btn-popup-copy-code')?.addEventListener('click', () => {
    if (!_activeGroupForCode) return;
    const directUrl = `${window.location.origin}/savings.html?joinGroup=${_activeGroupForCode.code}`;
    navigator.clipboard.writeText(_activeGroupForCode.code)
      .then(() => showToast(`Group code ${_activeGroupForCode.code} copied! Share link: ${directUrl}`, 'success', 5000))
      .catch(() => showToast(`Code: ${_activeGroupForCode.code}`, 'default'));
  });

  // Option 2: Send Direct Invite by Number
  document.getElementById('btn-popup-send-invite')?.addEventListener('click', () => {
    if (!_activeGroupForCode) return;
    const phoneInput = document.getElementById('popup-invite-phone');
    const statusEl = document.getElementById('popup-invite-status');
    const rawPhone = (phoneInput?.value || '').trim();

    if (!rawPhone || rawPhone.length < 9) {
      if (statusEl) { statusEl.textContent = 'Please enter a valid MTN mobile number.'; statusEl.className = 'enter-code-status text-danger'; }
      showToast('Enter a valid mobile number.', 'warning');
      return;
    }

    const inviteLink = `${window.location.origin}/savings.html?joinGroup=${_activeGroupForCode.code}`;
    const smsMessage = `MTN MoMo: You have been invited to join the '${_activeGroupForCode.name}' savings group (${_activeGroupForCode.reason}). Join using code: ${_activeGroupForCode.code} or link: ${inviteLink}`;

    if (statusEl) {
      statusEl.textContent = `Invite alert sent to ${rawPhone}! Direct link attached.`;
      statusEl.className = 'enter-code-status text-success';
    }

    showToast(`Invite alert dispatched to ${rawPhone}!`, 'success', 5000);
    console.log(`[SMS Gateway Mock] Dispatched to ${rawPhone}: "${smsMessage}"`);
    if (phoneInput) phoneInput.value = '';
  });

  // --- Join Group ---
  document.getElementById('btn-join-group')?.addEventListener('click', () => openModal('modal-join-group'));
  document.getElementById('btn-close-join-group')?.addEventListener('click',  () => closeModal('modal-join-group'));
  document.getElementById('btn-cancel-join-group')?.addEventListener('click', () => closeModal('modal-join-group'));
  document.getElementById('modal-join-group')?.addEventListener('click', e => { if (e.target.id === 'modal-join-group') closeModal('modal-join-group'); });

  document.getElementById('btn-confirm-join-group')?.addEventListener('click', () => {
    const code = document.getElementById('join-group-code')?.value.trim();
    const amount = parseFloat(document.getElementById('join-group-contribution')?.value || 0);
    const statusEl = document.getElementById('join-group-status');

    if (!code) { showToast('Enter a group code.', 'warning'); return; }
    if (!amount || amount <= 0) { showToast('Enter your contribution amount.', 'warning'); return; }

    const result = joinGroup(user.id, code, amount);
    if (!result.ok) {
      if (statusEl) { statusEl.textContent = result.msg; statusEl.className = 'enter-code-status text-danger'; }
      return;
    }
    showToast(`Joined "${result.group.name}"! ${fmt(amount)} contributed.`, 'success');
    closeModal('modal-join-group');
    updateAllUI();
  });

  // --- Group Deposit ---
  document.getElementById('btn-close-group-deposit')?.addEventListener('click',  () => closeModal('modal-group-deposit'));
  document.getElementById('btn-cancel-group-deposit')?.addEventListener('click', () => closeModal('modal-group-deposit'));
  document.getElementById('btn-confirm-group-deposit')?.addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('group-deposit-amount')?.value || 0);
    if (!amount || amount <= 0) { showToast('Enter a valid amount.', 'warning'); return; }
    const result = depositToGroup(_groupDepositTarget, amount, user.id);
    if (!result.ok) { showToast(result.msg, 'error'); return; }
    showToast(`${fmt(amount)} contributed to group!`, 'success');
    if (result.completionMsg) setTimeout(() => showToast(result.completionMsg, 'success', 5000), 500);
    closeModal('modal-group-deposit');
    updateAllUI();
  });

  // --- Referral Submit ---
  document.getElementById('btn-submit-code')?.addEventListener('click', () => {
    const input = document.getElementById('input-referral-code');
    const statusEl = document.getElementById('enter-code-status');
    if (!input?.value.trim()) return;
    const result = submitReferralCode(input.value, user);
    if (statusEl) {
      statusEl.textContent = result.msg;
      statusEl.className = `enter-code-status ${result.ok ? 'text-success' : 'text-danger'}`;
    }
    if (result.ok) { input.value = ''; renderReferralsPage(); }
  });

  // --- Copy referral code ---
  document.getElementById('btn-copy-code')?.addEventListener('click', () => {
    const codeEl = document.getElementById('my-referral-code');
    if (codeEl) navigator.clipboard.writeText(codeEl.textContent)
      .then(() => showToast('Code copied!', 'success'))
      .catch(() => showToast('Copy failed — please copy manually.', 'warning'));
  });

  // --- Share modal ---
  document.getElementById('btn-share-code')?.addEventListener('click', e => { e.preventDefault(); openShareModal(); });
  document.getElementById('btn-close-share-modal')?.addEventListener('click', closeShareModal);
  document.getElementById('modal-share')?.addEventListener('click', e => { if (e.target.id === 'modal-share') closeShareModal(); });

  // --- Copy share link ---
  document.getElementById('btn-copy-share-link')?.addEventListener('click', () => {
    const linkInput = document.getElementById('share-link-input');
    if (linkInput) navigator.clipboard.writeText(linkInput.value)
      .then(() => showToast('Link copied!', 'success'))
      .catch(() => showToast('Copy failed.', 'warning'));
  });

  // --- Welcome modal (from referrals page) ---
  document.getElementById('btn-close-welcome-modal')?.addEventListener('click', () => closeModal('modal-welcome'));

  // --- Register modal bindings ---
  document.getElementById('btn-close-register-modal')?.addEventListener('click', closeRegisterModal);
  document.getElementById('btn-cancel-register')?.addEventListener('click', closeRegisterModal);
  document.getElementById('btn-confirm-register')?.addEventListener('click', handleRegistrationWithCode);
  document.getElementById('modal-register')?.addEventListener('click', e => {
    if (e.target.id === 'modal-register') closeRegisterModal();
  });
}


/* ================================================
   BOOT
   ================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();

  // Ensure user has an active referral code
  getActiveCode(user);

  // Setup navigation drawer
  setupDrawer();

  // Setup modal events
  setupModals();

  // Setup game page interactions
  setupGamePage();

  // Render all UI
  updateAllUI();

  // Check for incoming referral URL param
  checkUrlReferral();

  console.log('🚀 MTN MoMo Prize-Linked Savings — loaded');
  console.log(`👤 User: ${user.id} | Phone: ${user.phone}`);
  console.log(`💰 Wallet: ${fmt(getWalletBalance())} | Tickets: ${getUserTickets(user.id).length}`);
});
