-- ThinkStore V60 Growth Enterprise - tablas opcionales para producción
create table if not exists loyalty_points (id bigserial primary key, customer_email text, points integer default 0, tier text default 'Inicial', created_at timestamptz default now());
create table if not exists verified_reviews (id bigserial primary key, order_code text, product text, stars integer default 5, comment text, customer_email text, created_at timestamptz default now());
create table if not exists featured_products (id bigserial primary key, product_name text, tag text, price_usd numeric default 0, active boolean default true, created_at timestamptz default now());
create table if not exists inventory_real (id bigserial primary key, product_name text, stock integer default 0, min_alert integer default 2, created_at timestamptz default now());
create table if not exists digital_warranties (id bigserial primary key, warranty_code text unique, customer text, product text, serial text, expires_at date, created_at timestamptz default now());
create table if not exists gift_cards (id bigserial primary key, code text unique, value_usd numeric default 0, recipient text, used boolean default false, created_at timestamptz default now());
create table if not exists smart_preorders (id bigserial primary key, order_code text, product text, status text, updated_at timestamptz default now());
create table if not exists birthday_campaigns (id bigserial primary key, customer text, contact text, discount text, sent boolean default false, created_at timestamptz default now());
