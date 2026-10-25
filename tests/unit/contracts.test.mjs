import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {hash,stable,normalizeProject,relativeFile,containedFile,withLock,validTimings,captionGroups,secondsToSrt,ROOT} from '../../src/engine/core.mjs';
import {speechKey} from '../../src/engine/speech.mjs';
import {applySelection} from '../../src/engine/audition.mjs';
import {evaluateChecks} from '../../src/engine/publish.mjs';

const seed=()=>normalizeProject({schemaVersion:1,title:'A mechanism',scenes:[{id:'start',title:'Start',narration:'One choice.',visual:{type:'statement',text:'One'}}]});
test('voice, speed, lexicon, model and backend changes invalidate speech independently',async()=>{
  const p=seed(),s=p.scenes[0],base=await speechKey(s,p.speech,{modelFingerprint:'original',backendVersions:{kokoro:'x'}});
  for(const speech of [{...p.speech,voice:'am_michael'},{...p.speech,speed:1.1},{...p.speech,lexicon:{Erdos:'x'}}])assert.notEqual(await speechKey(s,speech,{modelFingerprint:'original',backendVersions:{kokoro:'x'}}),base);
  assert.notEqual(await speechKey(s,p.speech,{modelFingerprint:'changed',backendVersions:{kokoro:'x'}}),base);
  assert.notEqual(await speechKey(s,p.speech,{modelFingerprint:'original',backendVersions:{kokoro:'y'}}),base);
  assert.equal(await speechKey(s,p.speech,{modelFingerprint:'original',backendVersions:{kokoro:'x'}}),base);
});
test('reordering scenes does not alter a scene speech key; editing its text does',async()=>{
  const p=seed(),s=p.scenes[0],before=await speechKey(s,p.speech);p.scenes.unshift({...s,id:'another',narration:'Other content.'});assert.equal(await speechKey(p.scenes[1],p.speech),before);assert.notEqual(await speechKey({...s,narration:'One new choice.'},p.speech),before);
});
test('a second job cannot obtain a live project lock; failure releases it',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'explainer-lock-'));
  try{await assert.rejects(withLock(dir,async()=>{await assert.rejects(withLock(dir,async()=>{}),e=>e.code==='PROJECT_BUSY');throw new Error('stop');}),/stop/);await withLock(dir,async()=>{});}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('asset traversal and symlinks cannot escape a project',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'explainer-paths-'));const outside=await fs.mkdtemp(path.join(os.tmpdir(),'explainer-outside-'));
  try{await fs.writeFile(path.join(outside,'secret.txt'),'outside');assert.throws(()=>relativeFile(dir,'../secret.txt'),e=>e.code==='UNSAFE_PATH');await fs.symlink(path.join(outside,'secret.txt'),path.join(dir,'link.txt'));await assert.rejects(containedFile(dir,'link.txt'),e=>e.code==='UNSAFE_PATH');}finally{await fs.rm(dir,{recursive:true,force:true});await fs.rm(outside,{recursive:true,force:true});}
});
test('caption grouping preserves all words and breaks sentence boundaries',()=>{
  const words=['One','short','sentence.','Next','one.'].map((text,i)=>({text,start:i,end:i+.8}));const groups=captionGroups(words,6);assert.deepEqual(groups.map(g=>g.map(w=>w.text)),[['One','short','sentence.'],['Next','one.']]);assert.equal(groups.flat().length,words.length);assert.ok(captionGroups(words,2).every(g=>g.length<=2));
});
test('timing rejects reversed, out-of-range and empty data',()=>{
  assert.equal(validTimings([{text:'Hi',start:.1,end:.5}],1),true);
  assert.equal(validTimings([{text:'Hi',start:.5,end:.1}],1),false);assert.equal(validTimings([{text:'Hi',start:.5,end:2}],1),false);assert.equal(validTimings([],1),false);
  assert.equal(secondsToSrt(59.9996),'00:01:00,000');assert.equal(secondsToSrt(3600.004),'01:00:00,004');
});
test('stale audition choices fail and valid choices preserve the rest of the project',()=>{
  const p=seed(),selection={schemaVersion:1,projectHash:hash(p),style:'ink',caption:'pop',voice:'am_michael'};const result=applySelection(p,selection);assert.equal(result.style,'ink');assert.equal(result.scenes[0].narration,p.scenes[0].narration);assert.equal(p.style,'paper');assert.throws(()=>applySelection({...p,title:'Changed'},selection),e=>e.code==='STALE_SELECTION');
});
test('project rejects duplicate IDs, unsupported formats and path-like voices',()=>{
  const p=seed();assert.throws(()=>normalizeProject({...p,scenes:[p.scenes[0],p.scenes[0]]}),e=>e.code==='INVALID_PROJECT');assert.throws(()=>normalizeProject({...p,formats:['unknown']}),e=>e.code==='INVALID_PROJECT');assert.throws(()=>normalizeProject({...p,speech:{...p.speech,voice:'../../other'}}),e=>e.code==='INVALID_PROJECT');assert.throws(()=>normalizeProject(null),e=>e.code==='INVALID_PROJECT');
});
test('examples have independently checked numerical outcomes and supported claims',async()=>{
  for(const name of ['revenue-and-contribution','six-dots']){const p=normalizeProject(JSON.parse(await fs.readFile(path.join(ROOT,'examples',name,'project.json'),'utf8')));assert.ok(evaluateChecks(p).every(c=>c.pass));assert.ok(p.scenes.every(s=>s.claims.length));}
  assert.equal(evaluateChecks({checks:[{id:'bad',kind:'choose',values:[6,3],expected:21}]})[0].pass,false);
});
test('stable hashing ignores object key order, not array order',()=>{
  assert.equal(hash({a:1,b:2}),hash({b:2,a:1}));assert.notEqual(hash([1,2]),hash([2,1]));
});

test('malformed nested manifests fail before downstream work with INVALID_PROJECT',()=>{
  const p=seed(),source={id:'note',title:'Note'};
  const invalid=[{...p,claims:[{id:'claim',text:'Fact',sources:'note'}]},{...p,scenes:[{...p.scenes[0],claims:{}}]},{...p,speech:{...p.speech,lexicon:[]}},{...p,checks:'bogus'},{...p,checks:[{id:'bad',kind:'difference',values:[1],expected:1}]},{...p,sources:[source,source]},{...p,scenes:[{...p.scenes[0],visual:{type:'bars',items:{}}}]},{...p,teaching:{questions:[{id:'q',question:'Why?',answer:'Because.',scene:'missing'}]}}];
  for(const value of invalid)assert.throws(()=>normalizeProject(value),e=>e.code==='INVALID_PROJECT');
});
test('single-speaker timings reject overlap and backwards ends',()=>{
  assert.equal(validTimings([{text:'one',start:0,end:2},{text:'two',start:1,end:1.5}],3),false);
  assert.equal(validTimings([{text:'one',start:0,end:1},{text:'two',start:1,end:2}],2),true);
  assert.equal(validTimings([null],1),false);
});
test('project schema is valid JSON and covers the shipped visual families',async()=>{
  const schema=JSON.parse(await fs.readFile(path.join(ROOT,'schemas/project.schema.json'),'utf8'));
  assert.equal(schema.$schema,'https://json-schema.org/draft/2020-12/schema');
  for(const type of ['statement','compare','steps','bars','stacked-bars','dots','image','custom'])assert.ok(schema.$defs[type]);
});
