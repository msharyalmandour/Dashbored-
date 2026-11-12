-- المرحلة ٣ (الدكتورة): المحضر الفخم. أعمدة جديدة بس على meeting_minutes — ما يحذف ولا يغيّر بيانات موجودة.
-- عنوان الاجتماع، المكان، وقت البداية والنهاية، المدة المخططة، الحضور (مين ومتى دخل)، اللي انقال (سطر بسطر بوسمه)،
-- و«مفتوح للاجتماع الجاي».
alter table public.meeting_minutes add column if not exists title text not null default '';
alter table public.meeting_minutes add column if not exists room text not null default '';
alter table public.meeting_minutes add column if not exists started_at timestamptz;
alter table public.meeting_minutes add column if not exists ended_at timestamptz;
alter table public.meeting_minutes add column if not exists planned_minutes integer;
alter table public.meeting_minutes add column if not exists attendance jsonb not null default '[]'::jsonb;
alter table public.meeting_minutes add column if not exists captures jsonb not null default '[]'::jsonb;
alter table public.meeting_minutes add column if not exists open_items text not null default '';
