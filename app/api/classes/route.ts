import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';import { supabaseAdmin } from '@/lib/supabase-admin';
const schema=z.object({name:z.string().trim().min(2).max(60)});
export async function GET(){try{const {data,error}=await supabaseAdmin().from('classes').select('*').order('name');if(error)throw error;return NextResponse.json({classes:data||[]});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not load classes'},{status:500})}}
export async function POST(req:NextRequest){try{const {name}=schema.parse(await req.json());const {data,error}=await supabaseAdmin().from('classes').insert({name}).select().single();if(error)throw error;return NextResponse.json({class:data},{status:201});}catch(e:any){const duplicate=e?.code==='23505';return NextResponse.json({error:duplicate?'This class already exists.':e instanceof Error?e.message:'Could not add class'},{status:duplicate?409:400})}}
