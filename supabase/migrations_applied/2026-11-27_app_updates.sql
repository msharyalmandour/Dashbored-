-- «فيه تحديث جديد»: كل صف جديد هنا (sent_at فاضي) ترسله دالة app-updates مرة وحدة
-- (رسالة من ويسي بمحادثة كل فريق + إيميل لكل عضو مفعّل التذكيرات). pg_cron كل ١٠ دقايق.
-- مطبّق على المشروع (migrations: app_updates_announce, app_updates_cron_function).
create table if not exists public.app_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  lines text[] not null default '{}',
  closing text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.app_updates enable row level security;
-- الجدولة: cron.schedule('app-updates-announce', '*/10 * * * *', net.http_post → functions/v1/app-updates بسر digest_secret)
