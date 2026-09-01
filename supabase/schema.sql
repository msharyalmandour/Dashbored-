-- أثر (ATHAR) perfume store — initial schema.
-- Run this in the Supabase SQL editor (or via `supabase db push`) once the
-- project is created. Matches the shapes in src/lib/types.ts.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  notes_top text[] not null default '{}',
  notes_heart text[] not null default '{}',
  notes_base text[] not null default '{}',
  price numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2),
  concentration text not null default 'Eau de Parfum',
  volume_ml integer not null check (volume_ml > 0),
  gender text not null check (gender in ('men', 'women', 'unisex')),
  category text not null,
  collection text,
  accent_color text not null default '#caa14d',
  in_stock boolean not null default true,
  featured boolean not null default false,
  rating numeric(2, 1),
  reviews_count integer not null default 0,
  sku text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_slug on products (slug);
create index if not exists idx_products_gender on products (gender);
create index if not exists idx_products_category on products (category);

-- ─────────────────────────────────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  city text,
  address text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_id uuid references customers (id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  city text not null,
  address text not null,
  subtotal numeric(10, 2) not null,
  shipping_fee numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_method text check (payment_method in ('mada', 'visa', 'applepay', 'cod')),
  tap_charge_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_status on orders (status);
create index if not exists idx_orders_order_number on orders (order_number);

-- ─────────────────────────────────────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  product_name text not null,
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0),
  volume_ml integer not null
);

create index if not exists idx_order_items_order_id on order_items (order_id);

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- Storefront reads products with the anon key. Everything else (writing
-- products, creating orders/customers, reading orders in the admin
-- dashboard) goes through server-side code using the service role key,
-- which bypasses RLS — so no public policies are needed for those tables.
-- ─────────────────────────────────────────────────────────────────────────
alter table products enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

drop policy if exists "Public can read in-stock products" on products;
create policy "Public can read in-stock products"
  on products for select
  to anon, authenticated
  using (true);
