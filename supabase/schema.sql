-- Wesync — Supabase schema
--
-- الاستخدام: افتح مشروعك على supabase.com > SQL Editor > New query،
-- الصق هذا الملف كامل، ثم اضغط Run. يمكن تشغيله أكثر من مرة بأمان.

-- ============================================================
-- 1) الفرق (كل فريق بحثي = عميل مستقل باشتراكه الخاص)
-- ============================================================
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  /** تاريخ انتهاء الاشتراك — NULL يعني الفريق ما فعّل اشتراكه أبدًا بعد */
  subscription_end_date date,
  /** السعر الشهري بالريال لكل شخص بالفريق — يبقى ثابت للفريق حتى لو تغيّر السعر العام لاحقًا.
      الفاتورة الشهرية الفعلية للفريق = monthly_price × عدد الأعضاء */
  monthly_price numeric(6, 2) not null default 40,
  /** أول 15 فريق يشتركون بالنظام — سعرهم (40 ريال) يبقى ثابت مدى الاشتراك */
  is_founder boolean not null default false,
  /** true لين أول تفعيل اشتراك حقيقي من الإدارة — يميّز الأيام الثلاثة
      المجانية التلقائية عن اشتراك مدفوع فعليًا */
  on_trial boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.teams add column if not exists monthly_price numeric(6, 2) not null default 40;
alter table public.teams add column if not exists is_founder boolean not null default false;
alter table public.teams add column if not exists on_trial boolean not null default true;

-- نظام الإحالة بين الفرق — كل فريق له رمز دعوة فريد يشاركه مع فرق ثانية،
-- ولو فريق جديد انضم عن طريقه وفعّل اشتراكه، الفريق الداعي ياخذ ١٥ يوم مجاني
alter table public.teams add column if not exists referral_code text;
alter table public.teams add column if not exists referred_by_team_id uuid references public.teams(id);
alter table public.teams add column if not exists referral_reward_granted boolean not null default false;

alter table public.teams enable row level security;

-- يولّد رمز دعوة قصير وفريد (٦ أحرف، بدون حروف/أرقام ملتبسة زي 0/O أو 1/I)
create or replace function public.generate_referral_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  i int;
  taken boolean;
begin
  loop
    result := '';
    for i in 1..6 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    select exists(select 1 from public.teams where referral_code = result) into taken;
    exit when not taken;
  end loop;
  return result;
end;
$$;

update public.teams set referral_code = public.generate_referral_code() where referral_code is null;

alter table public.teams alter column referral_code set not null;
alter table public.teams drop constraint if exists teams_referral_code_key;
alter table public.teams add constraint teams_referral_code_key unique (referral_code);

-- يولّد رمز تلقائيًا لأي فريق جديد
create or replace function public.set_team_referral_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.referral_code is null then
    new.referral_code := public.generate_referral_code();
  end if;
  return new;
end;
$$;

drop trigger if exists set_team_referral_code on public.teams;
create trigger set_team_referral_code
  before insert on public.teams
  for each row execute procedure public.set_team_referral_code();

create index if not exists teams_referred_by_team_id_idx on public.teams (referred_by_team_id);

-- يعلّم أول 15 فريق تلقائيًا كـ"مؤسسين"، ويعطي كل فريق جديد ٧ أيام تجربة
-- مجانية تلقائيًا (subscription_end_date = بعد ٧ أيام) وقت إنشائه
create or replace function public.set_team_founder_flag()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (select count(*) from public.teams) < 15 then
    new.is_founder := true;
  end if;
  if new.subscription_end_date is null then
    new.subscription_end_date := current_date + 7;
  end if;
  new.monthly_price := public.plan_price(new.plan, new.is_founder);
  return new;
end;
$$;

drop trigger if exists set_team_founder_flag on public.teams;
create trigger set_team_founder_flag
  before insert on public.teams
  for each row execute procedure public.set_team_founder_flag();

-- الباقات: Basic (بدون ذكاء اصطناعي) 19 ريال/شخص/شهر، و AI 59 ريال (المؤسسون 40).
-- الفرق الحالية تبقى على باقة AI بنفس سعرها، والفرق الجديدة تبدأ بتجربة ٧ أيام
-- كاملة المزايا (باقة AI) ثم تختار قائدتها الباقة من صفحة "الباقات والاشتراك"
alter table public.teams add column if not exists plan text not null default 'ai';
alter table public.teams drop constraint if exists teams_plan_check;
alter table public.teams add constraint teams_plan_check check (plan in ('basic', 'ai'));

-- سعر الباقة لفريق معيّن (مصدر واحد للأسعار بقاعدة البيانات)
create or replace function public.plan_price(p_plan text, p_is_founder boolean)
returns numeric
language sql
immutable
as $$
  select case
    when p_plan = 'basic' then 19
    when p_is_founder then 40
    else 59
  end::numeric;
$$;

-- قائدة الفريق تختار الباقة. التبديل مسموح فقط أثناء التجربة أو لما الاشتراك
-- منتهي/قريب الانتهاء (٧ أيام أو أقل) — عشان ما أحد يدفع Basic ثم يرقّي
-- لـ AI بنص الشهر ويرجع يدفع Basic
create or replace function public.set_team_plan(p_plan text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_team_id uuid;
  v_team public.teams;
  v_price numeric;
begin
  if p_plan not in ('basic', 'ai') then
    raise exception 'باقة غير معروفة';
  end if;

  select role, team_id into v_role, v_team_id from public.profiles where id = auth.uid();
  if v_role is distinct from 'leader' or v_team_id is null then
    raise exception 'قائد الفريق فقط يقدر يغيّر الباقة';
  end if;

  select * into v_team from public.teams where id = v_team_id;
  v_price := public.plan_price(p_plan, v_team.is_founder);

  if v_team.plan = p_plan then
    return v_team.monthly_price;
  end if;

  if not v_team.on_trial
     and v_team.subscription_end_date is not null
     and v_team.subscription_end_date > current_date + 7 then
    raise exception 'تغيير الباقة يتاح قبل التجديد بأسبوع أو عند انتهاء الاشتراك — تواصلوا مع الفريق لو تحتاجون ترقية الحين';
  end if;

  update public.teams set plan = p_plan, monthly_price = v_price where id = v_team_id;
  return v_price;
end;
$$;

grant execute on function public.set_team_plan(text) to authenticated;

-- سجل استخدام وكيل البحث (research-agent) لحدود التكلفة الشهرية — يكتب ويقرأ منه
-- service role فقط (RLS مفعّلة بدون سياسات)
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists agent_runs_team_action_created_idx on public.agent_runs (team_id, action, created_at desc);
alter table public.agent_runs enable row level security;

-- ============================================================
-- 2) الملفات الشخصية (profile لكل مستخدم في auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  name text not null,
  initials text not null default '',
  title text not null default 'عضو الفريق',
  role text not null default 'member' check (role in ('leader', 'member')),
  color text not null default 'brand',
  email text,
  gender text check (gender in ('male', 'female')),
  /** حساب صاحب النظام (مالك Wesync) — يشوف صفحة إدارة الاشتراكات لكل الفرق */
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ترقية جدول قديم: أضف الأعمدة الجديدة لو الجدول كان موجود من قبل بدونها
alter table public.profiles add column if not exists team_id uuid references public.teams (id) on delete set null;
alter table public.profiles add column if not exists gender text check (gender in ('male', 'female'));
alter table public.profiles add column if not exists is_super_admin boolean not null default false;
-- ترقية من نسخة قديمة كانت تحط الاشتراك على كل حساب بدل الفريق (لم تعد مستخدمة)
alter table public.profiles drop column if exists subscription_status;
alter table public.profiles drop column if exists trial_ends_at;
drop function if exists public.has_active_subscription(uuid);

alter table public.profiles enable row level security;

-- يرجّع team_id الخاص بالمستخدم الحالي — دالة SECURITY DEFINER عشان تتفادى التكرار
-- اللانهائي لما policy على جدول profiles تحتاج تقرأ من نفس جدول profiles
create or replace function public.my_team_id()
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select team_id from public.profiles where id = auth.uid();
$$;

-- إحصائيات الإحالة لفريق المستخدم الحالي — تُعرض بصفحة "الفريق"
create or replace function public.get_my_referral_stats()
returns table (
  referral_code text,
  referred_count int,
  rewarded_count int,
  bonus_days_earned int
)
language sql
stable
security definer set search_path = public
as $$
  select
    t.referral_code,
    (select count(*)::int from public.teams r where r.referred_by_team_id = t.id),
    (select count(*)::int from public.teams r where r.referred_by_team_id = t.id and r.referral_reward_granted = true),
    (select count(*)::int from public.teams r where r.referred_by_team_id = t.id and r.referral_reward_granted = true) * 15
  from public.teams t
  where t.id = public.my_team_id();
$$;

grant execute on function public.get_my_referral_stats() to authenticated;

-- هل الحساب الحالي مالك النظام (Super Admin)؟
create or replace function public.is_super_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select is_super_admin from public.profiles where id = uid), false);
$$;

-- هل فريق معيّن يقدر "يكتب" (يضيف/يعدّل) الحين؟ محتاج تاريخ انتهاء موجود ولسا ما فات
create or replace function public.team_can_write(tid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.teams
    where id = tid and subscription_end_date is not null and subscription_end_date >= current_date
  );
$$;

drop policy if exists "profiles are viewable by the team" on public.profiles;
create policy "profiles are viewable by the team"
  on public.profiles for select
  to authenticated
  using (team_id = public.my_team_id() or public.is_super_admin());

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

drop policy if exists "users can insert their own profile" on public.profiles;
create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "team members can view their own team" on public.teams;
create policy "team members can view their own team"
  on public.teams for select
  to authenticated
  using (id = public.my_team_id() or public.is_super_admin());

-- ينشئ صف profile تلقائيًا عند تسجيل مستخدم جديد، وينشئ فريق جديد له تلقائيًا
-- إلا إذا مرّرتِ team_id لعضو منضم لفريق موجود (رابط دعوة الفريق)، أو
-- referral_code لفريق جديد جاي عن طريق رابط إحالة فريق ثاني (يربطه بالفريق
-- الداعي، فيصير له تجربة ٧ أيام مثل أي فريق جديد — والفريق الداعي ياخذ ١٥ يوم
-- إضافي أول ما اشتراك الفريق المُحال ينمدد):
--   supabase.auth.signUp({ email, password, options: { data: { name, initials, gender, team_id?, referral_code? } } })
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
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
  else
    if meta_referral_code is not null and length(trim(meta_referral_code)) > 0 then
      select id into referrer_team_id
      from public.teams
      where referral_code = upper(trim(meta_referral_code));
    end if;

    -- أول شخص يسجل بدون رابط دعوة هو من ينشئ الفريق، فيصير تلقائيًا قائد الفريق
    -- (تاريخ انتهاء الاشتراك يتحدد تلقائيًا بواسطة set_team_founder_flag — تجربة ٧ أيام لكل فريق جديد).
    -- الجامعة تُسجَّل هنا بس لفريق جديد — عضو منضم لفريق موجود يرث جامعة فريقه.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 3) المهام
-- ============================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams (id) on delete cascade,
  title text not null,
  description text not null default '',
  assignee_id uuid not null references public.profiles (id),
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'in-progress', 'done', 'overdue')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  section_key text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.tasks add column if not exists team_id uuid references public.teams (id) on delete cascade;

-- تعبّي team_id تلقائيًا من فريق منشئ المهمة، حتى لو الواجهة ما أرسلتها
create or replace function public.set_task_team_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.team_id is null then
    new.team_id := public.my_team_id();
  end if;
  return new;
end;
$$;

drop trigger if exists set_task_team_id on public.tasks;
create trigger set_task_team_id
  before insert on public.tasks
  for each row execute procedure public.set_task_team_id();

alter table public.tasks enable row level security;

