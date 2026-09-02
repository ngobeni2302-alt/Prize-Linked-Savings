# Ticket Code Workspace (`/ticket`)

Welcome to your dedicated **Ticket** development folder! Any code you write here is directly linked into the web application at [ticket.html](file:///c:/Users/Nwaml/OneDrive/Desktop/Prize-Linked-Savings/ticket.html).

## Files in this Directory

- **`ticket.js`**: Main entry point for your ticket code.
  - Automatically loaded on [ticket.html](file:///c:/Users/Nwaml/OneDrive/Desktop/Prize-Linked-Savings/ticket.html) via `<script type="module" src="/ticket/ticket.js"></script>`.
  - Also globally accessible on `window.TicketModule`.

## How Your Code Links to the Web Interface

1. **Live Reloading / HMR**: Vite automatically hot-reloads the browser whenever you modify or save files inside `ticket/`.
2. **DOM Elements Ready to Hook Into**:
   - `#ticket-code-select`: The dropdown of active ticket codes.
   - `#game-tickets-count`: The available ticket counter.
   - `#btn-add-ticket`: The "+ Add Ticket" button.
   - `.game-card`: The scratch / pick cards.
   - `#active-pool-type`: Active pool indicator (`INDIVIDUAL` vs `GROUP`).
   - `#prize-history-list`: The dynamic list of drawn ticket prizes.
3. **Global Access**:
   You can call `window.TicketModule` or read `window.availableTickets` directly from the browser console or any page script.
