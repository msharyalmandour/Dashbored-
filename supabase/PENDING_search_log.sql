-- الصقوه بـ Supabase ← SQL Editor ← Run (مرة وحدة، آمن للتكرار)

-- سجل البحث بالقواعد (قوقل سكولار وPubMed…): وش بحثوا وكم طلع وكم اختاروا — يعرفه الوكيل ويفيد توثيق المنهجية (PRISMA)
create table if not exists public.literature_search_log (
  id uuid primary key default gen_random_uuid(),
  research_project_id uuid not null references public.research_projects (id) on delete cascade,
  database text not null check (char_length(database) between 1 and 40),
  query_text text not null check (char_length(query_text) between 1 and 1000),
  results_count int check (results_count is null or results_count >= 0),
  selected_count int check (selected_count is null or selected_count >= 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists literature_search_log_project_idx on public.literature_search_log (research_project_id, created_at desc);
alter table public.literature_search_log enable row level security;
drop policy if exists "search log viewable by the team" on public.literature_search_log;
create policy "search log viewable by the team" on public.literature_search_log for select to authenticated
  using (research_project_id = public.my_research_project_id());
drop policy if exists "team can add search log" on public.literature_search_log;
create policy "team can add search log" on public.literature_search_log for insert to authenticated
  with check (research_project_id = public.my_research_project_id() and public.team_can_write(public.my_team_id()) and created_by = auth.uid());
drop policy if exists "team can delete search log" on public.literature_search_log;
create policy "team can delete search log" on public.literature_search_log for delete to authenticated
  using (research_project_id = public.my_research_project_id() and public.team_can_write(public.my_team_id()));