-- القراءة مسموحة دايمًا لأعضاء الفريق — حتى لو الاشتراك منتهي (وضع "قراءة فقط")
drop policy if exists "tasks are viewable by the team" on public.tasks;
create policy "tasks are viewable by the team"
  on public.tasks for select
  to authenticated
  using (team_id = public.my_team_id());

-- إضافة مهمة جديدة: قائد الفريق فقط، واشتراك الفريق لازم يكون فعّال (مو منتهي)
drop policy if exists "only the leader can create tasks" on public.tasks;
create policy "only the leader can create tasks"
  on public.tasks for insert
  to authenticated
  with check (
    public.team_can_write(public.my_team_id())
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'leader'
    )
  );

-- تحديث المهمة (تغيير الحالة مثلًا): العضو المسؤول عنها أو القائد، واشتراك الفريق فعّال
drop policy if exists "assignee or leader can update a task" on public.tasks;
create policy "assignee or leader can update a task"
  on public.tasks for update
  to authenticated
  using (
    team_id = public.my_team_id()
    and public.team_can_write(public.my_team_id())
    and (
      auth.uid() = assignee_id
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'leader')
    )
  );

drop policy if exists "only the leader can delete tasks" on public.tasks;
create policy "only the leader can delete tasks"
  on public.tasks for delete
  to authenticated
  using (
    team_id = public.my_team_id()
    and public.team_can_write(public.my_team_id())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'leader')
  );

-- تفعيل التحديث اللحظي (Realtime) حتى تتزامن المهام بين كل الفريق فورًا —
-- بشكل آمن للتشغيل أكثر من مرة (يتجاوز أي جدول مفعّل عليه Realtime أصلًا)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'teams'
  ) then
    alter publication supabase_realtime add table public.teams;
  end if;
end $$;

-- ============================================================
-- 3ب) تعليقات المهام — نقاش قصير مرتبط بكل مهمة
-- ============================================================
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  team_id uuid references public.teams (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

-- تعبّي team_id تلقائيًا من فريق المهمة نفسها، حتى لو الواجهة ما أرسلتها
create or replace function public.set_task_comment_team_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.team_id is null then
    select team_id into new.team_id from public.tasks where id = new.task_id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_task_comment_team_id on public.task_comments;
create trigger set_task_comment_team_id
  before insert on public.task_comments
  for each row execute procedure public.set_task_comment_team_id();

alter table public.task_comments enable row level security;

-- القراءة مسموحة لأي عضو بالفريق
drop policy if exists "task comments are viewable by the team" on public.task_comments;
create policy "task comments are viewable by the team"
  on public.task_comments for select
  to authenticated
  using (team_id = public.my_team_id());

-- إضافة تعليق: أي عضو بالفريق، طالما اشتراك الفريق فعّال وينسبه لنفسه فقط
drop policy if exists "team members can add task comments" on public.task_comments;
create policy "team members can add task comments"
  on public.task_comments for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and public.team_can_write(public.my_team_id())
    and exists (select 1 from public.tasks where id = task_id and team_id = public.my_team_id())
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_comments'
  ) then
    alter publication supabase_realtime add table public.task_comments;
  end if;
end $$;

-- ============================================================
-- 4) تعيين أول قائدة/قائد فريق
-- ============================================================
-- بعد ما تسجّل أول حساب (من صفحة تسجيل الدخول في الموقع)، شغّل هذا السطر
-- بعد ما تستبدل البريد الإلكتروني بإيميل قائدة/قائد الفريق الفعلي:
--
-- update public.profiles set role = 'leader' where email = 'leader@example.com';

-- ============================================================
-- 5) تعيينك أنتِ كمالكة للنظام (Super Admin)
-- ============================================================
-- شغّلي هذا السطر مرة وحدة بإيميلك أنتِ — بعدها راح تقدرين توصلين لصفحة
-- "إدارة الاشتراكات" (/admin/subscriptions) وتشوفين كل الفرق:
--
-- update public.profiles set is_super_admin = true where email = 'you@example.com';

-- ============================================================
-- 6) دوال صفحة "إدارة الاشتراكات" — Super Admin فقط
-- ============================================================
-- ترجّع كل الفرق مع حالتهم — يرفضها تلقائيًا لو المستخدم مو Super Admin
drop function if exists public.admin_list_teams();
create function public.admin_list_teams()
returns table (
  id uuid,
  name text,
  subscription_end_date date,
  member_count bigint,
  monthly_price numeric,
  is_founder boolean,
  on_trial boolean,
  university text,
  plan text
)
language sql
security definer set search_path = public
stable
as $$
  select t.id, t.name, t.subscription_end_date, count(p.id) as member_count,
         t.monthly_price, t.is_founder, t.on_trial, t.university, t.plan
  from public.teams t
  left join public.profiles p on p.team_id = t.id
  where public.is_super_admin()
  group by t.id, t.name, t.subscription_end_date, t.monthly_price, t.is_founder, t.on_trial, t.university, t.plan
  order by t.subscription_end_date nulls first;
$$;

-- تمدّد اشتراك فريق بعدد الأشهر اللي دفعوها فعليًا (٤٠ ريال/شخص شهريًا) —
-- تُضيف الأشهر فوق تاريخ الانتهاء الحالي لو لسا ما انتهى (تجديد مبكر ما يضيّع أيام)،
-- أو من اليوم لو منتهي أو أول مرة. استخدميها بعد ما تتأكدين من تحويل STC Pay يدويًا.
-- أول تمديد حقيقي يطفي علم "تجربة مجانية" (on_trial) نهائيًا للفريق، ولو
-- الفريق مُحال من فريق ثاني (referred_by_team_id) هذا أول تمديد له، الفريق
-- الداعي ياخذ ١٥ يوم مجاني تلقائيًا — مرة وحدة بس لكل فريق مُحال
create or replace function public.admin_extend_subscription(target_team_id uuid, months int default 1)
returns void
language plpgsql
security definer set search_path = public
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
      greatest(coalesce(subscription_end_date, current_date), current_date) + interval '15 days'
    )::date
    where id = ref_team_id;

    update public.teams set referral_reward_granted = true where id = target_team_id;
  end if;
end;
$$;

-- ============================================================
-- 6) إثباتات تحويل STC Pay — يرفعها قائد الفريق داخل التطبيق، وتراجعينها
--    من صفحة إدارة الاشتراكات قبل ما تضغطين "تمديد الاشتراك"
-- ============================================================
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  file_path text not null,
  created_at timestamptz not null default now()
);

alter table public.payment_proofs enable row level security;

drop policy if exists "team can view their own payment proofs" on public.payment_proofs;
create policy "team can view their own payment proofs"
  on public.payment_proofs for select
  to authenticated
  using (team_id = public.my_team_id() or public.is_super_admin());

drop policy if exists "team can upload their own payment proofs" on public.payment_proofs;
create policy "team can upload their own payment proofs"
  on public.payment_proofs for insert
  to authenticated
  with check (team_id = public.my_team_id());

drop policy if exists "team can upload payment proof files" on storage.objects;
create policy "team can upload payment proof files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = public.my_team_id()::text
  );

drop policy if exists "team can view payment proof files" on storage.objects;
create policy "team can view payment proof files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and ((storage.foldername(name))[1] = public.my_team_id()::text or public.is_super_admin())
  );

-- ============================================================
-- 7) أدوات إدارية إضافية للـ Super Admin
-- ============================================================

-- ترجّع أعضاء فريق معيّن — تستخدمينها بصفحة إدارة الاشتراكات لنقل عضو غلط فريقه
create or replace function public.admin_list_team_members(p_team_id uuid)
returns table (id uuid, name text, email text, role text)
language sql
security definer set search_path = public
stable
as $$
  select p.id, p.name, p.email, p.role
  from public.profiles p
  where p.team_id = p_team_id and public.is_super_admin()
  order by (p.role = 'leader') desc, p.name;
$$;

-- تنقل عضو لفريق ثاني — عشان لو أحد سجّل بدون رابط الدعوة وصار له فريق منفصل غلط.
-- يصير "عضو" عادي بالفريق الجديد (مو قائد) حتى ما يتعارض مع قائد الفريق الأصلي
create or replace function public.admin_move_member(p_member_id uuid, p_target_team_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'غير مصرح لك بهذا الإجراء';
  end if;

  update public.profiles
  set team_id = p_target_team_id, role = 'member'
  where id = p_member_id;
end;
$$;

-- ============================================================
-- 8) رابط المشرف الأكاديمي — تقرير قراءة فقط بدون تسجيل دخول
-- ============================================================

-- رمز مشاركة عشوائي غير قابل للتخمين لكل فريق — نفس فكرة رابط دعوة الفريق
alter table public.teams add column if not exists share_token uuid not null default gen_random_uuid();
create unique index if not exists teams_share_token_idx on public.teams (share_token);

-- ملاحظة/توجيه واحدة حالية من المشرف الأكاديمي للفريق — تُستبدل بكل مرة يرسل
-- فيها المشرف ملاحظة جديدة (مو سجل كامل، بس آخر ملاحظة نشطة)
alter table public.teams add column if not exists supervisor_note text;
alter table public.teams add column if not exists supervisor_note_at timestamptz;

-- ترجّع لقطة قراءة فقط من بيانات الفريق الحقيقية (المهام والأعضاء وملاحظة
-- المشرف) لمن يملك الرمز — بدون أي حاجة لتسجيل دخول. SECURITY DEFINER عشان
-- تتجاوز RLS بأمان (الوصول محصور بمعرفة الرمز نفسه، مو بجلسة مستخدم).
create or replace function public.get_team_snapshot(p_token uuid)
returns json
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_team_id uuid;
  v_team_name text;
  v_note text;
  v_note_at timestamptz;
  v_project_id uuid;
  result json;
