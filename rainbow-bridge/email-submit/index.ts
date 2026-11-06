// DEVELOPMENT ONLY: do not deploy before configuring a verified sender and rate limiting.
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
// RB_EMAIL_FROM (verified sender), RB_REVIEW_EMAIL, RB_REVIEW_BASE_URL.
// Single-use review tokens are stored as SHA-256 hashes; never include tokens in logs.
import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
const enc=new TextEncoder();
const hex=(bytes:Uint8Array)=>Array.from(bytes).map(x=>x.toString(16).padStart(2,'0')).join('');
const hash=async(s:string)=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))));
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
Deno.serve(async(req)=>{
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const env=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY','RB_EMAIL_FROM','RB_REVIEW_EMAIL','RB_REVIEW_BASE_URL'];
 if(env.some(k=>!Deno.env.get(k)))return reply({error:'Service not configured'},503);
 let body:Record<string,unknown>;
 try{body=await req.json()}catch{return reply({error:'Invalid request'},400)}
 if(body.website)return reply({ok:true}); // honeypot
 const field=(key:string,max:number)=>typeof body[key]==='string'?(body[key] as string).trim().slice(0,max+1):'';
 const pet=field('pet_name',100),species=field('species',80),tribute=field('tribute',4000),email=field('contact_email',254);
 if(!pet||pet.length>100||!species||species.length>80||!tribute||tribute.length>4000||!/^\S+@\S+\.\S+$/.test(email))return reply({error:'Please complete required fields'},400);
 const visibility=body.visibility==='unlisted'?'unlisted':'public';
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 // A dedicated private table keeps guest contact information off public memorial rows.
 const {data:memorial,error}=await db.from('rb_guest_submissions').insert({pet_name:pet,species,tribute,contact_email:email,visibility,status:'pending'}).select('id').single();
 if(error)return reply({error:'Unable to save submission'},500);
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));
 const tokenHash=await hash(token);
 const expires=new Date(Date.now()+48*3600*1000).toISOString();
 const {error:tokenError}=await db.from('rb_review_tokens').insert({submission_id:memorial.id,token_hash:tokenHash,expires_at:expires});
 if(tokenError)return reply({error:'Submission saved, notification pending',reference:memorial.id},503);
 const base=Deno.env.get('RB_REVIEW_BASE_URL')!;
 const reviewUrl=base+(base.includes('?')?'&':'?')+'token='+encodeURIComponent(token);
 const html='<h2>Rainbow Bridge memorial awaiting review</h2><p><b>Pet:</b> '+esc(pet)+'</p><p><b>Species:</b> '+esc(species)+'</p><p><b>Tribute:</b></p><p>'+esc(tribute).replaceAll('\n','<br>')+'</p><p><b>Submitter email:</b> '+esc(email)+'</p><p><a href="'+esc(reviewUrl)+'">Review memorial (Approve / Decline)</a></p><p>Link expires in 48 hours. Opening the link does not approve anything.</p>';
 const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+Deno.env.get('RESEND_API_KEY'),'content-type':'application/json'},body:JSON.stringify({from:Deno.env.get('RB_EMAIL_FROM'),to:[Deno.env.get('RB_REVIEW_EMAIL')],subject:'Rainbow Bridge memorial review: '+pet,html})});
 if(!sent.ok)return reply({error:'Submission saved, notification pending',reference:memorial.id},503);
 return reply({ok:true,reference:memorial.id});
});
