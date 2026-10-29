-- الصقوه بـ Supabase ← SQL Editor ← Run (مرة وحدة، آمن للتكرار)

-- أعمدة جدول الدراسات (حسب نموذج الدكتورة): الدولة، الهدف، العينة، جمع البيانات
alter table public.evidence_papers add column if not exists country text not null default '';
alter table public.evidence_papers add column if not exists aim text not null default '';
alter table public.evidence_papers add column if not exists sample text not null default '';
alter table public.evidence_papers add column if not exists data_collection text not null default '';
