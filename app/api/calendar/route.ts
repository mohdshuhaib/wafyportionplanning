import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';

const monthLengths: Record<string, number> = { '01':31, '02':29, '03':31, '04':30, '05':31, '06':30, '07':31, '08':31, '09':30, '10':31, '11':30, '12':31 };
const manualDate = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/).refine((value) => {
  const [month, day] = value.split('-');
  return Number(day) <= monthLengths[month];
}, 'Invalid month date');

const schema = z.object({
  semester: z.enum(['SEM-1', 'SEM-2']),
  date: manualDate,
  excluded: z.boolean(),
});

export async function GET(req: NextRequest) {
  try {
    const semester = req.nextUrl.searchParams.get('semester');
    if (!['SEM-1', 'SEM-2'].includes(semester || '')) {
      return NextResponse.json({ error: 'Invalid calendar query' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin()
      .from('calendar_exclusions')
      .select('month_day')
      .eq('semester', semester!);
    if (error) throw error;
    return NextResponse.json({ dates: (data || []).map((row) => row.month_day) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Calendar error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = schema.parse(await req.json());
    const db = supabaseAdmin();
    if (input.excluded) {
      const { error } = await db.from('calendar_exclusions').upsert(
        { semester: input.semester, month_day: input.date },
        { onConflict: 'semester,month_day' },
      );
      if (error) throw error;
    } else {
      const { error } = await db
        .from('calendar_exclusions')
        .delete()
        .eq('semester', input.semester)
        .eq('month_day', input.date);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Calendar update failed' }, { status: 400 });
  }
}
