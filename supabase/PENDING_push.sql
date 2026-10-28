-- ============================================================
-- إشعارات الجوال (Web Push) — شغّليه مرة وحدة من Supabase → SQL Editor
--   • push_config: مفاتيح VAPID تتولّد تلقائيًا بالدالة (service_role فقط، ما أحد يشوفها من الموقع)
--   • push_subscriptions: اشتراك كل جهاز (كل عضو يشوف ويحذف اشتراكاته بس)
--   • تذكير يومي ٨:٠٥ الصبح بتوقيت الرياض (٠٥:٠٥ UTC) — يستخدم نفس سر الجدولة حق الإيميلات
-- آمن لتشغيله أكثر من مرة.
-- ============================================================

create table if not exists public.push_config (
  id int primary key check (id = 1),
  public_key text not null,
  private_key text not null
);
alter table public.push_config enable row level security;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_profile_idx on public.push_subscriptions (profile_id);
alter table public.push_subscriptions enable row level security;

drop policy if exists "own push subscriptions select" on public.push_subscriptions;
create policy "own push subscriptions select" on public.push_subscriptions for select to authenticated using (profile_id = auth.uid());
drop policy if exists "own push subscriptions insert" on public.push_subscriptions;
create policy "own push subscriptions insert" on public.push_subscriptions for insert to authenticated with check (profile_id = auth.uid());
drop policy if exists "own push subscriptions delete" on public.push_subscriptions;
create policy "own push subscriptions delete" on public.push_subscriptions for delete to authenticated using (profile_id = auth.uid());

select cron.schedule(
  'push-daily',
  '5 5 * * *',
  $job$
  select net.http_post(
    url := 'https://uwdejlkvhsiqolmgihjq.supabase.co/functions/v1/push-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'digest_secret')
    ),
    body := '{"action":"daily"}'::jsonb
  );
  $job$
);
