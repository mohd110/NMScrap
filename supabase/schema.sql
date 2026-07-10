-- ============================================================
--  NM Scrap Enterprises — Supabase schema
--  Run this whole file in: Supabase Dashboard → SQL Editor → New query
--  It is idempotent-ish (safe to re-run) and sets up:
--    tables · indexes · row level security · RPC functions
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
--  PRODUCTS  (inventory items)
-- ------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  sku         text,
  category    text,
  unit        text not null default 'kg',       -- kg | units | MT
  quantity    numeric not null default 0,        -- current stock on hand
  min_stock   numeric not null default 0,        -- reorder threshold
  unit_price  numeric not null default 0,        -- value per unit (₹)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists products_user_idx on public.products(user_id);

-- ------------------------------------------------------------
--  VENDORS  (bazaar locations / buyers)
-- ------------------------------------------------------------
create table if not exists public.vendors (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  phone       text,
  frequency   text not null default 'weekly',    -- weekly | major | new
  created_at  timestamptz not null default now()
);
create index if not exists vendors_user_idx on public.vendors(user_id);

-- ------------------------------------------------------------
--  BAZAARS  (one selling event; inventory is assigned to it)
-- ------------------------------------------------------------
create table if not exists public.bazaars (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  vendor_id   uuid not null references public.vendors(id) on delete cascade,
  name        text not null,
  status      text not null default 'active',     -- active | closed
  return_date date,
  amount_received numeric not null default 0,      -- total ₹ received for the whole bazaar (revenue), set at close
  opened_at   timestamptz not null default now(),
  closed_at   timestamptz
);
create index if not exists bazaars_user_idx   on public.bazaars(user_id);
create index if not exists bazaars_vendor_idx on public.bazaars(vendor_id);
-- Add amount_received to pre-existing installs:
alter table public.bazaars add column if not exists amount_received numeric not null default 0;

