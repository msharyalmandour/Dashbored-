-- هدية الدعوة عند «البداية الفعلية» + من وين جا الفريق (2026-11-18)
-- 1) teams.signup_source: من وين سجّل الفريق (supervisor = رابط المشرفة، referral = رابط فريق ثاني، …)
--    عشان نقيس كم فريق جابته المشرفات فعلًا — ويكتبه handle_new_user بس (المستخدم ما يقدر يعدّله).
-- 2) هدية البداية: لما الفريق المدعو يبدأ فعليًا (عضوين أو أكثر + أول قسم مكتوب بالمقترح، أو 3 دراسات بالمكتبة)
--    ياخذ الفريقين أسبوعين (14 يوم) — مرة وحدة. وهدية الاشتراك (شهر) باقية زي ما هي.
--    العضوين شرط عشان ما أحد يسوي فرق وهمية لحاله.
-- 3) get_my_referral_stats يرجّع كمان كم فريق بدأ فعليًا، والأيام = 14×بدأوا + 30×اشتركوا.
-- ما يحذف أي بيانات.

begin;

alter table public.teams add column if not exists signup_source text
  check (signup_source is null or signup_source ~ '^[a-z_]{1,24}$');
alter table public.teams add column if not exists referral_activation_rewarded boolean not null default false;

-- العمودين الجداد ما يعدّلهم إلا السيرفر: جدول teams ما له سياسة UPDATE للمستخدمين (RLS)، فالكتابة من الدوال بس

-- ---------- التسجيل: نحفظ المصدر ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  new_team_id uuid;
  meta_team_id text := new.raw_user_meta_data ->> 'team_id';
  meta_referral_code text := new.raw_user_meta_data ->> 'referral_code';
  meta_university text := nullif(trim(new.raw_user_meta_data ->> 'university'), '');
  meta_source text := lower(nullif(trim(new.raw_user_meta_data ->> 'source'), ''));
  referrer_team_id uuid;
  new_role text := 'member';
begin
  if meta_source is not null and meta_source !~ '^[a-z_]{1,24}$' then
    meta_source := null;
  end if;

  if meta_team_id is not null then
    new_team_id := meta_team_id::uuid;
    if (select count(*) from public.profiles where team_id = new_team_id) >= 5 then
      raise exception 'team_full';
    end if;
  else
    if meta_referral_code is not null and length(trim(meta_referral_code)) > 0 then
      select id into referrer_team_id
      from public.teams
      where referral_code = upper(trim(meta_referral_code));
    end if;

    insert into public.teams (name, referred_by_team_id, university, signup_source)
    values (
      coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)) || ' — فريق بحثي',
      referrer_team_id,
      meta_university,
      coalesce(meta_source, case when referrer_team_id is not null then 'referral' end)
    )
    returning id into new_team_id;
    new_role := 'leader';
  end if;

  insert into public.profiles (id, team_id, name, initials, email, gender, role)
  values (
    new.id,
    new_team_id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'initials', upper(left(new.email, 2))),
    new.email,
    new.raw_user_meta_data ->> 'gender',
    new_role
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

-- ---------- هدية البداية ----------
create or replace function public.grant_referral_activation(p_team uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  t record;
  v_members int;
  v_sections int;
  v_papers int;
begin
  select id, referred_by_team_id, referral_activation_rewarded into t from public.teams where id = p_team for update;
  if t.id is null or t.referred_by_team_id is null or t.referral_activation_rewarded then
    return;
  end if;

  select count(*) into v_members from public.profiles where team_id = p_team;
  if v_members < 2 then
    return;
  end if;

  select count(*) into v_sections
  from public.proposal_sections s join public.research_projects rp on rp.id = s.research_project_id
  where rp.team_id = p_team and length(trim(coalesce(s.content, ''))) >= 40;
  select count(*) into v_papers
  from public.evidence_papers e join public.research_projects rp on rp.id = e.research_project_id
  where rp.team_id = p_team;
  if v_sections < 1 and v_papers < 3 then
    return;
  end if;

  update public.teams
  set subscription_end_date = (greatest(coalesce(subscription_end_date, current_date), current_date) + interval '14 days')::date
  where id in (p_team, t.referred_by_team_id);
  update public.teams set referral_activation_rewarded = true where id = p_team;
end;
$function$;
revoke all on function public.grant_referral_activation(uuid) from public, anon, authenticated;

-- المشغّلات: بعد كتابة قسم أو إضافة دراسة أو انضمام عضو
create or replace function public.trg_referral_activation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_team uuid;
begin
  if tg_table_name = 'profiles' then
    v_team := new.team_id;
  else
    select team_id into v_team from public.research_projects where id = new.research_project_id;
  end if;
  if v_team is not null and exists (select 1 from public.teams where id = v_team and referred_by_team_id is not null and not referral_activation_rewarded) then
    perform public.grant_referral_activation(v_team);
  end if;
  return new;
exception when others then
  -- الهدية ما توقف أبدًا التسجيل أو حفظ القسم
  raise warning 'referral activation skipped: %', sqlerrm;
  return new;
end;
$function$;

drop trigger if exists trg_referral_activation on public.proposal_sections;
create trigger trg_referral_activation after insert or update of content on public.proposal_sections
  for each row execute function public.trg_referral_activation();
drop trigger if exists trg_referral_activation on public.evidence_papers;
create trigger trg_referral_activation after insert on public.evidence_papers
  for each row execute function public.trg_referral_activation();
drop trigger if exists trg_referral_activation on public.profiles;
create trigger trg_referral_activation after insert on public.profiles
  for each row execute function public.trg_referral_activation();

-- ---------- الإحصائيات ----------
drop function if exists public.get_my_referral_stats();
create function public.get_my_referral_stats()
returns table(referral_code text, referred_count integer, activated_count integer, rewarded_count integer, bonus_days_earned integer)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    t.referral_code,
    (select count(*)::int from public.teams r where r.referred_by_team_id = t.id),
    (select count(*)::int from public.teams r where r.referred_by_team_id = t.id and r.referral_activation_rewarded),
    (select count(*)::int from public.teams r where r.referred_by_team_id = t.id and r.referral_reward_granted),
    (select (count(*) filter (where r.referral_activation_rewarded) * 14 + count(*) filter (where r.referral_reward_granted) * 30)::int
       from public.teams r where r.referred_by_team_id = t.id)
  from public.teams t
  where t.id = public.my_team_id();
$function$;
grant execute on function public.get_my_referral_stats() to authenticated;

commit;

-- للمالك: كم فريق جا من رابط المشرفات، وكم منهم شغّال فعلًا هالأسبوع
-- select signup_source, count(*) teams,
--        count(*) filter (where exists (select 1 from agent_runs a where a.team_id = teams.id and a.created_at > now() - interval '7 days')) active_7d
-- from teams group by 1 order by 2 desc;
