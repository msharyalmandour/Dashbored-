-- Wesync · الخطوات 27–30: رابط الدكتورة /j/:code + ملخص الخميس + المميزات الفخمة + السفراء + لوحة النمو
-- جداول جديدة بـ RLS بالفريق، وعمود واحد جديد بـ teams (supervisor_code). ما يحذف ولا يغيّر بيانات موجودة.
-- آمن للتشغيل أكثر من مرة. يعتمد على PENDING_2026-11-18_doors_receipts.sql (team_doors) — شغّلوه قبله.

-- ═══ 27) كود الدكتورة: wesyncapp.com/j/<code> ═══
create table if not exists public.supervisor_codes (
  code text primary key check (code ~ '^[A-Z0-9]{6,10}$'),
  origin_team_id uuid not null unique references public.teams(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.supervisor_codes enable row level security; -- بدون سياسات: الوصول عبر الدوال بس
alter table public.teams add column if not exists supervisor_code text;

-- الدكتورة (برمز رابط فريقها) تاخذ كودها — ينشأ أول مرة
create or replace function public.supervisor_code(p_token uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_team uuid; v_code text;
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid token'; end if;
  select code into v_code from public.supervisor_codes where origin_team_id = v_team;
  if v_code is not null then return v_code; end if;
  loop
    v_code := 'DR' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    begin
      insert into public.supervisor_codes (code, origin_team_id) values (v_code, v_team);
      return v_code;
    exception when unique_violation then
      if exists (select 1 from public.supervisor_codes where origin_team_id = v_team) then
        return (select code from public.supervisor_codes where origin_team_id = v_team);
      end if;
    end;
  end loop;
end $$;
revoke all on function public.supervisor_code(uuid) from public;
grant execute on function public.supervisor_code(uuid) to anon, authenticated;

-- الفريق الجديد (قائده، خلال أول 3 أيام) ينربط بكود الدكتورة — تنحسب لها
create or replace function public.join_doc_code(p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_team uuid := public.my_team_id();
begin
  if v_team is null then return false; end if;
  if not exists (select 1 from public.supervisor_codes where code = upper(trim(p_code))) then return false; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'leader') then return false; end if;
  update public.teams set supervisor_code = upper(trim(p_code)), signup_source = coalesce(signup_source, 'supervisor')
  where id = v_team and supervisor_code is null and created_at > now() - interval '3 days';
  return found;
end $$;
revoke all on function public.join_doc_code(text) from public;
grant execute on function public.join_doc_code(text) to authenticated;

-- كم فريق سجّل من رابطها (عدد بس — بدون أسماء ولا روابط فرق ثانية)
create or replace function public.doc_code_stats(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', c.code, 'joined', (select count(*) from public.teams t where t.supervisor_code = c.code))
  from public.supervisor_codes c join public.teams o on o.id = c.origin_team_id
  where o.share_token = p_token;
$$;
revoke all on function public.doc_code_stats(uuid) from public;
grant execute on function public.doc_code_stats(uuid) to anon, authenticated;

-- ملخص الدكتورة: كل خميس 16:00 بتوقيت الرياض (13:00 UTC) بدل الأحد
select cron.unschedule(jobid) from cron.job where jobname = 'supervisor-weekly';
select cron.schedule(
  'supervisor-weekly',
  '0 13 * * 4',
  $job$
  select net.http_post(
    url := 'https://uwdejlkvhsiqolmgihjq.supabase.co/functions/v1/supervisor-email',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'digest_secret')),
    body := '{"action":"weekly"}'::jsonb
  );
  $job$
);

-- ═══ 28.1) ويسي يحس بالموسم: التقويم الأكاديمي (الفريق يعدّله) ═══
create table if not exists public.academic_calendar (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.my_team_id() references public.teams(id) on delete cascade,
  college text not null default '' check (char_length(college) <= 120),
  kind text not null check (kind in ('exam', 'training', 'deadline')),
  title text not null check (char_length(title) between 1 and 120),
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now()
);
create index if not exists academic_calendar_team_idx on public.academic_calendar (team_id, starts_on);
alter table public.academic_calendar enable row level security;
drop policy if exists "team reads its calendar" on public.academic_calendar;
create policy "team reads its calendar" on public.academic_calendar for select to authenticated using (team_id = public.my_team_id());
drop policy if exists "team writes its calendar" on public.academic_calendar;
create policy "team writes its calendar" on public.academic_calendar for insert to authenticated with check (team_id = public.my_team_id());
drop policy if exists "team edits its calendar" on public.academic_calendar;
create policy "team edits its calendar" on public.academic_calendar for update to authenticated using (team_id = public.my_team_id()) with check (team_id = public.my_team_id());
drop policy if exists "team deletes its calendar" on public.academic_calendar;
create policy "team deletes its calendar" on public.academic_calendar for delete to authenticated using (team_id = public.my_team_id());

-- ═══ 28.4) ختم الأصالة: مين كتب وش (مو كشف ذكاء اصطناعي) ═══
create table if not exists public.section_authorship (
  team_id uuid not null default public.my_team_id() references public.teams(id) on delete cascade,
  section_key text not null check (char_length(section_key) between 1 and 60),
  human_chars integer not null default 0 check (human_chars >= 0),
  ai_edited_chars integer not null default 0 check (ai_edited_chars >= 0),
  updated_at timestamptz not null default now(),
  primary key (team_id, section_key)
);
alter table public.section_authorship enable row level security;
drop policy if exists "team reads authorship" on public.section_authorship;
create policy "team reads authorship" on public.section_authorship for select to authenticated using (team_id = public.my_team_id());

