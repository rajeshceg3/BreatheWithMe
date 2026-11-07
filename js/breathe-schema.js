// A whole ordered journey is one version. Never union sessions by content:
// two equal completed sessions and an explicit empty reset are meaningful.
export const BREATHE_KEYS=['breath_analytics_data','breath_custom_profiles','soundEnabled','regimentId','sessionDuration','lastUsed','theme','customInhale','customExhale','customHold'];
const base=['box-breathing','4-7-8','physiological-sigh','coherence'];
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=(x,n)=>typeof x==='string'&&x.length<=n;
const keys=(x,allowed,required=allowed)=>object(x)&&Object.keys(x).every(k=>allowed.includes(k))&&required.every(k=>Object.hasOwn(x,k));
const date=x=>text(x,50)&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const stress=x=>x===null||(Number.isInteger(x)&&x>=1&&x<=10);
const fail=message=>{throw Error(message)};
export function validateBreathe(v){
 if(!keys(v,['sessions','profiles','settings'])||!Array.isArray(v.sessions)||v.sessions.length>1000||!Array.isArray(v.profiles)||v.profiles.length>100||!object(v.settings))fail('Invalid Breathe journey');
 for(const s of v.sessions)if(!keys(s,['date','duration','regimentId','preStress','postStress'])||!date(s.date)||!Number.isFinite(s.duration)||s.duration<0||s.duration>86400000||!text(s.regimentId,150)||!s.regimentId||!stress(s.preStress)||!stress(s.postStress))fail('Invalid breathing session');
 if(new Set(v.profiles.map(p=>p?.id)).size!==v.profiles.length)fail('Duplicate profile identity');
 for(const p of v.profiles){
  if(!keys(p,['id','name','description','isSequence','sequence','benefits','audio','isCustom'])||!/^profile-\d+$/.test(p.id)||p.id.length>150||!text(p.name,300)||!p.name.trim()||!text(p.description,1000)||p.isCustom!==true||p.isSequence!==true||!Array.isArray(p.benefits)||p.benefits.length>20||p.benefits.some(x=>!text(x,300))||!keys(p.audio,['baseFreq','binauralBeat'])||p.audio.baseFreq!==200||p.audio.binauralBeat!==8||!Array.isArray(p.sequence)||!p.sequence.length||p.sequence.length>100)fail('Invalid custom profile');
  for(const s of p.sequence)if(!keys(s,['id','durationMinutes','name'])||!base.includes(s.id)||!Number.isSafeInteger(s.durationMinutes)||s.durationMinutes<1||s.durationMinutes>60||!text(s.name,300)||!s.name)fail('Invalid profile stage');
 }
 for(const [k,x] of Object.entries(v.settings)){
  if(!BREATHE_KEYS.slice(2).includes(k)||!text(x,150))fail('Unknown Breathe setting');
  if(k==='soundEnabled'&&!['true','false'].includes(x))fail('Invalid sound');
  if(k==='theme'&&!['light','dark'].includes(x))fail('Invalid theme');
  if(k==='sessionDuration'&&!['3','5','10','15'].includes(x))fail('Invalid duration');
  if(k==='lastUsed'&&!date(x))fail('Invalid last-used date');
  if(k==='regimentId'&&![...base,'custom','mission-reset',...v.profiles.map(p=>p.id)].includes(x))fail('Selected profile missing');
  if(k.startsWith('custom')&&(!/^\d+$/.test(x)||Number(x)<(k==='customHold'?0:1)||Number(x)>60))fail('Invalid custom pace');
 }
 if(JSON.stringify(v).length>180000)fail('Journey too large');return v;
}
export function parseBreatheRaw(raw){
 const d=JSON.parse(raw);if(!keys(d,['format','raw'])||d.format!=='breathe-raw-v1'||!object(d.raw)||Object.keys(d.raw).some(k=>!BREATHE_KEYS.includes(k))||Object.values(d.raw).some(x=>x!==null&&typeof x!=='string'))fail('Unknown Breathe snapshot');
 const analytics=JSON.parse(d.raw.breath_analytics_data??'{"sessions":[]}');
 if(!keys(analytics,['sessions']))fail('Unknown analytics fields');
 return validateBreathe({sessions:analytics.sessions,profiles:JSON.parse(d.raw.breath_custom_profiles??'[]'),settings:Object.fromEntries(Object.entries(d.raw).filter(([k,x])=>BREATHE_KEYS.slice(2).includes(k)&&x!==null))});
}
export function breatheRaw(v){validateBreathe(v);return {format:'breathe-raw-v1',raw:{breath_analytics_data:JSON.stringify({sessions:v.sessions}),breath_custom_profiles:JSON.stringify(v.profiles),...v.settings}};}
export async function breatheIdentity(raw){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));return 'breathe-import-'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');}
