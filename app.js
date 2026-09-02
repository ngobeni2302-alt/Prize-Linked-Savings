/* ================================================
   MTN MoMo Enhanced Mini App - JavaScript
   Page navigation and placeholder interactions
   ================================================ */

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
  });
}


// --- Ticket Code Selector & Active Pool UI ---
const ticketCodeSelect = document.getElementById('ticket-code-select');
const activePoolTypeEl = document.getElementById('active-pool-type');
const activeTicketTextEl = document.getElementById('active-ticket-text');

function updateActiveTicketInfo() {
  if (!ticketCodeSelect) return;
  const selectedOpt = ticketCodeSelect.options[ticketCodeSelect.selectedIndex];
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
  updateActiveTicketInfo();
}


// --- Combined Reward Pools & Reduced Probability Engine (-50% Win Rate) ---

// 1. INDIVIDUAL POOL (IND-xxxx) - Total Win Rate: ~50.00005%
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

// 2. GROUP POOL (GRP-xxxx) - Total Win Rate: ~50.0%
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
    // INDIVIDUAL POOL
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

function generateSmsAlert(reward, phone = "+27 83 *** 4921") {
  if (!reward.isWin) {
    return `"MTN MoMo: No prize drawn for code ${reward.code}. Better luck next time!"`;
  }

  if (reward.type === "GRP") {
    return `"MTN MoMo Group Alert: You won ${reward.prize}! ${reward.splitDetails}. SMS alerts sent to all members."`;
  }

  if (reward.category.includes("Data")) {
    return `"MTN MoMo Alert: ${reward.prize} has been credited to ${phone}. Valid for 30 days. Ref: ${reward.code}."`;
  } else if (reward.category.includes("Airtime")) {
    return `"MTN MoMo Alert: ${reward.prize} top-up successful for ${phone}. Ref: ${reward.code}."`;
  } else if (reward.category.includes("Minutes")) {
    return `"MTN MoMo Alert: ${reward.prize} voice minutes added to ${phone}. Ref: ${reward.code}."`;
  } else if (reward.category.includes("Fee Waiver")) {
    return `"MTN MoMo Alert: ${reward.prize} activated on ${phone}. Enjoy 0 fees for 30 days!"`;
  } else {
    return `"MTN MoMo Voucher Alert: ${reward.prize} has been deposited into your MoMo Wallet and sent via SMS to ${phone}. Ref: ${reward.code}."`;
  }
}

// --- The Ruler 3-Card Rewards Game ---
const gameCards = document.querySelectorAll('.game-card');
const winResultBox = document.getElementById('win-result-box');
const winBadge = document.getElementById('win-badge');
const winTitle = document.getElementById('win-title');
const winPrize = document.getElementById('win-prize');
const winSplitDetails = document.getElementById('win-split-details');
const deliveryStatusCard = document.getElementById('delivery-status-card');
const deliveryStatusBadge = document.getElementById('delivery-status-badge');
const winPhoneText = document.getElementById('win-phone-text');
const winSmsText = document.getElementById('win-sms-text');
const playAgainBtn = document.getElementById('btn-play-again');
const prizeHistoryList = document.getElementById('prize-history-list');
const gameInstruction = document.getElementById('game-instruction');

let gameActive = true;

