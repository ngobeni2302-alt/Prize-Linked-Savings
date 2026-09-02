# How to Run the MTN MoMo Enhanced Mini App

## Prerequisites

- **Node.js** (v18.x or higher) installed on your machine
- **npm** (comes with Node.js)

## Setup

1. Open a terminal and navigate to the project folder:

   ```bash
   cd ~/Desktop/MTN_MOMO_MINI-APP
   ```

2. Install dependencies (only needed once, or after a fresh clone):

   ```bash
   npm install
   ```

## Running the App

Start the development server:

```bash
npm run dev
```

This will start a local Vite dev server. The terminal will display a URL like:

```
Local: http://localhost:5173/
```

Open that URL in your browser to view the app.

## Stopping the Server

Press `Ctrl + C` in the terminal to stop the dev server.

## Project Structure

```
MTN_MOMO_MINI-APP/
  index.html      -- Main HTML with all 4 pages
  style.css       -- Full styling (60% white, 30% yellow, 10% #004f71)
  app.js          -- Page navigation and placeholder interactions
  package.json    -- Project config and scripts
  README.md       -- Product concept and hackathon context
  SETUP.md        -- This file (how to run the app)
```

## Pages

| Page | Description |
|---|---|
| **Home** | Dashboard with wallet balance, savings summary, tickets, referrals, quick actions, recent activity, and jackpot counter |
| **Savings** | Personal savings account, group savings / stockvel, and milestone progress bar |
| **The Ruler** | 3-card rewards game with ticket info, card pick area, prize history, and jackpot section |
| **Referrals** | Unique referral code, progress tracker (0/10), referral list, and how-it-works steps |

## Notes

- All content is **placeholder** -- ready to be wired up to real MoMo API data and game logic.
- The bottom navigation switches between the 4 pages without page reloads.
- Game cards have a simple click animation as a visual placeholder.
- The referral code "Copy" button works with the clipboard API.
