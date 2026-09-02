# Group Savings ("Pocket") Feature — Product & Build Spec

## Context / Overview

This specification details the **Group Savings feature ("Pockets")** built inside the **MTN MoMo Enhanced Mini App**.

Users are active MTN Mobile Money (MoMo) account holders with upstream KYC verification. This feature enables groups of MoMo users to pool money toward shared savings goals, with individual contribution tracking, a minimum savings lock period (90 days / 3 months), goal progress visualization, transparency controls, and interest yield that is protected by early withdrawal rules.

---

## 1. Core Concept & Business Rules

- A **Pocket** is a shared savings group created by a user (the **Creator / Admin**).
- Other MoMo users join via a unique **join code** (e.g. `POCK-7492-TRVL`) or shareable link.
- Each member contributes money from their MoMo wallet into the Pocket over time.
- The Pocket has a **savings purpose / preset category** (e.g., *Wedding, Education/School Fees, Emergency Fund, Travel, Rent/Housing, Business, Gadget/Asset Purchase, Other*) plus an optional free-text note (e.g. *"December Cape Town Trip"*).
- The Pocket displays a **target goal amount** and a real-time **progress bar** toward that goal.
- Each member sees **their own contribution total** and the **group total**. Individual member breakdowns are controlled via the **Transparency Ledger** settings.
- Funds are locked for a **minimum of 3 months (90 days)**:
  - **Matured Withdrawal (Lock Period Met):** Principal + full accrued interest (at 5.50% p.a.) paid out directly to MoMo wallet.
  - **Early Withdrawal (Lock Period Not Met):** Principal only returned; 100% of accrued interest is forfeited.

---

## 2. User Roles & Security Boundaries

| Role | Permissions & Powers |
|:---|:---|
| **Admin (Creator)** | Set Pocket name, savings purpose, goal amount, lock duration (min 3 months), configure Transparency Ledger visibility (Full vs. Totals Only), share/revoke join codes, view group audit trail. |
| **Member** | Join via code, contribute funds, view own contribution, view group total & progress bar, request withdrawal of own contributed principal, export audit statement, leave Pocket. |

> [!IMPORTANT]
> **Anti-Custodial Hard Rule:** Admin powers are strictly limited to *settings, parameters, and group invites*. Admins **cannot** move, seize, or withdraw other members' money. Every withdrawal only pays out directly to the MoMo wallet of the member who contributed the funds.

---

## 3. Core User Flows & UI Components

### 3.1 Create Pocket Flow
1. User clicks **"Create New Pocket"** on the Savings & Pockets dashboard.
2. Form fields:
   - **Pocket Name** (e.g., "Cape Town Holiday Villa")
   - **Savings Purpose / Category** (`travel`, `wedding`, `education`, `emergency`, `housing`, `business`, `asset_purchase`, `other`)
   - **Purpose Note** (optional custom description)
   - **Target Goal Amount (ZAR)**
   - **Lock Period Duration** (90 Days standard / 180 Days / 365 Days)
   - **Transparency Ledger Visibility** (`Full Visibility` or `Totals Only`)
   - **Initial Deposit Amount (Optional)**
3. User authenticates via **4-Digit MoMo PIN**.
4. System generates a unique join code (`POCK-[4Digits]-[Category]`), initializes the group, adds creator as Admin, records the audit trail, and opens the Pocket dashboard.

### 3.2 Join Pocket Flow
1. User clicks **"Join with Code"** and inputs join code.
2. System verifies the code, checking expiration and member capacity (max 20 members).
3. System renders an instant **Pocket Preview Card** displaying category icon, group name, target goal, current pooled total, lock duration, and member count.
4. User confirms join with **MoMo PIN authentication**.
5. User is added as Member, and the join event is recorded in the group audit log.

### 3.3 Contribute Funds Flow
1. Member clicks **"Contribute Funds"** from the Pocket dashboard.
2. Modal displays current MoMo wallet balance, amount input, and quick-add chips (`+R100`, `+R250`, `+R500`, `+R1,000`).
3. Real-time dynamic calculation displays:
   - Updated personal contribution total
   - Updated group pooled total
   - Guaranteed reward qualification
4. Member authorizes transaction via **4-Digit MoMo PIN**.
5. MoMo wallet balance is debited, pocket balance & progress bar update instantly, and an entry is logged in the audit trail.

### 3.4 Pocket Dashboard & Metrics
Each Pocket view features:
- **Hero Banner:** Purpose icon, category badge, Admin/Member role pill, lock status clock, and goal progress bar (`%` achieved, current pooled vs. goal, amount remaining).
- **4-Card Metric Grid:**
  1. *Total Group Pot*
  2. *My Contribution* (% share of group pot)
  3. *Accrued Interest* (5.5% p.a. yield rate)
  4. *Lock Period Clock* (Maturity date & remaining days)
- **Action Toolbar:** Contribute, Withdraw, Invite Friends, Statement.
- **Transparency Ledger:** Permission-gated table showing member names, masked phone numbers, join dates, contributed amounts, and share of pot.
- **Pocket Audit Trail:** Immutable chronological timeline of all group events.

