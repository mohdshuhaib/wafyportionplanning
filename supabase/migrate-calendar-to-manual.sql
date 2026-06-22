-- Run this once if you already installed an earlier version of schema.sql.
-- It converts year-specific dates into one permanent month/day holiday template.
alter table public.calendar_exclusions add column if not exists month_day text;
update public.calendar_exclusions
set month_day = to_char(excluded_date, 'MM-DD')
where month_day is null;

-- Keep one copy when the same holiday existed in multiple academic years.
delete from public.calendar_exclusions a
using public.calendar_exclusions b
where a.id > b.id
  and a.semester = b.semester
  and a.month_day = b.month_day;

alter table public.calendar_exclusions alter column month_day set not null;
alter table public.calendar_exclusions drop constraint if exists calendar_exclusions_academic_year_semester_excluded_date_key;
drop index if exists public.exclusions_year_sem_idx;
alter table public.calendar_exclusions drop column if exists academic_year;
alter table public.calendar_exclusions drop column if exists excluded_date;
alter table public.calendar_exclusions drop constraint if exists calendar_exclusions_semester_month_day_key;
alter table public.calendar_exclusions add constraint calendar_exclusions_semester_month_day_key unique (semester, month_day);
alter table public.calendar_exclusions drop constraint if exists calendar_exclusions_month_day_check;
alter table public.calendar_exclusions add constraint calendar_exclusions_month_day_check
  check (
    month_day ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
    and split_part(month_day,'-',2)::integer <= case split_part(month_day,'-',1)
      when '02' then 29 when '04' then 30 when '06' then 30 when '09' then 30 when '11' then 30 else 31 end
  );
create index if not exists exclusions_semester_idx on public.calendar_exclusions(semester);
