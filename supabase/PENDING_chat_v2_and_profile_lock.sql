-- لم يُطبَّق بعد: المالك يشغّله من Supabase → SQL Editor. آمن لتشغيله أكثر من مرة. ما يحذف أي بيانات.

-- ═══ أ) تصميم المحادثة وأول أسبوع (موافقة المالك 2026-11-04) ═══

-- شخصية الأفاتار اللي يختارها العضو (مثل "shemagh:2:1") — الفاضي = تتوزع حسب الاسم
alter table public.profiles add column if not exists avatar text check (avatar is null or char_length(avatar) <= 40);

-- إخفاء كرت «أول أسبوع» للفريق كله
alter table public.teams add column if not exists first_week_dismissed_at timestamptz;

create or replace function public.dismiss_first_week()
returns void
language sql
security definer
set search_path = public
as $$
  update public.teams set first_week_dismissed_at = now() where id = public.my_team_id();
$$;
revoke all on function public.dismiss_first_week() from public, anon;
grant execute on function public.dismiss_first_week() to authenticated;

-- ✓✓ انقرأت: آخر وقت قرا فيه كل عضو المحادثة
create table if not exists public.team_chat_reads (
  team_id uuid not null references public.teams (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);
alter table public.team_chat_reads enable row level security;

drop policy if exists "team sees chat reads" on public.team_chat_reads;
create policy "team sees chat reads" on public.team_chat_reads
  for select to authenticated using (team_id = public.my_team_id());

drop policy if exists "members mark own read" on public.team_chat_reads;
create policy "members mark own read" on public.team_chat_reads
  for insert to authenticated with check (profile_id = auth.uid() and team_id = public.my_team_id());

drop policy if exists "members update own read" on public.team_chat_reads;
create policy "members update own read" on public.team_chat_reads
  for update to authenticated
  using (profile_id = auth.uid() and team_id = public.my_team_id())
  with check (profile_id = auth.uid() and team_id = public.my_team_id());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'team_chat_reads') then
    alter publication supabase_realtime add table public.team_chat_reads;
  end if;
end $$;

-- ═══ ب) إصلاح أمني: العضو يعدّل بس حقوله العادية بملفه ═══
-- قبل: أي حساب يقدر يحط لنفسه is_super_admin أو team_id (يدخل أي فريق) أو role (يصير قائد) بطلب مباشر.
-- الموقع يعدّل بس: email_reminders, reduce_motion, paper_mode (+ avatar الجديد). الانضمام والأدوار من دوال السيرفر.
revoke update on public.profiles from authenticated, anon;
grant update (name, initials, title, color, gender, email_reminders, reduce_motion, paper_mode, avatar) on public.profiles to authenticated;
revoke insert on public.profiles from anon;
revoke insert on public.profiles from authenticated;
grant insert (id, name, initials, title, color, email, gender) on public.profiles to authenticated;