create or replace function public.add_authorship(p_section text, p_human integer, p_ai_edited integer)
returns void language sql security definer set search_path = public as $$
  insert into public.section_authorship (team_id, section_key, human_chars, ai_edited_chars)
  select public.my_team_id(), p_section, greatest(0, least(p_human, 20000)), greatest(0, least(p_ai_edited, 20000))
  where public.my_team_id() is not null
  on conflict (team_id, section_key) do update
    set human_chars = public.section_authorship.human_chars + excluded.human_chars,
        ai_edited_chars = public.section_authorship.ai_edited_chars + excluded.ai_edited_chars,
        updated_at = now();
$$;
revoke all on function public.add_authorship(text, integer, integer) from public;
grant execute on function public.add_authorship(text, integer, integer) to authenticated;

-- ═══ 28.6) شارة المؤسسين: رقم الفريق الحقيقي من 1 لـ 100 (بدون أرقام وهمية) ═══
create or replace function public.my_founder_number()
returns integer language sql stable security definer set search_path = public as $$
  select n from (
    select id, row_number() over (order by created_at, id) as n from public.teams where is_founder
  ) x where x.id = public.my_team_id() and x.n <= 100;
$$;
revoke all on function public.my_founder_number() from public;
grant execute on function public.my_founder_number() to authenticated;

-- ═══ 29) السفراء والإحالات ═══
create table if not exists public.referral_codes (
  code text primary key check (code ~ '^[A-Z0-9-]{4,24}$'),
  owner_profile_id uuid references public.profiles(id) on delete set null,
  owner_team_id uuid references public.teams(id) on delete set null,
  kind text not null check (kind in ('ambassador', 'influencer', 'team', 'doctor')),
  label text not null default '',
  created_at timestamptz not null default now()
);
alter table public.referral_codes enable row level security;
drop policy if exists "owner reads own codes" on public.referral_codes;
create policy "owner reads own codes" on public.referral_codes for select to authenticated using (owner_profile_id = auth.uid());

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.referral_codes(code) on delete cascade,
  team_id uuid not null unique references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  first_door_at timestamptz
);
alter table public.referrals enable row level security; -- القراءة عبر الدوال

-- السفير ياخذ كوده (مثل MSHARY-KAU): الاسم الأول + الجامعة
create or replace function public.my_ambassador_code()
returns text language plpgsql security definer set search_path = public as $$
declare v_code text; v_name text; v_uni text; v_base text; i int := 0;
begin
  if auth.uid() is null then return null; end if;
  select code into v_code from public.referral_codes where owner_profile_id = auth.uid() and kind = 'ambassador';
  if v_code is not null then return v_code; end if;
  select upper(regexp_replace(split_part(coalesce(p.name, ''), ' ', 1), '[^A-Za-z0-9]', '', 'g')), upper(regexp_replace(coalesce(t.university, ''), '[^A-Za-z0-9]', '', 'g'))
    into v_name, v_uni from public.profiles p left join public.teams t on t.id = p.team_id where p.id = auth.uid();
  v_base := left(coalesce(nullif(v_name, ''), 'WESY') || case when v_uni <> '' then '-' || left(v_uni, 6) else '' end, 18);
  if char_length(v_base) < 4 then v_base := v_base || 'WSYC'; end if;
  v_code := v_base;
  while exists (select 1 from public.referral_codes where code = v_code) loop
    i := i + 1; v_code := v_base || i::text;
  end loop;
  insert into public.referral_codes (code, owner_profile_id, owner_team_id, kind, label)
  values (v_code, auth.uid(), public.my_team_id(), 'ambassador', '');
  return v_code;
