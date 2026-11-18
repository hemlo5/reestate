-- Optional SQL Seed for Supabase PostgreSQL.
-- Note: The Housed Next.js server automatically populates missing seed rows on startup via DbAdapter.seedIfEmpty(),
-- or you can paste this into Supabase SQL Editor after running 001_initial_schema.sql.

insert into public.users (id, name, email, phone, role, city, avatar_url, auth_method, is_demo)
values
  ('seeker-1', 'Ananya Rao', 'ananya@housed.in', '+91 98450 11223', 'seeker', 'Bengaluru', null, 'password', true),
  ('broker-1', 'Vikram Mehta', 'vikram@koramangalahomes.in', '+91 98801 44556', 'broker', 'Bengaluru', '/images/brokers/broker_avatar_vikram_1794937316599.jpg', 'password', true),
  ('broker-2', 'Meera Nair', 'meera@eastsideestates.in', '+91 97412 88901', 'broker', 'Bengaluru', '/images/brokers/broker_avatar_meera_1794937317786.jpg', 'password', true),
  ('broker-3', 'Rohan Kulkarni', 'rohan@southyardrealty.in', '+91 99002 67311', 'broker', 'Bengaluru', '/images/brokers/broker_avatar_rohan_1794937317115.jpg', 'password', true)
on conflict (id) do nothing;
