-- Wesync · التسعيرة الثانية للطالب (قرار المالك 2026-11-27) — لازم تطابق src/lib/plans.ts (TIER_PRICES) و moyasar-webhook و ai-assist/billing.ts
-- • لحالك: 37 شهري · 129 فصل · 249 السنة الدراسية
-- • فريق (شخصين أو أكثر): 29 · 99 · 199
-- • الفرق المؤسِّسة (أول 50 فريق، is_founder): 27 · 89 · 179
-- • legacy: الفرق اللي دفعت قبل هذا التغيير يبقى لها 15 · 49 · 99 («سعرك ثابت لين تتخرجون»)
-- ما يحذف أي بيانات وما يغيّر تواريخ الاشتراكات. آمن لتشغيله أكثر من مرة.

-- 1) شريحة السعر المحفوظة للفريق (null = حسب عدد الأعضاء والمؤسسين)
alter table public.teams add column if not exists price_tier text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'teams_price_tier_check') then
    alter table public.teams add constraint teams_price_tier_check check (price_tier is null or price_tier in ('legacy'));
  end if;
end $$;

-- 2) الفرق اللي عندها دفعة مدفوعة قبل التغيير تثبت على السعر القديم
update public.teams t
set price_tier = 'legacy'
where t.price_tier is null
  and exists (select 1 from public.payments p where p.team_id = t.id and p.status = 'paid');

-- 3) الفرق المؤسِّسة صارت أول 50 فريق (بترتيب الإنشاء)
update public.teams t
set is_founder = true
where not t.is_founder
  and t.id in (select id from public.teams order by created_at asc limit 50);

create or replace function public.set_team_founder_flag()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if (select count(*) from public.teams) < 50 then
    new.is_founder := true;
  end if;
  if new.subscription_end_date is null then
    new.subscription_end_date := current_date + 14;
  end if;
  new.monthly_price := public.team_monthly_total(new.plan, new.is_founder, 1);
  return new;
end;
$$;
revoke execute on function public.set_team_founder_flag() from public, anon, authenticated;

-- 4) الشهري للفريق للعرض = سعر الطالب الشهري × الأعضاء (legacy ينحسب بالتحديث تحت)
create or replace function public.team_monthly_total(p_plan text, p_is_founder boolean, p_members integer)
returns numeric
language sql
immutable
set search_path to 'public'
as $$
  select (
    case when coalesce(p_members, 1) <= 1 then 37
         when p_is_founder then 27
         else 29 end
    * greatest(coalesce(p_members, 1), 1)
  )::numeric;
$$;

-- refresh_team_price يراعي legacy
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
  set monthly_price = case
    when t.price_tier = 'legacy' then 15 * greatest((select count(*)::int from public.profiles p where p.team_id = t.id), 1)
    else public.team_monthly_total(t.plan, t.is_founder, (select count(*)::int from public.profiles p where p.team_id = t.id))
  end
  where t.id = p_team_id
  returning t.monthly_price into v_price;
  return v_price;
end;
$$;
revoke execute on function public.refresh_team_price(uuid) from public, anon, authenticated;

-- 5) نحدّث monthly_price المخزّن لكل الفرق
select public.refresh_team_price(id) from public.teams;
