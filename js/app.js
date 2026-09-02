/**
 * MTN MoMo Enhanced - Master Application Coordinator
 * Handles UI DOM rendering, user interactions, modals, tab routing,
 * and quick simulator triggers.
 */
document.addEventListener('DOMContentLoaded', () => {
  const state = window.appState;
  const game = window.rulerGame;
  const wallet = window.walletEngine;
  const stokvel = window.stokvelEngine;
  const referrals = window.referralEngine;
  const sound = window.soundEngine;

  // Initialize Card Deck
  game.prepareCards();

  // DOM Elements
  const tabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const toastContainer = document.getElementById('toast-container');

  // Modal references
  const depositModal = document.getElementById('modal-deposit');
  const withdrawModal = document.getElementById('modal-withdraw');
  const stokvelModal = document.getElementById('modal-stokvel');
  const shareModal = document.getElementById('modal-share');
  const rewardModal = document.getElementById('modal-reward');

  /**
   * Render All UI State
   */
  function renderAll() {
    const data = state.get();

    // Top Bar & Badges
    document.querySelectorAll('.val-personal-tickets').forEach(el => el.textContent = data.tickets.personal);
    document.querySelectorAll('.val-group-tickets').forEach(el => el.textContent = data.tickets.group);
    document.querySelectorAll('.val-wallet-balance').forEach(el => el.textContent = `R ${data.wallet.balance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    document.querySelectorAll('.val-savings-balance').forEach(el => el.textContent = `R ${data.wallet.personalSavings.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    
    // User Profile
    const userNameEl = document.getElementById('user-profile-name');
    if (userNameEl) userNameEl.textContent = data.user.name;
    const userPhoneEl = document.getElementById('user-profile-phone');
    if (userPhoneEl) userPhoneEl.textContent = data.user.phone;
    const userTierEl = document.getElementById('user-profile-tier');
    if (userTierEl) userTierEl.textContent = data.user.tier;

    // Personal Savings Progress toward next R1,000 Milestone
    const currentSavings = data.wallet.personalSavings;
    const progressWithinThousand = (currentSavings % 1000);
    const percentToNextTicket = (progressWithinThousand / 1000) * 100;
    const remainingToTicket = 1000 - progressWithinThousand;
    
    const pBar = document.getElementById('savings-milestone-bar');
    if (pBar) pBar.style.width = `${percentToNextTicket}%`;
    const pText = document.getElementById('savings-milestone-text');
    if (pText) pText.textContent = `R ${remainingToTicket.toFixed(0)} more to earn your next Ruler Ticket!`;

    // Referral Progress & Stats
    const refCodeDisplays = document.querySelectorAll('.val-referral-code');
    refCodeDisplays.forEach(el => el.textContent = data.user.referralCode);
    
    const verifiedRefEl = document.getElementById('val-verified-referrals');
    if (verifiedRefEl) verifiedRefEl.textContent = data.referrals.verifiedCount;

    const refMilestoneProgress = (data.referrals.verifiedCount % 10) * 10;
    const refBar = document.getElementById('referral-milestone-bar');
    if (refBar) refBar.style.width = `${refMilestoneProgress}%`;
    const refMilestoneText = document.getElementById('referral-milestone-text');
    if (refMilestoneText) {
      const needed = 10 - (data.referrals.verifiedCount % 10);
      refMilestoneText.textContent = needed === 10 || needed === 0
        ? 'Milestone Reached! Free Ticket Minted!'
        : `${needed} more verified friend${needed > 1 ? 's' : ''} until your next FREE Ticket!`;
    }

    // Render Referral List
    const refListEl = document.getElementById('referral-list-container');
    if (refListEl) {
      refListEl.innerHTML = data.referrals.list.map(r => `
        <div class="referral-item">
          <div class="ref-user-info">
            <div class="ref-avatar">${r.name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
            <div>
              <div style="font-weight:700; font-size:0.9rem;">${escapeHtml(r.name)}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(r.phone)} · ${r.date}</div>
            </div>
          </div>
          <span class="badge badge-success">✓ MoMo Verified</span>
        </div>
      `).join('');
    }

    // Render Stokvels
    const stokvelsContainer = document.getElementById('stokvels-container');
    if (stokvelsContainer) {
      stokvelsContainer.innerHTML = data.stokvels.map(s => {
        const progressPct = Math.min(100, Math.round((s.totalPooled / s.targetGoal) * 100));
        return `
          <div class="stokvel-group-card" data-id="${s.id}">
            <div class="stokvel-group-header">
              <div class="stokvel-group-title">
                <span style="font-size:1.4rem;">🏛️</span>
                <div>
                  <div>${escapeHtml(s.name)}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">${escapeHtml(s.type)}</div>
                </div>
              </div>
              <span class="badge badge-blue">🎟️ ${s.groupTicketsMinted} Pool Tickets</span>
            </div>

            <div class="stokvel-group-stats">
              <div>
                <div class="stokvel-stat-label">Total Pooled</div>
                <div class="stokvel-stat-value text-yellow">R ${s.totalPooled.toLocaleString()}</div>
              </div>
              <div>
                <div class="stokvel-stat-label">My Contribution</div>
                <div class="stokvel-stat-value">R ${s.myContribution.toLocaleString()}</div>
              </div>
              <div>
                <div class="stokvel-stat-label">Payout Schedule</div>
                <div class="stokvel-stat-value" style="font-size:0.8rem;">${escapeHtml(s.payoutSchedule)}</div>
              </div>
            </div>

            <div style="margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;">
                <span>Group Goal: R ${s.targetGoal.toLocaleString()}</span>
                <span class="fw-bold">${progressPct}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-bar-fill" style="width:${progressPct}%;"></div>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="stokvel-members-avatar-list">
                ${s.members.map(m => `<div class="stokvel-avatar" title="${escapeHtml(m.name)}: R${m.amount}">${escapeHtml(m.avatar)}</div>`).join('')}
                <span style="font-size:0.75rem; color:var(--text-muted); margin-left:10px;">${s.members.length} members</span>
              </div>
              <button class="btn btn-primary btn-sm btn-contribute-stokvel" data-id="${s.id}">
                <span>+ Contribute</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render Transactions
    const txContainer = document.getElementById('transactions-container');
    if (txContainer) {
      txContainer.innerHTML = data.transactions.slice(0, 8).map(tx => {
        let icon = '💳';
        let iconClass = 'deposit';
        let isPos = tx.amount > 0;
        if (tx.type === 'deposit') { icon = '📥'; iconClass = 'deposit'; }
        else if (tx.type === 'withdraw') { icon = '📤'; iconClass = 'withdraw'; }
        else if (tx.type === 'reward') { icon = '🎁'; iconClass = 'reward'; }
        else if (tx.type === 'stokvel') { icon = '🏛️'; iconClass = 'stokvel'; }
        else if (tx.type === 'payment') { icon = '⚡'; iconClass = 'withdraw'; }

        return `
          <div class="transaction-item">
            <div class="tx-left">
              <div class="tx-icon ${iconClass}">${icon}</div>
              <div>
                <div class="tx-title">${escapeHtml(tx.title)}</div>
                <div class="tx-date">${tx.date}</div>
              </div>
            </div>
            <div class="tx-right">
              <div class="tx-amount ${isPos ? 'positive' : 'negative'}">
                ${isPos ? '+' : ''}R ${Math.abs(tx.amount).toFixed(2)}
              </div>
              ${tx.ticketEarned ? `<div class="tx-ticket-earned">🎟️ ${tx.ticketEarned}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    // Render 1-in-a-Million Global Counter
    const plays = data.jackpot.currentGlobalPlays.toString().padStart(7, '0');
    const digitsContainer = document.getElementById('jackpot-digits-container');
    if (digitsContainer) {
      digitsContainer.innerHTML = plays.split('').map(d => `<span class="counter-digit">${d}</span>`).join('');
    }

    // Update Game Pool Indicator
    const activePool = game.selectedPool;
    const personalPoolBtn = document.getElementById('pool-btn-personal');
    const groupPoolBtn = document.getElementById('pool-btn-group');
    if (personalPoolBtn && groupPoolBtn) {
      if (activePool === 'personal') {
        personalPoolBtn.classList.add('active');
        groupPoolBtn.classList.remove('active');
      } else {
        groupPoolBtn.classList.add('active');
        personalPoolBtn.classList.remove('active');
      }
    }

    // Render 3 Cards UI
    renderCardsDeck();
  }

  function renderCardsDeck() {
    const deck = game.currentDeck;
    const deckContainer = document.getElementById('ruler-cards-stage');
    if (!deckContainer) return;

    deckContainer.innerHTML = deck.map((card, idx) => `
      <div class="ruler-card-wrapper ${card.flipped ? 'flipped' : ''}" data-index="${idx}">
        <div class="ruler-card-inner">
          <div class="ruler-card-front">
            <div class="card-number-badge">CARD #${idx + 1}</div>
            <div class="card-center-crest">
              <div class="crown-icon">👑</div>
              <div class="card-prompt-label">The Ruler</div>
            </div>
            <div class="card-bottom-indicator">👉 Tap to Pick</div>
          </div>
          <div class="ruler-card-back">
            <div class="badge badge-yellow">MTN MoMo Reward</div>
            <div class="prize-icon-display">${card.prize.icon}</div>
            <div class="prize-title-text">${escapeHtml(card.prize.name)}</div>
            <div class="prize-desc-text">${escapeHtml(card.prize.desc)}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px;">Pool: ${game.selectedPool.toUpperCase()}</div>
          </div>
        </div>
      </div>
    `).join('');

    // Attach card click handlers
    deckContainer.querySelectorAll('.ruler-card-wrapper').forEach(cardEl => {
      cardEl.addEventListener('click', () => {
        const index = parseInt(cardEl.dataset.index);
        handleCardPick(index, cardEl);
      });
    });
  }

  /**
   * Handle Card Pick logic with flip animation & modal reward reveal
   */
  function handleCardPick(index, cardElement) {
    if (game.isPlaying) return;
    
    // Validate tickets
    if (!game.hasTickets()) {
      showToast(
        'No Tickets Available!',
        game.selectedPool === 'personal'
          ? 'Save R1,000 in Personal Savings or refer 10 friends to earn tickets!'
          : 'Save R1,000 in your Stokvel group to earn Group Tickets!',
        '🎟️'
      );
      if (sound) sound.playClick();
      return;
    }

    game.isPlaying = true;
    const result = game.pickCard(index);

    if (result.success) {
      cardElement.classList.add('flipped', 'winner');
      game.currentDeck[index].flipped = true;

      // Reveal other cards with a slight delay
      setTimeout(() => {
        deckContainerFlipOthers(index);
      }, 700);

      // Show celebration reward modal
      setTimeout(() => {
        showRewardModal(result.wonPrize, result.hitJackpot, result.selectedPool);
        game.isPlaying = false;
        renderAll();
      }, 1200);
    } else {
      showToast('Action Failed', result.error, '⚠️');
      game.isPlaying = false;
    }
  }

  function deckContainerFlipOthers(chosenIndex) {
    const deckContainer = document.getElementById('ruler-cards-stage');
    if (!deckContainer) return;
    deckContainer.querySelectorAll('.ruler-card-wrapper').forEach((el, idx) => {
      if (idx !== chosenIndex) {
        el.classList.add('flipped');
        el.style.opacity = '0.6';
      }
    });
  }

  function showRewardModal(prize, isJackpot, pool) {
    const modalPrizeIcon = document.getElementById('reward-modal-icon');
    const modalPrizeTitle = document.getElementById('reward-modal-title');
    const modalPrizeDesc = document.getElementById('reward-modal-desc');
    const modalPrizeCode = document.getElementById('reward-modal-code');

    if (modalPrizeIcon) modalPrizeIcon.textContent = prize.icon;
    if (modalPrizeTitle) modalPrizeTitle.textContent = prize.name;
    if (modalPrizeDesc) modalPrizeDesc.textContent = prize.desc;
    if (modalPrizeCode) modalPrizeCode.textContent = 'MOMO-WIN-' + Math.floor(100000 + Math.random() * 900000);

    rewardModal.classList.add('active');
  }

  /**
   * Helper: Escape HTML
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Toast notification helper
   */
  function showToast(title, message, icon = '🎉') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div>
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4200);
  }

  /**
   * Navigation Tabs Switching
   */
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (sound) sound.playClick();
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));

      tab.classList.add('active');
      const targetEl = document.getElementById(`tab-${target}`);
      if (targetEl) targetEl.classList.add('active');
    });
  });

  /**
   * Pool Switcher Buttons (Personal vs Group)
   */
  const btnPoolPersonal = document.getElementById('pool-btn-personal');
  const btnPoolGroup = document.getElementById('pool-btn-group');
  if (btnPoolPersonal) {
    btnPoolPersonal.addEventListener('click', () => {
      if (sound) sound.playClick();
      game.selectPool('personal');
      game.prepareCards();
      renderAll();
    });
  }
  if (btnPoolGroup) {
    btnPoolGroup.addEventListener('click', () => {
      if (sound) sound.playClick();
      game.selectPool('group');
      game.prepareCards();
      renderAll();
    });
  }

  const btnShuffle = document.getElementById('btn-shuffle-deck');
  if (btnShuffle) {
    btnShuffle.addEventListener('click', () => {
      if (sound) sound.playClick();
      game.prepareCards();
      renderAll();
      showToast('Deck Shuffled!', '3 brand new cards have been placed on the table.', '🃏');
    });
  }

  /**
   * Modal Open / Close Handlers
   */
  document.querySelectorAll('.modal-close, .btn-modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    });
  });

  const btnOpenDeposit = document.getElementById('btn-open-deposit-modal');
  if (btnOpenDeposit) {
    btnOpenDeposit.addEventListener('click', () => depositModal.classList.add('active'));
  }

  const btnOpenWithdraw = document.getElementById('btn-open-withdraw-modal');
  if (btnOpenWithdraw) {
    btnOpenWithdraw.addEventListener('click', () => withdrawModal.classList.add('active'));
  }

  const btnOpenNewStokvel = document.getElementById('btn-open-stokvel-modal');
  if (btnOpenNewStokvel) {
    btnOpenNewStokvel.addEventListener('click', () => stokvelModal.classList.add('active'));
  }

  const btnOpenShareModal = document.getElementById('btn-open-share-modal');
  if (btnOpenShareModal) {
    btnOpenShareModal.addEventListener('click', () => {
      const share = referrals.getShareData();
      const qrLink = document.getElementById('share-qr-url');
      if (qrLink) qrLink.textContent = share.url;
      shareModal.classList.add('active');
    });
  }

  // Play Again Button inside Reward Modal
  const btnRewardPlayAgain = document.getElementById('btn-reward-play-again');
  if (btnRewardPlayAgain) {
    btnRewardPlayAgain.addEventListener('click', () => {
      rewardModal.classList.remove('active');
      game.prepareCards();
      renderAll();
    });
  }

  /**
   * Form Submissions
   */
  const formDeposit = document.getElementById('form-deposit-savings');
  if (formDeposit) {
    formDeposit.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('input-deposit-amount').value);
      const source = document.getElementById('select-deposit-source').value;
      const res = wallet.depositPersonalSavings(amount, source);
      if (res.success) {
        showToast('Savings Deposit Confirmed', res.message, '💰');
        depositModal.classList.remove('active');
        formDeposit.reset();
        renderAll();
      } else {
        showToast('Deposit Failed', res.error, '⚠️');
      }
    });
  }

  const formWithdraw = document.getElementById('form-withdraw-savings');
  if (formWithdraw) {
    formWithdraw.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('input-withdraw-amount').value);
      const res = wallet.withdrawPersonalSavings(amount);
      if (res.success) {
        showToast('Withdrawal Processed', res.message, '📤');
        withdrawModal.classList.remove('active');
        formWithdraw.reset();
        renderAll();
      } else {
        showToast('Withdrawal Failed', res.error, '⚠️');
      }
    });
  }

  const formStokvel = document.getElementById('form-create-stokvel');
  if (formStokvel) {
    formStokvel.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('input-stokvel-name').value;
      const type = document.getElementById('input-stokvel-type').value;
      const goal = document.getElementById('input-stokvel-goal').value;
      const payout = document.getElementById('input-stokvel-payout').value;

      const res = stokvel.createStokvel(name, type, goal, payout);
      if (res.success) {
        showToast('Stokvel Created', res.message, '🏛️');
        stokvelModal.classList.remove('active');
        formStokvel.reset();
        renderAll();
      } else {
        showToast('Error', res.error, '⚠️');
      }
    });
  }

  const formReferFriend = document.getElementById('form-refer-friend');
  if (formReferFriend) {
    formReferFriend.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = formReferFriend.querySelector('button[type="submit"]');
      const nameInput = document.getElementById('input-refer-name');
      const phoneInput = document.getElementById('input-refer-phone');

      btn.disabled = true;
      btn.innerHTML = '<span class="pulse-dot"></span> Verifying with MoMo API...';

      const res = await referrals.submitReferral(nameInput.value, phoneInput.value);
      btn.disabled = false;
      btn.innerHTML = '<span>Verify & Invite</span>';

      if (res.success) {
        showToast('Referral Verified!', res.message, '🎁');
        formReferFriend.reset();
        renderAll();
      } else {
        showToast(res.fraudFlag ? 'Fraud Engine Alert' : 'Verification Error', res.error, '⚠️');
      }
    });
  }

  // Event Delegation for Stokvel contribute buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-contribute-stokvel');
    if (btn) {
      const stokvelId = btn.dataset.id;
      const res = stokvel.contributeToStokvel(stokvelId, 500);
      if (res.success) {
        showToast('Stokvel Contribution', res.message, '🏛️');
        renderAll();
      } else {
        showToast('Contribution Failed', res.error, '⚠️');
      }
    }
  });

  /**
   * Share Buttons (Copy, WhatsApp, SMS)
   */
  const btnCopyCode = document.getElementById('btn-copy-code');
  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', () => {
      const share = referrals.getShareData();
      navigator.clipboard.writeText(share.code);
      showToast('Referral Code Copied!', `Code ${share.code} copied to clipboard.`, '📋');
    });
  }

  const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
  if (btnShareWhatsapp) {
    btnShareWhatsapp.addEventListener('click', () => {
      const share = referrals.getShareData();
      window.open(share.whatsappUrl, '_blank');
    });
  }

  /**
   * Quick Simulation Testing Suite (One-click triggers for user evaluation)
   */
  const simPersonalDeposit = document.getElementById('sim-deposit-1000');
  if (simPersonalDeposit) {
    simPersonalDeposit.addEventListener('click', () => {
      const res = wallet.depositPersonalSavings(1000, 'External Card / Bank');
      showToast('Simulation: +R1,000 Personal Deposit', res.message, '⚡');
      renderAll();
    });
  }

  const simBatchRef = document.getElementById('sim-referrals-10');
  if (simBatchRef) {
    simBatchRef.addEventListener('click', () => {
      const res = referrals.simulateBatchReferrals(10);
      showToast('Simulation: 10 Verified Referrals', res.message, '👥');
      renderAll();
    });
  }

  const simStokvelPool = document.getElementById('sim-stokvel-deposit');
  if (simStokvelPool) {
    simStokvelPool.addEventListener('click', () => {
      const current = state.get();
      if (current.stokvels[0]) {
        // Direct boost to stokvel
        current.stokvels[0].totalPooled += 2000;
        current.stokvels[0].groupTicketsMinted += 2;
        current.tickets.group += 2;
        state.emit('stokvel:simulated', {});
        if (sound) sound.playTicketMint();
        showToast('Simulation: Stokvel +R2,000 Pooled', '🎉 Unlocked +2 Group Ruler Tickets for your Stokvel!', '🏛️');
        renderAll();
      }
    });
  }

  const simJackpotPrime = document.getElementById('sim-jackpot-prime');
  if (simJackpotPrime) {
    simJackpotPrime.addEventListener('click', () => {
      const res = game.simulateJackpotHit();
      showToast('Simulation: Jackpot Primed', res.message, '🏆');
      renderAll();
    });
  }

  const btnToggleFrame = document.getElementById('btn-toggle-mini-app-frame');
  if (btnToggleFrame) {
    btnToggleFrame.addEventListener('click', () => {
      document.body.classList.toggle('mini-app-mode');
      const isMini = document.body.classList.contains('mini-app-mode');
      btnToggleFrame.textContent = isMini ? '🖥️ Desktop View' : '📱 MoMo App View';
      showToast('Display Mode Switched', isMini ? 'Viewing in MTN MoMo Mobile Mini App Container' : 'Viewing in Full Desktop Dashboard', '📱');
    });
  }

  const btnResetState = document.getElementById('btn-reset-demo-state');
  if (btnResetState) {
    btnResetState.addEventListener('click', () => {
      if (confirm('Reset demo state back to default hackathon values?')) {
        state.reset();
        game.prepareCards();
        renderAll();
        showToast('State Reset', 'Demo state has been restored to default values.', '🔄');
      }
    });
  }

  // Subscribe to state updates
  state.subscribe('*', () => {
    renderAll();
  });

  // Initial Render
  renderAll();
});
