-- Store the first name collected by the free-product claim modal.
-- Nullable keeps this safe for rows created before name capture existed.
alter table public.free_downloads
  add column if not exists first_name text;

-- Supports the recent-delivery lookup used to prevent accidental repeat
-- submissions without permanently blocking someone from requesting a new link.
create index if not exists free_downloads_product_email_created_at_idx
  on public.free_downloads(product_id, email, created_at desc);
