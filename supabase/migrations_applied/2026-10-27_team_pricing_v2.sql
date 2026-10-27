-- تسعير الفريق (2026-10-27، سعر الإطلاق): السعر صار للفريق كامل مو لكل عضو.
-- باحث لحاله 19، فريق من شخصين 39، فريق 3–5 أعضاء 49.
-- المساعد الذكي إضافة: 19 للباحث لحاله، 39 للفريق (19 للفرق المؤسسة).
-- teams.monthly_price = إجمالي الفريق الشهري، ويتحدّث تلقائيًا مع تغيّر الباقة أو عدد الأعضاء.
create or replace function public.team_monthly_total(p_plan text, p_is_founder boolean, p_members integer)
returns numeric
language sql
immutable
set search_path to 'public'
as $$
  select (
    case when coalesce(p_members, 1) <= 1 then 19 when p_members = 2 then 39 else 49 end
    + case when p_plan = 'ai' then
        case when coalesce(p_members, 1) <= 1 then 19 when p_is_founder then 19 else 39 end
      else 0 end
  )::numeric;
$$;

create or replace function public.refresh_team_price(p_team_id uuid)
returns numeric
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_price numeric;
begin
  update public.teams t
  set monthly_price = public.team_monthly_total(
    t.plan, t.is_founder, (select count(*)::int from public.profiles p where p.team_id = t.id))
  where t.id = p_team_id
  returning t.monthly_price into v_price;
  return v_price;
end;
$$;
revoke execute on function public.refresh_team_price(uuid) from public, anon, authenticated;

create or replace function public.profiles_refresh_team_price()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.team_id is not null then
    perform public.refresh_team_price(new.team_id);
  end if;
  if tg_op in ('DELETE', 'UPDATE') and old.team_id is not null
     and (tg_op = 'DELETE' or old.team_id is distinct from new.team_id) then
    perform public.refresh_team_price(old.team_id);
  end if;
  return null;
end;
$$;

drop trigger if exists profiles_refresh_team_price on public.profiles;
create trigger profiles_refresh_team_price
after insert or delete or update of team_id on public.profiles
for each row execute function public.profiles_refresh_team_price();

-- الفريق الجديد: تجربة ١٤ يوم كاملة المزايا
create or replace function public.set_team_founder_flag()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if (select count(*) from public.teams) < 15 then
    new.is_founder := true;
  end if;
  if new.subscription_end_date is null then
    new.subscription_end_date := current_date + 14;
  end if;
  new.monthly_price := public.team_monthly_total(new.plan, new.is_founder, 1);
  return new;
end;
$$;

create or replace function public.set_team_plan(p_plan text)
returns numeric
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_role text;
  v_team_id uuid;
  v_team public.teams;
begin
  if p_plan not in ('basic', 'ai') then
    raise exception 'باقة غير معروفة';
  end if;

  select role, team_id into v_role, v_team_id from public.profiles where id = auth.uid();
  if v_role is distinct from 'leader' or v_team_id is null then
    raise exception 'قائد الفريق فقط يقدر يغيّر الباقة';
  end if;

  select * into v_team from public.teams where id = v_team_id;
  if v_team.plan = p_plan then
    return public.refresh_team_price(v_team_id);
  end if;

  if not v_team.on_trial
     and v_team.subscription_end_date is not null
     and v_team.subscription_end_date > current_date + 7 then
    raise exception 'تغيير الباقة يتاح قبل التجديد بأسبوع أو عند انتهاء الاشتراك — تواصلوا مع الفريق لو تحتاجون ترقية الحين';
  end if;

  update public.teams set plan = p_plan where id = v_team_id;
  return public.refresh_team_price(v_team_id);
end;
$$;

-- الفريق حدّه ٥ أعضاء
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  new_team_id uuid;
  meta_team_id text := new.raw_user_meta_data ->> 'team_id';
  meta_referral_code text := new.raw_user_meta_data ->> 'referral_code';
  meta_university text := nullif(trim(new.raw_user_meta_data ->> 'university'), '');
  referrer_team_id uuid;
  new_role text := 'member';
begin
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

    insert into public.teams (name, referred_by_team_id, university)
    values (
      coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)) || ' — فريق بحثي',
      referrer_team_id,
      meta_university
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
$$;

-- الإحالة: أول اشتراك حقيقي لفريق مُحال = شهر مجاني للفريقين
create or replace function public.admin_extend_subscription(target_team_id uuid, months integer default 1)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  ref_team_id uuid;
  already_rewarded boolean;
begin
  if not public.is_super_admin() then
    raise exception 'غير مصرح لك بهذا الإجراء';
  end if;

  update public.teams
  set subscription_end_date = (
    greatest(coalesce(subscription_end_date, current_date), current_date)
    + (months || ' months')::interval
  )::date,
  on_trial = false
  where id = target_team_id;

  select referred_by_team_id, referral_reward_granted
    into ref_team_id, already_rewarded
    from public.teams where id = target_team_id;

  if ref_team_id is not null and not already_rewarded then
    update public.teams
    set subscription_end_date = (
      greatest(coalesce(subscription_end_date, current_date), current_date) + interval '30 days'
    )::date
    where id in (ref_team_id, target_team_id);

    update public.teams set referral_reward_granted = true where id = target_team_id;
  end if;
end;
$$;

create or replace function public.get_my_referral_stats()
returns table(referral_code text, referred_count integer, rewarded_count integer, bonus_days_earned integer)
language sql
stable security definer
set search_path to 'public'
as $$
  select
    t.referral_code,
    (select count(*)::int from public.teams r where r.referred_by_team_id = t.id),
    (select count(*)::int from public.teams r where r.referred_by_team_id = t.id and r.referral_reward_granted = true),
    (select count(*)::int from public.teams r where r.referred_by_team_id = t.id and r.referral_reward_granted = true) * 30
  from public.teams t
  where t.id = public.my_team_id();
$$;

-- نحدّث سعر كل الفرق الموجودة للنظام الجديد
update public.teams t
set monthly_price = public.team_monthly_total(
  t.plan, t.is_founder, (select count(*)::int from public.profiles p where p.team_id = t.id));

alter table public.teams alter column monthly_price set default 19;
