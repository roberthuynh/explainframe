import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ROOT,run} from '../../src/engine/core.mjs';
import {BEFORE,AFTER,stateAt} from '../../examples/revenue-and-contribution/scenes/economics.mjs';
const example=path.join(ROOT,'examples/revenue-and-contribution');
async function cues(id){const {words}=JSON.parse(await fs.readFile(path.join(example,'media',id+'.json'),'utf8'));return word=>{const hits=words.filter(w=>w.text.toLowerCase().replace(/[^a-z]/g,'')===word.toLowerCase());assert.equal(hits.length,1);return hits[0].start;};}
test('moving comparison preserves the arithmetic and shrinks contribution while revenue grows',async()=>{
 const cue=await cues('compare'),begin=cue('After'),end=cue('fifty');let previous=stateAt('compare',begin,cue);
 for(let i=0;i<=200;i++){const s=stateAt('compare',begin+(end-begin)*i/200,cue);assert.ok(Math.abs(s.revenue-s.costs-s.contribution)<1e-9);assert.ok(s.revenue>=previous.revenue&&s.costs>=previous.costs&&s.contribution<=previous.contribution);previous=s;}
 assert.equal(previous.revenue,150);assert.equal(previous.costs,120);assert.equal(previous.contribution,30);
 const middle=stateAt('compare',(begin+end)/2,cue);assert.equal(middle.transition,true);assert.equal(stateAt('compare',end,cue).transition,false);
});
test('revealing the baseline never invents a changing business period; final scene retains final geometry',async()=>{
 const cue=await cues('mechanism');for(let t=0;t<9;t+=.05){const s=stateAt('mechanism',t,cue);assert.equal(s.revenue,BEFORE.revenue);assert.equal(s.costs,BEFORE.costs);assert.equal(s.contribution,40);assert.ok(s.split>=0&&s.split<=1);}
 assert.equal(stateAt('mechanism',0,cue).split,0);assert.equal(stateAt('mechanism',cue('contribution'),cue).split,1);
 const final=stateAt('takeaway',0,()=>{throw Error('unneeded cue');});assert.equal(final.revenue,AFTER.revenue);assert.equal(final.costs,AFTER.costs);
});
test('scene values agree with authored arithmetic checks, and reverse scrubbing is deterministic',async()=>{
 const p=JSON.parse(await fs.readFile(path.join(example,'project.json'),'utf8')),cue=await cues('compare');
 assert.deepEqual(p.checks.find(x=>x.id==='before').values,[BEFORE.revenue,BEFORE.costs]);assert.deepEqual(p.checks.find(x=>x.id==='after').values,[AFTER.revenue,AFTER.costs]);
 const a=stateAt('compare',7,cue);stateAt('compare',9,cue);stateAt('compare',0,cue);assert.deepEqual(stateAt('compare',7,cue),a);
});
test('new business projects copy direction and editable scenes without changing the example',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'explainer-direction-'));try{const dest=path.join(temp,'job');await run(process.execPath,[path.join(ROOT,'bin/explain.mjs'),'new','--path',dest,'--template','business']);assert.equal(await fs.readFile(path.join(dest,'direction.md'),'utf8'),await fs.readFile(path.join(example,'direction.md'),'utf8'));const portable=await import((await import('node:url')).pathToFileURL(path.join(dest,'scenes/economics.mjs')));assert.deepEqual(portable.stateAt('takeaway',0,()=>0),stateAt('takeaway',0,()=>0));}finally{await fs.rm(temp,{recursive:true,force:true});}
});
