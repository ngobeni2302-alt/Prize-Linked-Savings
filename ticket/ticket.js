/**
 * ================================================================
 * MTN MoMo Enhanced - Interactive Scratch Ticket Module
 * File: /ticket/ticket.js
 * ================================================================
 * Digital Scratch Card Ticket linked to ticket.html
 */

// --- 1. Reward Pool ---
const TICKET_QUEUE = [
  {
    code: 'IND-8492',
    type: 'IND',
    typeLabel: 'INDIVIDUAL SAVINGS',
    serial: 'SER: ZA-MOMO-2026-8492',
    tier: 'BRONZE TIER',
    prize: 'R30 MTN AIRTIME',
    valueRange: 'R0 - R50',
    details: 'Small MTN Airtime top-up credited to active SIM 083 *** **89',
    lockPeriod: '3-Month Lock Fulfilled'
  },
  {
    code: 'IND-5521',
    type: 'IND',
    typeLabel: 'INDIVIDUAL SAVINGS',
    serial: 'SER: ZA-MOMO-2026-5521',
    tier: 'SILVER TIER',
    prize: 'R80 DATA BUNDLE (3GB)',
    valueRange: 'R50 - R100',
    details: 'High-capacity MTN Data package loaded to your account',
    lockPeriod: '3-Month Lock Fulfilled'
  },
  {
    code: 'IND-1502',
    type: 'IND',
    typeLabel: 'INDIVIDUAL SAVINGS',
    serial: 'SER: ZA-MOMO-2026-1502',
    tier: 'GOLD TIER',
    prize: 'R250 SHOPRITE / PICK N PAY VOUCHER',
    valueRange: 'R100 - R500',
    details: 'Exclusive Retail Discount Voucher code redeemable in-store',
    lockPeriod: '3-Month Lock Fulfilled'
  },
  {
    code: 'GRP-3D1E88ZA',
    type: 'GRP',
    typeLabel: 'STOKVEL GROUP POOL (5 MEMBERS)',
    serial: 'SER: ZA-MOMO-2026-3D1E',
    tier: 'GROUP TIER',
    prize: '5% RETAIL DISCOUNT VOUCHER',
    valueRange: '5% Category Off',
    details: 'Split evenly across 5 active Stokvel members (Grocery Category)',
    lockPeriod: '3-Month Lock Fulfilled'
  },
  {
    code: 'IND-9921',
    type: 'REF',
    typeLabel: 'REFERRAL REWARD',
    serial: 'SER: ZA-MOMO-2026-9921',
    tier: 'REFERRAL REWARD',
    prize: 'R20 VOICE MINUTES',
    valueRange: 'R10 - R20',
    details: 'Awarded to Referrer - Friend completed 3-month savings lock',
    lockPeriod: 'Goal Lock Verified'
  }
];

// --- 2. Module State ---
let currentTicketIndex = 0;
let isScratched = false;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Scratch Engine Elements
let canvas = null;
let ctx = null;

/**
 * Retrieves the currently active ticket data
 */
export function getCurrentTicket() {
  return TICKET_QUEUE[currentTicketIndex % TICKET_QUEUE.length];
}

/**
 * Initializes and binds the Scratch Card Ticket component
 */
export function initScratchTicket() {
  canvas = document.getElementById('scratch-canvas');
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Sync available tickets counter
  syncTicketCounter();

  // Load current ticket data into the underlying DOM
  loadTicketData(getCurrentTicket());

  // Setup canvas resolution and draw foil
  setupCanvas();

  // Attach event handlers
  attachScratchEvents();
  attachControlButtons();

  console.log('[Ticket Module] Scratch Ticket initialized and ready.');
}

/**
 * Syncs the available ticket counter UI with state
 */
function syncTicketCounter() {
  const counterEl = document.getElementById('scratch-tickets-left');
  let count = 3;
  if (typeof window !== 'undefined' && window.ticketState) {
    count = window.ticketState.availableTickets;
  } else {
    count = parseInt(localStorage.getItem('momo_available_tickets') || '3', 10);
  }

  if (counterEl) counterEl.textContent = count;
}