gameCards.forEach(card => {
  card.addEventListener('click', () => {
    if (!gameActive) return;

    if (availableTickets <= 0) {
      alert("No tickets remaining! Click '+ Add Ticket (Demo)' or save money to earn more tickets.");
      return;
    }

    if (card.classList.contains('game-card--flipped')) return;

    gameActive = false;

    // Deduct ticket
    availableTickets--;
    saveAvailableTickets();
    updateTicketUI();

    // Get current ticket code selection
    const selectedOpt = ticketCodeSelect ? ticketCodeSelect.options[ticketCodeSelect.selectedIndex] : null;
    const ticketCode = selectedOpt ? selectedOpt.value : "IND-8492";
    const type = selectedOpt ? selectedOpt.getAttribute('data-type') : "IND";
    const groupName = selectedOpt ? selectedOpt.getAttribute('data-name') : "Default Pool";
    const groupMembers = selectedOpt ? parseInt(selectedOpt.getAttribute('data-members') || "5", 10) : 5;

    // Draw reward using Backend Ruler flow
    const reward = drawRulerReward(ticketCode, type, groupName, groupMembers);

    // Update card back text
    const backText = card.querySelector('.reward-text');
    if (backText) backText.textContent = reward.isWin ? (reward.type === "GRP" ? "GROUP WIN" : "WIN") : "NO PRIZE";

    // Flip card
    card.classList.add('game-card--flipped');

    // Disable other unpicked cards
    gameCards.forEach(c => {
      if (c !== card) c.disabled = true;
    });

    // Reveal result box after flip animation
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
          const smsMessage = generateSmsAlert(reward, "+27 83 *** 4921");

          if (deliveryStatusBadge) {
            deliveryStatusBadge.textContent = "DELIVERED";
            deliveryStatusBadge.className = "delivery-status-badge delivery-status-badge--delivered";
          }
          if (winPhoneText) {
            winPhoneText.textContent = reward.type === "GRP" 
              ? `Recipients: Group '${groupName}' (${groupMembers} MoMo Wallets & Phones)`
              : `Recipient: +27 83 *** 4921 (MTN MoMo Wallet & SIM)`;
          }
          if (winSmsText) {
            winSmsText.textContent = smsMessage;
          }
        } else {
          deliveryStatusCard.style.display = 'none';
        }
      }

      if (winResultBox) winResultBox.style.display = 'block';

      if (gameInstruction) {
        gameInstruction.textContent = reward.isWin 
          ? "Congratulations! Reward credited & SMS alert sent."
          : "No prize drawn this time for code " + reward.code + ". Try again on your next ticket!";
      }

      // Add to Prize History
      addPrizeToHistory(reward);
    }, 600);
  });
});

function addPrizeToHistory(reward) {
  if (!prizeHistoryList) return;

  const emptyMsg = document.getElementById('prize-history-empty');
  if (emptyMsg) emptyMsg.remove();

  const item = document.createElement('div');
  item.className = 'activity-item';
  
  if (reward.isWin) {
    item.innerHTML = `
      <span class="activity-desc"><strong>[${reward.code}] ${reward.tier}:</strong> ${reward.prize} <br><small style="color:#666;">${reward.splitDetails}</small></span>
      <span class="activity-amount" style="color: #004f71; font-weight:700;">WON</span>
    `;
  } else {
    item.innerHTML = `
      <span class="activity-desc"><strong>[${reward.code}] NO WIN:</strong> ${reward.category}</span>
      <span class="activity-amount" style="color: #888; font-weight:600;">TRY AGAIN</span>
    `;
  }
  
  prizeHistoryList.prepend(item);
}

if (playAgainBtn) {
  playAgainBtn.addEventListener('click', () => {
    // Reset cards
    gameCards.forEach(card => {
      card.classList.remove('game-card--flipped');
      card.disabled = false;
    });

    if (winResultBox) winResultBox.style.display = 'none';
    if (gameInstruction) gameInstruction.textContent = 'Choose 1 of the 3 cards to draw your reward ticket!';

    gameActive = true;
  });
}


// --- Referral System (single-use codes, random suffix, dual ticket rewards) ---
const REFCODE_KEY   = 'momo_referral_codes'; // { code: { userId, last4, status } } status: 'active' | 'used'
const REFERRAL_KEY  = 'momo_referrals';       // [{ code, referrerId, referredId, status, createdAt, completedAt }]
const TICKETS_KEY   = 'momo_tickets';         // { userId: count }
const CURRENT_USER_KEY = 'momo_current_user';

