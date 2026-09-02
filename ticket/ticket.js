/**
 * ================================================================
 * MTN MoMo Enhanced - Ticket Module
 * Folder: /ticket/ticket.js
 * ================================================================
 * This is your dedicated ticket workspace.
 * Any functions, logic, or variables you add here will be directly
 * linked to the Ticket web interface (ticket.html).
 */

// --- 1. Ticket Data & Configuration ---
export const TicketConfig = {
  defaultTickets: 3,
  minLockMonths: 3,
  tiers: {
    BRONZE: { name: 'Bronze', range: 'R1,000 - R4,999', maxReward: 'R25' },
    SILVER: { name: 'Silver', range: 'R5,000 - R14,999', maxReward: 'R35' },
    GOLD:   { name: 'Gold',   range: 'R15,000+',        maxReward: 'R45' }
  }
};

/**
 * Generates a unique ticket code.
 * Example outputs: IND-74829, GRP-92812
 */
export function generateTicketCode(type = 'IND') {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `${type.toUpperCase()}-${randomNum}`;
}

/**
 * Validates whether a ticket code is eligible for drawing a prize.
 */
export function validateTicket(ticketCode) {
  if (!ticketCode || typeof ticketCode !== 'string') return false;
  return ticketCode.startsWith('IND-') || ticketCode.startsWith('GRP-');
}

/**
 * Called whenever a ticket action or prize claim is triggered.
 * You can customize the prize logic, airtime rewards, or discount vouchers here!
 */
export function onTicketClaimed(ticketCode) {
  console.log(`[Ticket Module] Ticket ${ticketCode} claimed`);
  // Add your custom ticket logic here
}

/**
 * Initialize and link with the web DOM elements on load
 */
export function initTicketWebBindings() {
  console.log('[Ticket Module] Initialized and linked to the web interface.');

  // Example: Listen for ticket selector changes in the web UI
  const ticketSelect = document.getElementById('ticket-code-select');
  if (ticketSelect) {
    ticketSelect.addEventListener('change', (e) => {
      console.log('[Ticket Module] Active ticket changed to:', e.target.value);
    });
  }

  // Example: Hook into the "+ Add Ticket" button
  const addTicketBtn = document.getElementById('btn-add-ticket');
  if (addTicketBtn) {
    addTicketBtn.addEventListener('click', () => {
      console.log('[Ticket Module] User requested a new ticket');
    });
  }
}

// Expose TicketModule globally on window for easy console debugging & integration
if (typeof window !== 'undefined') {
  window.TicketModule = {
    TicketConfig,
    generateTicketCode,
    validateTicket,
    onTicketClaimed,
    initTicketWebBindings
  };

  // Automatically bind to DOM once content is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTicketWebBindings);
  } else {
    initTicketWebBindings();
  }
}