/**
 * Sets up canvas resolution and renders the metallic scratch foil layer
 */
function setupCanvas() {
  const box = document.getElementById('ticket-scratch-box');
  if (!box || !canvas || !ctx) return;

  const rect = box.getBoundingClientRect();
  const width = Math.floor(rect.width) || 400;
  const height = Math.floor(rect.height) || 180;

  canvas.width = width;
  canvas.height = height;

  canvas.classList.remove('revealed');
  canvas.style.display = 'block';
  canvas.style.opacity = '1';
  canvas.style.pointerEvents = 'auto';
  isScratched = false;

  renderFoilPattern(width, height);
}

/**
 * Draws the metallic foil texture with security patterning and instructions
 */
function renderFoilPattern(width, height) {
  if (!ctx) return;

  ctx.globalCompositeOperation = 'source-over';

  // Base metallic gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0.0, '#CBD5E1');
  grad.addColorStop(0.2, '#94A3B8');
  grad.addColorStop(0.4, '#E2E8F0');
  grad.addColorStop(0.6, '#64748B');
  grad.addColorStop(0.8, '#CBD5E1');
  grad.addColorStop(1.0, '#94A3B8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle patterned security mesh
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  for (let x = 0; x < width; x += 16) {
    for (let y = 0; y < height; y += 16) {
      if ((x + y) % 32 === 0) {
        ctx.fillRect(x, y, 8, 8);
      }
    }
  }

  // Inner border guideline
  ctx.strokeStyle = 'rgba(0, 79, 113, 0.25)';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  // Top Label
  ctx.fillStyle = '#004f71';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MTN MOMO SCRATCH TICKET', width / 2, 42);

  // Center Call to Action
  ctx.fillStyle = '#004f71';
  ctx.font = '900 18px Inter, sans-serif';
  ctx.fillText('SCRATCH HERE TO REVEAL', width / 2, height / 2 + 6);

  // Subtitle
  ctx.fillStyle = 'rgba(0, 79, 113, 0.7)';
  ctx.font = '600 11px Inter, sans-serif';
  ctx.fillText('Use your finger or mouse to scratch', width / 2, height / 2 + 28);
}

/**
 * Loads a ticket's data into the revealed DOM elements
 */
function loadTicketData(tkt) {
  const serialEl = document.getElementById('scratch-ticket-serial');
  const typeBadgeEl = document.getElementById('scratch-ticket-type-badge');
  const codeEl = document.getElementById('scratch-ticket-code');
  const prizeEl = document.getElementById('scratch-revealed-prize');
  const tierEl = document.getElementById('scratch-revealed-tier');
  const detailsEl = document.getElementById('scratch-revealed-details');

  if (serialEl) serialEl.textContent = tkt.serial;
  if (typeBadgeEl) typeBadgeEl.textContent = tkt.typeLabel;
  if (codeEl) codeEl.textContent = tkt.code;
  if (prizeEl) prizeEl.textContent = tkt.prize;
  if (tierEl) tierEl.textContent = tkt.tier;
  if (detailsEl) detailsEl.textContent = tkt.details;

  // Reset actions row
  const actionsRow = document.getElementById('scratch-actions-row');
  if (actionsRow) actionsRow.style.display = 'none';

  const hintEl = document.getElementById('scratch-hint');
  if (hintEl) hintEl.textContent = 'Scratch with your finger or mouse to reveal your reward';
}

/**
 * Attaches mouse and touch scratch interactions
 */
function attachScratchEvents() {
  if (!canvas) return;

  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startScratch = (e) => {
    if (isScratched) return;
    isDrawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
    scratchCircle(pos.x, pos.y);
  };

  const moveScratch = (e) => {
    if (!isDrawing || isScratched) return;
    e.preventDefault();
    const pos = getPos(e);
    scratchLine(lastX, lastY, pos.x, pos.y);
    lastX = pos.x;
    lastY = pos.y;

    // Check scratch percentage occasionally
    if (Math.random() < 0.3) {
      checkScratchPercentage();
    }
  };

  const stopScratch = () => {
    if (!isDrawing) return;
    isDrawing = false;
    checkScratchPercentage();
  };

  // Mouse listeners
  canvas.addEventListener('mousedown', startScratch);
  window.addEventListener('mousemove', moveScratch);
  window.addEventListener('mouseup', stopScratch);

  // Touch listeners (mobile/tablet)
  canvas.addEventListener('touchstart', startScratch, { passive: false });
  window.addEventListener('touchmove', moveScratch, { passive: false });
  window.addEventListener('touchend', stopScratch);
}

/**
 * Erases a circular area on the canvas
 */
function scratchCircle(x, y) {
  if (!ctx) return;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, 26, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Erases a continuous thick line on the canvas
 */
function scratchLine(x1, y1, x2, y2) {
  if (!ctx) return;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 48;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Checks the percentage of the foil that has been scratched away
 */
function checkScratchPercentage() {
  if (!canvas || !ctx || isScratched) return;

  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;
    let transparentCount = 0;

    // Sample every 16th pixel for high performance
    const step = 16;
    let sampledCount = 0;
    for (let i = 3; i < pixels.length; i += 4 * step) {
      sampledCount++;
      if (pixels[i] < 128) {
        transparentCount++;
      }
    }

    const percent = transparentCount / sampledCount;
    if (percent >= 0.35) {
      revealPrize();
    }
  } catch (err) {
    console.warn('[Ticket Module] Canvas check:', err);
  }
}

/**
 * Fully reveals the prize ticket, completely clearing the canvas overlay
 */
export function revealPrize() {
  if (isScratched) return;
  isScratched = true;

  // 1. Instantly clear canvas pixels and hide canvas layer completely
  if (canvas) {
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    canvas.style.opacity = '0';
    canvas.style.pointerEvents = 'none';
    canvas.classList.add('revealed');
  }

  // 2. Deduct available ticket
  let currentTickets = 3;
  if (typeof window !== 'undefined' && window.ticketState) {
    if (window.ticketState.availableTickets > 0) {
      window.ticketState.availableTickets -= 1;
      currentTickets = window.ticketState.availableTickets;
    }
  } else {
    currentTickets = parseInt(localStorage.getItem('momo_available_tickets') || '3', 10);
    if (currentTickets > 0) {
      currentTickets -= 1;
      localStorage.setItem('momo_available_tickets', currentTickets.toString());
    }
  }

  syncTicketCounter();

  const hintEl = document.getElementById('scratch-hint');
  if (hintEl) hintEl.textContent = 'Reward verified and revealed!';

  // 3. Show action buttons
  const actionsRow = document.getElementById('scratch-actions-row');
  if (actionsRow) actionsRow.style.display = 'flex';
}

/**
 * Attaches buttons: Quick Reveal, Scratch Next
 */
function attachControlButtons() {
  // Quick Reveal Button
  const quickRevealBtn = document.getElementById('btn-quick-reveal');
  if (quickRevealBtn) {
    quickRevealBtn.onclick = (e) => {
      if (e) e.preventDefault();
      revealPrize();
    };
  }

  // Scratch Next Ticket Button
  const nextBtn = document.getElementById('btn-scratch-next');
  if (nextBtn) {
    nextBtn.onclick = () => {
      let ticketsRemaining = parseInt(localStorage.getItem('momo_available_tickets') || '3', 10);
      if (typeof window !== 'undefined' && window.ticketState) {
        ticketsRemaining = window.ticketState.availableTickets;
      }

      if (ticketsRemaining <= 0) {
        alert('No tickets remaining! Complete your savings goals or refer peers to earn more scratch tickets.');
        return;
      }

      currentTicketIndex++;
      loadTicketData(getCurrentTicket());
      setupCanvas();
    };
  }
}

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
  window.TicketModule = {
    getCurrentTicket,
    initScratchTicket,
    revealPrize
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScratchTicket);
  } else {
    initScratchTicket();
  }

  window.addEventListener('resize', () => {
    if (!isScratched) setupCanvas();
  });
}
