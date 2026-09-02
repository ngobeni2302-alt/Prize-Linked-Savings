/**
 * Group Savings & Digital Stokvel Engine (Person 5)
 * Digitises traditional South African stokvels (R50B+ market),
 * provides group transparency, automated pooled ticket minting (Every R1,000 = 1 Group Ticket),
 * and links to the dedicated Group Prize Pool.
 */
class StokvelEngine {
  constructor(stateManager) {
    this.state = stateManager;
  }

  /**
   * Contribute to a Stokvel Group
   */
  contributeToStokvel(stokvelId, amount) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, error: 'Please enter a valid positive contribution.' };
    }

    const current = this.state.get();
    if (current.wallet.balance < numAmount) {
      return {
        success: false,
        error: `Insufficient MoMo wallet balance (Available: R${current.wallet.balance.toFixed(2)}).`
      };
    }

    const stokvel = current.stokvels.find(s => s.id === stokvelId);
    if (!stokvel) {
      return { success: false, error: 'Stokvel group not found.' };
    }

    const prevPooled = stokvel.totalPooled;
    const newPooled = prevPooled + numAmount;
    
    // Calculate new group tickets earned
    const prevMilestones = Math.floor(prevPooled / 1000);
    const newMilestones = Math.floor(newPooled / 1000);
    const ticketsEarned = Math.max(0, newMilestones - prevMilestones);

    // Deduct wallet and update group stats
    current.wallet.balance -= numAmount;
    stokvel.totalPooled = newPooled;
    stokvel.myContribution += numAmount;
    stokvel.groupTicketsMinted += ticketsEarned;

    // Add to user's group tickets balance
    if (ticketsEarned > 0) {
      current.tickets.group += ticketsEarned;
      if (window.soundEngine) window.soundEngine.playTicketMint();
    }

    // Update user entry in members list
    const myMember = stokvel.members.find(m => m.name.includes('(You)'));
    if (myMember) {
      myMember.amount += numAmount;
    }

    // Add transaction log
    const newTx = {
      id: 'tx-' + Date.now(),
      title: `Stokvel: ${stokvel.name}`,
      type: 'stokvel',
      amount: -numAmount,
      date: 'Just now',
      ticketEarned: ticketsEarned > 0 ? `+${ticketsEarned} Group Ticket${ticketsEarned > 1 ? 's' : ''}` : null
    };
    current.transactions.unshift(newTx);

    this.state.emit('stokvel:updated', {
      stokvelId,
      amount: numAmount,
      newPooled,
      ticketsEarned
    });

    return {
      success: true,
      stokvel,
      ticketsEarned,
      message: `Contributed R${numAmount.toFixed(2)} to ${stokvel.name}! ${ticketsEarned > 0 ? `🎉 Your Stokvel unlocked ${ticketsEarned} Group Game Ticket(s)!` : ''}`
    };
  }

  /**
   * Create a New Digital Stokvel Group
   */
  createStokvel(name, type, targetGoal, payoutSchedule) {
    if (!name || !name.trim()) return { success: false, error: 'Stokvel group name is required.' };
    const goal = parseFloat(targetGoal) || 10000;

    const current = this.state.get();
    const newStokvel = {
      id: 'stk-' + Date.now(),
      name: name.trim(),
      type: type || 'General Savings & Payouts',
      totalPooled: 0.00,
      myContribution: 0.00,
      targetGoal: goal,
      groupTicketsMinted: 0,
      membersCount: 1,
      payoutSchedule: payoutSchedule || 'Monthly Rotation',
      nextPayoutDate: 'End of Month',
      members: [
        { name: `${current.user.name} (You)`, amount: 0, avatar: current.user.avatar }
      ]
    };

    current.stokvels.unshift(newStokvel);
    this.state.emit('stokvel:created', newStokvel);

    return {
      success: true,
      stokvel: newStokvel,
      message: `🎉 Digital Stokvel "${newStokvel.name}" created successfully!`
    };
  }
}

window.stokvelEngine = new StokvelEngine(window.appState);
