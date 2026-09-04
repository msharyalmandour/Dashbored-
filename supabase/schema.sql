-- CohortSync — Supabase schema
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
  return new;
end;
$$;

drop trigger if exists set_team_founder_flag on public.teams;
create trigger set_team_founder_flag
  before insert on public.teams
  for each row execute procedure public.set_team_founder_flag();

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
  /** حساب صاحب النظام (مالك CohortSync) — يشوف صفحة إدارة الاشتراكات لكل الفرق */
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
    -- (تاريخ انتهاء الاشتراك يتحدد تلقائيًا بواسطة set_team_founder_flag — تجربة ٧ أيام لكل فريق جديد)
    insert into public.teams (name, referred_by_team_id)
    values (
      coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)) || ' — فريق بحثي',
      referrer_team_id
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
create or replace function public.admin_list_teams()
returns table (
  id uuid,
  name text,
  subscription_end_date date,
  member_count bigint,
  monthly_price numeric,
  is_founder boolean,
  on_trial boolean
)
language sql
security definer set search_path = public
stable
as $$
  select t.id, t.name, t.subscription_end_date, count(p.id) as member_count,
         t.monthly_price, t.is_founder, t.on_trial
  from public.teams t
  left join public.profiles p on p.team_id = t.id
  where public.is_super_admin()
  group by t.id, t.name, t.subscription_end_date, t.monthly_price, t.is_founder, t.on_trial
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
  result json;
begin
  select id, name, supervisor_note, supervisor_note_at
    into v_team_id, v_team_name, v_note, v_note_at
  from public.teams where share_token = p_token;
  if v_team_id is null then
    return null;
  end if;

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
