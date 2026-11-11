-- المرحلة ٢ (الدكتورة): ذكاء المحادثة + الفويس. إضافات بس — ما يحذف ولا يغيّر بيانات موجودة.
-- ١) chat_summaries: «الخلاصة الحيّة» محفوظة لكل فريق (تنحسب بالسيرفر كل دقيقتين بالكثير)
-- ٢) profiles.focus_until: وقت التركيز (الإشعارات تتجمع إلا الإشارة ورسالة الدكتورة)
-- ٣) team_messages.kind يقبل 'voice' (رسالة صوتية: الملف بحاوية drops تحت مجلد الفريق + النص والزبدة بـ meta)

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

-- ── ٣) الرسائل الصوتية ──
alter table public.team_messages drop constraint if exists team_messages_kind_check;
alter table public.team_messages add constraint team_messages_kind_check check (kind = any (array['user', 'agent', 'event', 'poll', 'voice']));
drop policy if exists "members post to their team" on public.team_messages;
create policy "members post to their team" on public.team_messages for insert to authenticated
  with check (auth.uid() = author_id and team_id = public.my_team_id() and public.team_can_write(public.my_team_id())
              and kind = any (array['user', 'agent', 'poll', 'voice']));
