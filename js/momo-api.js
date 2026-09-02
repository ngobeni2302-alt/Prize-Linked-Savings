/**
 * MTN MoMo Backend Infrastructure & API Simulator (Person 3)
 * Simulates MoMo Partner API (UBank), real-time account verification,
 * fraud detection, velocity limits, and duplicate phone checks.
 */
class MoMoApiService {
  constructor(stateManager) {
    this.state = stateManager;
  }

  /**
   * Validates South African MSISDN format
   */
  isValidSAPhone(phone) {
    const cleaned = phone.replace(/\s+/g, '').replace(/^(\+27)/, '0');
    // SA numbers: 10 digits starting with 06, 07, 08
    const regex = /^0[6-8][0-9]{8}$/;
    return {
      isValid: regex.test(cleaned),
      cleanedPhone: cleaned
    };
  }

  /**
   * MoMo API Account Verification & Fraud Engine Check
   */
  async verifyMoMoAccount(phone, inviterCode) {
    const phoneCheck = this.isValidSAPhone(phone);
    if (!phoneCheck.isValid) {
      return {
        success: false,
        error: 'Invalid South African mobile number. Must be 10 digits starting with 06, 07, or 08.'
      };
    }

    const currentData = this.state.get();
    // Fraud Check 1: Self referral
    const userPhoneCleaned = currentData.user.phone.replace(/\s+/g, '');
    if (phoneCheck.cleanedPhone === userPhoneCleaned) {
      return {
        success: false,
        fraudFlag: true,
        error: 'Fraud Detected: You cannot refer your own registered MoMo mobile number!'
      };
    }

    // Fraud Check 2: Duplicate referral in user list
    const isDuplicate = currentData.referrals.list.some(r => 
      r.phone.replace(/\s+/g, '') === phoneCheck.cleanedPhone
    );
    if (isDuplicate) {
      return {
        success: false,
        fraudFlag: true,
        error: 'Duplicate Referral: This mobile number has already registered via your link.'
      };
    }

    // Simulate API network latency for realistic fintech feel
    await new Promise(resolve => setTimeout(resolve, 600));

    // Simulated MoMo Account Query: Checks KYC status on UBank core
    const isRegisteredMoMoUser = true; // In real life, queries MoMo API
    const kycTier = Math.random() > 0.3 ? 'Yello Plus' : 'Yello';

    return {
      success: true,
      verified: isRegisteredMoMoUser,
      accountDetails: {
        msisdn: phoneCheck.cleanedPhone,
        kycTier: kycTier,
        carrier: 'MTN SA',
        ubankAccountId: 'UBANK-' + Math.floor(100000 + Math.random() * 900000)
      }
    };
  }

  /**
   * Verify Tier Limits (Yello vs Yello Plus)
   */
  checkLimitCompliance(currentSpend, amountToAdd, tier) {
    const dailyLimit = tier === 'Yello Plus' ? 10000 : 3500;
    const monthlyLimit = tier === 'Yello Plus' ? 40000 : 20000;

    if (currentSpend + amountToAdd > dailyLimit) {
      return {
        allowed: false,
        reason: `Exceeds ${tier} daily transaction limit of R${dailyLimit.toLocaleString()}`
      };
    }
    return { allowed: true };
  }
}

window.momoApi = new MoMoApiService(window.appState);
