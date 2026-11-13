-- الدرايف ومين مربوط (HERO المرحلة 6). إضافات بس: جدول جديد + أعمدة جديدة + جدولة كل ساعة.
-- ما تمسح ولا تغيّر أي بيانات موجودة.

-- ١) حالة كل عضو (وللمشرف/ة) مع مجلد الفريق
create table if not exists public.drive_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,   -- فاضي = المشرف/ة
  kind text not null check (kind in ('member', 'supervisor')),
  email text check (email is null or char_length(email) between 5 and 254),
  google_email text check (google_email is null or char_length(google_email) between 5 and 254),
  status text not null default 'missing_email' check (status in ('connected', 'invited', 'missing_email', 'view_only')),
  role text not null default 'writer' check (role in ('writer', 'commenter', 'reader')),
  invited_at timestamptz,
  connected_at timestamptz,
  last_sync_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((kind = 'member') = (profile_id is not null))
);
create unique index if not exists drive_members_member_uq on public.drive_members (team_id, profile_id) where kind = 'member';
create unique index if not exists drive_members_supervisor_uq on public.drive_members (team_id) where kind = 'supervisor';
alter table public.drive_members enable row level security;
grant select on public.drive_members to authenticated;
-- القراءة لأعضاء الفريق بس؛ الكتابة من دالة drive-team (مفتاح الخدمة) بس
drop policy if exists drive_members_select on public.drive_members;
create policy drive_members_select on public.drive_members for select to authenticated using (team_id = public.my_team_id());

-- ٢) ترتيب المجلد: معرّفات المجلدات الفرعية الستة + عدد الملفات + آخر فحص
alter table public.drive_connections add column if not exists subfolders jsonb not null default '{}'::jsonb;
alter table public.drive_connections add column if not exists folder_counts jsonb not null default '[]'::jsonb;
alter table public.drive_connections add column if not exists last_sync_at timestamptz;

-- ٣) القراءة للواجهة: ترتيب المجلد بدون أي رمز
create or replace function public.team_drive_folders()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('folders', coalesce(dc.folder_counts, '[]'::jsonb), 'lastSyncAt', dc.last_sync_at)
  from public.research_projects rp
  join public.drive_connections dc on dc.research_project_id = rp.id
  where rp.team_id = public.my_team_id()
  limit 1
$$;
revoke all on function public.team_drive_folders() from public, anon;
grant execute on function public.team_drive_folders() to authenticated;

-- ٤) نعيد فحص صلاحيات المجلدات كل ساعة (نفس سر الجدولة حق ملخص المشرف/ة)
select cron.unschedule('drive-sync-hourly') where exists (select 1 from cron.job where jobname = 'drive-sync-hourly');
select cron.schedule(
  'drive-sync-hourly',
  '17 * * * *',
  $cron$
  select net.http_post(
    url := 'https://uwdejlkvhsiqolmgihjq.supabase.co/functions/v1/drive-team',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'digest_secret')),
    body := '{"action":"sync_all"}'::jsonb
  );
  $cron$
);
