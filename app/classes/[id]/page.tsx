'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, BookOpen, ChevronDown, Edit3, LoaderCircle, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { SemesterTabs } from '@/components/semester-tabs';
import { api } from '@/lib/api';
import { academicYearBase, buildWorkingWeeks, formatMonthDay, SEMESTER_LABELS, status, statusStyle, type Semester } from '@/lib/portion-utils';

type Subject = { id:string; name:string; teacher:string; total_pages:number; total_periods:number; periods_per_week:number; pages_per_period:number; pages_per_week:number; row_version:number };
type Progress = { id:string; subject_id:string; week_key:string; month_key:string; week_no:number; date_from:string; date_to:string; period_taken:number; pages_taken:number; remarks:string; row_version:number };
type MonthStatusValue = 'pending'|'behind'|'on-track'|'ahead';
type MonthStatus = { id:string; subject_id:string; month_key:string; status:MonthStatusValue; row_version:number };
type Payload = { class:{id:string;name:string}; subjects:Subject[]; progress:Progress[]; monthStatuses:MonthStatus[]; excluded:string[] };
const blank = { name:'', teacher:'', totalPages:'', totalPeriods:'', periodsPerWeek:'' };
const MONTH_STATUS_OPTIONS:{value:MonthStatusValue;label:string}[] = [
  {value:'pending',label:'Pending'}, {value:'behind',label:'Behind'}, {value:'on-track',label:'On track'}, {value:'ahead',label:'Ahead'},
];

