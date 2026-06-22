import Link from 'next/link';
import { ArrowLeft, Sprout } from 'lucide-react';

export function PageHeader({ title, subtitle, back = '/' }: { title:string; subtitle?:string; back?:string }) {
  return <header className="mb-7 flex items-center gap-4">
    <Link href={back} aria-label="Go back" className="btn btn-secondary !h-11 !min-h-11 !w-11 !p-0"><ArrowLeft size={18}/></Link>
    <div className="min-w-0 flex-1"><p className="eyebrow flex items-center gap-1.5"><Sprout size={13}/> Wafy Campus</p><h1 className="display truncate text-3xl font-semibold md:text-4xl">{title}</h1>{subtitle&&<p className="muted mt-1 text-sm">{subtitle}</p>}</div>
  </header>;
}