begin
  select id, name, supervisor_note, supervisor_note_at
    into v_team_id, v_team_name, v_note, v_note_at
  from public.teams where share_token = p_token;
  if v_team_id is null then
    return null;
  end if;

  select id into v_project_id from public.research_projects where team_id = v_team_id;

  select json_build_object(
    'teamName', v_team_name,
    'supervisorNote', v_note,
    'supervisorNoteAt', v_note_at,
    'members', (
      select coalesce(json_agg(json_build_object('name', p.name, 'initials', p.initials, 'role', p.role)), '[]'::json)
      from public.profiles p
      where p.team_id = v_team_id
    ),
    'tasks', (
      select coalesce(json_agg(json_build_object(
        'title', t.title,
        'status', t.status,
        'dueDate', t.due_date,
        'assigneeName', p.name
      ) order by t.due_date), '[]'::json)
      from public.tasks t
      left join public.profiles p on p.id = t.assignee_id
      where t.team_id = v_team_id
    ),
    'proposalSections', (
      select coalesce(json_agg(json_build_object(
        'key', ps.section_key,
        'labelAr', ps.label_ar,
        'labelEn', ps.label_en,
        'status', ps.status,
        'content', ps.content
      ) order by ps.order_index), '[]'::json)
      from public.proposal_sections ps
      where ps.research_project_id = v_project_id
    ),
    'methodology', (
      select json_build_object(
        'studyDesign', m.study_design,
        'studySetting', m.study_setting,
        'population', m.population,
        'samplingInclusion', m.sampling_inclusion,
        'samplingExclusion', m.sampling_exclusion,
        'sampleSize', m.sample_size,
        'samplingTechnique', m.sampling_technique,
        'dataCollectionMethods', m.data_collection_methods,
        'dataCollectionProcedure', m.data_collection_procedure,
        'dataAnalysis', m.data_analysis,
        'ethicalConsiderations', m.ethical_considerations,
        'studyToolType', m.study_tool_type,
        'studyToolName', m.study_tool_name
      )
      from public.methodology m
      where m.research_project_id = v_project_id
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_team_snapshot(uuid) to anon;

-- يسمح للمشرف (يملك الرمز فقط، بدون تسجيل دخول) يرسل/يحدّث ملاحظة لفريقه —
-- تظهر لهم بلوحتهم الرئيسية. SECURITY DEFINER لنفس سبب get_team_snapshot
create or replace function public.submit_supervisor_note(p_token uuid, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.teams
  set supervisor_note = nullif(trim(p_note), ''),
      supervisor_note_at = now()
  where share_token = p_token;
end;
$$;

grant execute on function public.submit_supervisor_note(uuid, text) to anon;

-- ============================================================
-- 8) مدفوعات Moyasar — سجل تتبع للدفعات المؤكدة عبر البطاقة (تفعيل فوري
--    للاشتراك، بديل أسرع لإثبات تحويل STC Pay اليدوي أعلاه). الإدراج
--    والتحديث يصيران فقط من دالة Edge Function باسم moyasar-webhook
--    (بمفتاح service_role، يتجاوز RLS) بعد ما تتحقق من حالة الدفعة
--    مباشرة من Moyasar — مو من الواجهة مباشرة.
-- ============================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  moyasar_payment_id text not null unique,
  amount numeric(8, 2) not null,
  status text not null,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

drop policy if exists "team can view their own payments" on public.payments;
create policy "team can view their own payments"
  on public.payments for select
  to authenticated
  using (team_id = public.my_team_id() or public.is_super_admin());

create index if not exists payments_team_id_idx on public.payments (team_id);

-- ============================================================
-- 9) البنية التحتية الحقيقية للبحث — Research Core Engine
--    Team → Research Project (تلقائي، فريق واحد = مشروع واحد) → بيانات البحث
--    كل الجداول تتربط بـ research_project_id، وكل الـ RLS تستخدم
--    my_research_project_id() فوق my_team_id() الموجودة أصلًا —
--    بدون أي نظام ملكية جديد أو منفصل.
-- ============================================================

create table if not exists public.research_projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null unique references public.teams (id) on delete cascade,
  title text not null default '',
  description text not null default '',
  research_type text not null default '' check (research_type in ('', 'quantitative', 'qualitative', 'mixed-methods')),
  status text not null default 'planning' check (status in ('planning', 'active', 'writing', 'submitted')),
  start_date date,
  target_submission_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_projects_team_idx on public.research_projects (team_id);

alter table public.research_projects enable row level security;

-- دالة مساعدة فوق my_team_id() الموجودة أصلًا — نفس نمط RLS المستخدم بجدول tasks
create or replace function public.my_research_project_id()
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select id from public.research_projects where team_id = public.my_team_id();
$$;

drop policy if exists "research project viewable by the team" on public.research_projects;
create policy "research project viewable by the team"
  on public.research_projects for select
  to authenticated
  using (team_id = public.my_team_id());

drop policy if exists "leader can update the research project" on public.research_projects;
create policy "leader can update the research project"
  on public.research_projects for update
  to authenticated
  using (
    team_id = public.my_team_id()
    and public.team_can_write(public.my_team_id())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'leader')
  );

-- ---------------------------------------------------------------
-- رحلة البحث — 10 مراحل ثابتة تتربط بالمشروع
-- ---------------------------------------------------------------
create table if not exists public.research_stages (
  id uuid primary key default gen_random_uuid(),
  research_project_id uuid not null references public.research_projects (id) on delete cascade,
  stage_key text not null check (stage_key in (
    'topic', 'proposal', 'literature-review', 'research-gap', 'research-questions',
    'methodology', 'data-collection', 'analysis', 'writing', 'final-submission'
  )),
  title_ar text not null,
  title_en text not null,
  stage_order int not null,
  -- ملاحظة: نفس قيم PhaseStatus بالواجهة أصلًا (src/data/types.ts) — "upcoming"
  -- مو "not-started" — عشان PhaseTracker.tsx الموجود يشتغل عليها بدون أي تعديل
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'done')),
  progress int not null default 0 check (progress between 0 and 100),
  start_date date,
  target_date date,
  completed_date date,
  unique (research_project_id, stage_key)
);

create index if not exists research_stages_project_idx on public.research_stages (research_project_id);

alter table public.research_stages enable row level security;

drop policy if exists "research stages viewable by the team" on public.research_stages;
create policy "research stages viewable by the team"
  on public.research_stages for select
  to authenticated
  using (research_project_id = public.my_research_project_id());

drop policy if exists "team can update research stages" on public.research_stages;
create policy "team can update research stages"
  on public.research_stages for update
  to authenticated
  using (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
  );

-- ---------------------------------------------------------------
-- المقترح البحثي — أقسام حقيقية بدل JSON واحد
-- ---------------------------------------------------------------
create table if not exists public.proposal_sections (
  id uuid primary key default gen_random_uuid(),
  research_project_id uuid not null references public.research_projects (id) on delete cascade,
  section_key text not null check (section_key in (
    'background', 'literature-review', 'problem', 'gap', 'aim', 'questions', 'methodology'
  )),
  order_index int not null,
  label_ar text not null,
  label_en text not null,
  status text not null default 'not-started' check (status in ('not-started', 'in-progress', 'done')),
  content text not null default '',
  owner_id uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (research_project_id, section_key)
);

create index if not exists proposal_sections_project_idx on public.proposal_sections (research_project_id);

alter table public.proposal_sections enable row level security;

drop policy if exists "proposal sections viewable by the team" on public.proposal_sections;
create policy "proposal sections viewable by the team"
  on public.proposal_sections for select
  to authenticated
  using (research_project_id = public.my_research_project_id());

drop policy if exists "team can edit proposal sections" on public.proposal_sections;
create policy "team can edit proposal sections"
  on public.proposal_sections for update
  to authenticated
  using (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
  );

-- ---------------------------------------------------------------
-- الفجوة البحثية + هدف الدراسة + أسئلة البحث
-- ---------------------------------------------------------------
create table if not exists public.research_gap (
  research_project_id uuid primary key references public.research_projects (id) on delete cascade,
  what_we_know text[] not null default '{}',
  what_we_dont_know text[] not null default '{}',
  gap_statement text not null default '',
  study_connection text not null default '',
  connects_to_aim boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.research_gap enable row level security;

drop policy if exists "research gap viewable by the team" on public.research_gap;
create policy "research gap viewable by the team"
  on public.research_gap for select
  to authenticated
  using (research_project_id = public.my_research_project_id());

drop policy if exists "team can edit research gap" on public.research_gap;
create policy "team can edit research gap"
  on public.research_gap for update
  to authenticated
  using (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
  );

create table if not exists public.study_aim (
  research_project_id uuid primary key references public.research_projects (id) on delete cascade,
  statement text not null default '',
  status text not null default 'not-started' check (status in ('not-started', 'in-progress', 'done')),
  updated_at timestamptz not null default now()
);

alter table public.study_aim enable row level security;

drop policy if exists "study aim viewable by the team" on public.study_aim;
create policy "study aim viewable by the team"
  on public.study_aim for select
  to authenticated
  using (research_project_id = public.my_research_project_id());

drop policy if exists "team can edit study aim" on public.study_aim;
create policy "team can edit study aim"
  on public.study_aim for update
  to authenticated
  using (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
  );

create table if not exists public.research_questions (
  id uuid primary key default gen_random_uuid(),
  research_project_id uuid not null references public.research_projects (id) on delete cascade,
  order_index int not null,
  text text not null default ''
);

create index if not exists research_questions_project_idx on public.research_questions (research_project_id);

alter table public.research_questions enable row level security;

drop policy if exists "research questions viewable by the team" on public.research_questions;
create policy "research questions viewable by the team"
  on public.research_questions for select
  to authenticated
  using (research_project_id = public.my_research_project_id());

drop policy if exists "team can add research questions" on public.research_questions;
create policy "team can add research questions"
  on public.research_questions for insert
  to authenticated
  with check (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
  );

drop policy if exists "team can remove research questions" on public.research_questions;
create policy "team can remove research questions"
  on public.research_questions for delete
  to authenticated
  using (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
  );

-- ---------------------------------------------------------------
-- المنهجية — أعمدة حقيقية تطابق واجهة Methodology الحالية حرفيًا
-- ---------------------------------------------------------------
create table if not exists public.methodology (
  research_project_id uuid primary key references public.research_projects (id) on delete cascade,
  study_design text not null default '',
  study_design_status text not null default 'not-started' check (study_design_status in ('not-started', 'in-progress', 'done')),
  study_setting text not null default '',
  population text not null default '',
  sampling_inclusion text[] not null default '{}',
  sampling_exclusion text[] not null default '{}',
  sample_size text not null default '',
  sampling_technique text not null default '',
  data_collection_methods text[] not null default '{}',
  study_tool_type text not null default 'undecided' check (study_tool_type in ('existing', 'developed', 'undecided')),
  study_tool_name text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.methodology enable row level security;

drop policy if exists "methodology viewable by the team" on public.methodology;
create policy "methodology viewable by the team"
  on public.methodology for select
  to authenticated
  using (research_project_id = public.my_research_project_id());

drop policy if exists "team can edit methodology" on public.methodology;
create policy "team can edit methodology"
  on public.methodology for update
  to authenticated
  using (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
  );

-- ---------------------------------------------------------------
-- مكتبة الأدلة — دراسات حقيقية مشتركة بالفريق
-- ---------------------------------------------------------------
create table if not exists public.evidence_papers (
  id uuid primary key default gen_random_uuid(),
  research_project_id uuid not null references public.research_projects (id) on delete cascade,
  title text not null,
  authors text not null default '',
  year int,
  theme text not null default '',
  study_design text not null default '',
  key_finding text not null default '',
  relevance text not null default '',
  section text not null default 'other' check (section in ('background', 'literature-review', 'gap', 'methodology', 'other')),
  review_status text not null default 'collected' check (review_status in ('collected', 'reviewed')),
  link text,
  added_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists evidence_papers_project_idx on public.evidence_papers (research_project_id);

alter table public.evidence_papers enable row level security;

drop policy if exists "evidence papers viewable by the team" on public.evidence_papers;
create policy "evidence papers viewable by the team"
  on public.evidence_papers for select
  to authenticated
  using (research_project_id = public.my_research_project_id());

drop policy if exists "team can add evidence papers" on public.evidence_papers;
create policy "team can add evidence papers"
  on public.evidence_papers for insert
  to authenticated
  with check (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
    and added_by = auth.uid()
  );

drop policy if exists "team can update evidence papers" on public.evidence_papers;
create policy "team can update evidence papers"
  on public.evidence_papers for update
  to authenticated
  using (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
  );

drop policy if exists "author or leader can delete evidence papers" on public.evidence_papers;
create policy "author or leader can delete evidence papers"
  on public.evidence_papers for delete
  to authenticated
  using (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
    and (
      added_by = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'leader')
    )
  );

-- ---------------------------------------------------------------
-- إنشاء تلقائي لمشروع البحث عند إنشاء الفريق — نفس فكرة
-- set_team_founder_flag الموجودة، بدون تعديلها
-- ---------------------------------------------------------------
create or replace function public.seed_research_project_content(p_project_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.research_stages (research_project_id, stage_key, title_ar, title_en, stage_order)
  values
    (p_project_id, 'topic', 'اختيار الموضوع', 'Topic Selection', 1),
    (p_project_id, 'proposal', 'المقترح البحثي', 'Research Proposal', 2),
    (p_project_id, 'literature-review', 'مراجعة الأدبيات', 'Literature Review', 3),
    (p_project_id, 'research-gap', 'الفجوة البحثية', 'Research Gap', 4),
    (p_project_id, 'research-questions', 'أسئلة البحث', 'Research Questions', 5),
    (p_project_id, 'methodology', 'المنهجية', 'Methodology', 6),
    (p_project_id, 'data-collection', 'جمع البيانات', 'Data Collection', 7),
    (p_project_id, 'analysis', 'تحليل البيانات', 'Data Analysis', 8),
    (p_project_id, 'writing', 'كتابة البحث', 'Writing', 9),
    (p_project_id, 'final-submission', 'التسليم النهائي', 'Final Submission', 10)
  on conflict (research_project_id, stage_key) do nothing;

  insert into public.proposal_sections (research_project_id, section_key, order_index, label_ar, label_en)
  values
    (p_project_id, 'background', 1, 'خلفية البحث', 'Background'),
    (p_project_id, 'literature-review', 2, 'مراجعة الأدبيات', 'Literature Review'),
    (p_project_id, 'problem', 3, 'مشكلة البحث', 'Statement of Problem'),
    (p_project_id, 'gap', 4, 'الفجوة المعرفية', 'Gap of Knowledge'),
    (p_project_id, 'aim', 5, 'هدف الدراسة', 'Purpose / Aim'),
    (p_project_id, 'questions', 6, 'أسئلة البحث', 'Research Questions'),
    (p_project_id, 'methodology', 7, 'المنهجية', 'Methodology')
  on conflict (research_project_id, section_key) do nothing;

  insert into public.research_gap (research_project_id) values (p_project_id) on conflict do nothing;
  insert into public.study_aim (research_project_id) values (p_project_id) on conflict do nothing;
  insert into public.methodology (research_project_id) values (p_project_id) on conflict do nothing;
end;
$$;

create or replace function public.create_research_project_for_team()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
begin
  insert into public.research_projects (team_id) values (new.id)
  on conflict (team_id) do nothing
  returning id into v_project_id;

  if v_project_id is not null then
    perform public.seed_research_project_content(v_project_id);
  end if;

  return new;
end;
$$;

drop trigger if exists create_research_project_for_team on public.teams;
create trigger create_research_project_for_team
  after insert on public.teams
  for each row execute procedure public.create_research_project_for_team();

-- تعبئة تلقائية (backfill) لأي فريق موجود قبل هالتحديث — آمنة للتشغيل أكثر من مرة
do $$
declare
  t record;
  v_project_id uuid;
begin
  for t in select id from public.teams where not exists (
    select 1 from public.research_projects where team_id = teams.id
  ) loop
    insert into public.research_projects (team_id) values (t.id) returning id into v_project_id;
    perform public.seed_research_project_content(v_project_id);
  end loop;
end $$;

-- تفعيل التحديث اللحظي لكل جداول البحث الجديدة — نفس أسلوب tasks
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'research_projects') then
    alter publication supabase_realtime add table public.research_projects;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'research_stages') then
    alter publication supabase_realtime add table public.research_stages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'proposal_sections') then
    alter publication supabase_realtime add table public.proposal_sections;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'research_gap') then
    alter publication supabase_realtime add table public.research_gap;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'study_aim') then
    alter publication supabase_realtime add table public.study_aim;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'research_questions') then
    alter publication supabase_realtime add table public.research_questions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'methodology') then
    alter publication supabase_realtime add table public.methodology;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'evidence_papers') then
    alter publication supabase_realtime add table public.evidence_papers;
  end if;
