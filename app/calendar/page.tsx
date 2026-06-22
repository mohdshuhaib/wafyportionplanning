'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, LoaderCircle, Umbrella } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { SemesterTabs } from '@/components/semester-tabs';
import {
  semesterDays,
  SEMESTER_LABELS,
  type Semester,
} from '@/lib/portion-utils';
import { api } from '@/lib/api';

export default function CalendarPage() {
  const [semester, setSemester] = useState<Semester>('SEM-1');
  const [excluded, setExcluded] = useState(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string>();
  const days = useMemo(() => semesterDays(semester), [semester]);

  useEffect(() => {
    setLoading(true);
    api<{ dates: string[] }>(`/api/calendar?semester=${semester}`)
      .then((result) => setExcluded(new Set(result.dates)))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [semester]);

  async function toggle(date: string) {
    const next = !excluded.has(date);
    setPending(date);
    setExcluded((previous) => {
      const updated = new Set(previous);
      next ? updated.add(date) : updated.delete(date);
      return updated;
    });

    try {
      await api('/api/calendar', {
        method: 'POST',
        body: JSON.stringify({ semester, date, excluded: next }),
      });
      toast.success(next ? 'Marked as a holiday' : 'Restored as a working day');
    } catch (error) {
      setExcluded((previous) => {
        const restored = new Set(previous);
        next ? restored.delete(date) : restored.add(date);
        return restored;
      });
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setPending(undefined);
    }
  }

  const working = days.filter((day) => !excluded.has(day.value)).length;
  return (
    <main className="page">
      <PageHeader title="Wafy Calendar" subtitle="Shared holiday and programme calendar" />

      <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <SemesterTabs value={semester} onChange={setSemester} />
        <div className="pill bg-emerald-50 text-emerald-700">
          <CalendarCheck size={15} className="mr-2" />
          {working} working days
        </div>
      </div>

      <div className="card overflow-hidden p-4 md:p-5">
        <div className="mb-5 flex gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800 md:mb-4 md:items-center md:py-3">
          <Umbrella className="shrink-0" size={19} />
          <p>This is a permanent manual calendar. Every date—including February 29—is working by default; tap any date to mark it as a holiday.</p>
        </div>

        {loading ? (
          <div className="grid h-64 place-items-center">
            <LoaderCircle className="animate-spin text-[#16775d]" />
          </div>
        ) : (
          <div className="space-y-8 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
            {SEMESTER_LABELS[semester].map((month) => {
              const monthDays = days.filter((day) => day.monthLabel === month);
              return (
                <motion.section
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={month}
                  className="md:rounded-2xl md:border md:border-[#e2e7e2] md:bg-white md:p-3"
                >
                  <h2 className="display mb-3 text-2xl font-semibold md:mb-2 md:text-xl">{month}</h2>
                  <div className="grid grid-cols-7 gap-1.5 md:gap-1">
                    {monthDays.map((day) => {
                      const isLeave = excluded.has(day.value);
                      return (
                        <button
                          disabled={pending === day.value}
                          onClick={() => toggle(day.value)}
                          aria-label={`${day.value} ${isLeave ? 'holiday' : 'working'}`}
                          key={day.value}
                          className={`relative aspect-square rounded-xl text-xs font-bold transition md:rounded-lg ${
                            isLeave
                              ? 'bg-red-100 text-red-700 ring-1 ring-red-200'
                              : 'bg-[#f7faf7] hover:bg-emerald-50 hover:text-emerald-700'
                          } ${pending === day.value ? 'opacity-50' : ''}`}
                        >
                          {day.day}
                          {isLeave && (
                            <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-red-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