export default function ClassPlanPage({ params }:{ params:Promise<{id:string}> }) {
  const { id } = use(params);
  const year = academicYearBase();
  const [semester,setSemester] = useState<Semester>('SEM-1');
  const [data,setData] = useState<Payload>();
  const [loading,setLoading] = useState(true);
  const [selected,setSelected] = useState('');
  const [openMonth,setOpenMonth] = useState<string|null>(null);
  const [modal,setModal] = useState(false);
  const [editing,setEditing] = useState<Subject>();
  const [form,setForm] = useState(blank);
  const [drafts,setDrafts] = useState<Record<string,Partial<Progress>>>({});
  const [saving,setSaving] = useState(false);
  const [savingMonth,setSavingMonth] = useState<string>();

  async function load(quiet=false) {
    if (!quiet) setLoading(true);
    try {
      const next = await api<Payload>(`/api/classes/${id}?year=${year}&semester=${semester}`);
      setData(next);
      setSelected((old) => next.subjects.some((item) => item.id===old) ? old : next.subjects[0]?.id || '');
      setDrafts({});
      setOpenMonth(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load plan');
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [id,semester]);
  useEffect(() => { setOpenMonth(null); setDrafts({}); }, [selected]);

  const weeks = useMemo(() => buildWorkingWeeks(semester,year,new Set(data?.excluded||[])), [semester,year,data?.excluded]);
  const subject = data?.subjects.find((item) => item.id===selected);
  const progress = useMemo(() => new Map((data?.progress||[]).filter((item) => item.subject_id===selected).map((item) => [item.week_key,item])), [data?.progress,selected]);
  const monthStatusMap = useMemo(() => new Map((data?.monthStatuses||[]).filter((item) => item.subject_id===selected).map((item) => [item.month_key,item])), [data?.monthStatuses,selected]);
  const monthGroups = useMemo(() => SEMESTER_LABELS[semester].map((label) => {
    const monthWeeks=weeks.filter((week)=>week.monthLabel===label);
    return { label, key:monthWeeks[0]?.monthKey||'', weeks:monthWeeks };
  }), [semester,weeks]);
  const validWeekKeys = useMemo(() => new Set(weeks.map((week)=>week.key)), [weeks]);
  const stats = useMemo(() => {
    if(!subject) return {periods:0,pages:0,pct:0};
    const rows=[...progress.entries()].filter(([key])=>validWeekKeys.has(key)).map(([,row])=>row);
    const periods=rows.reduce((sum,row)=>sum+Number(row.period_taken),0);
    const pages=rows.reduce((sum,row)=>sum+Number(row.pages_taken),0);
    const expected=weeks.length*Number(subject.pages_per_week);
    return {periods,pages,pct:expected?Math.min(100,Math.round(pages/expected*100)):0};
  }, [subject,progress,weeks,validWeekKeys]);

  function openAdd(){ setEditing(undefined);setForm(blank);setModal(true); }
  function openEdit(item:Subject){ setEditing(item);setForm({name:item.name,teacher:item.teacher,totalPages:String(item.total_pages),totalPeriods:String(item.total_periods),periodsPerWeek:String(item.periods_per_week)});setModal(true); }
  async function saveSubject(event:React.FormEvent){event.preventDefault();setSaving(true);try{await api(`/api/classes/${id}`,{method:'POST',body:JSON.stringify({action:'save-subject',academicYear:year,semester,id:editing?.id,rowVersion:editing?.row_version,name:form.name,teacher:form.teacher,totalPages:Number(form.totalPages),totalPeriods:Number(form.totalPeriods),periodsPerWeek:Number(form.periodsPerWeek)})});toast.success(editing?'Subject updated':'Subject added');setModal(false);await load(true);}catch(error){toast.error(error instanceof Error?error.message:'Save failed');}finally{setSaving(false);}}
  async function remove(item:Subject){if(!confirm(`Delete ${item.name} and all of its progress?`))return;try{await api(`/api/classes/${id}`,{method:'POST',body:JSON.stringify({action:'delete-subject',subjectId:item.id})});toast.success('Subject deleted');await load(true);}catch(error){toast.error(error instanceof Error?error.message:'Delete failed');}}
  function change(key:string,field:'period_taken'|'pages_taken'|'remarks',value:string){setDrafts((old)=>({...old,[key]:{...old[key],[field]:field==='remarks'?value:Number(value)}}));}
  async function saveProgress(){if(!subject)return;const changed=weeks.filter((week)=>drafts[week.key]);if(!changed.length){toast.info('No weekly changes to save');return;}setSaving(true);try{const rows=changed.map((week)=>{const current=progress.get(week.key);const draft=drafts[week.key]||{};return {weekKey:week.key,monthKey:week.monthKey,weekNo:week.weekNo,dateFrom:week.dateFrom,dateTo:week.dateTo,periodTaken:Number(draft.period_taken??current?.period_taken??0),pagesTaken:Number(draft.pages_taken??current?.pages_taken??0),remarks:String(draft.remarks??current?.remarks??''),rowVersion:current?.row_version||0};});await api(`/api/classes/${id}`,{method:'POST',body:JSON.stringify({action:'save-progress',subjectId:subject.id,rows})});toast.success('Weekly progress saved');await load(true);}catch(error){toast.error(error instanceof Error?error.message:'Progress save failed');await load(true);}finally{setSaving(false);}}
  async function saveMonthStatus(monthKey:string,value:MonthStatusValue){if(!subject)return;const current=monthStatusMap.get(monthKey);setSavingMonth(monthKey);try{const result=await api<{monthStatus:MonthStatus}>(`/api/classes/${id}`,{method:'POST',body:JSON.stringify({action:'save-month-status',subjectId:subject.id,monthKey,status:value,rowVersion:current?.row_version||0})});setData((old)=>old?{...old,monthStatuses:[...old.monthStatuses.filter((item)=>!(item.subject_id===subject.id&&item.month_key===monthKey)),result.monthStatus]}:old);toast.success('Monthly status saved');}catch(error){toast.error(error instanceof Error?error.message:'Status save failed');await load(true);}finally{setSavingMonth(undefined);}}

  if(loading) return <main className="page grid min-h-[70vh] place-items-center"><LoaderCircle className="animate-spin text-[#16775d]"/></main>;
  if(!data) return null;

  return <main className="page">
    <PageHeader title={data.class.name} subtitle="Subject planning and weekly progress" back="/classes"/>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><SemesterTabs value={semester} onChange={setSemester}/><button onClick={openAdd} className="btn btn-primary"><Plus size={17}/> Add subject</button></div>
    {data.subjects.length===0 ? <EmptySubjects semester={semester} onAdd={openAdd}/> : <div className="grid items-start gap-5 lg:grid-cols-[300px_1fr]">
      <aside className="card p-3"><p className="eyebrow px-2 pb-3 pt-2">Subjects</p><div className="space-y-2">{data.subjects.map((item)=><button onClick={()=>setSelected(item.id)} key={item.id} className={`w-full rounded-2xl p-3 text-left transition ${selected===item.id?'bg-[#16775d] text-white shadow-lg':'hover:bg-emerald-50'}`}><div className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{item.name}</strong><span className={`pill !px-2 !py-1 text-[9px] ${selected===item.id?'bg-white/15':'bg-stone-100 text-stone-500'}`}>{Number(item.pages_per_week).toFixed(1)} pg/wk</span></div><p className={`mt-1 truncate text-xs ${selected===item.id?'text-white/70':'muted'}`}>{item.teacher}</p></button>)}</div></aside>
      {subject && <section className="space-y-5">
        <div className="card p-5 md:p-6"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Selected subject</p><h2 className="display mt-1 text-3xl font-semibold">{subject.name}</h2><p className="muted mt-1 text-sm">{subject.teacher} · {subject.periods_per_week} periods/week</p></div><div className="flex gap-2"><button onClick={()=>openEdit(subject)} aria-label="Edit subject" className="btn btn-secondary !h-10 !min-h-10 !w-10 !p-0"><Edit3 size={16}/></button><button onClick={()=>remove(subject)} aria-label="Delete subject" className="btn btn-secondary !h-10 !min-h-10 !w-10 !p-0 text-red-600"><Trash2 size={16}/></button></div></div><div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">Usthad’s target per period</p><p className="display mt-1 text-3xl font-semibold text-emerald-900">{Number(subject.pages_per_period).toFixed(2)} <span className="font-sans text-sm font-bold">pages</span></p></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-stone-100"><motion.div initial={{width:0}} animate={{width:`${stats.pct}%`}} className="h-full rounded-full bg-[#16775d]"/></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><Stat label="Periods" value={stats.periods}/><Stat label="Pages" value={stats.pages}/><Stat label="Progress" value={`${stats.pct}%`}/></div></div>
        <div className="card overflow-hidden"><div className="border-b border-[#dfe5df] p-5"><div className="flex items-center gap-2"><BarChart3 size={18} className="text-[#16775d]"/><h3 className="display text-2xl font-semibold">Monthly portion plan</h3></div><p className="muted mt-1 text-xs">Open one month to update its weeks. Monthly status is selected and saved manually.</p></div>
          <div className="space-y-3 p-3 md:p-5">{monthGroups.map((month)=>{const isOpen=openMonth===month.key;const savedStatus=monthStatusMap.get(month.key);const statusValue=savedStatus?.status||'pending';return <div key={month.key} className="overflow-hidden rounded-2xl border border-[#dfe5df] bg-white"><div className="flex items-center gap-2 p-2 sm:p-3"><button onClick={()=>setOpenMonth(isOpen?null:month.key)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left hover:bg-stone-50"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isOpen?'bg-[#16775d] text-white':'bg-emerald-50 text-[#16775d]'}`}><ChevronDown size={17} className={`transition ${isOpen?'rotate-180':''}`}/></span><span className="min-w-0"><strong className="display block truncate text-xl">{month.label}</strong><span className="muted text-[11px]">{month.weeks.length} weeks · {month.weeks.reduce((sum,week)=>sum+week.workingDates.length,0)} working days</span></span></button><label className={`pill shrink-0 ${monthStatusStyle(statusValue)}`}><span className="sr-only">{month.label} status</span><select disabled={savingMonth===month.key} value={statusValue} onChange={(event)=>saveMonthStatus(month.key,event.target.value as MonthStatusValue)} className="cursor-pointer bg-transparent text-xs font-extrabold outline-none disabled:opacity-50">{MONTH_STATUS_OPTIONS.map((option)=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
            <AnimatePresence initial={false}>{isOpen&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden"><div className="space-y-3 border-t border-[#dfe5df] bg-[#fafbf8] p-3 md:p-4">{month.weeks.map((week)=>{const row=progress.get(week.key),draft=drafts[week.key]||{};const actual=Number(draft.pages_taken??row?.pages_taken??0);const weekStatus=status(actual,Number(subject.pages_per_week));return <div key={week.key} className="rounded-2xl border border-[#dfe5df] bg-white p-4"><div className="flex items-start justify-between gap-2"><div><strong className="text-sm">Week {week.weekNo}</strong><p className="muted mt-1 text-[11px]">{formatMonthDay(week.dateFrom)} – {formatMonthDay(week.dateTo)} · {week.workingDates.length} working days</p></div><span className={`pill ${statusStyle(weekStatus)}`}>{weekStatus}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-[120px_120px_1fr]"><Field label="Periods" type="number" value={String(draft.period_taken??row?.period_taken??'')} onChange={(value)=>change(week.key,'period_taken',value)} placeholder="0"/><Field label="Pages covered" type="number" value={String(draft.pages_taken??row?.pages_taken??'')} onChange={(value)=>change(week.key,'pages_taken',value)} placeholder="0"/><Field label="Remarks / last page" value={String(draft.remarks??row?.remarks??'')} onChange={(value)=>change(week.key,'remarks',value)} placeholder="e.g. Reached page 48"/></div></div>})}</div></motion.div>}</AnimatePresence>
          </div>})}</div><div className="sticky bottom-0 border-t border-[#dfe5df] bg-[#fffef9]/95 p-4 backdrop-blur"><button disabled={saving} onClick={saveProgress} className="btn btn-primary w-full">{saving?<LoaderCircle className="animate-spin" size={17}/>:<Save size={17}/>} Save weekly status</button></div></div>
      </section>}
    </div>}
    <SubjectModal open={modal} editing={editing} form={form} setForm={setForm} saving={saving} onClose={()=>setModal(false)} onSubmit={saveSubject}/>
  </main>;
}

function monthStatusStyle(value:MonthStatusValue){return value==='behind'?'bg-red-50 text-red-700':value==='ahead'?'bg-blue-50 text-blue-700':value==='on-track'?'bg-emerald-50 text-emerald-700':'bg-stone-100 text-stone-600';}
function EmptySubjects({semester,onAdd}:{semester:Semester;onAdd:()=>void}){return <div className="card p-9 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-50 text-[#16775d]"><BookOpen/></span><h2 className="display mt-5 text-3xl font-semibold">No subjects yet</h2><p className="muted mt-2 text-sm">Add the first subject for {semester==='SEM-1'?'Semester 1':'Semester 2'}.</p><button onClick={onAdd} className="btn btn-primary mt-6"><Plus size={17}/> Add subject</button></div>;}
function SubjectModal({open,editing,form,setForm,saving,onClose,onSubmit}:{open:boolean;editing?:Subject;form:typeof blank;setForm:(value:typeof blank)=>void;saving:boolean;onClose:()=>void;onSubmit:(event:React.FormEvent)=>void}){return <AnimatePresence>{open&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={onClose} className="fixed inset-0 z-50 grid place-items-end bg-black/40 backdrop-blur-sm sm:place-items-center sm:p-4"><motion.form initial={{y:40}} animate={{y:0}} exit={{y:40}} onSubmit={onSubmit} onMouseDown={(event)=>event.stopPropagation()} className="max-h-[92vh] w-full overflow-auto rounded-t-[28px] bg-[#fffef9] p-6 sm:max-w-lg sm:rounded-[28px]"><div className="flex items-center justify-between"><h2 className="display text-3xl font-semibold">{editing?'Edit subject':'Add a subject'}</h2><button type="button" onClick={onClose} className="btn btn-secondary !h-10 !min-h-10 !w-10 !p-0"><X size={17}/></button></div><div className="mt-6 grid gap-4"><Field label="Subject name" value={form.name} onChange={(value)=>setForm({...form,name:value})} placeholder="e.g. Fiqh" required/><Field label="Teacher name" value={form.teacher} onChange={(value)=>setForm({...form,teacher:value})} placeholder="Teacher or initials" required/><div className="grid grid-cols-2 gap-3"><Field label="Total pages" type="number" value={form.totalPages} onChange={(value)=>setForm({...form,totalPages:value})} placeholder="0" required/><Field label="Total periods" type="number" value={form.totalPeriods} onChange={(value)=>setForm({...form,totalPeriods:value})} placeholder="0" required/></div><Field label="Periods per week" type="number" value={form.periodsPerWeek} onChange={(value)=>setForm({...form,periodsPerWeek:value})} placeholder="0" required/><div className="rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800">Pages per period and pages per week are calculated automatically.</div><button disabled={saving} className="btn btn-primary w-full">{saving?<LoaderCircle className="animate-spin" size={17}/>:<Save size={17}/>} Save subject</button></div></motion.form></motion.div>}</AnimatePresence>;}
function Field({label,value,onChange,placeholder,type='text',required=false}:{label:string;value:string;onChange:(value:string)=>void;placeholder:string;type?:string;required?:boolean}){return <label className="block"><span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-stone-500">{label}</span><input className="input !min-h-10 !rounded-xl !px-3 !py-2 text-sm" type={type} min={type==='number'?0:undefined} step={type==='number'?'any':undefined} value={value} onChange={(event)=>onChange(event.target.value)} placeholder={placeholder} required={required}/></label>;}
function Stat({label,value}:{label:string;value:string|number}){return <div className="rounded-2xl bg-[#f3f6f2] p-3"><strong className="display block text-xl">{value}</strong><span className="muted text-[10px] font-bold uppercase tracking-wide">{label}</span></div>;}
