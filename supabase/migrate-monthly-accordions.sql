-- Run once after migrate-calendar-to-manual.sql when upgrading an existing project.
-- Existing weekly rows are retained as legacy history; new month-owned week keys are added separately.
alter table public.week_progress alter column date_from type text using to_char(date_from, 'MM-DD');
alter table public.week_progress alter column date_to type text using to_char(date_to, 'MM-DD');

create table if not exists public.subject_month_status (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  month_key text not null check (month_key ~ '^(0[1-9]|1[0-2])$'),
  status text not null default 'pending' check (status in ('pending','behind','on-track','ahead')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), row_version integer not null default 1,
  unique(subject_id,month_key)
);
create index if not exists month_status_subject_idx on public.subject_month_status(subject_id);
drop trigger if exists touch_month_status on public.subject_month_status;
create trigger touch_month_status before update on public.subject_month_status for each row execute function public.touch_row();

drop function if exists public.save_week_progress(uuid,text,text,integer,date,date,numeric,numeric,text,integer);
create or replace function public.save_week_progress(p_subject_id uuid,p_week_key text,p_month_key text,p_week_no integer,p_date_from text,p_date_to text,p_period_taken numeric,p_pages_taken numeric,p_remarks text,p_expected_version integer)
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
revoke all on function public.save_week_progress(uuid,text,text,integer,text,text,numeric,numeric,text,integer) from public,anon,authenticated;
revoke all on public.subject_month_status from anon,authenticated;
alter table public.subject_month_status enable row level security;