end $$;

-- ============================================================
-- 10) رفع ملفات حقيقي إلى Google Drive + محاضر الاجتماعات
--     مجلد Drive لكل فريق يُخزَّن بعمود research_projects.drive_folder_id
--     (مو سرًا مشتركًا — كل فريق مجلده الخاص، نفس فكرة research_project_id
--     أصلًا). الإدراج والتحديث بجدول files، وربط drive_file_id/drive_view_link
--     بجدول meeting_minutes، يصيران فقط من دالة Edge Function باسم
--     drive-upload (بمفتاح service_role، يتجاوز RLS) بعد رفع حقيقي فعلي
--     لـ Google Drive عبر حساب خدمة — مو من الواجهة مباشرة، نفس فكرة payments.
-- ============================================================
alter table public.research_projects add column if not exists drive_folder_id text;

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  research_project_id uuid not null references public.research_projects (id) on delete cascade,
  name text not null,
  mime_type text not null default '',
  size_bytes bigint not null default 0,
  category text not null default 'general' check (category in ('general', 'meeting-minutes')),
  drive_file_id text unique,
  drive_view_link text,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists files_project_idx on public.files (research_project_id);

alter table public.files enable row level security;

drop policy if exists "files viewable by the team" on public.files;
create policy "files viewable by the team"
  on public.files for select
  to authenticated
  using (research_project_id = public.my_research_project_id());

drop policy if exists "team can add files" on public.files;
create policy "team can add files"
  on public.files for insert
  to authenticated
  with check (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
    and uploaded_by = auth.uid()
  );

drop policy if exists "uploader or leader can delete files" on public.files;
create policy "uploader or leader can delete files"
  on public.files for delete
  to authenticated
  using (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
    and (
      uploaded_by = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'leader')
    )
  );

create table if not exists public.meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  research_project_id uuid not null references public.research_projects (id) on delete cascade,
  meeting_date date not null,
  attendees text[] not null default '{}',
  discussion text not null default '',
  decisions text not null default '',
  action_items text not null default '',
  created_by uuid references public.profiles (id),
  drive_file_id text,
  drive_view_link text,
  created_at timestamptz not null default now()
);

create index if not exists meeting_minutes_project_idx on public.meeting_minutes (research_project_id);

alter table public.meeting_minutes enable row level security;

drop policy if exists "meeting minutes viewable by the team" on public.meeting_minutes;
create policy "meeting minutes viewable by the team"
  on public.meeting_minutes for select
  to authenticated
  using (research_project_id = public.my_research_project_id());

drop policy if exists "team can add meeting minutes" on public.meeting_minutes;
create policy "team can add meeting minutes"
  on public.meeting_minutes for insert
  to authenticated
  with check (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
    and created_by = auth.uid()
  );

drop policy if exists "team can update meeting minutes" on public.meeting_minutes;
create policy "team can update meeting minutes"
  on public.meeting_minutes for update
  to authenticated
  using (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
  );

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'files') then
    alter publication supabase_realtime add table public.files;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meeting_minutes') then
    alter publication supabase_realtime add table public.meeting_minutes;
  end if;
end $$;

-- ============================================================
-- 11) مطابقة المقترح البحثي + طلب الموافقة الأخلاقية لنموذج جامعة
--     الملك عبدالعزيز الرسمي (Course Syllabus / Proposal Template /
--     Rubric / Application for Nursing Research Ethical Approval)
-- ============================================================
alter table public.research_projects add column if not exists abstract text not null default '';
alter table public.research_projects add column if not exists supervisor_name text not null default '';

alter table public.methodology add column if not exists data_collection_procedure text not null default '';
alter table public.methodology add column if not exists data_analysis text not null default '';
alter table public.methodology add column if not exists ethical_considerations text not null default '';

