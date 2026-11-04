-- لم يُطبَّق بعد: Supabase طلب تأكيد وما وصل رد. يُطبَّق بعد موافقة المالك ثم ينتقل لـ migrations_applied.
-- محادثة الفريق داخل التطبيق (موافقة المالك 2026-11-04): قروب الفريق بدل واتساب، مربوط بالشغل.
-- الفريق بس يشوف رسائله (المشرف/ة ما يشوفها). كل عضو يكتب ويعدّل ويحذف رسائله هو.
create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.my_team_id() references public.teams (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  reply_to uuid references public.team_messages (id) on delete set null,
  -- رسالة تشير لشي بالبحث: مهمة / قسم مقترح / دراسة بالمكتبة
  ref_type text check (ref_type in ('task', 'section', 'paper')),
  ref_id text check (char_length(ref_id) <= 80),
  ref_label text check (char_length(ref_label) <= 200),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists team_messages_team_created on public.team_messages (team_id, created_at desc);

alter table public.team_messages enable row level security;

drop policy if exists "team reads its messages" on public.team_messages;
create policy "team reads its messages" on public.team_messages
  for select to authenticated using (team_id = public.my_team_id());

drop policy if exists "members post to their team" on public.team_messages;
create policy "members post to their team" on public.team_messages
  for insert to authenticated
  with check (auth.uid() = author_id and team_id = public.my_team_id() and public.team_can_write(public.my_team_id()));

drop policy if exists "authors edit their messages" on public.team_messages;
create policy "authors edit their messages" on public.team_messages
  for update to authenticated
  using (auth.uid() = author_id and team_id = public.my_team_id())
  with check (auth.uid() = author_id and team_id = public.my_team_id());

drop policy if exists "authors delete their messages" on public.team_messages;
create policy "authors delete their messages" on public.team_messages
  for delete to authenticated using (auth.uid() = author_id);

-- رسائل لحظية
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'team_messages') then
    alter publication supabase_realtime add table public.team_messages;
  end if;
end $$;