function getCurrentUser() {
  let user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
  if (!user) {
    user = { id: 'user_' + Math.random().toString(36).slice(2, 8), phone: '0821234521' };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }
  return user;
}

function getReferralCodes() { return JSON.parse(localStorage.getItem(REFCODE_KEY) || '{}'); }
function saveReferralCodes(c) { localStorage.setItem(REFCODE_KEY, JSON.stringify(c)); }
function getReferrals() { return JSON.parse(localStorage.getItem(REFERRAL_KEY) || '[]'); }
function saveReferrals(r) { localStorage.setItem(REFERRAL_KEY, JSON.stringify(r)); }

function randomSuffix() {
  return String(Math.floor(Math.random() * 1000)).padStart(3, '0');
}

// Creates a brand new single-use code for this user (called at signup, on refresh, and after each completed referral)
function createNewReferralCode(userId, last4) {
  const codes = getReferralCodes();
  // Retire any previous active codes of this user so only the new one is display-active,
  // but keep them in the database so they still work if entered by a referred friend.
  Object.values(codes).forEach(entry => {
    if (entry.userId === userId && entry.status === 'active') {
      entry.status = 'retired';
    }
  });

  let code;
  do {
    code = `MOMO-${last4}-${randomSuffix()}`;
  } while (codes[code]); // guarantee uniqueness even on random collision
  codes[code] = { userId, last4, status: 'active' };
  saveReferralCodes(codes);
  return code;
}

// Returns the user's current active code, generating one if they don't have one
function getActiveReferralCode(user) {
  const codes = getReferralCodes();
  const active = Object.entries(codes).find(([, v]) => v.userId === user.id && v.status === 'active');
  if (active) return active[0];
  return createNewReferralCode(user.id, user.phone.slice(-4));
}

