-- الصقوه بـ Supabase ← SQL Editor ← Run (مرة وحدة)

-- ذاكرة المشروع: قرارات الفريق وحقائقه الثابتة اللي يتذكرها الوكيل
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
