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
  opened_at   timestamptz not null default now(),
  closed_at   timestamptz
);
create index if not exists bazaars_user_idx   on public.bazaars(user_id);
create index if not exists bazaars_vendor_idx on public.bazaars(vendor_id);

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
  unit_price    numeric not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists bazaar_items_bazaar_idx on public.bazaar_items(bazaar_id);

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
--  Records returns, moves unsold stock BACK into inventory,
--  computes qty_sold, and closes the bazaar.
--  p_returns = jsonb array of { item_id, qty_returned }
-- ============================================================
create or replace function public.close_bazaar(
  p_bazaar_id uuid,
  p_returns   jsonb
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
    set status = 'closed', closed_at = now()
    where id = p_bazaar_id and user_id = v_uid;
end;
$$;
