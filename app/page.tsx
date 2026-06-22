'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, CalendarDays, GraduationCap, Sparkles } from 'lucide-react';

export default function Home(){ return <main className="relative min-h-screen overflow-hidden">
 <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-[#dceee5] blur-3xl"/>
 <section className="page flex min-h-screen flex-col justify-between py-8 md:py-12">
  <nav className="flex items-center justify-between"><div className="flex items-center gap-2 font-extrabold"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#16775d] text-white"><GraduationCap size={20}/></span> Wafy Campus</div><span className="pill bg-white/70 text-[#16775d] shadow-sm"><Sparkles size={12} className="mr-1"/> Academic year</span></nav>
  <motion.div initial={{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{duration:.65}} className="mx-auto my-14 max-w-3xl text-center">
   <p className="eyebrow mb-5">Plan with clarity · Teach with confidence</p>
   <h1 className="display text-6xl font-semibold leading-[.95] tracking-[-.04em] md:text-8xl">Portion<br/><span className="text-[#16775d]">Planning</span></h1>
   <p className="muted mx-auto mt-6 max-w-xl text-base leading-7 md:text-lg">A shared academic workspace for <strong className="text-[#17322b]">Wafy Campus Kalikavu</strong>—made for steady progress, week by week.</p>
   <div className="mx-auto mt-10 grid max-w-md gap-3">
    <Link href="/calendar" className="btn btn-secondary group !justify-between !px-5"><span className="flex items-center gap-3"><CalendarDays size={19} className="text-[#16775d]"/> View Wafy Calendar</span><ArrowRight size={17} className="transition group-hover:translate-x-1"/></Link>
    <Link href="/classes" className="btn btn-primary group !justify-between !px-5"><span className="flex items-center gap-3"><BookOpen size={19}/> Choose your class</span><ArrowRight size={17} className="transition group-hover:translate-x-1"/></Link>
   </div>
  </motion.div>
  <p className="muted text-center text-xs">Built for thoughtful teaching and shared responsibility.</p>
 </section>
 </main> }
