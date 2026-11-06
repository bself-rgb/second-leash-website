import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const client=createClient('https://dhtbfnrdinfnqeghwyss.supabase.co','sb_publishable_MUI_dYG5VE1cNqkKyhvXpA_i8pv24qb');
const $=id=>document.getElementById(id);
const status=$('authStatus'),feedback=$('feedback'),send=$('sendLink'),signOut=$('signOut'),submit=$('next');
let activeUser=null,busy=false;
async function refresh(){
 const {data:{user},error}=await client.auth.getUser();
 activeUser=error?null:user;
 status.textContent=activeUser?'Signed in as '+activeUser.email:'Sign in before submitting your memorial.';
 send.hidden=!!activeUser;signOut.hidden=!activeUser;$('email').disabled=!!activeUser;
}
send.addEventListener('click',async()=>{
 const email=$('email').value.trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){status.textContent='Enter a valid email address.';return;}
 send.disabled=true;status.textContent='Sending sign-in link…';
 const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
 status.textContent=error?'Could not send link: '+error.message:'Check your email for your sign-in link. Return here after opening it.';
 send.disabled=false;
});
signOut.addEventListener('click',async()=>{await client.auth.signOut();await refresh();});
client.auth.onAuthStateChange(()=>{setTimeout(refresh,0);});
await refresh();
const text=id=>$(id).value.trim();
const optionalYear=id=>text(id)?Number(text(id)):null;
window.addEventListener('rb-submit',async()=>{
 if(busy)return;
 feedback.className='error';
 if(!activeUser){feedback.textContent='Please sign in using your email before submitting.';return;}
 if(!$('permission').checked){feedback.textContent='Please confirm you have permission to share this memorial.';return;}
 const photos=[...$('photos').files];
 if(photos.length>5||photos.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024)){feedback.textContent='Choose up to five JPG, PNG or WebP photos under 5 MB each.';return;}
 busy=true;submit.disabled=true;feedback.textContent='Submitting memorial…';
 try{
  const payload={owner_id:activeUser.id,pet_name:text('petName'),species:text('species'),nickname:text('nickname')||null,birth_year:optionalYear('birthYear'),passing_year:optionalYear('passingYear'),tribute:text('tribute'),favorite_memory:text('memory')||null,visibility:document.querySelector('input[name="visibility"]:checked').value,allow_messages:$('allowMessages').checked};
  const {data:memorial,error}=await client.from('rb_memorials').insert(payload).select('id').single();
  if(error)throw error;
  let uploaded=0;let failures=[];
  for(const file of photos){
   const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
   const path=activeUser.id+'/'+memorial.id+'/'+crypto.randomUUID()+'.'+extension;
   const {error:uploadError}=await client.storage.from('rb-memorial-photos').upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError){failures.push(file.name);continue;}
   const {error:metadataError}=await client.from('rb_memorial_photos').insert({memorial_id:memorial.id,owner_id:activeUser.id,storage_path:path});
   if(metadataError){failures.push(file.name);await client.storage.from('rb-memorial-photos').remove([path]);continue;}
   uploaded++;
  }
  feedback.className='success';
  feedback.textContent='Memorial received and awaiting approval. Reference: '+memorial.id+'. '+uploaded+' photo(s) saved.'+(failures.length?' Some photos failed: '+failures.join(', ')+'. Please contact Second Leash with your reference.':'');
  submit.textContent='Submitted';submit.disabled=true;
 }catch(error){feedback.textContent='Submission failed: '+(error?.message||'Please try again.');submit.disabled=false;}
 finally{busy=false;}
});
