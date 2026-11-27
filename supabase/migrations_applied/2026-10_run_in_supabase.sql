-- ============================================================
-- (تقارير وتذكيرات) تاريخ إنجاز المهام، إيقاف التذكيرات، وسجل الإرسال
--    + تطبيق جدول task_comments فعليًا (كان معرّف فوق وما انطبّق بالإنتاج)
-- ============================================================
alter table public.tasks add column if not exists completed_at timestamptz;

-- يتعبّى لما المهمة تصير «منجزة» وينمسح لو رجعت — للتقرير الأسبوعي وقياس المساهمة
create or replace function public.set_task_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_task_completed_at on public.tasks;
create trigger set_task_completed_at
  before insert or update of status on public.tasks
  for each row execute procedure public.set_task_completed_at();

-- العضو يقدر يوقف إيميلات التذكير (سياسة «تحديث ملفي» الموجودة تغطيها)
alter table public.profiles add column if not exists email_reminders boolean not null default true;

-- سجل الإيميلات المرسلة — يمنع التكرار. يكتب فيه team-digest بمفتاح الخدمة فقط (بدون سياسات = مقفول على الكل)
create table if not exists public.reminder_log (
  id bigint generated always as identity primary key,
  kind text not null,
  ref_id uuid not null,
  recipient text not null,
  created_at timestamptz not null default now(),
  unique (kind, ref_id, recipient)
);
alter table public.reminder_log enable row level security;

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  team_id uuid references public.teams (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

-- تعبّي team_id تلقائيًا من فريق المهمة نفسها، حتى لو الواجهة ما أرسلتها
create or replace function public.set_task_comment_team_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.team_id is null then
    select team_id into new.team_id from public.tasks where id = new.task_id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_task_comment_team_id on public.task_comments;
create trigger set_task_comment_team_id
  before insert on public.task_comments
  for each row execute procedure public.set_task_comment_team_id();

alter table public.task_comments enable row level security;

-- القراءة مسموحة لأي عضو بالفريق
drop policy if exists "task comments are viewable by the team" on public.task_comments;
create policy "task comments are viewable by the team"
  on public.task_comments for select
  to authenticated
  using (team_id = public.my_team_id());

-- إضافة تعليق: أي عضو بالفريق، طالما اشتراك الفريق فعّال وينسبه لنفسه فقط
drop policy if exists "team members can add task comments" on public.task_comments;
create policy "team members can add task comments"
  on public.task_comments for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and public.team_can_write(public.my_team_id())
    and exists (select 1 from public.tasks where id = task_id and team_id = public.my_team_id())
  );

drop policy if exists "authors can delete their task comments" on public.task_comments;
create policy "authors can delete their task comments"
  on public.task_comments for delete
  to authenticated
  using (auth.uid() = author_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_comments'
  ) then
    alter publication supabase_realtime add table public.task_comments;
  end if;
end $$;
