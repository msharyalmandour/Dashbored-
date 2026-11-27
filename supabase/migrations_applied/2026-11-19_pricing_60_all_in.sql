-- Wesync · السعر الشامل (2026-11-19)
-- اشتراك واحد شامل كل شي (المساعد الذكي داخل): لحالك 19، شخصين 39، 3–5 أعضاء 60 ريال بالشهر.
-- السنوي = 10 × الشهري (يُحسب بالواجهة والويبهوك، ما يحتاج عمود جديد).
-- ما يحذف أي بيانات: يغيّر دالة السعر بس ويحدّث monthly_price المخزّن لكل فريق.
-- (كل الفرق حاليًا plan = 'ai' والافتراضي 'ai' — ما نلمس عمود plan.)

create or replace function public.team_monthly_total(p_plan text, p_is_founder boolean, p_members integer)
returns numeric
language sql
immutable
set search_path to 'public'
as $$
  -- p_plan و p_is_founder باقيين بالتوقيع عشان التريقرز القديمة تشتغل، بس ما يأثرون على السعر
  select (case when coalesce(p_members, 1) <= 1 then 19 when p_members = 2 then 39 else 60 end)::numeric;
$$;

update public.teams t
set monthly_price = public.team_monthly_total(
  t.plan, t.is_founder, (select count(*)::int from public.profiles p where p.team_id = t.id));

-- تحقق: لازم يطلع 19 / 39 / 60
select public.team_monthly_total('basic', false, 1) as solo,
       public.team_monthly_total('ai', true, 2) as duo,
       public.team_monthly_total('ai', false, 5) as team;