-- ------------------------------------------------------------
--  BAZAAR ITEMS  (each product assigned to a bazaar)
--  qty_sold = qty_assigned - qty_returned  (filled at close)
-- ------------------------------------------------------------
create table if not exists public.bazaar_items (
  id            uuid primary key default gen_random_uuid(),
  bazaar_id     uuid not null references public.bazaars(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  product_name  text not null,        -- snapshot at assign time
  sku           text,
  unit          text not null default 'kg',
  qty_assigned  numeric not null default 0,
  qty_returned  numeric not null default 0,
  qty_sold      numeric not null default 0,
  unit_price    numeric not null default 0,   -- WHOLESALE / cost snapshot at assign time
  sale_price    numeric not null default 0,   -- actual selling price, captured at close
  created_at    timestamptz not null default now()
);
create index if not exists bazaar_items_bazaar_idx on public.bazaar_items(bazaar_id);
-- Add sale_price to pre-existing installs (create-table-if-not-exists won't):
alter table public.bazaar_items add column if not exists sale_price numeric not null default 0;

-- ------------------------------------------------------------
--  BILLS  (scanned printed / handwritten bills)
-- ------------------------------------------------------------
create table if not exists public.bills (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  image_url   text,
  raw_text    text,
  source      text not null default 'scan',       -- scan | manual
  status      text not null default 'imported',   -- pending | reviewed | imported
  created_at  timestamptz not null default now()
);
create index if not exists bills_user_idx on public.bills(user_id);

create table if not exists public.bill_items (
  id          uuid primary key default gen_random_uuid(),
  bill_id     uuid not null references public.bills(id) on delete cascade,
  name        text not null,
  sku         text,
  unit        text not null default 'units',
  quantity    numeric not null default 0,
  unit_price  numeric not null default 0
);
create index if not exists bill_items_bill_idx on public.bill_items(bill_id);

-- ============================================================
--  ROW LEVEL SECURITY
--  Every user only sees / edits their own data.
-- ============================================================
alter table public.products     enable row level security;
alter table public.vendors      enable row level security;
alter table public.bazaars      enable row level security;
alter table public.bazaar_items enable row level security;
alter table public.bills        enable row level security;
alter table public.bill_items   enable row level security;

-- Owner-scoped tables --------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['products','vendors','bazaars','bills'] loop
    execute format('drop policy if exists "own_select_%1$s" on public.%1$s;', t);
    execute format('drop policy if exists "own_write_%1$s"  on public.%1$s;', t);
    execute format($f$create policy "own_select_%1$s" on public.%1$s
                     for select using (auth.uid() = user_id);$f$, t);
    execute format($f$create policy "own_write_%1$s" on public.%1$s
                     for all using (auth.uid() = user_id)
                     with check (auth.uid() = user_id);$f$, t);
  end loop;
end $$;

-- Child tables scoped through their parent -----------------------------------
drop policy if exists "bazaar_items_access" on public.bazaar_items;
create policy "bazaar_items_access" on public.bazaar_items
  for all
  using (exists (select 1 from public.bazaars b
                 where b.id = bazaar_items.bazaar_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.bazaars b
                 where b.id = bazaar_items.bazaar_id and b.user_id = auth.uid()));

drop policy if exists "bill_items_access" on public.bill_items;
create policy "bill_items_access" on public.bill_items
  for all
  using (exists (select 1 from public.bills b
                 where b.id = bill_items.bill_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.bills b
                 where b.id = bill_items.bill_id and b.user_id = auth.uid()));

-- ============================================================
--  RPC: assign_inventory
--  Creates an active bazaar and moves stock OUT of inventory
--  atomically (one round-trip, all-or-nothing).
--  p_items = jsonb array of
--    { product_id, product_name, sku, unit, qty, unit_price }
-- ============================================================
create or replace function public.assign_inventory(
  p_vendor_id  uuid,
  p_name       text,
  p_return_date date,
  p_items      jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_bazaar_id uuid;
  v_item      jsonb;
  v_uid       uuid := auth.uid();
  v_qty       numeric;
begin
  insert into public.bazaars (user_id, vendor_id, name, return_date, status)
  values (v_uid, p_vendor_id, p_name, p_return_date, 'active')
  returning id into v_bazaar_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'qty')::numeric;

    insert into public.bazaar_items
      (bazaar_id, product_id, product_name, sku, unit, qty_assigned, unit_price)
    values (
      v_bazaar_id,
      nullif(v_item->>'product_id','')::uuid,
      v_item->>'product_name',
      v_item->>'sku',
      coalesce(v_item->>'unit','kg'),
      v_qty,
      coalesce((v_item->>'unit_price')::numeric, 0)
    );

    if (v_item->>'product_id') is not null and (v_item->>'product_id') <> '' then
      update public.products
        set quantity = quantity - v_qty, updated_at = now()
        where id = (v_item->>'product_id')::uuid and user_id = v_uid;
    end if;
  end loop;

  return v_bazaar_id;
end;
$$;

-- ============================================================
--  RPC: close_bazaar
--  Records per-item returns, moves unsold stock BACK into
--  inventory, computes qty_sold, stores the single total amount
--  received for the whole bazaar (revenue), and closes it.
--  Profit = amount_received − wholesale cost of goods sold,
--  derived at report time.
--  p_returns = jsonb array of { item_id, qty_returned }
-- ============================================================
create or replace function public.close_bazaar(
  p_bazaar_id       uuid,
  p_returns         jsonb,
  p_amount_received numeric default 0
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ret jsonb;
  v_uid uuid := auth.uid();
begin
  for v_ret in select * from jsonb_array_elements(p_returns)
  loop
    update public.bazaar_items bi
      set qty_returned = (v_ret->>'qty_returned')::numeric,
          qty_sold     = greatest(bi.qty_assigned - (v_ret->>'qty_returned')::numeric, 0)
      where bi.id = (v_ret->>'item_id')::uuid
        and bi.bazaar_id = p_bazaar_id;

    update public.products p
      set quantity = quantity + (v_ret->>'qty_returned')::numeric, updated_at = now()
      from public.bazaar_items bi
      where bi.id = (v_ret->>'item_id')::uuid
        and p.id = bi.product_id
        and p.user_id = v_uid;
  end loop;

  update public.bazaars
    set status = 'closed', closed_at = now(),
        amount_received = coalesce(p_amount_received, 0)
    where id = p_bazaar_id and user_id = v_uid;
end;
$$;

-- ============================================================
--  DIRECT SALES  (sell products individually, outside a bazaar)
--  Each sale is ONE bill with one or more line items. The
--  selling price is captured per line and may differ from the
--  product's wholesale (cost) price. Profit is stored for the
--  owner's own reporting only — it is never shown on the bill.
-- ============================================================
create table if not exists public.sales (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  bill_no      text not null,
  buyer_name   text,
  buyer_phone  text,
  payment_mode text not null default 'cash',     -- cash | upi | credit
  note         text,
  total        numeric not null default 0,        -- selling total (₹)
  cost_total   numeric not null default 0,        -- wholesale total (₹, internal)
  profit       numeric not null default 0,        -- total - cost_total (internal)
  created_at   timestamptz not null default now()
);
create index if not exists sales_user_idx on public.sales(user_id);

create table if not exists public.sale_items (
  id              uuid primary key default gen_random_uuid(),
  sale_id         uuid not null references public.sales(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  product_name    text not null,        -- snapshot at sale time
  sku             text,
  unit            text not null default 'kg',
  quantity        numeric not null default 0,
  wholesale_price numeric not null default 0,     -- cost snapshot (internal)
  sale_price      numeric not null default 0,     -- actual selling price
  line_total      numeric not null default 0      -- quantity * sale_price
);
create index if not exists sale_items_sale_idx on public.sale_items(sale_id);

-- RLS for the two new tables (mirrors the pattern above) -----------------------
alter table public.sales      enable row level security;
alter table public.sale_items enable row level security;

drop policy if exists "own_select_sales" on public.sales;
drop policy if exists "own_write_sales"  on public.sales;
create policy "own_select_sales" on public.sales
  for select using (auth.uid() = user_id);
create policy "own_write_sales" on public.sales
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sale_items_access" on public.sale_items;
create policy "sale_items_access" on public.sale_items
  for all
  using (exists (select 1 from public.sales s
                 where s.id = sale_items.sale_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.sales s
                 where s.id = sale_items.sale_id and s.user_id = auth.uid()));

-- ============================================================
--  RPC: record_sale
--  Creates a bill, writes its line items, and moves stock OUT
--  of inventory atomically. Refuses to oversell. Auto-numbers
--  the bill (NM-0001, NM-0002, ...) per user.
--  p_items = jsonb array of
--    { product_id, product_name, sku, unit, quantity,
--      wholesale_price, sale_price }
-- ============================================================
create or replace function public.record_sale(
  p_buyer_name   text,
  p_buyer_phone  text,
  p_payment_mode text,
  p_note         text,
  p_items        jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sale_id    uuid;
  v_item       jsonb;
  v_uid        uuid := auth.uid();
  v_qty        numeric;
  v_sale_price numeric;
  v_cost       numeric;
  v_pid        uuid;
  v_stock      numeric;
  v_bill_no    text;
  v_total      numeric := 0;
  v_cost_total numeric := 0;
begin
  -- next bill number for this user, zero-padded: NM-0001, NM-0002, ...
  v_bill_no := 'NM-' || lpad(
    ((select count(*) from public.sales where user_id = v_uid) + 1)::text, 4, '0');

  insert into public.sales
    (user_id, bill_no, buyer_name, buyer_phone, payment_mode, note)
  values
    (v_uid, v_bill_no, nullif(p_buyer_name,''), nullif(p_buyer_phone,''),
     coalesce(nullif(p_payment_mode,''), 'cash'), nullif(p_note,''))
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty        := coalesce((v_item->>'quantity')::numeric, 0);
    v_sale_price := coalesce((v_item->>'sale_price')::numeric, 0);
    v_cost       := coalesce((v_item->>'wholesale_price')::numeric, 0);
    v_pid        := nullif(v_item->>'product_id','')::uuid;

    -- move stock out (and refuse to oversell) when it's a real product
    if v_pid is not null then
      select quantity into v_stock from public.products
        where id = v_pid and user_id = v_uid for update;
      if v_stock is null then
        raise exception 'Product not found';
      end if;
      if v_stock < v_qty then
        raise exception 'Not enough stock for % (have %, need %)',
          v_item->>'product_name', v_stock, v_qty;
      end if;
      update public.products
        set quantity = quantity - v_qty, updated_at = now()
        where id = v_pid and user_id = v_uid;
    end if;

    insert into public.sale_items
      (sale_id, product_id, product_name, sku, unit, quantity,
       wholesale_price, sale_price, line_total)
    values
      (v_sale_id, v_pid, v_item->>'product_name', v_item->>'sku',
       coalesce(v_item->>'unit','kg'), v_qty, v_cost, v_sale_price,
       v_qty * v_sale_price);

    v_total      := v_total + v_qty * v_sale_price;
    v_cost_total := v_cost_total + v_qty * v_cost;
  end loop;

  update public.sales
    set total = v_total, cost_total = v_cost_total, profit = v_total - v_cost_total
    where id = v_sale_id;

  return v_sale_id;
end;
$$;