create table if not exists public.ethical_approval (
  research_project_id uuid primary key references public.research_projects (id) on delete cascade,
  application_date date,
  pi_name text not null default '',
  pi_affiliation text not null default '',
  pi_email text not null default '',
  pi_type text not null default 'undergraduate' check (pi_type in ('faculty', 'graduate', 'undergraduate')),
  other_researchers text not null default '',
  supervisor_names text not null default '',
  registration_no text not null default '',
  expected_start_date date,
  expected_end_date date,
  persons_involved text not null default '',
  data_management_confidentiality text not null default '',
  funding_details text not null default '',
  principle_written_explanation text check (principle_written_explanation in ('yes', 'no', 'na')),
  principle_oral_explanation text check (principle_oral_explanation in ('yes', 'no', 'na')),
  principle_written_consent text check (principle_written_consent in ('yes', 'no', 'na')),
  principle_oral_consent text check (principle_oral_consent in ('yes', 'no', 'na')),
  principle_voluntary_informed text check (principle_voluntary_informed in ('yes', 'no', 'na')),
  principle_withdraw_option text check (principle_withdraw_option in ('yes', 'no', 'na')),
  principle_harm_informed text check (principle_harm_informed in ('yes', 'no', 'na')),
  principle_confidentiality_guaranteed text check (principle_confidentiality_guaranteed in ('yes', 'no', 'na')),
  principle_anonymity_guaranteed text check (principle_anonymity_guaranteed in ('yes', 'no', 'na')),
  principle_vulnerable_groups_informed text check (principle_vulnerable_groups_informed in ('yes', 'no', 'na')),
  principle_interview_no_explanation_needed text check (principle_interview_no_explanation_needed in ('yes', 'no', 'na')),
  principle_safe_data_storage text check (principle_safe_data_storage in ('yes', 'no', 'na')),
  principle_will_publish text check (principle_will_publish in ('yes', 'no', 'na')),
  attach_protocol_or_proposal boolean not null default false,
  attach_participant_info_sheet boolean not null default false,
  attach_consent_form boolean not null default false,
  attach_study_tools boolean not null default false,
  attach_other_supportive_docs boolean not null default false,
  outcome text not null default 'pending' check (outcome in ('pending', 'granted', 'amendments', 'rejected')),
  ref_number text,
  meeting_date date,
  approval_letter_file_id uuid references public.files (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.ethical_approval enable row level security;

drop policy if exists "ethical approval viewable by the team" on public.ethical_approval;
create policy "ethical approval viewable by the team"
  on public.ethical_approval for select
  to authenticated
  using (research_project_id = public.my_research_project_id());

drop policy if exists "team can edit ethical approval" on public.ethical_approval;
create policy "team can edit ethical approval"
  on public.ethical_approval for update
  to authenticated
  using (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
  );

-- يوسّع خيارات فئة الملفات لتشمل خطاب/مرفقات الموافقة الأخلاقية — يعيد
-- استخدام نفس مسار الرفع الحقيقي (FileAttach → drive-upload) بدون كود جديد
alter table public.files drop constraint if exists files_category_check;
alter table public.files add constraint files_category_check
  check (category in ('general', 'meeting-minutes', 'ethical-approval'));

-- صف طلب موافقة أخلاقية فارغ لكل مشروع بحث حالي — seed_research_project_content
-- المُحدَّثة (بالأسفل) تتكفل بأي فريق جديد تلقائيًا
insert into public.ethical_approval (research_project_id)
select id from public.research_projects
where not exists (select 1 from public.ethical_approval where research_project_id = research_projects.id)
on conflict do nothing;

create or replace function public.seed_research_project_content(p_project_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.research_stages (research_project_id, stage_key, title_ar, title_en, stage_order)
  values
    (p_project_id, 'topic', 'اختيار الموضوع', 'Topic Selection', 1),
    (p_project_id, 'proposal', 'المقترح البحثي', 'Research Proposal', 2),
    (p_project_id, 'literature-review', 'مراجعة الأدبيات', 'Literature Review', 3),
    (p_project_id, 'research-gap', 'الفجوة البحثية', 'Research Gap', 4),
    (p_project_id, 'research-questions', 'أسئلة البحث', 'Research Questions', 5),
    (p_project_id, 'methodology', 'المنهجية', 'Methodology', 6),
    (p_project_id, 'data-collection', 'جمع البيانات', 'Data Collection', 7),
    (p_project_id, 'analysis', 'تحليل البيانات', 'Data Analysis', 8),
    (p_project_id, 'writing', 'كتابة البحث', 'Writing', 9),
    (p_project_id, 'final-submission', 'التسليم النهائي', 'Final Submission', 10)
  on conflict (research_project_id, stage_key) do nothing;

  insert into public.proposal_sections (research_project_id, section_key, order_index, label_ar, label_en)
  values
    (p_project_id, 'background', 1, 'خلفية البحث', 'Background'),
    (p_project_id, 'literature-review', 2, 'مراجعة الأدبيات', 'Literature Review'),
    (p_project_id, 'problem', 3, 'مشكلة البحث', 'Statement of Problem'),
    (p_project_id, 'gap', 4, 'الفجوة المعرفية', 'Gap of Knowledge'),
    (p_project_id, 'aim', 5, 'هدف الدراسة', 'Purpose / Aim'),
    (p_project_id, 'questions', 6, 'أسئلة البحث', 'Research Questions'),
    (p_project_id, 'methodology', 7, 'المنهجية', 'Methodology')
  on conflict (research_project_id, section_key) do nothing;

  insert into public.research_gap (research_project_id) values (p_project_id) on conflict do nothing;
  insert into public.study_aim (research_project_id) values (p_project_id) on conflict do nothing;
  insert into public.methodology (research_project_id) values (p_project_id) on conflict do nothing;
  insert into public.ethical_approval (research_project_id) values (p_project_id) on conflict do nothing;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ethical_approval') then
    alter publication supabase_realtime add table public.ethical_approval;
  end if;
end $$;

-- =============================================================
-- وكيل البحث العلمي — research_search_queries
--
-- كل صف نتيجة بحث ويب حقيقي (Claude web search) عن دراسات قريبة
-- من عنوان بحث الفريق. results عبارة عن jsonb (استثناء متعمد عن
-- النمط المعتاد بهذا الملف من أعمدة نصية مسطّحة) لأن كل نتيجة
-- بحث سجل متعدد الحقول (عنوان، رابط، مؤلفين، ملخص، سبب الصلة،
-- نوع المصدر) وعددها متغيّر لكل بحث — يحتاج يبقى بنية JSON
-- عشان الواجهة تعرض كل حقل بشكل منفصل.
-- =============================================================

create table if not exists public.research_search_queries (
  id uuid primary key default gen_random_uuid(),
  research_project_id uuid not null references public.research_projects (id) on delete cascade,
  query_text text not null,
  results jsonb not null default '[]'::jsonb,
  novelty_note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists research_search_queries_project_idx on public.research_search_queries (research_project_id);

alter table public.research_search_queries enable row level security;

drop policy if exists "research search queries viewable by the team" on public.research_search_queries;
create policy "research search queries viewable by the team"
  on public.research_search_queries for select
  to authenticated
  using (research_project_id = public.my_research_project_id());

drop policy if exists "team can add research search queries" on public.research_search_queries;
create policy "team can add research search queries"
  on public.research_search_queries for insert
  to authenticated
  with check (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
    and created_by = auth.uid()
  );

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'research_search_queries') then
    alter publication supabase_realtime add table public.research_search_queries;
  end if;
end $$;

-- =============================================================
-- حدود استخدام الذكاء الاصطناعي — تحكّم بتكلفة Anthropic API
--
-- المساعد الذكي (شات): حد يومي لكل فريق، يُحسب بجدول ai_usage_daily.
-- وكيل البحث العلمي: حد شهري لكل فريق، يُحسب مباشرة من عدد صفوف
-- research_search_queries هذا الشهر (ما يحتاج جدول عدّاد منفصل لأن
-- كل عملية بحث أصلًا تتسجّل هناك).
-- =============================================================

create table if not exists public.ai_usage_daily (
  team_id uuid not null references public.teams (id) on delete cascade,
  usage_date date not null default current_date,
  chat_count int not null default 0,
  primary key (team_id, usage_date)
);

alter table public.ai_usage_daily enable row level security;

drop policy if exists "team can view own ai usage" on public.ai_usage_daily;
create policy "team can view own ai usage"
  on public.ai_usage_daily for select
  to authenticated
  using (team_id = public.my_team_id());

-- دالة الزيادة الذرّية — تُستدعى فقط من دالة ai-assist Edge Function عبر
-- service role (ما فيها grant لـ authenticated/anon عن قصد). ترجّع الرقم
-- الجديد لو زادت، أو رقم سالب (= -العدد الحالي) لو وصل الحد.
create or replace function public.increment_ai_chat_usage(p_team_id uuid, p_limit int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.ai_usage_daily (team_id, usage_date, chat_count)
  values (p_team_id, current_date, 1)
  on conflict (team_id, usage_date)
  do update set chat_count = ai_usage_daily.chat_count + 1
  where ai_usage_daily.chat_count < p_limit
  returning chat_count into v_count;

  if v_count is null then
    select chat_count into v_count from public.ai_usage_daily
    where team_id = p_team_id and usage_date = current_date;
    return -coalesce(v_count, p_limit);
  end if;

  return v_count;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ai_usage_daily') then
    alter publication supabase_realtime add table public.ai_usage_daily;
  end if;
end $$;

-- ============================================================
-- 10) دفع كل عضو حصته — بدل ما شخص واحد يدفع فاتورة الفريق كاملة، أي عضو
--    يقدر يدفع نصيبه فقط. نربط كل دفعة بصاحبها (profile_id) عشان: (أ)
--    نعرض قائمة "مين دفع حصته هالشهر" بصفحة الأسعار، و(ب) الـ webhook يمدد
--    الاشتراك تراكميًا حسب نسبة المبلغ المدفوع من إجمالي فاتورة الفريق —
--    مو شرط الكل يدفعون قبل لا يتفعّل أي شيء (تفصيل الحساب بـ
--    moyasar-webhook، هذا فقط عمود التتبع).
-- ============================================================
alter table public.payments add column if not exists profile_id uuid references public.profiles (id) on delete set null;
create index if not exists payments_profile_id_idx on public.payments (profile_id);
create index if not exists payments_team_created_idx on public.payments (team_id, created_at);

-- ============================================================
-- 11) حذف — tasks و evidence_papers عندها سياسات حذف من قبل، بس
--    meeting_minutes وresearch_search_queries ما عندها. نضيفها هنا بنفس
--    نمط "الكاتب أو القائد يقدر يحذف، والفريق لازم يقدر يكتب (اشتراك فعّال)"
--    المستخدم بباقي الجداول. + دالة لإزالة عضو من الفريق (قائد الفريق بس،
--    ومو نفسه) عشان قائمة النقاط الثلاث بصفحة الفريق.
--
--    ملاحظة: جدول task_comments معرّف بقسم (٣) فوق لكنه ما انطبّق فعليًا
--    على قاعدة البيانات الحية (تحقّقنا مباشرة) — ميزة "تعليقات المهام"
--    معطّلة بالإنتاج حاليًا بصمت. ما أضفنا سياسة حذف له هنا لنفس السبب —
--    يحتاج قرار منفصل: نطبّق الجدول فعليًا أو نشيله من الواجهة.
-- ============================================================
drop policy if exists "author or leader can delete meeting minutes" on public.meeting_minutes;
create policy "author or leader can delete meeting minutes"
  on public.meeting_minutes for delete
  to authenticated
  using (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
    and (
      created_by = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'leader')
    )
  );

drop policy if exists "author or leader can delete research search queries" on public.research_search_queries;
create policy "author or leader can delete research search queries"
  on public.research_search_queries for delete
  to authenticated
  using (
    research_project_id = public.my_research_project_id()
    and public.team_can_write(public.my_team_id())
    and (
      created_by = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'leader')
    )
  );

-- إزالة عضو من الفريق: قائد الفريق بس، وعلى عضو غيره (مو نفسه). العضو
-- المُزال ما يُحذف ولا يُعلّق بـ team_id = null (كان يسيبه بحساب معطّل
-- بلا فريق ولا طريقة رجوع) — يصير تلقائيًا قائد فريق بحثي جديد ومستقل
-- له لحاله، بنفس منطق handle_new_user بالضبط.
create or replace function public.remove_team_member(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_caller_team uuid;
  v_target_team uuid;
  v_target_name text;
  v_new_team_id uuid;
begin
  select role, team_id into v_caller_role, v_caller_team from public.profiles where id = auth.uid();
  select team_id, name into v_target_team, v_target_name from public.profiles where id = target_id;

  if v_caller_role is distinct from 'leader' then
    raise exception 'قائد الفريق فقط يقدر يزيل عضو';
  end if;

  if v_caller_team is null or v_caller_team is distinct from v_target_team then
    raise exception 'العضو مو بنفس فريقك';
  end if;

  if target_id = auth.uid() then
    raise exception 'ما تقدر تزيل نفسك';
  end if;

  insert into public.teams (name)
  values (coalesce(v_target_name, 'عضو') || ' — فريق بحثي')
  returning id into v_new_team_id;

  update public.profiles
  set team_id = v_new_team_id, role = 'leader'
  where id = target_id;
end;
$$;

grant execute on function public.remove_team_member(uuid) to authenticated;

-- ============================================================
-- 12) جامعة الفريق — حقل اختياري بسيط (مو إعادة هيكلة لمجلدات Drive،
--    بس لعرض/فلترة الفرق حسب جامعتها بصفحة الفريق ولوحة الأدمن).
--    تُسجَّل تلقائيًا وقت إنشاء فريق جديد (handle_new_user فوق)، وقابلة
--    للتعديل لاحقًا من قائد الفريق عبر update_team_university.
-- ============================================================
alter table public.teams add column if not exists university text;

create or replace function public.update_team_university(p_university text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_team_id uuid;
begin
  select role, team_id into v_role, v_team_id from public.profiles where id = auth.uid();

  if v_role is distinct from 'leader' or v_team_id is null then
    raise exception 'قائد الفريق فقط يقدر يعدّل جامعة الفريق';
  end if;

  update public.teams set university = nullif(trim(p_university), '') where id = v_team_id;
end;
$$;

grant execute on function public.update_team_university(text) to authenticated;

-- ============================================================
-- سجل محادثات المساعد الذكي — خاص بكل مستخدم (ما يشوفه زملاؤه)
-- الصور ما تنحفظ (تنحفظ إشارة نصية فقط) عشان حجم القاعدة وخصوصية المرفقات
-- ============================================================
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'محادثة جديدة',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);
alter table public.ai_conversations enable row level security;

drop policy if exists "own ai conversations" on public.ai_conversations;
create policy "own ai conversations"
  on public.ai_conversations for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  had_image boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_conv_idx on public.ai_messages (conversation_id, created_at);
alter table public.ai_messages enable row level security;

drop policy if exists "own ai messages" on public.ai_messages;
create policy "own ai messages"
  on public.ai_messages for all
  to authenticated
  using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
-- ============================================================
-- أدوات الدراسة: ملاحظات المشرف، قوائم التحقق، مكتبة الأدوات المعتمدة، اقتراحات الميزات
-- ============================================================

