-- المرحلة ٢ (الدكتورة): ذكاء المحادثة + الفويس. إضافات بس — ما يحذف ولا يغيّر بيانات موجودة.
-- ١) chat_summaries: «الخلاصة الحيّة» محفوظة لكل فريق (تنحسب بالسيرفر كل دقيقتين بالكثير)
-- ٢) profiles.focus_until: وقت التركيز (الإشعارات تتجمع إلا الإشارة ورسالة الدكتورة)
-- (الفويس ما يحتاج تغيير: رسالة عادية فيها meta.type='voice' والملف بحاوية drops تحت مجلد الفريق)

-- ── ١) الخلاصة الحيّة ──
create table if not exists public.chat_summaries (
  team_id uuid primary key references public.teams(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  last_message_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.chat_summaries enable row level security;
drop policy if exists chat_summaries_read on public.chat_summaries;
create policy chat_summaries_read on public.chat_summaries for select to authenticated using (team_id = public.my_team_id());
-- الكتابة من دالة chat-intel بس (service role)

-- ── ٢) وقت التركيز ──
alter table public.profiles add column if not exists focus_until timestamptz;
