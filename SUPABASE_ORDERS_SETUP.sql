-- Not4Normal order tracking table.
-- Run this in the Supabase SQL editor before relying on paid order tracking.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid null references public.products(id) on delete set null,
  product_title text not null,
  product_slug text not null,
  customer_email text not null,
  paddle_transaction_id text not null unique,
  paddle_customer_id text null,
  paddle_price_id text null,
  amount text null,
  currency text null,
  status text not null default 'completed',
  delivery_status text not null default 'pending',
  download_url_sent boolean not null default false,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx
  on public.orders(created_at desc);

create index if not exists orders_customer_email_idx
  on public.orders(customer_email);

create index if not exists orders_paddle_price_id_idx
  on public.orders(paddle_price_id);

alter table public.orders enable row level security;

-- No public RLS policies are required. The app writes and reads orders only
-- through server routes that use the Supabase service role key.
