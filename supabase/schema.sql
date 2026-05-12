create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'user_role'
  ) then
    create type public.user_role as enum ('Admin', 'Cashier');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'shift_code'
  ) then
    create type public.shift_code as enum ('Office', 'SHIFT A', 'SHIFT B', 'SHIFT C', 'SHIFT D', 'SHIFT E');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text not null unique,
  email text not null unique,
  role public.user_role not null default 'Cashier',
  shift public.shift_code not null default 'SHIFT A',
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  barcode text unique,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  beginning_inventory integer not null default 0 check (beginning_inventory >= 0),
  added_purchase integer not null default 0 check (added_purchase >= 0),
  total_available integer generated always as (beginning_inventory + added_purchase) stored,
  sold integer not null default 0 check (sold >= 0),
  ending_inventory integer generated always as ((beginning_inventory + added_purchase) - sold) stored,
  selling_price numeric(10, 2) not null check (selling_price >= 0),
  sales numeric(10, 2) generated always as (sold * selling_price) stored,
  date_created date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  cashier_id uuid not null references public.profiles(id) on delete restrict,
  shift public.shift_code not null,
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  payment numeric(10, 2) not null check (payment >= 0),
  change numeric(10, 2) not null check (change >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  total numeric(10, 2) generated always as (quantity * unit_price) stored
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_barcode_idx on public.products(barcode);
create index if not exists inventory_logs_date_idx on public.inventory_logs(date_created);
create index if not exists sales_cashier_idx on public.sales(cashier_id);
create index if not exists sales_created_at_idx on public.sales(created_at);
create index if not exists sale_items_sale_idx on public.sale_items(sale_id);

create or replace function public.touch_product_stock_from_sale()
returns trigger
language plpgsql
as $$
begin
  update public.products
  set stock = greatest(stock - new.quantity, 0)
  where id = new.product_id;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    where t.tgname = 'sale_items_reduce_stock'
      and t.tgrelid = 'public.sale_items'::regclass
  ) then
    create trigger sale_items_reduce_stock
    after insert on public.sale_items
    for each row execute function public.touch_product_stock_from_sale();
  end if;
end
$$;

create or replace function public.current_role()
returns public.user_role
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.create_staff_account(
  p_name text,
  p_username text,
  p_email text,
  p_password text,
  p_role text,
  p_shift text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_user_id uuid := gen_random_uuid();
begin
  if public.current_role() <> 'Admin' then
    raise exception 'Only canteen officers can create accounts.';
  end if;

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    lower(p_email),
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    new_user_id,
    lower(p_email),
    jsonb_build_object('sub', new_user_id::text, 'email', lower(p_email)),
    'email',
    now(),
    now(),
    now()
  );

  insert into public.profiles (id, name, username, email, role, shift)
  values (new_user_id, p_name, p_username, lower(p_email), p_role::public.user_role, p_shift::public.shift_code);

  return new_user_id;
end;
$$;

create or replace function public.update_staff_account(
  p_id uuid,
  p_name text,
  p_username text,
  p_email text,
  p_password text,
  p_role text,
  p_shift text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.current_role() <> 'Admin' then
    raise exception 'Only canteen officers can update accounts.';
  end if;

  update public.profiles
  set name = p_name,
      username = p_username,
      email = lower(p_email),
      role = p_role::public.user_role,
      shift = p_shift::public.shift_code
  where id = p_id;

  update auth.users
  set email = lower(p_email),
      updated_at = now(),
      encrypted_password = case
        when p_password is null or p_password = '' then encrypted_password
        else crypt(p_password, gen_salt('bf'))
      end
  where id = p_id;

  update auth.identities
  set provider_id = lower(p_email),
      identity_data = jsonb_build_object('sub', p_id::text, 'email', lower(p_email)),
      updated_at = now()
  where user_id = p_id and provider = 'email';
end;
$$;

create or replace function public.delete_staff_account(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.current_role() <> 'Admin' then
    raise exception 'Only canteen officers can delete accounts.';
  end if;

  if p_id = auth.uid() then
    raise exception 'You cannot delete your own active account.';
  end if;

  delete from auth.users where id = p_id;
end;
$$;

grant execute on function public.create_staff_account(text, text, text, text, text, text) to authenticated;
grant execute on function public.update_staff_account(uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.delete_staff_account(uuid) to authenticated;

-- Seed: Admin account (for demos/dev)
-- Login: admin@school.edu / Admin12345
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@school.edu',
  crypt('Admin12345', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
)
on conflict (id) do update
set email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = now(),
    updated_at = now();

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'admin@school.edu',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000001', 'email', 'admin@school.edu'),
  'email',
  now(),
  now(),
  now()
)
on conflict (provider_id, provider) do update
set user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    updated_at = now();

insert into public.profiles (id, name, username, email, role, shift) values
  ('00000000-0000-0000-0000-000000000001', 'Canteen Officer', 'Admin', 'admin@school.edu', 'Admin', 'Office')
on conflict (username) do update
set name = excluded.name,
    id = excluded.id,
    username = excluded.username,
    email = excluded.email,
    role = excluded.role,
    shift = excluded.shift;

-- Convenience view: show "users" in the public schema (backed by profiles)
create or replace view public.users as
select
  id,
  name,
  username,
  email,
  role,
  shift,
  created_at
from public.profiles;

-- RLS (keep data from being "unrestricted" in Table Editor)
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.inventory_logs enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

drop policy if exists "Profiles can read own profile" on public.profiles;
create policy "Profiles can read own profile"
on public.profiles for select
using (id = auth.uid() or public.current_role() = 'Admin');

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles for all
using (public.current_role() = 'Admin')
with check (public.current_role() = 'Admin');

drop policy if exists "Authenticated users read categories" on public.categories;
create policy "Authenticated users read categories"
on public.categories for select
using (auth.role() = 'authenticated');

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories"
on public.categories for all
using (public.current_role() = 'Admin')
with check (public.current_role() = 'Admin');

drop policy if exists "Authenticated users read products" on public.products;
create policy "Authenticated users read products"
on public.products for select
using (auth.role() = 'authenticated');

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
on public.products for all
using (public.current_role() = 'Admin')
with check (public.current_role() = 'Admin');

drop policy if exists "Admins read and manage inventory" on public.inventory_logs;
create policy "Admins read and manage inventory"
on public.inventory_logs for all
using (public.current_role() = 'Admin')
with check (public.current_role() = 'Admin');

drop policy if exists "Cashiers can create own sales" on public.sales;
create policy "Cashiers can create own sales"
on public.sales for insert
with check (cashier_id = auth.uid() and public.current_role() = 'Cashier');

drop policy if exists "Sales visible by role" on public.sales;
create policy "Sales visible by role"
on public.sales for select
using (public.current_role() = 'Admin' or cashier_id = auth.uid());

drop policy if exists "Cashiers create sale items for own sales" on public.sale_items;
create policy "Cashiers create sale items for own sales"
on public.sale_items for insert
with check (
  exists (
    select 1 from public.sales
    where sales.id = sale_items.sale_id
    and sales.cashier_id = auth.uid()
  )
);

drop policy if exists "Sale items visible by role" on public.sale_items;
create policy "Sale items visible by role"
on public.sale_items for select
using (
  public.current_role() = 'Admin'
  or exists (
    select 1 from public.sales
    where sales.id = sale_items.sale_id
    and sales.cashier_id = auth.uid()
  )
);
