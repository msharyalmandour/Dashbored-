-- «بدأتوا قبل؟» (HERO المرحلة 4): وين وصل الفريق ببحثه — يحدد أول شاشة والمراحل اللي تنحسب خالصة.
-- إضافة بس: عمود جديد ودالة. ما تمسح ولا تغيّر أي بيانات موجودة.
--   topic      = بس اخترنا الموضوع
--   proposal   = كتبنا جزء من المقترح
--   ethics     = خلصنا المقترح وننتظر الأخلاقيات
--   collecting = بدأنا نجمع البيانات
--   fresh      = لسه ما بدأنا (البداية العادية)

alter table public.teams add column if not exists stage text
  check (stage is null or stage in ('topic', 'proposal', 'ethics', 'collecting', 'fresh'));
alter table public.teams add column if not exists stage_set_at timestamptz;

-- أي عضو بالفريق يقدر يحدد المرحلة لفريقه هو بس
create or replace function public.set_team_stage(p_stage text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_stage is null or p_stage not in ('topic', 'proposal', 'ethics', 'collecting', 'fresh') then
    raise exception 'bad stage';
  end if;
  if public.my_team_id() is null then
    raise exception 'no team';
  end if;
  update public.teams set stage = p_stage, stage_set_at = now() where id = public.my_team_id();
end;
$$;
revoke all on function public.set_team_stage(text) from public, anon;
grant execute on function public.set_team_stage(text) to authenticated;