### 3.5 Withdraw Funds Flow
1. Member clicks **"Request Withdrawal"**.
2. Withdrawable maximum is strictly capped at **that member's contributed principal**.
3. **Lock Period Validation:**
   - **If Lock Met ($\ge$ 90 Days):** Shows success banner; pays out 100% Principal + Accrued Interest (5.5% p.a.).
   - **If Early ($<$ 90 Days):** Shows warning banner; pays out Principal only; displays forfeited interest itemized in red.
4. Payout destination is locked to member's verified MTN MoMo account (`+27 83 *** 4921`).
5. Transaction authenticated via **MoMo PIN**.

---

## 4. Trust & Transparency Features

- **Transparency Ledger Toggle:** Configurable by Admin between *Full Transparency* (open ledger of all contributions) and *Totals Only* (privacy mode where only the group total and individual's own balance are visible).
- **Statement & CSV Export:** Downloadable per-pocket audit statement (`MoMo_Pocket_Statement_[Name].csv`) containing certified timestamped records.
- **Multi-Channel Invite Engine:** One-click sharing via WhatsApp, Telegram, SMS, or clipboard copy.

---

## 5. Security & Compliance Architecture

- **Transaction PIN Authentication (2FA):** Every financial action (creation with deposit, contributions, withdrawals) requires a 4-digit MoMo PIN.
- **Upstream KYC Reuse:** Identity and phone verification are inherited directly from MTN MoMo.
- **Anti-Fraud & Limits:** Member caps (20 members per Pocket), join code format validation, and non-custodial payout routes.

---

## 6. Complete Data Model

```sql
-- Pockets / Group Savings Table
CREATE TABLE pockets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    purpose_category VARCHAR(30) NOT NULL,    -- 'travel', 'wedding', 'education', 'emergency', 'housing', 'business', 'asset_purchase', 'other'
    purpose_note TEXT,
    goal_amount NUMERIC(12,2),
    lock_period_days INT DEFAULT 90,           -- Minimum 90 days
    interest_rate NUMERIC(5,4) DEFAULT 0.0550, -- 5.50% p.a.
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    lock_end_date TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active',       -- 'active', 'matured', 'dissolved'
    transparency_level VARCHAR(20) DEFAULT 'full', -- 'full', 'totals_only'
    member_cap INT DEFAULT 20,
    join_code VARCHAR(30) UNIQUE NOT NULL
);

-- Pocket Membership Table
CREATE TABLE pocket_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pocket_id UUID REFERENCES pockets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member',         -- 'admin', 'member'
    joined_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active'        -- 'active', 'left', 'removed'
);

-- Contributions Ledger
CREATE TABLE pocket_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pocket_id UUID REFERENCES pockets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    amount NUMERIC(12,2) NOT NULL,
    contributed_at TIMESTAMP DEFAULT NOW(),
    source_transaction_id VARCHAR(100)
);

-- Withdrawals Record
CREATE TABLE pocket_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pocket_id UUID REFERENCES pockets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    amount_principal NUMERIC(12,2) NOT NULL,
    amount_interest NUMERIC(12,2) DEFAULT 0.00,
    is_early_withdrawal BOOLEAN DEFAULT FALSE,
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'completed'
);

-- Audit Trail
CREATE TABLE pocket_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pocket_id UUID REFERENCES pockets(id) ON DELETE CASCADE,
    actor_name VARCHAR(100) NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. Open Decisions & Product Alignment

| # | Decision Item | Recommended / Implemented MVP Stance | Alternative / Future Expansion |
|:---:|:---|:---|:---|
| **1** | **Target vs. Susu/Rotating Model** | **Target/Goal Savings** (members save together toward a shared pot; each withdraws their own contribution). | Rotating Susu model where one member claims full pot per round. |
| **2** | **Contribution Schedule** | **Flexible Any-Amount** with quick-add chips (+R100, +R250, +R500, +R1,000). | Fixed recurring monthly debit via MoMo auto-save. |
| **3** | **Join Flow** | **Instant Join via Code** with preview validation & member cap. | Admin approval queue required before member admittance. |
| **4** | **Partial Withdrawals** | **Supported**: Member can withdraw partial principal (forfeiting pro-rata interest if early) and remain in the Pocket. | Full exit only. |
| **5** | **Lock-Period Clock** | **Pocket-Wide Clock** (from creation date to `lock_end_date`). | Per-deposit FIFO lock clock. |
| **6** | **Forfeited Interest Destination** | Absorbed back into the MTN MoMo reward & prize pool funding mechanism. | Redistributed pro-rata to remaining patient group members. |
| **7** | **Maturity Payout** | **On-Demand Member Withdrawal**: Member triggers payout at or after maturity. | Automated batch push to all MoMo wallets on maturity date. |
| **8** | **Admin Transfer** | Creator remains primary admin; if admin leaves, role auto-promotes to earliest joined active member. | Co-admin support. |
