-- NURSYNC — Supabase schema
--
-- الاستخدام: افتح مشروعك على supabase.com > SQL Editor > New query،
-- الصق هذا الملف كامل، ثم اضغط Run. يمكن تشغيله أكثر من مرة بأمان.

-- ============================================================
-- 1) الملفات الشخصية (profile لكل مستخدم في auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  initials text not null default '',
  title text not null default 'عضو الفريق',
  role text not null default 'member' check (role in ('leader', 'member')),
  color text not null default 'brand',
  email text,
  gender text check (gender in ('male', 'female')),
  subscription_status text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'expired')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

-- ترقية جدول قديم: أضف الأعمدة الجديدة لو الجدول كان موجود من قبل بدونها
alter table public.profiles add column if not exists gender text check (gender in ('male', 'female'));
alter table public.profiles add column if not exists subscription_status text
  not null default 'trial' check (subscription_status in ('trial', 'active', 'expired'));
alter table public.profiles add column if not exists trial_ends_at timestamptz
  default (now() + interval '14 days');

-- تتحقق هل اشتراك المستخدم فعّال (Active، أو Trial ولسا ما انتهى)
-- استخدمها بأي RLS policy عشان تمنعين الوصول للمحتوى الفعلي لحساب منتهي الاشتراك
create or replace function public.has_active_subscription(uid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and (
        subscription_status = 'active'
        or (subscription_status = 'trial' and (trial_ends_at is null or trial_ends_at > now()))
      )
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles are viewable by the team" on public.profiles;
create policy "profiles are viewable by the team"
  on public.profiles for select
  to authenticated
  using (true);

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

-- ينشئ صف profile تلقائيًا عند تسجيل مستخدم جديد.
-- مرّر الاسم والحروف الأولى والجنس عبر options.data عند استدعاء supabase.auth.signUp:
--   supabase.auth.signUp({ email, password, options: { data: { name, initials, gender } } })
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, initials, email, gender)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'initials', upper(left(new.email, 2))),
    new.email,
    new.raw_user_meta_data ->> 'gender'
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
-- 2) المهام
-- ============================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
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

alter table public.tasks enable row level security;

-- المحتوى الفعلي (المهام) محجوب عن أي حساب اشتراكه منتهي — حتى لو مسجّل دخول صحيح
drop policy if exists "tasks are viewable by the team" on public.tasks;
create policy "tasks are viewable by the team"
  on public.tasks for select
  to authenticated
  using (public.has_active_subscription(auth.uid()));

-- إسناد مهمة جديدة: يقدر يسويها قائد الفريق فقط، واشتراكه لازم يكون فعّال
drop policy if exists "only the leader can create tasks" on public.tasks;
create policy "only the leader can create tasks"
  on public.tasks for insert
  to authenticated
  with check (
    public.has_active_subscription(auth.uid())
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'leader'
    )
  );

-- تحديث المهمة: العضو المسؤول عنها يقدر يحدّث حالتها، والقائد يقدر يعدّل أي مهمة — واشتراكهم لازم يكون فعّال
drop policy if exists "assignee or leader can update a task" on public.tasks;
create policy "assignee or leader can update a task"
  on public.tasks for update
  to authenticated
  using (
    public.has_active_subscription(auth.uid())
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
    public.has_active_subscription(auth.uid())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'leader')
  );

-- تفعيل التحديث اللحظي (Realtime) حتى تتزامن المهام بين كل الفريق فورًا
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.profiles;

-- ============================================================
-- 3) تعيين أول قائدة/قائد فريق
-- ============================================================
-- بعد ما تسجّل أول حساب (من صفحة تسجيل الدخول في الموقع)، شغّل هذا السطر
-- بعد ما تستبدل البريد الإلكتروني بإيميل قائدة/قائد الفريق الفعلي:
--
-- update public.profiles set role = 'leader' where email = 'leader@example.com';

-- ============================================================
-- 4) إدارة الاشتراك (يدويًا الآن، لحد ما تربطين بوابة دفع)
-- ============================================================
-- كل حساب جديد يبدأ تلقائيًا بفترة تجريبية 14 يوم (subscription_status = 'trial').
-- بعد ما يدفع الفريق، فعّلي اشتراكهم بتشغيل هذا السطر لكل حساب بالفريق:
--
-- update public.profiles set subscription_status = 'active' where email = 'leader@example.com';
--
-- لو انتهى الاشتراك أو توقف الدفع:
--
-- update public.profiles set subscription_status = 'expired' where email = 'leader@example.com';
--
-- لما تربطين بوابة دفع حقيقية (Moyasar/Tap)، خلي الـ webhook حقها يشغّل نفس هذين
-- السطرين تلقائيًا بدل التفعيل اليدوي — الكود بالموقع والـ RLS جاهزين، ما يحتاجون تعديل.
