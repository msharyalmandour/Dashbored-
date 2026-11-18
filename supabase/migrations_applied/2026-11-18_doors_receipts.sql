-- Wesync · الخطوة 20 (نظام الأبواب) + الخطوة 28 (الإيصالات)
-- جدولين جداد بس، ما يغيّر ولا يحذف أي بيانات موجودة. RLS بالفريق. آمن للتشغيل أكثر من مرة.

-- 1) الأبواب لكل فريق: متى انفتح الباب، ومتى شافوا لحظة انفتاحه
create table if not exists public.team_doors (
  team_id uuid not null default public.my_team_id() references public.teams(id) on delete cascade,
  key text not null check (key in ('write', 'methodology', 'supervisor', 'calendar', 'collect')),
  unlocked_at timestamptz not null default now(),
  seen_at timestamptz,
  primary key (team_id, key)
);
alter table public.team_doors enable row level security;
drop policy if exists "team reads its doors" on public.team_doors;
create policy "team reads its doors" on public.team_doors for select to authenticated using (team_id = public.my_team_id());
-- الكتابة عبر الدوال تحت بس

-- 2) الإيصالات: «سوّيتوا شي ↔ هذا دليله» (B02Receipt) — باب ينفتح، مهمة تخلص بدليل، محضر ينعتمد…
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.my_team_id() references public.teams(id) on delete cascade,
  kind text not null check (kind in ('door', 'task', 'minutes', 'section', 'paper', 'milestone')),
  title text not null check (char_length(title) between 1 and 200),
  proof jsonb not null default '{}'::jsonb check (jsonb_typeof(proof) = 'object' and pg_column_size(proof) < 4000),
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists receipts_team_idx on public.receipts (team_id, created_at desc);
alter table public.receipts enable row level security;
drop policy if exists "team reads its receipts" on public.receipts;
create policy "team reads its receipts" on public.receipts for select to authenticated using (team_id = public.my_team_id());
drop policy if exists "members add receipts" on public.receipts;
create policy "members add receipts" on public.receipts for insert to authenticated
  with check (team_id = public.my_team_id() and created_by = auth.uid() and kind <> 'door');

-- 3) unlockDoor: idempotent — لو الباب مفتوح من قبل ما يسوي شي. يسجّل التاريخ + حدث door_unlocked + إيصال
create or replace function public.unlock_door(p_key text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_team uuid := public.my_team_id();
  v_n int;
begin
  if v_team is null or auth.uid() is null then return false; end if;
  if p_key not in ('write', 'methodology', 'supervisor', 'calendar', 'collect') then raise exception 'invalid door'; end if;
  insert into public.team_doors (team_id, key) values (v_team, p_key)
  on conflict (team_id, key) do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then return false; end if;
  insert into public.app_events (team_id, user_id, name, props) values (v_team, auth.uid(), 'door_unlocked', jsonb_build_object('key', p_key));
  insert into public.receipts (team_id, kind, title, proof, created_by)
  values (v_team, 'door', 'انفتح باب: ' || p_key, jsonb_build_object('key', p_key), auth.uid());
  return true;
end $$;
revoke all on function public.unlock_door(text) from public;
grant execute on function public.unlock_door(text) to authenticated;

create or replace function public.mark_door_seen(p_key text)
returns void language sql security definer set search_path = public as $$
  update public.team_doors set seen_at = now()
  where team_id = public.my_team_id() and key = p_key and seen_at is null;
$$;
revoke all on function public.mark_door_seen(text) from public;
grant execute on function public.mark_door_seen(text) to authenticated;

-- تحقق:
-- select key, unlocked_at, seen_at from public.team_doors where team_id = public.my_team_id();