function normalizeCode(input) {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

function submitReferralCode(rawCode, user) {
  const statusEl = document.getElementById('enter-code-status');
  const code = normalizeCode(rawCode);
  const codes = getReferralCodes();
  let entry = codes[code];

  if (statusEl) statusEl.classList.remove('text-danger');

  // For demo/testing across different browsers/machines where codes are not in the local database:
  // If the code has the MOMO prefix format, auto-simulate/register it so it works!
  if (!entry && code.startsWith('MOMO-')) {
    const parts = code.split('-');
    entry = {
      userId: 'user_referrer_' + Math.random().toString(36).slice(2, 8),
      last4: parts[1] || '0000',
      status: 'active'
    };
    codes[code] = entry;
    saveReferralCodes(codes);
  }

  if (!entry) {
    if (statusEl) {
      statusEl.textContent = "That code doesn't look right — double check with whoever sent it.";
      statusEl.classList.add('text-danger');
    }
    return;
  }
  if (entry.status === 'used') {
    if (statusEl) {
      statusEl.textContent = "This code has already been used.";
      statusEl.classList.add('text-danger');
    }
    return;
  }
  if (entry.userId === user.id) {
    if (statusEl) {
      statusEl.textContent = "You can't use your own code.";
      statusEl.classList.add('text-danger');
    }
    return;
  }
  if (getReferrals().some(r => r.referredId === user.id)) {
    if (statusEl) {
      statusEl.textContent = "You've already linked a referral code.";
      statusEl.classList.add('text-danger');
    }
    return;
  }

  // Lock the code — single use, forever
  entry.status = 'used';
  codes[code] = entry;
  saveReferralCodes(codes);

  const referrals = getReferrals();
  referrals.push({
    code,
    referrerId: entry.userId,
    referredId: user.id,
    status: 'linked',      // -> 'completed' once first deposit clears
    createdAt: new Date().toISOString(),
    completedAt: null
  });
  saveReferrals(referrals);

  if (statusEl) {
    statusEl.textContent = 'Code applied! Make your first deposit to unlock tickets for you both.';
  }
  const inputEl = document.getElementById('input-referral-code');
  if (inputEl) inputEl.value = '';
}

function awardTicket(userId) {
  const tickets = JSON.parse(localStorage.getItem(TICKETS_KEY) || '{}');
  tickets[userId] = (tickets[userId] || 0) + 1;
  localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
}

function getTicketCount(userId) {
  const tickets = JSON.parse(localStorage.getItem(TICKETS_KEY) || '{}');
  return tickets[userId] || 0;
}

// Call this from your Collections API success callback, once the recipient's
// first deposit into a PLS pocket clears.
function completeReferral(referredUserId) {
  const referrals = getReferrals();
  const r = referrals.find(r => r.referredId === referredUserId && r.status === 'linked');
  if (!r) return; // no pending referral for this user — nothing to do

  r.status = 'completed';
  r.completedAt = new Date().toISOString();
  saveReferrals(referrals);

  awardTicket(r.referrerId);
  awardTicket(r.referredId);

  // Referrer's spent code stays retired; generate them a fresh one automatically
  const codes = getReferralCodes();
  const codeEntry = codes[r.code];
  const last4 = codeEntry ? codeEntry.last4 : '0000';
  createNewReferralCode(r.referrerId, last4);
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
  if (labelEl) labelEl.textContent = `${verifiedCount} / 10 verified referrals to earn a bonus ticket`;

  const ticketCount = getTicketCount(user.id);
  const ticketCountEl = document.getElementById('my-ticket-count');
  if (ticketCountEl) {
    ticketCountEl.textContent = `You have ${ticketCount} ticket${ticketCount === 1 ? '' : 's'}`;
  }

  const listEl = document.getElementById('referral-list');
  if (listEl) {
    if (referrals.length === 0) {
      listEl.innerHTML = `<div class="activity-item"><span class="activity-desc">No referrals yet</span><span class="activity-amount">--</span></div>`;
    } else {
      listEl.innerHTML = referrals.map(r => {
        const badge = r.status === 'completed' 
          ? '<span class="status-badge status-badge--verified">Verified · +1 Ticket</span>' 
          : '<span class="status-badge status-badge--pending">Pending Deposit</span>';
        const date = new Date(r.createdAt).toLocaleDateString();
        return `<div class="referral-list-item">
          <div class="referral-info">
            <span class="referral-avatar">👤</span>
            <div>
              <span class="activity-desc">Invited Friend</span>
              <span class="referral-date">Sent on ${date}</span>
            </div>
          </div>
          <span class="activity-amount">${badge}</span>
        </div>`;
      }).join('');
    }
  }
}

// --- Copy Referral Code ---
const copyBtn = document.getElementById('btn-copy-code');
if (copyBtn) {
  copyBtn.addEventListener('click', () => {
    const codeEl = document.getElementById('my-referral-code');
    if (codeEl) {
      navigator.clipboard.writeText(codeEl.textContent).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy Code'; }, 1500);
      }).catch(() => {});
    }
  });
}

// --- Share Modal Dialog Trigger ---
const shareBtn = document.getElementById('btn-share-code');
const shareModal = document.getElementById('modal-share');
const closeShareModalBtn = document.getElementById('btn-close-share-modal');
const copyShareLinkBtn = document.getElementById('btn-copy-share-link');

