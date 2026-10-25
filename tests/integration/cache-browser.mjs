import assert from 'node:assert/strict';import path from 'node:path';
import {ROOT,loadProject,atomic} from '../../src/engine/core.mjs';import {prepare} from '../../src/engine/publish.mjs';import {handoff} from '../../src/engine/handoff.mjs';import {openPage} from '../../src/engine/render.mjs';import {checkScenes} from '../../scripts/check-scenes.mjs';
const dir=path.join(ROOT,'examples/kv-cache'),out=path.join(process.env.EXPLAINFRAME_TEST_OUTPUT??path.join(ROOT,'.local/test-results'),'iteration-cache');
const report=await checkScenes(dir,out);assert.equal(report.status,'passed',JSON.stringify(report));
const {page,browser,errors}=await openPage(path.join(dir,'dist/review.html'));
try{
 const check=await page.evaluate(()=>{
  const m=window.explainer.manifest,failures=[];let frames=0;
  const close=(a,b)=>Math.abs(a-b)<1e-10;
  for(const scene of m.scenes)for(let f=0;f<Math.round(scene.duration*m.fps);f++){
   frames++;const frame=window.renderAt(scene.start+f/m.fps),p=frame.audit.find(a=>a.kind==='cache-proof');
   if(!p)throw new Error('Missing cache audit');
   if(!p.after.output.every((v,i)=>close(v,p.fresh.output[i])))failures.push('Cached/full mismatch');
   if(p.causal.weights.at(-1)!==0||!close(p.causal.weights.reduce((a,b)=>a+b),1))failures.push('Mask/normalization');
   if(!p.before.keys.every((v,i)=>JSON.stringify(v)===JSON.stringify(p.after.keys[i])))failures.push('Changed saved key');
   if(p.slots.length!==4||p.storedScalars!==p.full.keys.flat().length+p.full.values.flat().length)failures.push('False counter');
   if(scene.id==='predict'&&frame.audit.some(a=>a.kind==='cache-result'&&/output|recompute/i.test(a.text)))failures.push('Premature answer');
   if(scene.id==='mask'&&(!p.slots[3].blocked||p.slots[3].weight!==0))failures.push('Missing visible blocked slot');
   if(scene.id==='answer'&&!frame.audit.some(a=>a.kind==='cache-result'&&a.text.startsWith('Full recompute:')))failures.push('Missing fresh comparison');
  }
  return {frames,failures:[...new Set(failures)]};
 });assert.deepEqual(check.failures,[]);assert.deepEqual(errors,[]);await atomic(path.join(out,'mechanism.json'),{status:'passed',...check});
}finally{await browser.close();}
const {project}=await loadProject(dir),m=await prepare(dir,project);await handoff(dir,project,m);console.log('Cache frames, phone layout, counter/mask invariants and handoff passed.');
