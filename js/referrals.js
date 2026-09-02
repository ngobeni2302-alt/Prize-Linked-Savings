/**
 * Referral Growth Engine & Verification Flow (Person 2)
 * Manages unique permanent codes (MOMO-[Last4Digits]), viral sharing,
 * milestone calculation (10 Verified MoMo Referrals = 1 Free Ticket),
 * and links with MoMo API Verification Engine.
 */
class ReferralEngine {
  constructor(stateManager, apiService) {
    this.state = stateManager;
    this.api = apiService;
  }

  /**
   * Add a new referred user and perform MoMo verification
   */
  async submitReferral(name, phone) {
    if (!name || !name.trim()) {
      return { success: false, error: 'Please enter the friend\'s full name.' };
    }

    const current = this.state.get();
    
    // Call simulated MoMo API (Person 3 backend)
    const verification = await this.api.verifyMoMoAccount(phone, current.user.referralCode);
    if (!verification.success) {
      return verification;
    }

    const newRef = {
      name: name.trim(),
      phone: verification.accountDetails.msisdn,
      status: 'verified',
      date: 'Today',
      verifiedOnMoMo: true,
      tier: verification.accountDetails.kycTier
    };

    current.referrals.list.unshift(newRef);
    current.referrals.totalReferred += 1;
    current.referrals.verifiedCount += 1;

    // Check 10-referral milestone
    let bonusTicketAwarded = false;
    if (current.referrals.verifiedCount % 10 === 0) {
      current.tickets.personal += 1;
      current.tickets.referralBonusEarned = (current.tickets.referralBonusEarned || 0) + 1;
      bonusTicketAwarded = true;
      if (window.soundEngine) window.soundEngine.playWin();
    }

    this.state.emit('referral:added', {
      referral: newRef,
      verifiedCount: current.referrals.verifiedCount,
      bonusTicketAwarded
    });

    return {
      success: true,
      referral: newRef,
      bonusTicketAwarded,
      message: bonusTicketAwarded
        ? `🔥 Awesome! 10 verified referrals reached! You just earned 1 FREE Ruler Game Ticket!`
        : `✅ ${name} verified as active MTN MoMo account (${current.referrals.verifiedCount % 10}/10 toward next free ticket).`
    };
  }

  /**
   * Fast-forward batch referrals (simulate 10 verified users)
   */
  simulateBatchReferrals(count = 10) {
    const current = this.state.get();
    const mockNames = ['Lwazi Mabaso', 'Kholofelo Seete', 'Bafana Ndlovu', 'Nomusa Radebe', 'Thabo Mthembu', 'Simphiwe Khuzwayo', 'Vusi Zwane', 'Gugu Nkambule', 'Thandi Modise', 'Mbali Shabalala'];

    for (let i = 0; i < count; i++) {
      const name = mockNames[i % mockNames.length] + ' ' + (Math.floor(Math.random() * 89) + 10);
      const phone = '083' + Math.floor(1000000 + Math.random() * 9000000);
      current.referrals.list.unshift({
        name,
        phone,
        status: 'verified',
        date: 'Just now',
        verifiedOnMoMo: true
      });
      current.referrals.totalReferred += 1;
      current.referrals.verifiedCount += 1;

      if (current.referrals.verifiedCount % 10 === 0) {
        current.tickets.personal += 1;
        current.tickets.referralBonusEarned = (current.tickets.referralBonusEarned || 0) + 1;
      }
    }

    if (window.soundEngine) window.soundEngine.playTicketMint();
    this.state.emit('referral:batch_added', { count, verifiedCount: current.referrals.verifiedCount });
    return {
      success: true,
      message: `Simulated ${count} new verified MoMo signups! Free tickets awarded based on 10-milestones.`
    };
  }

  /**
   * Generate Native Share Data & WhatsApp Link
   */
  getShareData() {
    const state = this.state.get();
    const code = state.user.referralCode;
    const shareUrl = `${window.location.origin}${window.location.pathname}?ref=${code}`;
    const message = `Join me on MTN MoMo Enhanced! Save money, digitise your stokvel, and pick cards in The Ruler game to win airtime, data, and the 1-in-a-Million Jackpot! Use my referral code: ${code}\n${shareUrl}`;

    return {
      code,
      url: shareUrl,
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(message)}`,
      smsUrl: `sms:?body=${encodeURIComponent(message)}`,
      message
    };
  }
}

window.referralEngine = new ReferralEngine(window.appState, window.momoApi);
