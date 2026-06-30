# LoveTap / STH Financial — Account Setup Guide

This guide explains how to set up accounts for your clients (the workers who
receive tips) from start to finish. There are two sides to every account:

1. **The Admin Dashboard (web)** — where *you* create the client's account and
   assign them an NFC chip.
2. **The Mobile App** — where the *client* logs in, connects their Square +
   bank account, and starts receiving payouts.

Follow the steps in order. The whole process takes about 5–10 minutes per client.

---

## Part 0 — One-time setup (first time only)

You only need to do this once, before you onboard your first client.

### Web Admin Dashboard
- **URL:** https://sthfinancial.vercel.app
- **Login page:** https://sthfinancial.vercel.app/login
- **Default admin login:**
  - Email: `admin@lovetap.me`
  - Password: `admin123`

> ⚠️ **Change this password** after your first login (Dashboard → **Settings**).
> The default credentials are public knowledge and must not be left active.

### Mobile App (for clients)
- App name: **LoveTap** (`lovetap.me`)
- The app connects to the same backend at `https://sthfinancial.vercel.app/api`.
- Clients install it from the App Store / Google Play (or the build link you
  send them).

---

## Part 1 — Create the client's account (Admin Dashboard)

You can create a client account in **two ways**. Pick whichever you prefer.

### Option A — Create it for them (recommended)

1. Log in to the dashboard at https://sthfinancial.vercel.app/login.
2. In the left menu, go to **Customers**.
3. Click **+ Add Customer** (top right).
4. Fill in the form:
   - **Full Name** — e.g. `John Doe`
   - **Email** — the client's real email (this is their login username)
   - **Phone** — e.g. `+1 (555) 000-0000`
   - **Password** — set a temporary password (e.g. `Welcome123`)
5. Click **Save / Add Customer**.

The client now exists in the system. Send them their email + temporary
password, and tell them to change it after first login (in the app's
**Profile** screen).

> If you leave the password blank, the system assigns a default of `default123`.
> Always set a real one and share it securely.

### Option B — Let the client sign up themselves

The client can self-register directly in the mobile app:

1. They open the LoveTap app and tap **Sign Up**.
2. They enter **Name, Email, Phone, and Password**.
3. The account is created instantly and they're logged in.

After they sign up, they'll appear automatically in your **Customers** list in
the dashboard, where you can then assign them an NFC chip (Part 2).

---

## Part 2 — Assign an NFC chip to the client (Admin Dashboard)

Each client needs at least one NFC chip — this is the physical tag a tipper
taps to pay them.

1. In the dashboard menu, go to **NFC Chips**.
2. Click **+ Add / Register Chip**.
3. Enter:
   - **Chip UID** — the unique ID printed on / encoded in the physical chip.
   - **Customer** — select the client you just created from the dropdown.
4. Click **Save**.

The chip is now linked to that client. Any tip paid through that chip will be
credited to them.

> A chip can be registered without a customer and assigned later. A UID can only
> be registered **once** — if you get a "Chip UID already registered" error, the
> chip is already in the system.

---

## Part 3 — Client finishes setup in the Mobile App

Send the client these instructions. They complete this on their phone.

### 1. Log in
- Open the **LoveTap** app.
- Tap **Log In** and enter the email + password from Part 1.
- (If they forgot the password, they can tap **Forgot Password** to reset it.)

### 2. Connect Square (payment processing)
This lets the app accept card payments from tippers.

- Go to **Profile** (or the **Connect** prompt on the Dashboard).
- Tap **Connect Square**.
- The device browser opens Square's login. The client signs in to their Square
  account and approves access.
- After approving, they're returned to the app and Square shows as **Connected**.

### 3. Connect a bank account (payouts)
This is where their tip money is paid out.

- In **Profile**, tap **Bank Account / Payouts**.
- Follow the prompts to link their bank.
- Status will change from **Pending** → **Connected** once linked.

The client is fully set up once **both** Square and the bank account show
**Connected**.

---

## Part 4 — Verify everything works (test tip)

1. Have the client open the app (or just have the chip ready).
2. Using a **different phone**, tap the client's NFC chip.
3. The tipper flow opens → choose a tip amount → pay with a card.
4. Confirm:
   - The tipper sees a **success / result** screen.
   - The transaction appears under **Transactions** in the client's app and in
     your admin dashboard.

---

## Part 5 — Payouts

- Clients request payouts from the **Payouts** screen in the mobile app.
- You (admin) review and process payout requests from **Payouts** in the web
  dashboard.
- Payouts only work once the client's bank account status is **Connected**.

---

## Quick checklist per client

- [ ] Account created in dashboard **Customers** (or client self-signed-up)
- [ ] Temporary password shared securely
- [ ] NFC chip registered and assigned to the client (**NFC Chips**)
- [ ] Client logged into the mobile app and changed password
- [ ] Square **Connected**
- [ ] Bank account **Connected**
- [ ] Test tip completed successfully

---

## Troubleshooting

| Problem | Cause / Fix |
|---|---|
| "Email already registered" when adding a client | An account with that email already exists. Search **Customers** for it instead of recreating. |
| "Chip UID already registered" | That chip is already in the system. Find it under **NFC Chips** and reassign it. |
| Square won't connect / "Square OAuth not configured" | Backend Square credentials (`SQUARE_APPLICATION_ID`, etc.) aren't set. This is an admin/server config issue — contact your developer. |
| Bank account stuck on **Pending** | The client started but didn't finish the Square/bank approval. Have them retry **Connect** in **Profile**. |
| Client can't log in | Confirm the email is correct and have them use **Forgot Password** to reset. |
| Tip taps don't open anything | The chip isn't assigned to a customer, or the UID was registered wrong. Re-check the assignment in **NFC Chips**. |

---

### Summary of the flow

```
Admin creates account (Customers)
        │
        ▼
Admin assigns NFC chip (NFC Chips)
        │
        ▼
Client logs into mobile app  ──►  Connects Square  ──►  Connects bank account
        │
        ▼
Tipper taps chip ──► pays tip ──► funds tracked ──► client requests payout ──► admin processes payout
```
