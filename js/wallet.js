/**
 * Personal Savings Account & MoMo Core Services Engine (Person 4)
 * Manages "Me Money" savings, threshold-based ticket minting (Every R1,000 = 1 Ticket),
 * and standard MoMo value-added transactions.
 */
class WalletEngine {
  constructor(stateManager) {
    this.state = stateManager;
  }

  /**
   * Deposit into Personal Savings ("Me Money")
   * Calculates R1,000 milestones and automatically mints game tickets
   */
  depositPersonalSavings(amount, source = 'MoMo Wallet') {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, error: 'Please enter a valid positive amount.' };
    }

    const current = this.state.get();
    
    // Check wallet balance if funding from MoMo wallet
    if (source === 'MoMo Wallet' && current.wallet.balance < numAmount) {
      return {
        success: false,
        error: `Insufficient MoMo wallet balance (Current: R${current.wallet.balance.toFixed(2)}). Please top up first.`
      };
    }

    const previousSavings = current.wallet.personalSavings;
    const newSavings = previousSavings + numAmount;
    
    // Calculate new tickets earned based on R1,000 multiples
    const prevMilestones = Math.floor(previousSavings / 1000);
    const newMilestones = Math.floor(newSavings / 1000);
    const ticketsEarned = Math.max(0, newMilestones - prevMilestones);

    // Update state
    current.wallet.personalSavings = newSavings;
    if (source === 'MoMo Wallet') {
      current.wallet.balance -= numAmount;
    }
    
    if (ticketsEarned > 0) {
      current.tickets.personal += ticketsEarned;
      if (window.soundEngine) window.soundEngine.playTicketMint();
    }

    // Add transaction log
    const newTx = {
      id: 'tx-' + Date.now(),
      title: 'Personal Savings Deposit',
      type: 'deposit',
      amount: numAmount,
      date: 'Just now',
      ticketEarned: ticketsEarned > 0 ? `+${ticketsEarned} Personal Ticket${ticketsEarned > 1 ? 's' : ''}` : null
    };
    current.transactions.unshift(newTx);

    this.state.emit('wallet:updated', {
      amount: numAmount,
      newSavings,
      ticketsEarned,
      source
    });

    return {
      success: true,
      newSavings,
      ticketsEarned,
      message: `Successfully deposited R${numAmount.toFixed(2)} into Personal Savings! ${ticketsEarned > 0 ? `🎉 You earned ${ticketsEarned} Ruler game ticket(s)!` : ''}`
    };
  }

  /**
   * Withdraw from Personal Savings to Main MoMo Wallet
   */
  withdrawPersonalSavings(amount) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, error: 'Please enter a valid withdrawal amount.' };
    }

    const current = this.state.get();
    if (current.wallet.personalSavings < numAmount) {
      return {
        success: false,
        error: `Insufficient Personal Savings balance (Available: R${current.wallet.personalSavings.toFixed(2)}).`
      };
    }

    current.wallet.personalSavings -= numAmount;
    current.wallet.balance += numAmount;

    // Add transaction log
    const newTx = {
      id: 'tx-' + Date.now(),
      title: 'Personal Savings Withdrawal',
      type: 'withdraw',
      amount: -numAmount,
      date: 'Just now',
      ticketEarned: null
    };
    current.transactions.unshift(newTx);

    this.state.emit('wallet:updated', {
      amount: -numAmount,
      newSavings: current.wallet.personalSavings
    });

    return {
      success: true,
      newSavings: current.wallet.personalSavings,
      message: `Withdrew R${numAmount.toFixed(2)} back to your active MoMo Wallet.`
    };
  }

  /**
   * Quick MoMo Top-Up / Cash-In
   */
  cashInWallet(amount) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return { success: false, error: 'Invalid amount' };

    const current = this.state.get();
    current.wallet.balance += numAmount;

    const newTx = {
      id: 'tx-' + Date.now(),
      title: 'MoMo Cash In (MTN Store / EFT)',
      type: 'deposit',
      amount: numAmount,
      date: 'Just now',
      ticketEarned: null
    };
    current.transactions.unshift(newTx);

    this.state.emit('wallet:updated', { amount: numAmount });
    return { success: true, message: `Topped up R${numAmount.toFixed(2)} into MoMo Wallet.` };
  }

  /**
   * Perform MoMo Payment Service (Airtime, Data, Bills)
   */
  payMoMoService(serviceName, amount, details) {
    const numAmount = parseFloat(amount);
    const current = this.state.get();

    if (current.wallet.balance < numAmount) {
      return { success: false, error: `Insufficient MoMo balance for ${serviceName}.` };
    }

    current.wallet.balance -= numAmount;
    const newTx = {
      id: 'tx-' + Date.now(),
      title: `${serviceName} (${details || 'Direct'})`,
      type: 'payment',
      amount: -numAmount,
      date: 'Just now',
      ticketEarned: null
    };
    current.transactions.unshift(newTx);

    this.state.emit('wallet:updated', { amount: -numAmount });
    return { success: true, message: `Successfully purchased ${serviceName} for R${numAmount.toFixed(2)}!` };
  }
}

window.walletEngine = new WalletEngine(window.appState);
