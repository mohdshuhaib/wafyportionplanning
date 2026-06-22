-- Run this entire file in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 60),
  name_key text generated always as (lower(trim(name))) stored unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), row_version integer not null default 1
);
create table if not exists public.calendar_exclusions (
  id uuid primary key default gen_random_uuid(),
  semester text not null check (semester in ('SEM-1','SEM-2')),
  month_day text not null check (
    month_day ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
    and split_part(month_day,'-',2)::integer <= case split_part(month_day,'-',1)
      when '02' then 29 when '04' then 30 when '06' then 30 when '09' then 30 when '11' then 30 else 31 end
  ),
  created_at timestamptz not null default now(),
  unique (semester,month_day)
);
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(), class_id uuid not null references public.classes(id) on delete cascade,
  academic_year integer not null check (academic_year between 2020 and 2100), semester text not null check (semester in ('SEM-1','SEM-2')),
  name text not null check (char_length(trim(name)) between 2 and 100), teacher text not null check (char_length(trim(teacher)) between 2 and 100),
  total_pages numeric(10,2) not null check (total_pages>=0), total_periods numeric(10,2) not null check (total_periods>0), periods_per_week numeric(10,2) not null check (periods_per_week>0),
  pages_per_period numeric(10,4) not null check (pages_per_period>=0), pages_per_week numeric(10,4) not null check (pages_per_week>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), row_version integer not null default 1,
  unique(class_id,academic_year,semester,name)
);
create table if not exists public.week_progress (
  id uuid primary key default gen_random_uuid(), subject_id uuid not null references public.subjects(id) on delete cascade,
  week_key text not null, month_key text not null, week_no integer not null check (week_no>0), date_from date not null, date_to date not null,
  period_taken numeric(10,2) not null default 0 check (period_taken>=0), pages_taken numeric(10,2) not null default 0 check (pages_taken>=0), remarks text not null default '' check(char_length(remarks)<=500),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), row_version integer not null default 1,
  unique(subject_id,week_key)
);
create index if not exists subjects_class_sem_idx on public.subjects(class_id,academic_year,semester);
create index if not exists progress_subject_idx on public.week_progress(subject_id);
create index if not exists exclusions_semester_idx on public.calendar_exclusions(semester);

create or replace function public.touch_row() returns trigger language plpgsql as $$ begin new.updated_at=now();new.row_version=old.row_version+1;return new;end $$;
drop trigger if exists touch_classes on public.classes; create trigger touch_classes before update on public.classes for each row execute function public.touch_row();
drop trigger if exists touch_subjects on public.subjects; create trigger touch_subjects before update on public.subjects for each row execute function public.touch_row();
drop trigger if exists touch_progress on public.week_progress; create trigger touch_progress before update on public.week_progress for each row execute function public.touch_row();

-- Atomic compare-and-swap: prevents two editors from silently overwriting one week.
create or replace function public.save_week_progress(p_subject_id uuid,p_week_key text,p_month_key text,p_week_no integer,p_date_from date,p_date_to date,p_period_taken numeric,p_pages_taken numeric,p_remarks text,p_expected_version integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare affected integer;
begin
 if p_expected_version=0 then
  insert into week_progress(subject_id,week_key,month_key,week_no,date_from,date_to,period_taken,pages_taken,remarks)
  values(p_subject_id,p_week_key,p_month_key,p_week_no,p_date_from,p_date_to,p_period_taken,p_pages_taken,p_remarks)
  on conflict(subject_id,week_key) do nothing; get diagnostics affected=row_count; return affected=1;
 end if;
 update week_progress set month_key=p_month_key,week_no=p_week_no,date_from=p_date_from,date_to=p_date_to,period_taken=p_period_taken,pages_taken=p_pages_taken,remarks=p_remarks
 where subject_id=p_subject_id and week_key=p_week_key and row_version=p_expected_version; get diagnostics affected=row_count; return affected=1;
end $$;
revoke all on all tables in schema public from anon,authenticated;
revoke all on function public.save_week_progress(uuid,text,text,integer,date,date,numeric,numeric,text,integer) from public,anon,authenticated;
alter table public.classes enable row level security; alter table public.calendar_exclusions enable row level security; alter table public.subjects enable row level security; alter table public.week_progress enable row level security;
