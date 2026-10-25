import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {unzipSync} from 'fflate';
import {ROOT,loadProject,atomic,hash} from '../../src/engine/core.mjs';
import {narrate} from '../../src/engine/speech.mjs';
import {prepare,htmlPage,writeReview} from '../../src/engine/publish.mjs';
import {checkProject} from '../../src/engine/checks.mjs';
import {handoff} from '../../src/engine/handoff.mjs';
import {portableNotices} from '../../src/engine/notices.mjs';
import {audition} from '../../src/engine/audition.mjs';

async function fixture(action){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'explainer-production-'));
  try{const {project}=await loadProject(path.join(ROOT,'examples/revenue-and-contribution'));await fs.cp(path.join(ROOT,'examples/revenue-and-contribution/media'),path.join(dir,'media'),{recursive:true});await fs.copyFile(path.join(ROOT,'examples/revenue-and-contribution/source-notes.md'),path.join(dir,'source-notes.md'));await fs.cp(path.join(ROOT,'examples/revenue-and-contribution/scenes'),path.join(dir,'scenes'),{recursive:true});project.scenes=project.scenes.slice(0,1);project.teaching.questions=[];project.formats=['square'];project.checks=[];await atomic(path.join(dir,'project.json'),project);return await action(dir,project);}finally{await fs.rm(dir,{recursive:true,force:true});}
}
test('bundled speech refuses language changes rather than returning the old waveform',()=>fixture(async(dir,p)=>{
  p.speech.backend='provided';p.speech.language='b';await assert.rejects(narrate(dir,p),e=>e.code==='PROVIDED_AUDIO_STALE');
}));
test('cache hit and input receipt metadata do not change rendered HTML',()=>fixture(async(dir,p)=>{
  const m=await prepare(dir,p),before=await htmlPage(dir,{...m,inputHash:'before',scenes:m.scenes.map(s=>({...s,reused:false}))},{renderOnly:true}),after=await htmlPage(dir,{...m,inputHash:'after',scenes:m.scenes.map(s=>({...s,reused:true}))},{renderOnly:true});assert.equal(hash(before),hash(after));
}));
test('preview checks detect a changed transitive visual dependency without requiring a video',()=>fixture(async(dir,p)=>{
  await fs.mkdir(path.join(dir,'scenes'),{recursive:true});await atomic(path.join(dir,'scenes/words.mjs'),"export const message='Before revision';");await atomic(path.join(dir,'scenes/main.mjs'),"import {message} from './words.mjs';export function render({text,body}){text(message,body.x,body.y,32);}");p.scenes[0].visualDescription='A text-only fixture used to check revisions.';p.scenes[0].visual={type:'custom',module:'scenes/main.mjs'};
  const m=await prepare(dir,p);await atomic(path.join(dir,'build/prepared.json'),{projectHash:hash(p),manifest:m});await writeReview(dir,m);
  assert.equal((await checkProject(dir,p,{target:'preview'})).status,'technical-checks-passed');
  await atomic(path.join(dir,'scenes/words.mjs'),"export const message='After revision';");const checked=await checkProject(dir,p,{target:'preview'});assert.equal(checked.status,'needs-attention');assert.ok(checked.problems.some(p=>p.includes('stale')));
}));
test('handoff ZIP retains included notes, omits other local documents and verifies its files',()=>fixture(async(dir,p)=>{
  await atomic(path.join(dir,'private-reading.md'),'Private source body must not travel.');p.sources.push({id:'private',title:'Original reading',file:'private-reading.md'});
  const m=await prepare(dir,p);await atomic(path.join(dir,'build/prepared.json'),{projectHash:hash(p),manifest:m});const out=await handoff(dir,p,m),zip=unzipSync(await fs.readFile(out.archive));
  for(const notice of await portableNotices()){assert.equal(Buffer.from(zip['licenses/'+notice.file]).toString(),notice.text);const files=JSON.parse(Buffer.from(zip['artifacts.json']).toString()).files;assert.equal(files.find(f=>f.file==='licenses/'+notice.file).sha256,hash(notice.text));}
  assert.ok(Buffer.from(zip['index.html']).toString().includes('licenses/COMPONENTS.md'));
  assert.ok(zip['index.html']);assert.ok(zip['review.html']);assert.ok(zip['editable-project/sources/0-source-notes.md']);assert.ok(!Object.keys(zip).some(n=>n.includes('private-reading')));
  const portable=JSON.parse(Buffer.from(zip['editable-project/project.json']).toString());assert.equal(portable.sources[1].file,undefined);assert.equal(portable.scenes[0].audio,'media/question.wav');
  assert.equal((await checkProject(dir,p,{target:'bundle'})).status,'technical-checks-passed');
  await fs.appendFile(out.archive,'changed');assert.ok((await checkProject(dir,p,{target:'bundle'})).problems.includes('Handoff ZIP changed'));
}));

