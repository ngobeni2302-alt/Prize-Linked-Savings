/**
 * "The Ruler" 3-Card Rewards Game & "1 in a Million" Jackpot Engine (Person 1)
 * Features 3-Card Interactive Picking, Independent Personal vs Group Prize Pools,
 * Live 1,000,000 Global Play Tracker, and Confetti FX.
 */
class RulerGameEngine {
  constructor(stateManager) {
    this.state = stateManager;
    this.selectedPool = 'personal'; // 'personal' or 'group'
    this.isPlaying = false;
    this.currentDeck = [];
    this.confettiInstance = null;
  }

  getPersonalPrizePool() {
    return [
      { name: '1GB MTN Data Bundle', type: 'data', icon: '📶', desc: 'Valid for 7 days on MTN network' },
      { name: 'R50 MTN Airtime', type: 'airtime', icon: '📱', desc: 'Loaded instantly to your MoMo SIM' },
      { name: 'R100 Instant MoMo Cash', type: 'cash', icon: '💵', desc: 'Credited directly to MoMo Wallet' },
      { name: 'R200 Shoprite Voucher', type: 'voucher', icon: '🛒', desc: 'Digital code valid at any Shoprite store' },
      { name: '5GB MTN Data Bundle', type: 'data', icon: '🚀', desc: 'High-speed 5G MTN data bundle' },
      { name: 'R500 Takealot Voucher', type: 'voucher', icon: '🛍️', desc: 'Redeemable on Takealot.com' },
      { name: 'R500 MoMo Cash Boost', type: 'cash', icon: '💰', desc: 'Direct cash deposit into your wallet' },
      { name: 'R20 MTN Airtime', type: 'airtime', icon: '📞', desc: 'Instant airtime recharge' }
    ];
  }

  getGroupPrizePool() {
    return [
      { name: 'R1,000 Stokvel Cash Boost', type: 'cash', icon: '🏛️', desc: 'Added directly to your active Stokvel pool' },
      { name: 'R1,500 Checkers Grocery Hamper', type: 'voucher', icon: '🧺', desc: 'Shareable voucher for all group members' },
      { name: 'R500 MoMo Community Pool Bonus', type: 'cash', icon: '💰', desc: 'Bonus cash dividend for the group' },
      { name: '5x R50 Group Airtime Pack', type: 'airtime', icon: '📲', desc: 'Distributed to all 5 primary stokvel members' },
      { name: 'R2,000 Shoprite Food Voucher', type: 'voucher', icon: '🛒', desc: 'Bulk food voucher for festive stokvel' },
      { name: '10GB Shared MTN Data Pack', type: 'data', icon: '📡', desc: 'Data bundle split across group phones' }
    ];
  }

  selectPool(poolType) {
    if (poolType === 'personal' || poolType === 'group') {
      this.selectedPool = poolType;
      this.state.emit('game:pool_changed', { pool: poolType });
    }
  }

  hasTickets() {
    const current = this.state.get();
    return this.selectedPool === 'personal'
      ? current.tickets.personal > 0
      : current.tickets.group > 0;
  }

  /**
   * Generates a 3-card deck with random prizes
   */
  prepareCards() {
    const pool = this.selectedPool === 'personal' 
      ? this.getPersonalPrizePool() 
      : this.getGroupPrizePool();

    // Pick 3 random distinct prizes from pool
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    this.currentDeck = [
      { id: 0, prize: shuffled[0], flipped: false },
      { id: 1, prize: shuffled[1], flipped: false },
      { id: 2, prize: shuffled[2], flipped: false }
    ];
    return this.currentDeck;
  }

  /**
   * Execute card pick
   */
  pickCard(cardIndex) {
    const current = this.state.get();
    
    // Check ticket availability
    if (this.selectedPool === 'personal') {
      if (current.tickets.personal <= 0) {
        return { success: false, error: 'No Personal Tickets available. Save R1,000 or refer 10 friends to earn tickets!' };
      }
      current.tickets.personal -= 1;
    } else {
      if (current.tickets.group <= 0) {
        return { success: false, error: 'No Group Tickets available. Contribute R1,000 to a Stokvel to earn Group Tickets!' };
      }
      current.tickets.group -= 1;
    }

    // Play card flip sound
    if (window.soundEngine) window.soundEngine.playCardFlip();

    // Increment Global Jackpot Counter
    current.jackpot.currentGlobalPlays += 1;
    let hitJackpot = false;

    // Check if this is the 1,000,000th play
    if (current.jackpot.currentGlobalPlays >= current.jackpot.targetJackpotPlays) {
      hitJackpot = true;
      current.jackpot.currentGlobalPlays = 0; // Reset counter for next 1M run
      if (window.soundEngine) window.soundEngine.playJackpot();
    } else {
      if (window.soundEngine) window.soundEngine.playWin();
    }

    const wonPrize = hitJackpot 
      ? { name: '🎉 1-IN-A-MILLION GRAND PRIZE: VW Polo Vivo + R100,000 Cash!', type: 'jackpot', icon: '🏆', desc: 'MTN Fintech Summit 2026 Grand Jackpot Winner!' }
      : this.currentDeck[cardIndex].prize;

    // Record prize
    current.prizesWon.unshift({
      name: wonPrize.name,
      type: wonPrize.type,
      pool: this.selectedPool,
      date: 'Just now',
      code: 'MOMO-WIN-' + Math.floor(1000 + Math.random() * 9000)
    });

    // Credit cash if prize is cash
    if (wonPrize.type === 'cash') {
      const match = wonPrize.name.match(/R(\d+[\d,]*)/);
      if (match) {
        const cashVal = parseFloat(match[1].replace(',', ''));
        if (this.selectedPool === 'personal') {
          current.wallet.balance += cashVal;
        } else {
          if (current.stokvels[0]) {
            current.stokvels[0].totalPooled += cashVal;
          }
        }
      }
    }

    this.launchConfetti();

    this.state.emit('game:played', {
      cardIndex,
      wonPrize,
      hitJackpot,
      selectedPool: this.selectedPool,
      globalPlays: current.jackpot.currentGlobalPlays
    });

    return {
      success: true,
      cardIndex,
      wonPrize,
      hitJackpot,
      selectedPool: this.selectedPool
    };
  }

  /**
   * Fast trigger 1-in-a-million play simulation
   */
  simulateJackpotHit() {
    const current = this.state.get();
    current.jackpot.currentGlobalPlays = 999999;
    this.state.emit('jackpot:near_miss', { currentPlays: 999999 });
    return {
      success: true,
      message: 'Global counter primed to 999,999! Next play will hit the 1-in-a-Million Jackpot!'
    };
  }

  /**
   * Confetti celebration canvas animation
   */
  launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#FFCC00', '#004F71', '#10B981', '#F59E0B', '#FFFFFF', '#EC4899'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 18,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let frames = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let activeCount = 0;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4; // Gravity
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.012;

        if (p.opacity > 0) {
          activeCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      frames++;
      if (activeCount > 0 && frames < 120) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    requestAnimationFrame(animate);
  }
}

window.rulerGame = new RulerGameEngine(window.appState);
