-- سجل المقابلات للدراسات الكيفية: كل مقابلة برمز المشارك (بدون أسماء)، وحالتها، وعدد المواضيع الجديدة (للتشبّع).
create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.my_team_id() references public.teams (id) on delete cascade,
  code text not null,
  interview_date date,
  duration_min integer check (duration_min is null or (duration_min >= 0 and duration_min <= 600)),
  mode text not null default 'in_person' check (mode in ('in_person', 'phone', 'online')),
  status text not null default 'planned' check (status in ('planned', 'done', 'transcribed', 'coded')),
  new_themes integer check (new_themes is null or (new_themes >= 0 and new_themes <= 200)),
  notes text not null default '',
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists interviews_team_idx on public.interviews (team_id, interview_date);
alter table public.interviews enable row level security;

create policy "interviews are viewable by the team" on public.interviews
  for select using (team_id = public.my_team_id());
create policy "team members can add interviews" on public.interviews
  for insert with check (team_id = public.my_team_id() and public.team_can_write(public.my_team_id()));
create policy "team members can update interviews" on public.interviews
  for update using (team_id = public.my_team_id() and public.team_can_write(public.my_team_id()))
  with check (team_id = public.my_team_id());
create policy "team members can delete interviews" on public.interviews
  for delete using (team_id = public.my_team_id() and public.team_can_write(public.my_team_id()));
