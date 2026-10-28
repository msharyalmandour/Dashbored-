-- ============================================================
-- كل الإصلاحات بملف واحد (شغّليه مرة وحدة من Supabase → SQL Editor):
--   ذاكرة المشروع + إشعارات الجوال + الجدولة اليومية + تشديد صلاحيات دوال داخلية
-- آمن لتشغيله أكثر من مرة.
-- ============================================================
create table if not exists public.project_memory (
  id uuid primary key default gen_random_uuid(),
  research_project_id uuid not null references public.research_projects (id) on delete cascade,
  note text not null check (char_length(note) between 1 and 400),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists project_memory_project_idx on public.project_memory (research_project_id, created_at);
alter table public.project_memory enable row level security;

drop policy if exists "memory viewable by the team" on public.project_memory;
create policy "memory viewable by the team" on public.project_memory for select to authenticated
  using (research_project_id = public.my_research_project_id());
drop policy if exists "team can add memory" on public.project_memory;
create policy "team can add memory" on public.project_memory for insert to authenticated
  with check (research_project_id = public.my_research_project_id() and public.team_can_write(public.my_team_id()) and created_by = auth.uid());
drop policy if exists "team can delete memory" on public.project_memory;
create policy "team can delete memory" on public.project_memory for delete to authenticated
  using (research_project_id = public.my_research_project_id() and public.team_can_write(public.my_team_id()));

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

-- دوال داخلية (تريقرات) ما لازم تنطلب من الـ API الخارجي
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.set_task_comment_team_id() from public, anon, authenticated;
revoke execute on function public.set_task_team_id() from public, anon, authenticated;
revoke execute on function public.set_team_founder_flag() from public, anon, authenticated;
revoke execute on function public.profiles_refresh_team_price() from public, anon, authenticated;
alter function public.set_task_completed_at() set search_path = public;