function openShareModal() {
  if (!shareModal) return;
  
  const codeEl = document.getElementById('my-referral-code');
  const code = codeEl ? codeEl.textContent : "MOMO-0000-000";
  const shareUrl = `https://www.mtn.co.za/home/momo/?ref=${code}`;
  const shareText = `Join me on MoMo Save & Win! Use my referral code ${code} to earn a free ticket:`;
  
  // Set direct link input value
  const linkInput = document.getElementById('share-link-input');
  if (linkInput) linkInput.value = shareUrl;
  
  // Set social links
  const whatsappLink = document.getElementById('share-whatsapp');
  if (whatsappLink) whatsappLink.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
  
  const telegramLink = document.getElementById('share-telegram');
  if (telegramLink) telegramLink.href = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  
  const xLink = document.getElementById('share-x');
  if (xLink) xLink.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  
  const facebookLink = document.getElementById('share-facebook');
  if (facebookLink) facebookLink.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  
  const smsLink = document.getElementById('share-sms');
  if (smsLink) smsLink.href = `sms:?body=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
  
  // Show modal overlay
  shareModal.classList.add('modal-overlay--active');
}

function closeShareModal() {
  if (shareModal) shareModal.classList.remove('modal-overlay--active');
}

if (shareBtn) {
  shareBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openShareModal();
  });
}

if (closeShareModalBtn) {
  closeShareModalBtn.addEventListener('click', closeShareModal);
}

if (shareModal) {
  shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) closeShareModal();
  });
}

if (copyShareLinkBtn) {
  copyShareLinkBtn.addEventListener('click', () => {
    const linkInput = document.getElementById('share-link-input');
    if (linkInput) {
      navigator.clipboard.writeText(linkInput.value).then(() => {
        copyShareLinkBtn.textContent = 'Copied!';
        setTimeout(() => { copyShareLinkBtn.textContent = 'Copy Link'; }, 1500);
      }).catch(() => {});
    }
  });
}

// --- Submit entered code ---
const submitBtn = document.getElementById('btn-submit-code');
if (submitBtn) {
  submitBtn.addEventListener('click', () => {
    const input = document.getElementById('input-referral-code');
    if (input && input.value.trim()) {
      submitReferralCode(input.value, getCurrentUser());
      renderReferralPage();
    }
  });
}

// --- Savings Balance State & Auto-Referral Completion Flow ---
const SAVINGS_KEY = 'momo_savings_balance';

function getSavingsBalance(userId) {
  try {
    const balance = JSON.parse(localStorage.getItem(SAVINGS_KEY) || '{}');
    if (balance[userId] === undefined) {
      balance[userId] = 0.00;
    }
    return balance[userId];
  } catch (e) {
    return 0.00;
  }
}

function setSavingsBalance(userId, amount) {
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

function updateSavingsUI() {
  const user = getCurrentUser();
  const balance = getSavingsBalance(user.id);
  const formatted = `R${balance.toFixed(2)}`;
  
  const savingsSummaryEl = document.querySelector('#card-savings-summary .card-value');
  const mySavingsBalanceEl = document.querySelector('#section-personal-savings .card .card-value');
  
  if (savingsSummaryEl) savingsSummaryEl.textContent = formatted;
  if (mySavingsBalanceEl) mySavingsBalanceEl.textContent = formatted;
}

// Deposit event handler
const depositBtn = document.getElementById('btn-deposit-personal');
if (depositBtn) {
  depositBtn.addEventListener('click', () => {
    const user = getCurrentUser();
    const currentBalance = getSavingsBalance(user.id);
    const amountStr = prompt("Enter deposit amount into your Savings Pocket (ZAR):", "1000.00");
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }
    
    const newBalance = currentBalance + amount;
    setSavingsBalance(user.id, newBalance);
    updateSavingsUI();
    
    // Automatically trigger referral completion on savings deposit!
    const referrals = getReferrals();
    const r = referrals.find(ref => ref.referredId === user.id && ref.status === 'linked');
    
    if (r) {
      completeReferral(user.id);
      availableTickets++;
      saveAvailableTickets();
      updateTicketUI();
      renderReferralPage();
      alert(`Deposit of R${amount.toFixed(2)} successful! Your referral code ${r.code} has been verified automatically, and you earned a game ticket!`);
    } else {
      alert(`Deposit of R${amount.toFixed(2)} successful!`);
    }
  });
}

// Withdraw event handler
const withdrawBtn = document.getElementById('btn-withdraw-personal');
if (withdrawBtn) {
  withdrawBtn.addEventListener('click', () => {
    const user = getCurrentUser();
    const currentBalance = getSavingsBalance(user.id);
    const amountStr = prompt("Enter withdrawal amount from your Savings Pocket (ZAR):", "500.00");
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }
    
    if (amount > currentBalance) {
      alert("Insufficient savings balance.");
      return;
    }
    
    const newBalance = currentBalance - amount;
    setSavingsBalance(user.id, newBalance);
    updateSavingsUI();
    alert(`Withdrawal of R${amount.toFixed(2)} successful!`);
  });
}

// --- URL Referral Parameter Detection & Welcome Modal ---
function checkUrlReferralCode() {
  const params = new URLSearchParams(window.location.search);
  const refCode = params.get('ref') || params.get('code');
  if (!refCode) return;

  const normalized = normalizeCode(refCode);
  const user = getCurrentUser();
  const codes = getReferralCodes();
  let entry = codes[normalized];

  // If own code, just clear URL and ignore
  if (entry && entry.userId === user.id) {
    clearUrlParams();
    return;
  }

  // If already referred, just clear URL and ignore
  if (getReferrals().some(r => r.referredId === user.id)) {
    clearUrlParams();
    return;
  }

  // Open Welcome Modal
  const welcomeModal = document.getElementById('modal-welcome');
  const welcomeCodeDisplay = document.getElementById('welcome-referral-code');
  
  if (welcomeModal && welcomeCodeDisplay) {
    welcomeCodeDisplay.textContent = normalized;
    welcomeModal.classList.add('modal-overlay--active');
    
    const applyBtn = document.getElementById('btn-apply-welcome-code');
    const closeBtn = document.getElementById('btn-close-welcome-modal');
    
    if (applyBtn) {
      const newApplyBtn = applyBtn.cloneNode(true);
      applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
      
      newApplyBtn.addEventListener('click', () => {
        submitReferralCode(normalized, user);
        renderReferralPage();
        welcomeModal.classList.remove('modal-overlay--active');
        clearUrlParams();
        navigateTo('referrals');
      });
    }
    
    if (closeBtn) {
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      
      newCloseBtn.addEventListener('click', () => {
        welcomeModal.classList.remove('modal-overlay--active');
        clearUrlParams();
      });
    }
  }
}

function clearUrlParams() {
  const url = new URL(window.location);
  url.searchParams.delete('ref');
  url.searchParams.delete('code');
  window.history.replaceState({}, document.title, url.pathname + url.search);
}

// Initial render
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  
  // Requirement: "when i refresh or relog it must generate the new referral code"
  // So on refresh (DOMContentLoaded), we generate a new active code
  createNewReferralCode(user.id, user.phone.slice(-4));
  
  // Render referral page state
  renderReferralPage();
  
  // Render savings state
  updateSavingsUI();
  
  // Look for any incoming referral code from URL parameters
  checkUrlReferralCode();
});

// --- Placeholder Button Alerts ---
const placeholderButtons = [
  'btn-send-money',
  'btn-buy-airtime',
  'btn-pay-bills',
  'btn-cash-in',
  'btn-create-group',
  'btn-join-group'
  // Note: 'btn-share-code' removed to prevent double-binding
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



// --- Navigation Drawer open/close ---
const openMenuBtn = document.getElementById('btn-open-menu');
const closeMenuBtn = document.getElementById('btn-close-menu');
const drawerOverlay = document.getElementById('drawer-overlay');
const navDrawer = document.getElementById('nav-drawer');

function openDrawer() {
  if (navDrawer) navDrawer.classList.add('nav-drawer--active');
}

function closeDrawer() {
  if (navDrawer) navDrawer.classList.remove('nav-drawer--active');
}

if (openMenuBtn) openMenuBtn.addEventListener('click', openDrawer);
if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeDrawer);
if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

console.log('MTN MoMo Enhanced Mini App loaded.');
console.log('Pages: Home | Savings | The Ruler | Referrals');
console.log('All interactions are placeholders for future implementation.');