-- ملاحظات المشرف — كل ملاحظة صف مستقل يتتبعه الفريق حتى ينحل
create table if not exists public.supervisor_feedback (
  id uuid primary key default gen_random_uuid(),
  research_project_id uuid not null references public.research_projects (id) on delete cascade,
  comment text not null check (char_length(comment) between 1 and 1000),
  section_key text,
  status text not null default 'open' check (status in ('open', 'done')),
  assignee_id uuid references public.profiles (id) on delete set null,
  feedback_date date not null default current_date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists supervisor_feedback_project_idx on public.supervisor_feedback (research_project_id, status, created_at desc);
alter table public.supervisor_feedback enable row level security;

drop policy if exists "feedback viewable by the team" on public.supervisor_feedback;
create policy "feedback viewable by the team" on public.supervisor_feedback for select to authenticated
  using (research_project_id = public.my_research_project_id());
drop policy if exists "team can add feedback" on public.supervisor_feedback;
create policy "team can add feedback" on public.supervisor_feedback for insert to authenticated
  with check (research_project_id = public.my_research_project_id() and public.team_can_write(public.my_team_id()) and created_by = auth.uid());
drop policy if exists "team can update feedback" on public.supervisor_feedback;
create policy "team can update feedback" on public.supervisor_feedback for update to authenticated
  using (research_project_id = public.my_research_project_id() and public.team_can_write(public.my_team_id()));
drop policy if exists "team can delete feedback" on public.supervisor_feedback;
create policy "team can delete feedback" on public.supervisor_feedback for delete to authenticated
  using (research_project_id = public.my_research_project_id() and public.team_can_write(public.my_team_id()));

-- قوائم تحقق مشتركة للفريق (ترجمة الاستبيان، تجهيز الموافقات…)
create table if not exists public.project_checklists (
  research_project_id uuid not null references public.research_projects (id) on delete cascade,
  list_key text not null,
  item_key text not null,
  done boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (research_project_id, list_key, item_key)
);
alter table public.project_checklists enable row level security;

drop policy if exists "checklists viewable by the team" on public.project_checklists;
create policy "checklists viewable by the team" on public.project_checklists for select to authenticated
  using (research_project_id = public.my_research_project_id());
drop policy if exists "team can add checklist items" on public.project_checklists;
create policy "team can add checklist items" on public.project_checklists for insert to authenticated
  with check (research_project_id = public.my_research_project_id() and public.team_can_write(public.my_team_id()));
drop policy if exists "team can update checklist items" on public.project_checklists;
create policy "team can update checklist items" on public.project_checklists for update to authenticated
  using (research_project_id = public.my_research_project_id() and public.team_can_write(public.my_team_id()));

-- مكتبة أدوات القياس المعتمدة — مشتركة بين كل الفرق (بيانات مستخرجة من دراسات منشورة، ما فيها أي بيانات فريق)
create table if not exists public.validated_tools (
  id uuid primary key default gen_random_uuid(),
  tool_key text not null unique,
  tool_name text not null check (char_length(tool_name) between 2 and 200),
  measures text not null default '' check (char_length(measures) <= 400),
  items text not null default '' check (char_length(items) <= 120),
  reliability text not null default '' check (char_length(reliability) <= 300),
  languages text not null default '' check (char_length(languages) <= 200),
  population text not null default '' check (char_length(population) <= 300),
  source_title text not null default '' check (char_length(source_title) <= 400),
  source_url text not null default '' check (char_length(source_url) <= 600 and (source_url = '' or source_url ~* '^https?://')),
  year int,
  is_arabic boolean not null default false,
  saved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.validated_tools enable row level security;

drop policy if exists "tools library readable by members" on public.validated_tools;
create policy "tools library readable by members" on public.validated_tools for select to authenticated using (true);
drop policy if exists "members can add tools" on public.validated_tools;
create policy "members can add tools" on public.validated_tools for insert to authenticated with check (saved_by = auth.uid());
drop policy if exists "admin can delete tools" on public.validated_tools;
create policy "admin can delete tools" on public.validated_tools for delete to authenticated using (public.is_super_admin());

-- اقتراحات الميزات من المستخدمات — تُقرأ من صاحب النظام فقط
create table if not exists public.feature_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  idea text not null check (char_length(idea) between 3 and 600),
  page text,
  created_at timestamptz not null default now()
);
alter table public.feature_ideas enable row level security;

drop policy if exists "users add own ideas" on public.feature_ideas;
create policy "users add own ideas" on public.feature_ideas for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "users see own ideas or admin all" on public.feature_ideas;
create policy "users see own ideas or admin all" on public.feature_ideas for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'supervisor_feedback') then
    alter publication supabase_realtime add table public.supervisor_feedback;
  end if;
end $$;
-- ============================================================
-- رسائل المشرفة (محادثة عبر رابطها) + تقويم الجوال (رابط اشتراك ICS)
-- ============================================================

create table if not exists public.supervisor_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  sender text not null check (sender in ('supervisor', 'team')),
  sender_name text not null default '' check (char_length(sender_name) <= 80),
  body text not null check (char_length(body) between 1 and 1500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists supervisor_messages_team_idx on public.supervisor_messages (team_id, created_at desc);
alter table public.supervisor_messages enable row level security;

drop policy if exists "team sees supervisor messages" on public.supervisor_messages;
create policy "team sees supervisor messages" on public.supervisor_messages for select to authenticated
  using (team_id = public.my_team_id());
drop policy if exists "team replies to supervisor" on public.supervisor_messages;
create policy "team replies to supervisor" on public.supervisor_messages for insert to authenticated
  with check (sender = 'team' and created_by = auth.uid() and team_id = public.my_team_id() and public.team_can_write(team_id));

-- المشرفة (برمزها فقط، بدون حساب) تقرأ المحادثة
create or replace function public.get_supervisor_thread(p_token uuid)
returns jsonb
language sql
security definer set search_path = public
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'sender', m.sender, 'senderName', m.sender_name, 'body', m.body, 'createdAt', m.created_at
  ) order by m.created_at), '[]'::jsonb)
  from (
    select * from public.supervisor_messages
    where team_id = (select id from public.teams where share_token = p_token)
    order by created_at desc limit 100
  ) m;
$$;
grant execute on function public.get_supervisor_thread(uuid) to anon, authenticated;

-- المشرفة ترسل رسالة — حد ٢٠ رسالة بالساعة لكل فريق (حماية من إساءة استخدام الرابط)
create or replace function public.submit_supervisor_message(p_token uuid, p_body text, p_name text default '')
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team uuid;
  v_body text := trim(coalesce(p_body, ''));
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then
    raise exception 'invalid token';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 1500 then
    raise exception 'invalid length';
  end if;
  if (select count(*) from public.supervisor_messages
      where team_id = v_team and sender = 'supervisor' and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'rate limit';
  end if;
  insert into public.supervisor_messages (team_id, sender, sender_name, body)
  values (v_team, 'supervisor', left(trim(coalesce(p_name, '')), 80), v_body);
  -- توافق مع لوحة الفريق القديمة (آخر ملاحظة)
  update public.teams set supervisor_note = v_body, supervisor_note_at = now() where id = v_team;
end;
$$;
grant execute on function public.submit_supervisor_message(uuid, text, text) to anon, authenticated;

-- الفريق يعلّم رسائل المشرفة كمقروءة
create or replace function public.mark_supervisor_messages_read()
returns void
language sql
security definer set search_path = public
as $$
  update public.supervisor_messages set read_at = now()
  where team_id = public.my_team_id() and sender = 'supervisor' and read_at is null;
$$;
grant execute on function public.mark_supervisor_messages_read() to authenticated;

-- قائدة الفريق تغيّر رابط المشرفة لو تسرّب (الرابط القديم يتعطل)
create or replace function public.rotate_share_token()
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_new uuid := gen_random_uuid();
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'leader') then
    raise exception 'leader only';
  end if;
  update public.teams set share_token = v_new where id = public.my_team_id();
  return v_new;
end;
$$;
grant execute on function public.rotate_share_token() to authenticated;

-- ترحيل آخر ملاحظة قديمة كرسالة أولى (مرة وحدة)
insert into public.supervisor_messages (team_id, sender, body, created_at, read_at)
select t.id, 'supervisor', left(t.supervisor_note, 1500), coalesce(t.supervisor_note_at, now()), now()
from public.teams t
where t.supervisor_note is not null and trim(t.supervisor_note) <> ''
  and not exists (select 1 from public.supervisor_messages m where m.team_id = t.id);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'supervisor_messages') then
    alter publication supabase_realtime add table public.supervisor_messages;
  end if;
end $$;

