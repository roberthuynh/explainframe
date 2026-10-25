import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {unzipSync} from 'fflate';
import {ROOT,loadProject,atomic,hashFile} from '../../src/engine/core.mjs';
import {prepare,htmlPage} from '../../src/engine/publish.mjs';
import {openPage,capture} from '../../src/engine/render.mjs';
const dir=path.join(process.env.EXPLAINFRAME_TEST_OUTPUT??path.join(ROOT,'.local/test-results'),'proofs/revision');await fs.rm(dir,{recursive:true,force:true});await fs.mkdir(dir,{recursive:true});
const source=path.join(ROOT,'examples/linear-transformation/dist/handoff.zip');
for(const [name,bytes]of Object.entries(unzipSync(await fs.readFile(source))))if(name.startsWith('editable-project/'))await atomic(path.join(dir,name),Buffer.from(bytes));
const job=await loadProject(path.join(dir,'editable-project')),before=await prepare(job.dir,job.project),codeFile=path.join(job.dir,job.project.scenes[0].visual.module),code=await fs.readFile(codeFile,'utf8');
assert.ok(code.includes('CHANGED = [1, 2]'));
await atomic(codeFile,code.replace('CHANGED = [1, 2]','CHANGED = [4, 2]'));
const changed=job.project.scenes.find(s=>s.id==='predict');
changed.narration='Now try four steps right and two steps up. Predict the destination.';
job.project.scenes.find(s=>s.id==='apply').narration='Apply the same shear: each upward step also moves right. The result is six, two. The coefficients stay the same.';
changed.visualDescription='The input (4,2) uses four right basis steps and two up basis steps. The same shear maps it to (6,2), with the same coefficients and a fixed coordinate scale.';
for(const source of job.project.sources)if(source.file?.endsWith('direction.md')){const f=path.join(job.dir,source.file),text=await fs.readFile(f,'utf8');await atomic(f,text.replaceAll('(1,2)','(4,2)').replaceAll('(3,2)','(6,2)'));}
await atomic(path.join(job.dir,'project.json'),job.project);
const after=await prepare(job.dir,job.project);
assert.equal(after.scenes.filter(s=>!s.reused).length,2);assert.deepEqual(after.scenes.filter(s=>!s.reused).map(s=>s.id),['predict','apply']);
for(const scene of before.scenes.filter(s=>!['predict','apply'].includes(s.id)))assert.equal(await hashFile(scene.audioFile),await hashFile(after.scenes.find(s=>s.id===scene.id).audioFile));
const file=path.join(dir,'revision.html');await atomic(file,await htmlPage(job.dir,after));const {page,browser,errors}=await openPage(file);
let proof;
try{
 proof=await page.evaluate(()=>{const m=window.explainer.manifest;return window.renderAt(m.scenes.at(-1).end-.5).audit.find(a=>a.kind==='geometry-proof');});assert.deepEqual(proof.output,[6,2]);
 const shot=await capture(page,after.scenes.at(-1).end-.5,'png');await atomic(path.join(dir,'revision.png'),Buffer.from(shot.image,'base64'));
 assert.ok(proof.plot&&proof.tip[0]>=proof.plot.x&&proof.tip[0]<=proof.plot.x+proof.plot.w&&proof.tip[1]>=proof.plot.y&&proof.tip[1]<=proof.plot.y+proof.plot.h,'Revised vector must remain inside the coordinate plot');assert.deepEqual(errors,[]);
}finally{await browser.close();}
await atomic(path.join(dir,'result.json'),{status:'passed',before:[1,2],after:[4,2],output:proof.output,newSpeech:['predict','apply'],unchangedSpeech:['basis','shear'],plot:proof.plot});console.log('Quantity revision passed; only changed-scene speech rebuilt.');
