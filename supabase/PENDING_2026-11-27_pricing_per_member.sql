-- Wesync · التسعيرة للطالب (قرار المالك 2026-11-27). لازم تطابق src/lib/plans.ts و moyasar-webhook و ai-assist/billing.ts.
-- - السعر للطالب، والوكيل داخل السعر (ما فيه باقة بدون وكيل): لحالك 37، في فريق 29 للطالب، والفرق المؤسِّسة (أول 50 فريق) 27 ثابت.
-- - باقة البحث كامل (8 شهور، دفعة وحدة): 249 لحالك، 199 للطالب في فريق، 179 للمؤسسين.
-- آمن للتشغيل أكثر من مرة. ما يغيّر تواريخ الاشتراكات الحالية.

-- 1) الإجمالي الشهري للفريق = سعر الطالب × عدد الأعضاء (p_plan باقي للتوافق وما يأثر)
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

-- 2) باقة البحث كامل للفريق
create or replace function public.team_research_total(p_is_founder boolean, p_members integer)
returns numeric
language sql
immutable
set search_path to 'public'
as $$
  select (
    case when coalesce(p_members, 1) <= 1 then 249
         when p_is_founder then 179
         else 199 end
    * greatest(coalesce(p_members, 1), 1)
  )::numeric;
$$;
revoke execute on function public.team_research_total(boolean, integer) from anon;

-- 3) الوكيل داخل الاشتراك: كل الفرق على plan = 'ai' (الحدود والأقفال بالسيرفر تعتمد عليه)
update public.teams set plan = 'ai' where plan is distinct from 'ai';
alter table public.teams alter column plan set default 'ai';

-- 4) الفرق المؤسِّسة صارت أول 50 فريق (بترتيب الإنشاء)
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
  new.plan := 'ai';
  new.monthly_price := public.team_monthly_total(new.plan, new.is_founder, 1);
  return new;
end;
$$;
revoke execute on function public.set_team_founder_flag() from public, anon, authenticated;

-- 5) نحدّث monthly_price المخزّن لكل الفرق بالحسبة الجديدة
select public.refresh_team_price(id) from public.teams;