-- رمز اشتراك تقويم الجوال — جدول منفصل عشان ما يظهر لزميلات الفريق (profiles تنقرأ من الفريق كله)
create table if not exists public.calendar_feeds (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.calendar_feeds enable row level security;
-- بدون سياسات: الوصول فقط عبر الدوال أدناه ودالة calendar-feed (service role)

create or replace function public.get_or_create_calendar_token()
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_token uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into public.calendar_feeds (profile_id) values (auth.uid()) on conflict (profile_id) do nothing;
  select token into v_token from public.calendar_feeds where profile_id = auth.uid();
  return v_token;
end;
$$;
grant execute on function public.get_or_create_calendar_token() to authenticated;

create or replace function public.rotate_calendar_token()
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_token uuid := gen_random_uuid();
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into public.calendar_feeds (profile_id, token) values (auth.uid(), v_token)
  on conflict (profile_id) do update set token = excluded.token, created_at = now();
  return v_token;
end;
$$;
grant execute on function public.rotate_calendar_token() to authenticated;

-- الدالة القديمة (نسخ الواجهة القديمة المخزّنة) تمر الآن عبر الدالة الجديدة عشان يسري الحد وتنحفظ بالسجل
create or replace function public.submit_supervisor_note(p_token uuid, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.submit_supervisor_message(p_token, p_note, '');
end;
$$;
grant execute on function public.submit_supervisor_note(uuid, text) to anon, authenticated;

-- دوال الأعضاء فقط: نسحب التنفيذ من anon/public
revoke execute on function public.mark_supervisor_messages_read() from public, anon;
revoke execute on function public.rotate_share_token() from public, anon;
revoke execute on function public.get_or_create_calendar_token() from public, anon;
revoke execute on function public.rotate_calendar_token() from public, anon;

-- ============================================================
-- منشئ استبيانات البحث + استبيان عام (pain-points) — مطبّق على القاعدة عبر migrations
-- survey_responses / research_surveys / research_survey_responses
-- (انظر الدوال submit_survey, get_public_survey, submit_survey_response)
-- ============================================================

-- ============================================================
-- إشعارات الإيميل للمشرفة — تشترك بنفسها من رابطها (تأكيد مزدوج)
-- الوصول للجدول فقط من دالة Edge باسم supervisor-email (service role)؛ الإيميل ما يظهر لأي عميل.
-- ============================================================
create table if not exists public.supervisor_email_subscriptions (
  team_id uuid primary key references public.teams (id) on delete cascade,
  email text not null check (char_length(email) between 5 and 254),
  confirm_token uuid not null default gen_random_uuid(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  requested_at timestamptz not null default now(),
  requests_day date not null default current_date,
  requests_today int not null default 0,
  last_notified_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.supervisor_email_subscriptions enable row level security;

create or replace function public._mask_email(p_email text)
returns text
language sql
immutable
as $$
  select case
    when p_email is null or position('@' in p_email) < 2 then ''
    else left(split_part(p_email, '@', 1), 1) || '***@' || split_part(p_email, '@', 2)
  end;
$$;

create or replace function public.get_supervisor_email_status(p_token uuid)
returns jsonb
language sql
security definer set search_path = public
stable
as $$
  select coalesce((
    select jsonb_build_object(
      'state', case
        when s.unsubscribed_at is not null then 'off'
        when s.confirmed_at is not null then 'active'
        else 'pending' end,
      'emailMasked', public._mask_email(s.email)
    )
    from public.supervisor_email_subscriptions s
    join public.teams t on t.id = s.team_id
    where t.share_token = p_token
  ), jsonb_build_object('state', 'none', 'emailMasked', ''));
$$;
grant execute on function public.get_supervisor_email_status(uuid) to anon, authenticated;

create or replace function public.get_my_supervisor_email_status()
returns jsonb
language sql
security definer set search_path = public
stable
as $$
  select coalesce((
    select jsonb_build_object(
      'state', case
        when s.unsubscribed_at is not null then 'off'
        when s.confirmed_at is not null then 'active'
        else 'pending' end,
      'emailMasked', public._mask_email(s.email)
    )
    from public.supervisor_email_subscriptions s
    where s.team_id = public.my_team_id()
  ), jsonb_build_object('state', 'none', 'emailMasked', ''));
$$;
grant execute on function public.get_my_supervisor_email_status() to authenticated;
revoke execute on function public.get_my_supervisor_email_status() from anon;

-- ============================================================
-- ربط درايف الفريق (قائد الفريق يربط حساب Google حقه — مجلد مشترك للأعضاء)
-- رموز التحديث مشفّرة (AES-GCM) من دالة drive-team؛ RLS مفعّل بدون أي policy
-- يعني ما أحد يقرأ الجدول من الواجهة — الدالة وحدها (service_role) تقرأ وتكتب.
-- ============================================================
create table if not exists public.drive_connections (
  research_project_id uuid primary key references public.research_projects (id) on delete cascade,
  connected_by uuid references public.profiles (id) on delete set null,
  google_email text not null,
  refresh_token_enc text not null,
  folder_id text not null,
  folder_link text not null,
  created_at timestamptz not null default now()
);

alter table public.drive_connections enable row level security;

-- ============================================================
-- تقويم الفريق الحقيقي (مواعيد/اجتماعات/مواعيد نهائية) — مشترك بين الأعضاء.
-- كان محفوظًا بمتصفح كل مستخدم فقط (localStorage)، فما يظهر للفريق ولا بالرئيسية.
-- ============================================================
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  event_date date not null,
  event_time text not null default '09:00',
  event_type text not null default 'meeting' check (event_type in ('meeting', 'review', 'fieldwork', 'deadline')),
  location text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists calendar_events_team_date_idx on public.calendar_events (team_id, event_date);

alter table public.calendar_events enable row level security;

drop policy if exists "team can view calendar events" on public.calendar_events;
create policy "team can view calendar events"
  on public.calendar_events for select
  to authenticated
  using (team_id = public.my_team_id() or public.is_super_admin());

drop policy if exists "team can add calendar events" on public.calendar_events;
create policy "team can add calendar events"
  on public.calendar_events for insert
  to authenticated
  with check (
    team_id = public.my_team_id()
    and public.team_can_write(team_id)
    and created_by = auth.uid()
  );

drop policy if exists "team can update calendar events" on public.calendar_events;
create policy "team can update calendar events"
  on public.calendar_events for update
  to authenticated
  using (team_id = public.my_team_id() and public.team_can_write(team_id))
  with check (team_id = public.my_team_id());

drop policy if exists "author or leader can delete calendar events" on public.calendar_events;
create policy "author or leader can delete calendar events"
  on public.calendar_events for delete
  to authenticated
  using (
    team_id = public.my_team_id()
    and public.team_can_write(team_id)
    and (
      created_by = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'leader')
    )
  );

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'calendar_events') then
    alter publication supabase_realtime add table public.calendar_events;
  end if;
end $$;

-- ============================================================
-- الوضوح بين الفريق والمشرفة: محاضر منظّمة + اعتماد + قرارات + أوقات متاحة + حجز مواعيد.
-- المشرفة بدون حساب: كل إجراءاتها عبر دوال SECURITY DEFINER تتحقق من رمز الرابط (share_token).
-- الفريق يكتب فقط عبر دوال/سياسات تتحقق من الفريق والاشتراك، فما يقدر يزوّر اعتماد المشرفة.
-- «الصمت = موافقة»: المحضر المعلّق أكثر من 48 ساعة يُحسب «اعتُمد تلقائيًا» عند القراءة (بدون جدولة).
-- ============================================================
alter table public.meeting_minutes add column if not exists agenda text not null default '';

create table if not exists public.minutes_approvals (
  minutes_id uuid primary key references public.meeting_minutes (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  note text not null default '' check (char_length(note) <= 1000),
  supervisor_name text not null default '' check (char_length(supervisor_name) <= 80)
);
create index if not exists minutes_approvals_team_idx on public.minutes_approvals (team_id, requested_at desc);
alter table public.minutes_approvals enable row level security;
create policy "team sees minutes approvals" on public.minutes_approvals for select to authenticated
  using (team_id = public.my_team_id());

create table if not exists public.minutes_actions (
  id uuid primary key default gen_random_uuid(),
  minutes_id uuid not null references public.meeting_minutes (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 300),
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  task_id uuid references public.tasks (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists minutes_actions_minutes_idx on public.minutes_actions (minutes_id);
create index if not exists minutes_actions_team_idx on public.minutes_actions (team_id);
alter table public.minutes_actions enable row level security;
create policy "team sees minutes actions" on public.minutes_actions for select to authenticated
  using (team_id = public.my_team_id());

create table if not exists public.decision_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  question text not null check (char_length(question) between 3 and 400),
  options text[] not null check (array_length(options, 1) between 2 and 4),
  needed_by date,
  status text not null default 'open' check (status in ('open', 'answered', 'cancelled')),
  chosen_index int,
  answer_note text not null default '' check (char_length(answer_note) <= 1000),
  supervisor_name text not null default '' check (char_length(supervisor_name) <= 80),
  answered_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists decision_requests_team_idx on public.decision_requests (team_id, created_at desc);
alter table public.decision_requests enable row level security;
create policy "team sees decision requests" on public.decision_requests for select to authenticated
  using (team_id = public.my_team_id());
create policy "team asks decision requests" on public.decision_requests for insert to authenticated
  with check (
    team_id = public.my_team_id() and public.team_can_write(team_id) and created_by = auth.uid()
    and status = 'open' and chosen_index is null and answered_at is null and answer_note = '' and supervisor_name = ''
  );

create table if not exists public.supervisor_availability (
  team_id uuid primary key references public.teams (id) on delete cascade,
  windows jsonb not null default '[]'::jsonb,
  slot_minutes int not null default 30 check (slot_minutes in (15, 20, 30, 45, 60)),
  auto_confirm boolean not null default true,
  reply_days int check (reply_days between 1 and 30),
  note text not null default '' check (char_length(note) <= 300),
  updated_at timestamptz not null default now()
);
alter table public.supervisor_availability enable row level security;
create policy "team sees supervisor availability" on public.supervisor_availability for select to authenticated
  using (team_id = public.my_team_id());

create table if not exists public.meeting_bookings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  booking_date date not null,
  booking_time text not null check (booking_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  duration_min int not null default 30,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  note text not null default '' check (char_length(note) <= 300),
  supervisor_note text not null default '' check (char_length(supervisor_note) <= 300),
  requested_by uuid references public.profiles (id) on delete set null,
  calendar_event_id uuid references public.calendar_events (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists meeting_bookings_team_idx on public.meeting_bookings (team_id, booking_date);
alter table public.meeting_bookings enable row level security;
create policy "team sees meeting bookings" on public.meeting_bookings for select to authenticated
  using (team_id = public.my_team_id());

-- ---------- دوال الفريق (مستخدم مسجّل) ----------
create or replace function public.create_minutes_actions(p_minutes_id uuid, p_actions jsonb)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_team uuid := public.my_team_id();
  v_item jsonb;
  v_task uuid;
  v_assignee uuid;
  v_due date;
  v_text text;
  v_count int := 0;
begin
  if auth.uid() is null or v_team is null or not public.team_can_write(v_team) then
    raise exception 'not allowed';
  end if;
  if not exists (select 1 from public.meeting_minutes where id = p_minutes_id and research_project_id = public.my_research_project_id()) then
    raise exception 'minutes not found';
  end if;
  if jsonb_typeof(p_actions) <> 'array' or jsonb_array_length(p_actions) > 20 then
    raise exception 'bad actions';
  end if;
  for v_item in select * from jsonb_array_elements(p_actions) loop
    v_text := left(trim(coalesce(v_item->>'text', '')), 300);
    continue when v_text = '';
    v_assignee := null;
    if coalesce(v_item->>'assigneeId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select id into v_assignee from public.profiles where id = (v_item->>'assigneeId')::uuid and team_id = v_team;
    end if;
    v_due := null;
    begin
      if coalesce(v_item->>'dueDate', '') ~ '^\d{4}-\d{2}-\d{2}$' then
        v_due := (v_item->>'dueDate')::date;
      end if;
    exception when others then
      v_due := null;
    end;
    v_due := coalesce(v_due, current_date + 7);
    insert into public.tasks (team_id, title, description, assignee_id, due_date, priority, created_by)
    values (v_team, v_text, 'من محضر اجتماع', coalesce(v_assignee, auth.uid()), v_due, 'medium', auth.uid())
    returning id into v_task;
    insert into public.minutes_actions (minutes_id, team_id, text, assignee_id, due_date, task_id)
    values (p_minutes_id, v_team, v_text, coalesce(v_assignee, auth.uid()), v_due, v_task);
    v_count := v_count + 1;
  end loop;
  return jsonb_build_object('created', v_count);
end;
$$;
grant execute on function public.create_minutes_actions(uuid, jsonb) to authenticated;

create or replace function public.request_minutes_approval(p_minutes_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team uuid := public.my_team_id();
begin
  if auth.uid() is null or v_team is null or not public.team_can_write(v_team) then
    raise exception 'not allowed';
  end if;
  if not exists (select 1 from public.meeting_minutes where id = p_minutes_id and research_project_id = public.my_research_project_id()) then
    raise exception 'minutes not found';
  end if;
  insert into public.minutes_approvals (minutes_id, team_id, status, requested_at)
  values (p_minutes_id, v_team, 'pending', now())
  on conflict (minutes_id) do update
    set status = 'pending', requested_at = now(), resolved_at = null, note = '', supervisor_name = '';
end;
$$;
grant execute on function public.request_minutes_approval(uuid) to authenticated;

create or replace function public.cancel_decision_request(p_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team uuid := public.my_team_id();
begin
  if auth.uid() is null or v_team is null or not public.team_can_write(v_team) then
    raise exception 'not allowed';
  end if;
  update public.decision_requests set status = 'cancelled'
  where id = p_id and team_id = v_team and status = 'open';
end;
$$;
grant execute on function public.cancel_decision_request(uuid) to authenticated;

create or replace function public.book_meeting_slot(p_date date, p_time text, p_note text default '')
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_team uuid := public.my_team_id();
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_av public.supervisor_availability%rowtype;
  v_has_windows boolean := false;
  v_ok boolean := false;
  v_win jsonb;
  v_mins int;
  v_start int;
  v_end int;
  v_status text := 'pending';
  v_event uuid;
  v_id uuid;
  v_dur int := 30;
begin
  if auth.uid() is null or v_team is null or not public.team_can_write(v_team) then
    raise exception 'not allowed';
  end if;
  if p_date is null or p_date < v_today or p_date > v_today + 60 then
    raise exception 'bad date';
  end if;
  if p_time is null or p_time !~ '^[0-2][0-9]:[0-5][0-9]$' or substr(p_time, 1, 2)::int > 23 then
    raise exception 'bad time';
  end if;
  if (select count(*) from public.meeting_bookings where team_id = v_team and status in ('pending', 'confirmed') and booking_date >= v_today) >= 5 then
    raise exception 'too many bookings';
  end if;
  if exists (select 1 from public.meeting_bookings where team_id = v_team and status in ('pending', 'confirmed') and booking_date = p_date and booking_time = p_time) then
    raise exception 'already booked';
  end if;

  select * into v_av from public.supervisor_availability where team_id = v_team;
  if found and jsonb_typeof(v_av.windows) = 'array' and jsonb_array_length(v_av.windows) > 0 then
    v_has_windows := true;
    v_dur := v_av.slot_minutes;
    v_mins := substr(p_time, 1, 2)::int * 60 + substr(p_time, 4, 2)::int;
    for v_win in select * from jsonb_array_elements(v_av.windows) loop
      if (v_win->>'weekday')::int = extract(dow from p_date)::int then
        v_start := substr(v_win->>'start', 1, 2)::int * 60 + substr(v_win->>'start', 4, 2)::int;
        v_end := substr(v_win->>'end', 1, 2)::int * 60 + substr(v_win->>'end', 4, 2)::int;
        if v_mins >= v_start and v_mins + v_dur <= v_end and (v_mins - v_start) % v_dur = 0 then
          v_ok := true;
        end if;
      end if;
    end loop;
    if not v_ok then
      raise exception 'outside availability';
    end if;
    if v_av.auto_confirm then
      v_status := 'confirmed';
    end if;
  end if;

  if v_status = 'confirmed' then
    insert into public.calendar_events (team_id, title, event_date, event_time, event_type, location, created_by)
    values (v_team, 'اجتماع مع المشرفة', p_date, p_time, 'meeting', '', auth.uid())
    returning id into v_event;
  end if;

  insert into public.meeting_bookings (team_id, booking_date, booking_time, duration_min, status, note, requested_by, calendar_event_id, resolved_at)
  values (v_team, p_date, p_time, v_dur, v_status, left(coalesce(p_note, ''), 300), auth.uid(), v_event, case when v_status = 'confirmed' then now() else null end)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'status', v_status, 'hasWindows', v_has_windows);
end;
$$;
grant execute on function public.book_meeting_slot(date, text, text) to authenticated;

create or replace function public.cancel_meeting_booking(p_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team uuid := public.my_team_id();
  v_event uuid;
begin
  if auth.uid() is null or v_team is null or not public.team_can_write(v_team) then
    raise exception 'not allowed';
  end if;
  update public.meeting_bookings set status = 'cancelled', resolved_at = now()
  where id = p_id and team_id = v_team and status in ('pending', 'confirmed')
  returning calendar_event_id into v_event;
  if v_event is not null then
    delete from public.calendar_events where id = v_event and team_id = v_team;
  end if;
end;
$$;
grant execute on function public.cancel_meeting_booking(uuid) to authenticated;

-- ---------- دوال المشرفة (برمز الرابط، بدون حساب) ----------
create or replace function public.get_supervisor_board(p_token uuid)
returns jsonb
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_team uuid;
  v_name text;
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_last jsonb;
begin
  select id, name into v_team, v_name from public.teams where share_token = p_token;
  if v_team is null then
    return null;
  end if;

  select jsonb_build_object(
    'meetingDate', m.meeting_date,
    'total', (select count(*) from public.minutes_actions a where a.minutes_id = m.id),
    'done', (select count(*) from public.minutes_actions a join public.tasks t on t.id = a.task_id where a.minutes_id = m.id and t.status = 'done')
  ) into v_last
  from public.meeting_minutes m
  join public.research_projects rp on rp.id = m.research_project_id
  where rp.team_id = v_team
  order by m.meeting_date desc, m.created_at desc
  limit 1;

  return jsonb_build_object(
    'teamName', v_name,
    'today', v_today,
    'waiting', jsonb_build_object(
      'minutes', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', m.id,
          'meetingDate', m.meeting_date,
          'attendees', to_jsonb(m.attendees),
          'agenda', m.agenda,
          'discussion', m.discussion,
          'decisions', m.decisions,
          'requestedAt', ap.requested_at,
          'autoApprovesAt', ap.requested_at + interval '48 hours',
          'actions', (
            select coalesce(jsonb_agg(jsonb_build_object(
              'text', a.text, 'assigneeName', pr.name, 'dueDate', a.due_date, 'done', coalesce(t.status = 'done', false)
            ) order by a.created_at), '[]'::jsonb)
            from public.minutes_actions a
            left join public.profiles pr on pr.id = a.assignee_id
            left join public.tasks t on t.id = a.task_id
            where a.minutes_id = m.id
          )
        ) order by ap.requested_at desc), '[]'::jsonb)
        from public.minutes_approvals ap
        join public.meeting_minutes m on m.id = ap.minutes_id
        where ap.team_id = v_team and ap.status = 'pending' and ap.requested_at >= now() - interval '48 hours'
      ),
      'decisions', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', d.id, 'question', d.question, 'options', to_jsonb(d.options), 'neededBy', d.needed_by, 'createdAt', d.created_at
        ) order by d.created_at desc), '[]'::jsonb)
        from public.decision_requests d where d.team_id = v_team and d.status = 'open'
      ),
      'bookings', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', b.id, 'date', b.booking_date, 'time', b.booking_time, 'durationMin', b.duration_min, 'note', b.note, 'createdAt', b.created_at
        ) order by b.booking_date, b.booking_time), '[]'::jsonb)
        from public.meeting_bookings b where b.team_id = v_team and b.status = 'pending' and b.booking_date >= v_today
      )
    ),
    'recentMinutes', (
      select coalesce(jsonb_agg(x order by x->>'meetingDate' desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'id', m.id,
          'meetingDate', m.meeting_date,
          'status', case when ap.minutes_id is null then 'none'
                         when ap.status = 'pending' and ap.requested_at < now() - interval '48 hours' then 'auto_approved'
                         else ap.status end,
          'total', (select count(*) from public.minutes_actions a where a.minutes_id = m.id),
          'done', (select count(*) from public.minutes_actions a join public.tasks t on t.id = a.task_id where a.minutes_id = m.id and t.status = 'done')
        ) as x
        from public.meeting_minutes m
        join public.research_projects rp on rp.id = m.research_project_id
        left join public.minutes_approvals ap on ap.minutes_id = m.id
        where rp.team_id = v_team
        order by m.meeting_date desc, m.created_at desc
        limit 6
      ) s
    ),
    'lastMeeting', v_last,
    'upcoming', (
      select coalesce(jsonb_agg(jsonb_build_object('date', b.booking_date, 'time', b.booking_time) order by b.booking_date, b.booking_time), '[]'::jsonb)
      from public.meeting_bookings b where b.team_id = v_team and b.status = 'confirmed' and b.booking_date >= v_today
    ),
    'availability', (
      select jsonb_build_object('windows', av.windows, 'slotMinutes', av.slot_minutes, 'autoConfirm', av.auto_confirm, 'replyDays', av.reply_days, 'note', av.note)
      from public.supervisor_availability av where av.team_id = v_team
    )
  );
