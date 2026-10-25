import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createReadStream,readFileSync} from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const validateSchema=new Ajv2020({allErrors:true,strict:false}).compile(JSON.parse(readFileSync(new URL('../../schemas/project.schema.json',import.meta.url),'utf8')));
export const VERSION = '0.2.0';
export const MODEL_REVISION = 'f3ff3571791e39611d31c381e3a41a3af07b4987';
export const FORMATS = Object.freeze({
  landscape: {width:1920,height:1080,label:'16:9'},
  portrait: {width:1080,height:1920,label:'9:16'},
  square: {width:1080,height:1080,label:'1:1'},
  feed: {width:1080,height:1350,label:'4:5'},
});
export const STYLES = ['paper','ink','chalk'];
export const CAPTIONS = ['karaoke','pop','plain','none'];
export class KitError extends Error {
  constructor(code,message,repair,details={}) { super(message); this.code=code;this.repair=repair;this.details=details; }
}
export const hash = value => crypto.createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:stable(value)).digest('hex');
export async function hashFile(file){const h=crypto.createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex');}
export function stable(value) {
  if (Array.isArray(value)) return '['+value.map(stable).join(',')+']';
  if (value && typeof value==='object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
export const exists=async p=>{try{await fs.access(p);return true;}catch{return false;}};
export const readJSON=async p=>{try{return JSON.parse(await fs.readFile(p,'utf8'));}catch(e){throw new KitError('INVALID_JSON',`Cannot read ${p}: ${e.message}`,'Check the file exists and contains valid JSON.');}};
export async function atomic(file,value) {
  await fs.mkdir(path.dirname(file),{recursive:true}); const temp=file+'.'+crypto.randomUUID()+'.tmp';
  try {await fs.writeFile(temp,typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value,null,2)+'\n');await fs.rename(temp,file);}
  finally {await fs.rm(temp,{force:true}).catch(()=>{});}
}
export function relativeFile(root,name) {
  if (typeof name!=='string'||!name||name.includes('\0')||path.isAbsolute(name)) throw new KitError('UNSAFE_PATH',`Expected a relative project path: ${name}`,'Use a path inside the project.');
  const result=path.resolve(root,name);
  if (!result.startsWith(path.resolve(root)+path.sep)) throw new KitError('UNSAFE_PATH',`Path escapes project: ${name}`,'Use a path inside the project.');
  return result;
}
export async function containedFile(root,name) {
  const candidate=relativeFile(root,name), real=await fs.realpath(candidate);
  if (!real.startsWith((await fs.realpath(root))+path.sep)) throw new KitError('UNSAFE_PATH',`Symlink escapes project: ${name}`,'Copy the needed file into the project.');
  return real;
}
export async function run(command,args=[],options={}) {
  if(options.signal?.aborted)throw new KitError('INTERRUPTED','Command interrupted.','Resume the command when ready.');
  return await new Promise((resolve,reject)=>{
    let child;try{child=spawn(command,args,{cwd:options.cwd,env:{...process.env,...options.env},stdio:['ignore','pipe','pipe']});}catch(e){reject(e);return;}
    let stdout='',stderr='',failure=null,killTimer;
    const stop=code=>{if(failure)return;failure=code;child.kill('SIGTERM');killTimer=setTimeout(()=>child.kill('SIGKILL'),options.killGrace??1500);};
    const abort=()=>stop('INTERRUPTED');
    const timer=setTimeout(()=>stop('TIMEOUT'),options.timeout??120000);
    options.signal?.addEventListener('abort',abort,{once:true});
    const cleanup=()=>{clearTimeout(timer);clearTimeout(killTimer);options.signal?.removeEventListener('abort',abort);};
    child.stdout.on('data',b=>stdout=(stdout+b).slice(-2_000_000));
    child.stderr.on('data',b=>stderr=(stderr+b).slice(-16000));
    child.on('error',e=>{cleanup();reject(new KitError('TOOL_MISSING',`${command}: ${e.message}`,'Run npm run doctor -- --json and follow the listed repairs.'));});
    child.on('close',code=>{cleanup();if(failure||code!==0)reject(new KitError(failure??'TOOL_FAILED',`${path.basename(command)} ${failure==='TIMEOUT'?'timed out':failure==='INTERRUPTED'?'interrupted':`exited ${code}`}`,options.repair??'Read the diagnostic, repair the dependency or input, and resume the same command.',{stderr,stdout}));else resolve(stdout);});
  });
}
export async function withLock(project,action) {
  const dir=path.join(project,'build');await fs.mkdir(dir,{recursive:true});const lock=path.join(dir,'.lock');let handle;
  try {handle=await fs.open(lock,'wx');}catch(e){if(e.code==='EEXIST')throw new KitError('PROJECT_BUSY','Another job owns this project.','Wait for that job. If it crashed, inspect build/.lock and remove it only after its process has stopped.');throw e;}
  await handle.writeFile(JSON.stringify({pid:process.pid,started:new Date().toISOString()}));
  try{return await action();}finally{await handle.close();await fs.rm(lock,{force:true});}
}
export function normalizeProject(raw) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new KitError('INVALID_PROJECT','Project must be a JSON object.','Use an included project.json as a starting point.');
  if(!validateSchema(raw))throw new KitError('INVALID_PROJECT','Project does not match schemas/project.schema.json.','Repair the fields listed in details.problems.',{problems:validateSchema.errors.map(e=>`${e.instancePath||'/'} ${e.message}`)});
  const p=structuredClone(raw), problems=[];
  for(const name of ['speech','caption'])if(p[name]!=null&&(typeof p[name]!=='object'||Array.isArray(p[name])))throw new KitError('INVALID_PROJECT',name+' must be an object.','Use the documented project schema.');
  if(p.schemaVersion!==1)problems.push('schemaVersion must be 1');
  if(typeof p.title!=='string'||!p.title.trim())problems.push('title is required');
  if(!Array.isArray(p.scenes)||!p.scenes.length)problems.push('at least one scene is required');
  p.fps??=30;if(![24,25,30,60].includes(p.fps))problems.push('fps must be 24, 25, 30 or 60');
  p.style??='paper';if(!STYLES.includes(p.style))problems.push('unknown style');
  p.caption??={};p.caption.mode??='karaoke';p.caption.maxWords??=6;p.caption.safeBottom??=.10;
  if(!CAPTIONS.includes(p.caption.mode))problems.push('unknown caption mode');
  if(!Number.isInteger(p.caption.maxWords)||p.caption.maxWords<2||p.caption.maxWords>10)problems.push('caption.maxWords must be 2–10');
  if(!Number.isFinite(p.caption.safeBottom)||p.caption.safeBottom<.03||p.caption.safeBottom>.3)problems.push('caption.safeBottom must be .03–.30');
  p.speech??={};p.speech.voice??='af_heart';p.speech.speed??=1;p.speech.lexicon??={};p.speech.language??='a';
  if(!p.speech.lexicon||typeof p.speech.lexicon!=='object'||Array.isArray(p.speech.lexicon)||Object.values(p.speech.lexicon).some(v=>typeof v!=='string'))problems.push('speech.lexicon must map words to pronunciation strings');
  p.speech.backend??='kokoro';
  if(!['kokoro','provided'].includes(p.speech.backend))problems.push('speech.backend must be kokoro or provided');
  if(p.speech.backend==='kokoro'&&!/^(af|am|bf|bm)_[a-z]+$/.test(p.speech.voice))problems.push('speech.voice must be an English Kokoro voice ID');
  if(!Number.isFinite(p.speech.speed)||p.speech.speed<.5||p.speech.speed>2)problems.push('speech.speed must be .5–2');
  if(!['a','b'].includes(p.speech.language))problems.push('initial voice backend supports English a/b; import aligned audio for other languages');
  p.formats??=['portrait','landscape'];if(!Array.isArray(p.formats)||!p.formats.length||p.formats.some(f=>!FORMATS[f]))problems.push('formats must name supported output presets');
  p.sources??=[];p.claims??=[];
  if(!Array.isArray(p.sources)||!Array.isArray(p.claims)||!Array.isArray(p.scenes))throw new KitError('INVALID_PROJECT','sources, claims and scenes must be arrays.','Use the documented project schema.');
  for(const name of ['sources','claims','scenes'])if(p[name].some(item=>!item||typeof item!=='object'||Array.isArray(item)))throw new KitError('INVALID_PROJECT',name+' entries must be objects.','Use the documented project schema.');
  if(p.kitURL&&!/^https:\/\/github\.com\/[^/]+\/[^/#?]+\/?$/.test(p.kitURL))problems.push('kitURL must be the actual HTTPS GitHub repository URL');
  const idList=(v)=>Array.isArray(v)&&v.every(id=>typeof id==='string');
  const sourceIds=new Set(p.sources.map(s=>s.id)),claimIds=new Set(p.claims.map(c=>c.id)),ids=new Set();
  for(const [name,entries] of [['sources',p.sources],['claims',p.claims]])if(new Set(entries.map(e=>e.id)).size!==entries.length)problems.push('duplicate '+name+' IDs');
  for(const source of p.sources)if(typeof source.id!=='string'||!source.id||typeof source.title!=='string')problems.push('source needs an id and title');
  for(const source of p.sources){for(const key of ['url','status','locator','note','file'])if(source[key]!=null&&typeof source[key]!=='string')problems.push('source.'+key+' must be text');if(source.includeInBundle!=null&&typeof source.includeInBundle!=='boolean')problems.push('source.includeInBundle must be a boolean');}
  for(const c of p.claims)if(typeof c.id!=='string'||!c.id||typeof c.text!=='string'||!idList(c.sources??[])||(Array.isArray(c.sources)&&c.sources.some(id=>!sourceIds.has(id))))problems.push('invalid claim or missing source: '+c.id);
  for(const c of p.claims)for(const key of ['basis','locator','note','limit'])if(c[key]!=null&&typeof c[key]!=='string')problems.push('claim.'+key+' must be text');
  p.checks??=[];
  if(!Array.isArray(p.checks))problems.push('checks must be an array');
  else for(const c of p.checks)if(!c||typeof c!=='object'||typeof c.id!=='string'||!['difference','sum','power','choose'].includes(c.kind)||!Array.isArray(c.values)||!c.values.length||(c.kind!=='sum'&&c.values.length!==2)||c.values.some(v=>!Number.isFinite(v))||!Number.isFinite(c.expected))problems.push('invalid numeric check');
  if(p.teaching!=null){
    if(typeof p.teaching!=='object'||Array.isArray(p.teaching))problems.push('teaching must be an object');
    else{
      for(const key of ['audience','goal','prerequisite','limit'])if(p.teaching[key]!=null&&typeof p.teaching[key]!=='string')problems.push('teaching.'+key+' must be text');
      if(p.teaching.questions!=null&&(!Array.isArray(p.teaching.questions)||p.teaching.questions.some(q=>!q||typeof q.id!=='string'||typeof q.question!=='string'||typeof q.answer!=='string'||(q.explanation!=null&&typeof q.explanation!=='string')||(q.scene!=null&&!p.scenes.some(s=>s.id===q.scene)))))problems.push('teaching.questions need id, question, answer and a valid optional scene');
    }
  }
  for(const scene of p.scenes??[]) {
    if(!/^[a-z][a-z0-9-]{0,63}$/.test(scene.id??'')||ids.has(scene.id))problems.push('scene IDs must be unique lowercase slugs');ids.add(scene.id);
    if(typeof scene.narration!=='string'||!scene.narration.trim())problems.push('scene narration is required: '+scene.id);
    if(typeof scene.title!=='string')problems.push('scene title is required: '+scene.id);
    scene.visual??={type:'statement',text:scene.title};
    if(!scene.visual||typeof scene.visual!=='object'||Array.isArray(scene.visual))throw new KitError('INVALID_PROJECT','visual must be an object: '+scene.id,'Use a documented visual type.');
    if(!['statement','compare','steps','bars','stacked-bars','dots','image','custom'].includes(scene.visual.type))problems.push('unknown visual type: '+scene.id);
    if(['compare','steps','bars'].includes(scene.visual.type)&&(!Array.isArray(scene.visual.items)||!scene.visual.items.length||scene.visual.items.length>6))problems.push('visual items must contain 1–6 entries: '+scene.id);
    if(scene.visual.type==='compare'&&Array.isArray(scene.visual.items)&&scene.visual.items.some(i=>!i||typeof i!=='object'||typeof i.label!=='string'))problems.push('comparison items need labels: '+scene.id);
    if(scene.visual.type==='steps'&&Array.isArray(scene.visual.items)&&scene.visual.items.some(i=>typeof i!=='string'&&(!i||typeof i.text!=='string')))problems.push('steps must contain text: '+scene.id);
    if(scene.visual.type==='bars'&&Array.isArray(scene.visual.items)&&scene.visual.items.some(i=>!i||!Number.isFinite(i.value)||i.value<0))problems.push('bar values must be nonnegative finite numbers: '+scene.id);
    if(scene.visual.type==='stacked-bars'&&(!Array.isArray(scene.visual.items)||!scene.visual.items.length||scene.visual.items.length>3||scene.visual.items.some(i=>!i||typeof i.label!=='string'||!Array.isArray(i.segments)||i.segments.length<2||i.segments.length>3||i.segments.some(s=>!s||typeof s.label!=='string'||!Number.isFinite(s.value)||s.value<0))))problems.push('stacked bars need 1–3 labeled items with 2–3 nonnegative segments');
    if(scene.visual.type==='dots'&&(!Number.isInteger(scene.visual.count??6)||(scene.visual.count??6)<3||(scene.visual.count??6)>12))problems.push('dots count must be 3–12: '+scene.id);
    if(scene.visual.type==='dots'&&scene.visual.edges!=null&&(!Array.isArray(scene.visual.edges)||scene.visual.edges.some(e=>!Array.isArray(e)||e.length!==2||e.some(n=>!Number.isInteger(n)||n<0||n>=(scene.visual.count??6)))))problems.push('dot edges need two valid zero-based indices: '+scene.id);
    if(scene.visual.type==='image'&&!scene.visual.file)problems.push('image needs a project-relative file: '+scene.id);
    if(scene.visual.type==='custom'&&!scene.visual.module)problems.push('custom scene needs a module: '+scene.id);
    if(!idList(scene.claims??[])||(Array.isArray(scene.claims)&&scene.claims.some(id=>!claimIds.has(id))))problems.push('invalid or missing claim reference: '+scene.id);
    if(!Number.isFinite(scene.hold??.8)||(scene.hold??.8)<0||(scene.hold??.8)>10)problems.push('scene hold must be 0–10 seconds: '+scene.id);
  }
  if(problems.length)throw new KitError('INVALID_PROJECT',problems.join('; '),'Repair project.json; see docs/guides/authoring.md.',{problems});
  return p;
}
export async function loadProject(directory) {
  const dir=path.resolve(directory),project=normalizeProject(await readJSON(path.join(dir,'project.json')));
  return {dir,project};
}
export function validTimings(words,duration) {
  return Number.isFinite(duration)&&duration>0&&Array.isArray(words)&&words.length>0&&words.every((w,i)=>w&&typeof w.text==='string'&&w.text.trim().length>0&&Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.start>=0&&w.end>w.start&&w.end<=duration+.05&&(i===0||w.start>=words[i-1].end));
}
export function captionGroups(words,maxWords=6) {
  const result=[];let group=[];
  for(const w of words) {
    group.push(w);
    if(group.length>=maxWords||/[.!?]$/.test(w.text)){result.push(group);group=[];}
  }
  if(group.length)result.push(group);return result;
}
export function secondsToSrt(t) {
  let n=Math.round(t*1000);const ms=n%1000;n=Math.floor(n/1000);const s=n%60;n=Math.floor(n/60);const m=n%60;const h=Math.floor(n/60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
}
export const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeJSON=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
