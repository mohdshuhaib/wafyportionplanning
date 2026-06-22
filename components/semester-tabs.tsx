'use client';
import type { Semester } from '@/lib/portion-utils';
export function SemesterTabs({ value,onChange }:{ value:Semester;onChange:(s:Semester)=>void }) {
 return <div className="inline-flex rounded-2xl bg-[#e8ede8] p-1">{(['SEM-1','SEM-2'] as Semester[]).map(s=><button key={s} onClick={()=>onChange(s)} className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${value===s?'bg-white text-[#16775d] shadow-sm':'text-[#687a74]'}`}>{s==='SEM-1'?'Semester 1':'Semester 2'}</button>)}</div>
}