end;
$$;
grant execute on function public.get_supervisor_board(uuid) to anon, authenticated;

create or replace function public.supervisor_resolve_minutes(p_token uuid, p_minutes_id uuid, p_decision text, p_note text default '', p_name text default '')
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team uuid;
  v_date date;
  v_note text := left(trim(coalesce(p_note, '')), 1000);
  v_name text := left(trim(coalesce(p_name, '')), 80);
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid token'; end if;
  if p_decision not in ('approved', 'changes_requested') then raise exception 'bad decision'; end if;
  if p_decision = 'changes_requested' and v_note = '' then raise exception 'note required'; end if;
  select m.meeting_date into v_date from public.meeting_minutes m
    join public.research_projects rp on rp.id = m.research_project_id
    where m.id = p_minutes_id and rp.team_id = v_team;
  if v_date is null then raise exception 'minutes not found'; end if;
  update public.minutes_approvals set status = p_decision, resolved_at = now(), note = v_note, supervisor_name = v_name
    where minutes_id = p_minutes_id and team_id = v_team;
  if not found then raise exception 'no approval request'; end if;
  insert into public.supervisor_messages (team_id, sender, sender_name, body)
  values (v_team, 'supervisor', v_name,
    case when p_decision = 'approved' then '✅ اعتمدتُ محضر اجتماع ' || to_char(v_date, 'YYYY/MM/DD') || '.'
         else '✏️ طلبتُ تعديلًا على محضر اجتماع ' || to_char(v_date, 'YYYY/MM/DD') || ': ' || v_note end);
end;
$$;
grant execute on function public.supervisor_resolve_minutes(uuid, uuid, text, text, text) to anon, authenticated;

create or replace function public.supervisor_answer_decision(p_token uuid, p_id uuid, p_choice int, p_note text default '', p_name text default '')
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team uuid;
  v_q text;
  v_opts text[];
  v_note text := left(trim(coalesce(p_note, '')), 1000);
  v_name text := left(trim(coalesce(p_name, '')), 80);
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid token'; end if;
  select question, options into v_q, v_opts from public.decision_requests where id = p_id and team_id = v_team and status = 'open';
  if v_q is null then raise exception 'request not open'; end if;
  if p_choice < 0 or p_choice >= array_length(v_opts, 1) then raise exception 'bad choice'; end if;
  update public.decision_requests
    set status = 'answered', chosen_index = p_choice, answer_note = v_note, supervisor_name = v_name, answered_at = now()
    where id = p_id;
  insert into public.supervisor_messages (team_id, sender, sender_name, body)
  values (v_team, 'supervisor', v_name,
    '✅ قراري على «' || left(v_q, 120) || '»: ' || v_opts[p_choice + 1] || case when v_note <> '' then ' — ' || v_note else '' end);
end;
$$;
grant execute on function public.supervisor_answer_decision(uuid, uuid, int, text, text) to anon, authenticated;

create or replace function public.supervisor_respond_booking(p_token uuid, p_id uuid, p_decision text, p_note text default '', p_name text default '')
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team uuid;
  v_b public.meeting_bookings%rowtype;
  v_note text := left(trim(coalesce(p_note, '')), 300);
  v_name text := left(trim(coalesce(p_name, '')), 80);
  v_event uuid;
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid token'; end if;
  if p_decision not in ('confirm', 'decline') then raise exception 'bad decision'; end if;
  select * into v_b from public.meeting_bookings where id = p_id and team_id = v_team and status = 'pending';
  if not found then raise exception 'booking not pending'; end if;
  if p_decision = 'confirm' then
    insert into public.calendar_events (team_id, title, event_date, event_time, event_type, location, created_by)
    values (v_team, 'اجتماع مع المشرفة', v_b.booking_date, v_b.booking_time, 'meeting', '', v_b.requested_by)
    returning id into v_event;
    update public.meeting_bookings set status = 'confirmed', supervisor_note = v_note, resolved_at = now(), calendar_event_id = v_event where id = p_id;
  else
    update public.meeting_bookings set status = 'declined', supervisor_note = v_note, resolved_at = now() where id = p_id;
  end if;
  insert into public.supervisor_messages (team_id, sender, sender_name, body)
  values (v_team, 'supervisor', v_name,
    case when p_decision = 'confirm'
      then '📅 أكّدتُ اجتماع ' || to_char(v_b.booking_date, 'YYYY/MM/DD') || ' الساعة ' || v_b.booking_time || '.'
      else '📅 ما أقدر على موعد ' || to_char(v_b.booking_date, 'YYYY/MM/DD') || ' الساعة ' || v_b.booking_time || '، اقترحوا غيره' || case when v_note <> '' then ': ' || v_note else '.' end end);
end;
$$;
grant execute on function public.supervisor_respond_booking(uuid, uuid, text, text, text) to anon, authenticated;

create or replace function public.supervisor_set_availability(p_token uuid, p_windows jsonb, p_slot int, p_auto boolean, p_reply_days int, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_team uuid;
  v_win jsonb;
  v_clean jsonb := '[]'::jsonb;
  v_s text;
  v_e text;
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid token'; end if;
  if p_slot not in (15, 20, 30, 45, 60) then raise exception 'bad slot'; end if;
  if p_reply_days is not null and (p_reply_days < 1 or p_reply_days > 30) then raise exception 'bad reply days'; end if;
  if jsonb_typeof(p_windows) <> 'array' or jsonb_array_length(p_windows) > 14 then raise exception 'bad windows'; end if;
  for v_win in select * from jsonb_array_elements(p_windows) loop
    v_s := coalesce(v_win->>'start', '');
    v_e := coalesce(v_win->>'end', '');
    if (v_win->>'weekday') ~ '^[0-6]$' and v_s ~ '^[0-2][0-9]:[0-5][0-9]$' and v_e ~ '^[0-2][0-9]:[0-5][0-9]$' and v_s < v_e then
      v_clean := v_clean || jsonb_build_array(jsonb_build_object('weekday', (v_win->>'weekday')::int, 'start', v_s, 'end', v_e));
    end if;
  end loop;
  insert into public.supervisor_availability (team_id, windows, slot_minutes, auto_confirm, reply_days, note, updated_at)
  values (v_team, v_clean, p_slot, coalesce(p_auto, true), p_reply_days, left(trim(coalesce(p_note, '')), 300), now())
  on conflict (team_id) do update
    set windows = excluded.windows, slot_minutes = excluded.slot_minutes, auto_confirm = excluded.auto_confirm,
        reply_days = excluded.reply_days, note = excluded.note, updated_at = now();
end;
$$;
grant execute on function public.supervisor_set_availability(uuid, jsonb, int, boolean, int, text) to anon, authenticated;

alter publication supabase_realtime add table public.minutes_approvals, public.minutes_actions, public.decision_requests, public.meeting_bookings;