end $$;
revoke all on function public.my_ambassador_code() from public;
grant execute on function public.my_ambassador_code() to authenticated;

-- الفريق الجديد يسجّل كود سفير/مؤثر (مرة وحدة، خلال أول 3 أيام)
create or replace function public.claim_referral(p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_team uuid := public.my_team_id();
begin
  if v_team is null or not exists (select 1 from public.referral_codes where code = upper(trim(p_code))) then return false; end if;
  if exists (select 1 from public.referral_codes where code = upper(trim(p_code)) and owner_team_id = v_team) then return false; end if;
  if not exists (select 1 from public.teams where id = v_team and created_at > now() - interval '3 days') then return false; end if;
  insert into public.referrals (code, team_id) values (upper(trim(p_code)), v_team) on conflict (team_id) do nothing;
  return found;
end $$;
revoke all on function public.claim_referral(text) from public;
grant execute on function public.claim_referral(text) to authenticated;

-- أول باب ينفتح للفريق المُحال = الإحالة صارت حقيقية (المكافأة نفسها على نظام التفعيل الحالي)
create or replace function public.trg_referral_first_door()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.referrals set first_door_at = now() where team_id = new.team_id and first_door_at is null;
  return new;
end $$;
drop trigger if exists referral_first_door on public.team_doors;
create trigger referral_first_door after insert on public.team_doors for each row execute function public.trg_referral_first_door();

-- صفحة السفير: كم فريق جاب، كم منهم فتح أول باب (= شهر مجاني)، وترتيب الجامعات هالشهر
create or replace function public.my_ambassador_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  with mine as (select code from public.referral_codes where owner_profile_id = auth.uid()),
  r as (select * from public.referrals where code in (select code from mine))
  select jsonb_build_object(
    'teams', (select count(*) from r),
    'activated', (select count(*) from r where first_door_at is not null),
    'colleges', coalesce((
      select jsonb_agg(jsonb_build_object('college', u, 'teams', c) order by c desc)
      from (
        select coalesce(nullif(t.university, ''), '—') u, count(*) c
        from public.referrals x join public.teams t on t.id = x.team_id
        where x.created_at >= date_trunc('month', now())
        group by 1 order by 2 desc limit 5
      ) z
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.my_ambassador_stats() from public;
grant execute on function public.my_ambassador_stats() to authenticated;

-- ═══ 30) لوحة حلقة النمو (للمشرف العام بس) ═══
create or replace function public.admin_growth_weekly(p_weeks integer default 8)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_super_admin) then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(w order by w->>'week' desc) from (
      select jsonb_build_object(
        'week', to_char(date_trunc('week', t.created_at), 'YYYY-MM-DD'),
        'teams', count(*),
        'by_source', jsonb_build_object(
          'team_referral', count(*) filter (where t.referred_by_team_id is not null),
          'ambassador', count(*) filter (where exists (select 1 from public.referrals r join public.referral_codes c on c.code = r.code where r.team_id = t.id and c.kind = 'ambassador')),
          'influencer', count(*) filter (where exists (select 1 from public.referrals r join public.referral_codes c on c.code = r.code where r.team_id = t.id and c.kind = 'influencer')),
          'doctor', count(*) filter (where t.supervisor_code is not null or t.signup_source = 'supervisor'),
          'other', count(*) filter (where t.referred_by_team_id is null and t.supervisor_code is null and coalesce(t.signup_source, '') <> 'supervisor' and not exists (select 1 from public.referrals r where r.team_id = t.id))
        ),
        'first_door', count(*) filter (where exists (select 1 from public.team_doors d where d.team_id = t.id))
      ) w
      from public.teams t
      where t.created_at >= date_trunc('week', now()) - make_interval(weeks => greatest(1, least(p_weeks, 52)) - 1)
      group by date_trunc('week', t.created_at)
    ) s
  ), '[]'::jsonb);
end $$;
revoke all on function public.admin_growth_weekly(integer) from public;
grant execute on function public.admin_growth_weekly(integer) to authenticated;