test('a stale audition does not travel with a changed custom scene',()=>fixture(async(dir,p)=>{
  await fs.mkdir(path.join(dir,'scenes'),{recursive:true});await atomic(path.join(dir,'scenes/main.mjs'),"export function render({text,body}){text('Before',body.x,body.y,32);}");p.scenes[0].visualDescription='A text-only fixture used to check revisions.';p.scenes[0].visual={type:'custom',module:'scenes/main.mjs'};
  await audition(dir,p,{voices:[p.speech.voice]});
  await atomic(path.join(dir,'scenes/main.mjs'),"export function render({text,body}){text('After',body.x,body.y,32);}");
  const m=await prepare(dir,p),out=await handoff(dir,p,m),zip=unzipSync(await fs.readFile(out.archive));assert.equal(zip['audition.html'],undefined);
}));

test('preview verification binds actual player bytes to the current prepared input',()=>fixture(async(dir,p)=>{
  const m=await prepare(dir,p);await atomic(path.join(dir,'build/prepared.json'),{projectHash:hash(p),manifest:m});await writeReview(dir,m);
  const file=path.join(dir,'dist/review.html'),original=await fs.readFile(file);
  assert.equal((await checkProject(dir,p,{target:'preview'})).status,'technical-checks-passed');
  for(const changed of ['',original.toString()+'<!-- changed -->']){await fs.writeFile(file,changed);assert.equal((await checkProject(dir,p,{target:'preview'})).status,'needs-attention');}
  await fs.writeFile(file,original);p.title='A new title';const revised=await prepare(dir,p);await atomic(path.join(dir,'build/prepared.json'),{projectHash:hash(p),manifest:revised});
  assert.ok((await checkProject(dir,p,{target:'preview'})).problems.some(p=>p.includes('Review player is stale')));
  await writeReview(dir,revised);assert.equal((await checkProject(dir,p,{target:'preview'})).status,'technical-checks-passed');
  await fs.writeFile(path.join(dir,'dist/review.json'),'{broken');assert.equal((await checkProject(dir,p,{target:'preview'})).status,'needs-attention');
}));
test('standalone HTML embeds complete readable code and font notices',()=>fixture(async(dir,p)=>{
  const html=await htmlPage(dir,await prepare(dir,p));assert.ok(html.includes('id="licenses"'));
  const decode=s=>s.replace(/&#32;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
  for(const notice of await portableNotices())assert.ok(decode(html).includes(notice.text));
}));

test('visual descriptions survive transcript and editable handoff; opaque visuals require an explicit alternative',()=>fixture(async(dir,p)=>{
 await fs.mkdir(path.join(dir,'scenes'),{recursive:true});await atomic(path.join(dir,'scenes/custom.mjs'),"export function render(){}");p.scenes[0].visual={type:'custom',module:'scenes/custom.mjs'};delete p.scenes[0].visualDescription;
 async function refresh(){const m=await prepare(dir,p);await atomic(path.join(dir,'build/prepared.json'),{projectHash:hash(p),manifest:m});await writeReview(dir,m);return m;}
 await refresh();assert.ok((await checkProject(dir,p,{target:'preview'})).problems.some(x=>x.includes('Visual meaning is undocumented')));
 p.scenes[0].visualMeaningInNarration=true;await refresh();assert.equal((await checkProject(dir,p,{target:'preview'})).status,'technical-checks-passed');
 delete p.scenes[0].visualMeaningInNarration;p.scenes[0].visualDescription='Revenue rises while contribution stays flat. <img src=x onerror=alert(1)>';
 const m=await refresh();assert.equal((await checkProject(dir,p,{target:'preview'})).status,'technical-checks-passed');
 const out=await handoff(dir,p,m),zip=unzipSync(await fs.readFile(out.archive));
 assert.ok(Buffer.from(zip['transcript.md']).toString().includes(p.scenes[0].visualDescription));
 assert.equal(JSON.parse(Buffer.from(zip['editable-project/project.json']).toString()).scenes[0].visualDescription,p.scenes[0].visualDescription);
}));
