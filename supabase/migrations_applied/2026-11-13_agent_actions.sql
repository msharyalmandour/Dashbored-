-- الوكيل (المرحلة 7): سجل كل شي سوّاه الوكيل بعد «وافقوا وسوّوها»
-- مين وافق، وش تغيّر (diff)، وكيف نتراجع (undo) خلال 24 ساعة.
-- يعيد التشغيل بأمان (idempotent). ما يحذف ولا يغيّر أي جدول موجود.

create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  approved_by uuid references public.profiles(id) on delete set null,
  request text not null default '',
  summary text not null default '',
  -- [{ type, label, to, diff, undo }]: كل خطوة انسوت، ووش كان قبلها، وكيف ترجع
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  undone_at timestamptz,
  undone_by uuid references public.profiles(id) on delete set null
);

create index if not exists agent_actions_team_created on public.agent_actions (team_id, created_at desc);

alter table public.agent_actions enable row level security;
grant select, insert on public.agent_actions to authenticated;

drop policy if exists agent_actions_select on public.agent_actions;
create policy agent_actions_select on public.agent_actions
  for select to authenticated
  using (team_id = public.my_team_id());

-- الإضافة: لفريقي بس، وباسمي أنا (اللي وافق)
drop policy if exists agent_actions_insert on public.agent_actions;
create policy agent_actions_insert on public.agent_actions
  for insert to authenticated
  with check (team_id = public.my_team_id() and approved_by = auth.uid() and undone_at is null);

-- التراجع: ما فيه تعديل مباشر على السجل؛ بس هالدالة تعلّم «تراجعنا» خلال 24 ساعة
create or replace function public.mark_agent_action_undone(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team uuid := public.my_team_id();
  v_ok boolean;
begin
  if auth.uid() is null or v_team is null then
    return false;
  end if;
  update public.agent_actions
     set undone_at = now(), undone_by = auth.uid()
   where id = p_id
     and team_id = v_team
     and undone_at is null
     and created_at > now() - interval '24 hours'
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

revoke all on function public.mark_agent_action_undone(uuid) from public;
grant execute on function public.mark_agent_action_undone(uuid) to authenticated;
