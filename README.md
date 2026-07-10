# NM Scrap Enterprises — Smart Inventory

A mobile (phone-frame) inventory app for a scrap business, built with **React + Vite**
and a **Supabase** backend. Buy · Track · Sell · Grow.

## What it does

- **Auth** — email/password sign-up & login (Supabase Auth). Each user only sees their own data (row-level security).
- **Inventory** — add / edit / delete products, search, low-stock alerts.
- **AI Bill Scanner (MVP)** — capture or upload a printed/handwritten bill → it's parsed into line
  items → an **editable review popup** lets you correct anything → confirm adds/merges into inventory.
- **Bazaar flow** — assign a slice of inventory to a bazaar (stock is deducted). When the bazaar ends,
  **record returns**: unsold stock flows back into inventory and the rest is recorded as **sold**.
- **Reports** — per-bazaar sold report (item breakdown), top-selling products, totals.

## One-time setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the schema:** open *SQL Editor → New query*, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates all tables,
   row-level-security policies, and the `assign_inventory` / `close_bazaar` functions.
3. **Add your keys:** copy `.env.example` to `.env` and fill in from
   *Project Settings → API*:
   ```
   VITE_SUPABASE_URL=https://your-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
4. **Run it:**
   ```
   npm install
   npm run dev
   ```
   Open http://localhost:5173, register an account, and start adding stock.

> Until `.env` is filled in, the login screen shows setup instructions instead of crashing.

## Bill scanner — real OCR (optional)

The scanner currently uses a **mock parser** (`src/lib/parseBill.js`) so the editable review flow
works with zero cost or keys. To read real handwritten/printed bills, replace the body of
`parseBill()` with a `fetch()` to a **Supabase Edge Function** that forwards the image to a vision
model (Claude vision recommended for handwriting) and returns the same `{ rawText, items }` shape.
Nothing else in the app changes.

## Project structure

```
supabase/schema.sql          Postgres schema · RLS · RPC functions
src/lib/supabase.js          Supabase client (reads .env)
src/lib/parseBill.js         Bill OCR (mock; swap for real vision API)
src/lib/format.js            currency / quantity / time helpers
src/context/AuthContext      session + sign in/up/out
src/context/DataContext      products/vendors/bazaars + CRUD + bazaar RPCs
src/context/NavContext       in-app screen navigation
src/context/ToastContext     toast notifications
src/components/*Screen.jsx   the app screens
src/components/Modal.jsx     reusable bottom-sheet
src/components/BillReviewModal.jsx   the editable scan-review popup
```

## Data model (Supabase)

| table          | purpose |
|----------------|---------|
| `products`     | inventory items (quantity, unit, unit_price, min_stock) |
| `vendors`      | bazaar locations / buyers |
| `bazaars`      | one selling event (active → closed) |
| `bazaar_items` | products assigned to a bazaar (assigned / returned / sold) |
| `bills`        | scanned bills (raw text) |
| `bill_items`   | parsed line items from a bill |

Stock movements are atomic via two Postgres functions:
`assign_inventory()` (deducts stock into a bazaar) and
`close_bazaar()` (returns unsold stock, computes sold, closes the bazaar).

# NMScrap
