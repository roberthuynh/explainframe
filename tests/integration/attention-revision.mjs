import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {ROOT,atomic,loadProject,run} from '../../src/engine/core.mjs';import {prepare,htmlPage} from '../../src/engine/publish.mjs';import {openPage,capture} from '../../src/engine/render.mjs';
const dir=path.join(process.env.EXPLAINFRAME_TEST_OUTPUT??path.join(ROOT,'.local/test-results'),'attention-input-revision');
// This directory is owned evidence; preserve it if an earlier run exists.
const job=path.join(dir,String(Date.now()));await run(process.execPath,[path.join(ROOT,'bin/explain.mjs'),'new','--template','attention','--path',job]);
const {project}=await loadProject(job),module=path.join(job,'scenes/lesson.mjs'),code=await fs.readFile(module,'utf8');
assert.ok(code.includes('var KEYS = [[1, 0], [0, 1]];'));assert.ok(code.includes('var VALUES = [[2, 0], [0, 4]];'));
await atomic(module,code.replace('var KEYS = [[1, 0], [0, 1]];','var KEYS = [[2, 1], [0, 1]];').replace('var VALUES = [[2, 0], [0, 4]];','var VALUES = [[3, 1], [0, 5]];'));
const old=process.env.EXPLAINER_PYTHON;process.env.EXPLAINER_PYTHON=path.join(job,'no-python');
try{
 const m=await prepare(job,project);assert.ok(m.scenes.every(s=>s.reused));const html=path.join(job,'revised.html');await atomic(html,await htmlPage(job,m));const {browser,page,errors}=await openPage(html);
 try{
  const state=await page.evaluate(()=>{const m=window.explainer.manifest,a=window.renderAt(m.scenes[0].end-.5).audit,mix=m.scenes.find(s=>s.id==='mix'),b=window.renderAt(mix.end-.5).audit,predict=m.scenes.find(s=>s.id==='predict'),c=window.renderAt(predict.end-.5).audit;return {inputLabels:a.filter(x=>x.text).map(x=>x.text),mixLabels:b.filter(x=>x.text).map(x=>x.text),proof:b.find(x=>x.kind==='attention-proof'),prediction:c.find(x=>x.kind==='attention-proof')};});
  assert.ok(state.inputLabels.includes('Key (2, 1)'));assert.ok(state.inputLabels.includes('Value (3, 1)'));assert.ok(state.inputLabels.includes('Value (0, 5)'));
  const weight=1/(1+Math.exp(-4/Math.sqrt(2)));assert.ok(Math.abs(state.proof.output[0]-3*weight)<1e-10);assert.ok(Math.abs(state.proof.output[1]-(weight+5*(1-weight)))<1e-10);assert.deepEqual(state.prediction.query,[0,2]);assert.equal(state.prediction.mixReveal,0);assert.deepEqual(errors,[]);
  const shot=await capture(page,m.scenes.find(s=>s.id==='mix').end-.5,'png');await atomic(path.join(dir,'revision.png'),Buffer.from(shot.image,'base64'));await atomic(path.join(dir,'result.json'),{status:'passed',keys:[[2,1],[0,1]],values:[[3,1],[0,5]],output:state.proof.output,allSpeechReused:true,labelsDerived:true});
 }finally{await browser.close();}
}finally{if(old===undefined)delete process.env.EXPLAINER_PYTHON;else process.env.EXPLAINER_PYTHON=old;}
console.log('Revised keys, values, labels, outputs and prediction input agree; supplied audio reused without Python.');
