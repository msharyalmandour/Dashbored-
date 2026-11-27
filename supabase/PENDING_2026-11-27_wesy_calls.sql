-- Wesync · «ويسي يتصل» — 2026-11-27
-- • كل اجتماع يبدأ (أو يجي وقته بالتقويم) = «مكالمة» للفريق: شاشة مكالمة واردة بالتطبيق + إشعار
-- • كل عضو يرد: داخل / بعد 5 دقايق / ما أقدر (والسبب ينكتب بالمحضر كاعتذار)
-- • اتصال هاتفي حقيقي للغايب — بس لو هو فعّله بنفسه، وعلى رقمه اللي أكّده بالواتساب
-- • جدولة كل 5 دقايق: تتصل وقت اجتماعات التقويم، وتتصل بالجوال على اللي غاب بعد 5 دقايق
-- ما يحذف أي بيانات. آمن لتشغيله أكثر من مرة.

-- 1) المكالمات
create table if not exists public.meet_calls (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  started_by uuid references public.profiles (id) on delete set null,
  source text not null default 'join' check (source in ('join', 'manual', 'schedule')),
  calendar_event_id uuid references public.calendar_events (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists meet_calls_team_idx on public.meet_calls (team_id, created_at desc);
alter table public.meet_calls enable row level security;
drop policy if exists "team reads its calls" on public.meet_calls;
create policy "team reads its calls" on public.meet_calls for select to authenticated using (team_id = public.my_team_id());

-- 2) الردود (عضو واحد = رد واحد لكل مكالمة، ويقدر يغيّره)
create table if not exists public.meet_call_answers (
  call_id uuid not null references public.meet_calls (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  answer text not null check (answer in ('join', 'later', 'cant')),
  reason text not null default '' check (char_length(reason) <= 120),
  phoned_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (call_id, profile_id)
);
alter table public.meet_call_answers enable row level security;
drop policy if exists "team reads call answers" on public.meet_call_answers;
create policy "team reads call answers" on public.meet_call_answers for select to authenticated using (team_id = public.my_team_id());
drop policy if exists "member answers own call" on public.meet_call_answers;
create policy "member answers own call" on public.meet_call_answers for insert to authenticated
  with check (profile_id = (select auth.uid()) and team_id = public.my_team_id()
    and exists (select 1 from public.meet_calls c where c.id = call_id and c.team_id = public.my_team_id()));
drop policy if exists "member updates own answer" on public.meet_call_answers;
create policy "member updates own answer" on public.meet_call_answers for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()) and team_id = public.my_team_id());

-- التحديث الحي (شاشة المكالمة تطلع على طول، والردود تطلع بالغرفة)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meet_calls') then
    alter publication supabase_realtime add table public.meet_calls;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meet_call_answers') then
    alter publication supabase_realtime add table public.meet_call_answers;
  end if;
end $$;

-- 3) «ويسي يتصل علي بالجوال لو غبت» — اختيار كل عضو لنفسه، على رقمه المؤكد بالواتساب
alter table public.whatsapp_links add column if not exists call_me boolean not null default false;

create or replace function public.meet_set_call_me(p_on boolean)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.whatsapp_links set call_me = coalesce(p_on, false) where profile_id = auth.uid() and linked_at is not null;
  return found;
end;
$$;
revoke execute on function public.meet_set_call_me(boolean) from public, anon;
grant execute on function public.meet_set_call_me(boolean) to authenticated;

-- 4) الجدولة: كل 5 دقايق (اجتماعات التقويم + اتصال الجوال للغايب) — نفس سر الجدولة حق الإيميلات
do $$
begin
  if exists (select 1 from cron.job where jobname = 'meet-ring') then
    perform cron.unschedule('meet-ring');
  end if;
  perform cron.schedule(
    'meet-ring',
    '*/5 * * * *',
    $cron$
      select net.http_post(
        url := 'https://uwdejlkvhsiqolmgihjq.supabase.co/functions/v1/meet-token',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'digest_secret')
        ),
        body := '{"action":"cron"}'::jsonb
      );
    $cron$
  );
end $$;

-- تحقق: لازم يطلع 2 · 2 · 1 · 1
select
  (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('meet_calls', 'meet_call_answers')) as tables,
  (select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('meet_calls', 'meet_call_answers')) as realtime,
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'whatsapp_links' and column_name = 'call_me') as call_me,
  (select count(*) from cron.job where jobname = 'meet-ring') as cron_jobs;
