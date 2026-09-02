/**
 * MTN MoMo Enhanced - Reactive State Store
 */
class StateManager {
  constructor() {
    this.STORAGE_KEY = 'momo_enhanced_state_v1';
    this.listeners = {};
    this.state = this.loadInitialState();
  }

  getDefaultState() {
    return {
      user: {
        name: 'Thabo Ndlovu',
        phone: '083 456 9274',
        referralCode: 'MOMO-9274',
        tier: 'Yello Plus', // 'Yello' or 'Yello Plus'
        dailyLimit: 10000,
        monthlyLimit: 40000,
        avatar: 'TN'
      },
      wallet: {
        balance: 4250.00,
        personalSavings: 2350.00,
        personalSavingsTarget: 5000.00,
        lastTicketSavingsThreshold: 2000.00 // Tracks every R1,000 threshold
      },
      tickets: {
        personal: 3,
        group: 2,
        referralBonusEarned: 1
      },
      referrals: {
        totalReferred: 8,
        verifiedCount: 8,
        pendingCount: 0,
        nextMilestone: 10,
        list: [
          { name: 'Sipho Zulu', phone: '082 112 3456', status: 'verified', date: '2026-08-28', verifiedOnMoMo: true },
          { name: 'Naledi Khumalo', phone: '071 998 8771', status: 'verified', date: '2026-08-29', verifiedOnMoMo: true },
          { name: 'Kagiso Mokoena', phone: '065 432 1098', status: 'verified', date: '2026-08-30', verifiedOnMoMo: true },
          { name: 'Zanele Dlamini', phone: '083 776 5432', status: 'verified', date: '2026-08-30', verifiedOnMoMo: true },
          { name: 'Bongani Sithole', phone: '084 554 3210', status: 'verified', date: '2026-08-31', verifiedOnMoMo: true },
          { name: 'Lerato Molefe', phone: '072 667 8901', status: 'verified', date: '2026-09-01', verifiedOnMoMo: true },
          { name: 'Mandla Buthelezi', phone: '081 334 5566', status: 'verified', date: '2026-09-01', verifiedOnMoMo: true },
          { name: 'Precious Nkosi', phone: '073 221 4455', status: 'verified', date: '2026-09-02', verifiedOnMoMo: true }
        ]
      },
      stokvels: [
        {
          id: 'stk-1',
          name: 'Soweto Tech Builders',
          type: 'Investment & Hardware',
          totalPooled: 14500.00,
          myContribution: 3000.00,
          targetGoal: 20000.00,
          groupTicketsMinted: 14,
          membersCount: 8,
          payoutSchedule: 'Monthly Rotation',
          nextPayoutDate: '25 Sep 2026',
          members: [
            { name: 'Thabo N. (You)', amount: 3000, avatar: 'TN' },
            { name: 'Kagiso M.', amount: 2500, avatar: 'KM' },
            { name: 'Naledi K.', amount: 2000, avatar: 'NK' },
            { name: 'Precious N.', amount: 2000, avatar: 'PN' },
            { name: 'Sipho Z.', amount: 5000, avatar: 'SZ' }
          ]
        },
        {
          id: 'stk-2',
          name: 'Ndlovu Family Holiday Fund',
          type: 'December Festive & Travel',
          totalPooled: 8200.00,
          myContribution: 2000.00,
          targetGoal: 15000.00,
          groupTicketsMinted: 8,
          membersCount: 5,
          payoutSchedule: 'Lump Sum (1 Dec)',
          nextPayoutDate: '01 Dec 2026',
          members: [
            { name: 'Thabo N. (You)', amount: 2000, avatar: 'TN' },
            { name: 'Gogo Ndlovu', amount: 3000, avatar: 'GN' },
            { name: 'Bheki Ndlovu', amount: 2200, avatar: 'BN' },
            { name: 'Zandile N.', amount: 1000, avatar: 'ZN' }
          ]
        }
      ],
      jackpot: {
        currentGlobalPlays: 999942, // Counting towards 1,000,000
        targetJackpotPlays: 1000000,
        grandPrizeName: 'Brand New VW Polo Vivo + R100,000 MoMo Cash',
        recentWinners: [
          { name: 'Ayanda M. (Durban)', prize: 'R500 Airtime', time: '2m ago' },
          { name: 'Jabu K. (Soweto)', prize: '5GB MTN Data', time: '5m ago' },
          { name: 'Themba S. (Tembisa)', prize: 'R1,000 Cash', time: '11m ago' },
          { name: 'Lindiwe N. (Polokwane)', prize: 'R250 Shoprite Voucher', time: '18m ago' }
        ]
      },
      prizesWon: [
        { name: 'MTN 2GB Data Bundle', type: 'data', date: '2026-09-01', code: 'MOMO-DAT-7741' },
        { name: 'R50 MTN Airtime', type: 'airtime', date: '2026-08-31', code: 'MOMO-AIR-3910' }
      ],
      transactions: [
        { id: 'tx-101', title: 'Personal Savings Deposit', type: 'deposit', amount: 1000.00, date: 'Today, 10:14', ticketEarned: '+1 Personal Ticket' },
        { id: 'tx-102', title: 'Stokvel Contribution (Soweto Builders)', type: 'stokvel', amount: -500.00, date: 'Yesterday', ticketEarned: null },
        { id: 'tx-103', title: 'The Ruler Reward: R50 Airtime', type: 'reward', amount: 50.00, date: '31 Aug 2026', ticketEarned: null }
      ]
    };
  }

  loadInitialState() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
    }
    return this.getDefaultState();
  }

  saveState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  }

  get() {
    return this.state;
  }

  subscribe(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event, data) {
    this.saveState();
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data, this.state));
    }
    if (this.listeners['*']) {
      this.listeners['*'].forEach(callback => callback(event, data, this.state));
    }
  }

  reset() {
    this.state = this.getDefaultState();
    this.saveState();
    this.emit('state:reset', this.state);
  }
}

window.appState = new StateManager();
