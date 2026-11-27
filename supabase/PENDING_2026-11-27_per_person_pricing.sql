-- Wesync · السعر لكل شخص + نظام الدفع الكامل — 2026-11-27
-- • السعر: 15 ريال للشخص بالشهر · فصل (4 شهور) 49 · السنة الدراسية (9 شهور) 99 — والدكتورة مجانًا
-- • جدول الدفعات: مدة الدفعة، مين دفع (لو دفع عن صاحبه)، تبرع صندوق المنح، ودفعة عن الفريق كامل
-- • خصم الاستمرار: فريق اشتغل كل أسبوع آخر ٤ أسابيع → الشهري بـ 12
-- • جدولة تذكيرات الدفع يوميًا (12:07 الظهر بتوقيت الرياض)
-- ما يحذف أي بيانات. آمن لتشغيله أكثر من مرة.

-- 1) أعمدة الدفعات الجديدة (الدفعات القديمة تبقى «شهري» عن صاحبها)
alter table public.payments add column if not exists period text not null default 'month';
alter table public.payments add column if not exists paid_by uuid references public.profiles(id) on delete set null;
alter table public.payments add column if not exists donation numeric not null default 0;
alter table public.payments add column if not exists for_team boolean not null default false;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_period_check') then
    alter table public.payments add constraint payments_period_check check (period in ('month', 'semester', 'year'));
  end if;
end $$;

-- 2) اشتراك الفريق بالشهر للعرض = 15 × الأعضاء (المعاملات القديمة باقية بالتوقيع عشان التريقرز)
create or replace function public.team_monthly_total(p_plan text, p_is_founder boolean, p_members integer)
returns numeric
language sql
immutable
set search_path to 'public'
as $$
  select (15 * greatest(coalesce(p_members, 1), 1))::numeric;
$$;

update public.teams t
set monthly_price = public.team_monthly_total(
  t.plan, t.is_founder, (select count(*)::int from public.profiles p where p.team_id = t.id));

-- 3) خصم الاستمرار: نشاط (مهمة انضافت أو انقفلت، رسالة بالمحادثة، أو حدث بالتطبيق) بكل أسبوع من آخر ٤ أسابيع
create or replace function public.team_streak_ok(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  with acts as (
    select created_at as at from public.tasks where team_id = p_team and created_at > now() - interval '28 days'
    union all
    select completed_at from public.tasks where team_id = p_team and completed_at > now() - interval '28 days'
    union all
    select created_at from public.team_messages where team_id = p_team and created_at > now() - interval '28 days'
    union all
    select created_at from public.app_events where team_id = p_team and created_at > now() - interval '28 days'
  )
  select count(distinct floor(extract(epoch from (now() - at)) / 604800)) >= 4 from acts;
$$;
revoke execute on function public.team_streak_ok(uuid) from public, anon, authenticated;
grant execute on function public.team_streak_ok(uuid) to service_role;

create or replace function public.my_streak_ok()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(public.team_streak_ok(public.my_team_id()), false);
$$;
revoke execute on function public.my_streak_ok() from public, anon;
grant execute on function public.my_streak_ok() to authenticated;

-- 4) تذكيرات الدفع: كل يوم 09:07 UTC (12:07 الرياض) — نفس سر الجدولة حق الإيميلات
do $$
begin
  if exists (select 1 from cron.job where jobname = 'billing-nudges-daily') then
    perform cron.unschedule('billing-nudges-daily');
  end if;
  perform cron.schedule(
    'billing-nudges-daily',
    '7 9 * * *',
    $cron$
      select net.http_post(
        url := 'https://uwdejlkvhsiqolmgihjq.supabase.co/functions/v1/billing-nudges',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'digest_secret')
        ),
        body := '{"action":"daily"}'::jsonb
      );
    $cron$
  );
end $$;

-- تحقق: لازم يطلع 60 · 4 أعمدة · دالتين · جدولة وحدة
select
  public.team_monthly_total('ai', false, 4) as team_of_4,
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'payments' and column_name in ('period', 'paid_by', 'donation', 'for_team')) as new_columns,
  (select count(*) from pg_proc where proname in ('team_streak_ok', 'my_streak_ok')) as functions,
  (select count(*) from cron.job where jobname = 'billing-nudges-daily') as cron_jobs;
