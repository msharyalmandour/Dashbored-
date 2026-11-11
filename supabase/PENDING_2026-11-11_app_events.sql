-- أحداث الاستخدام (analytics) — جدول جديد بس، ما يغيّر أي جدول موجود ولا يحذف شي.
-- الموقع يكتب فيه: drop_started · drop_read · drop_results_shown · drop_filed (عدد كل مكان) · drop_undo · drop_error (الكود).
-- الفريق والمستخدم يتعبّون من القاعدة نفسها (ما يقدر أحد يكتب باسم غيره)، والقراءة للمشرف العام (super admin) بس.
create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  team_id uuid default public.my_team_id() references public.teams(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (name ~ '^[a-z][a-z_]{1,39}$'),
  props jsonb not null default '{}'::jsonb check (jsonb_typeof(props) = 'object' and pg_column_size(props) < 2000),
  created_at timestamptz not null default now()
);
create index if not exists app_events_name_time on public.app_events (name, created_at desc);
create index if not exists app_events_team_time on public.app_events (team_id, created_at desc);

alter table public.app_events enable row level security;

drop policy if exists app_events_insert on public.app_events;
create policy app_events_insert on public.app_events for insert to authenticated
  with check (user_id = auth.uid() and team_id is not distinct from public.my_team_id());

drop policy if exists app_events_admin_read on public.app_events;
create policy app_events_admin_read on public.app_events for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin));
