import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {unzipSync} from 'fflate';
import {ROOT,FORMATS,loadProject,atomic,hashFile} from '../../src/engine/core.mjs';
import {prepare,writeReview,htmlPage,inputFingerprint} from '../../src/engine/publish.mjs';
import {handoff} from '../../src/engine/handoff.mjs';
import {openPage,capture} from '../../src/engine/render.mjs';
const out=path.join(process.env.EXPLAINFRAME_TEST_OUTPUT??path.join(ROOT,'.local/test-results'),'proofs');await fs.mkdir(out,{recursive:true});
const results=[];
for(const slug of ['linear-transformation','attention-dataflow']){
 const {dir,project}=await loadProject(path.join(ROOT,'examples',slug)),manifest=await prepare(dir,project);
 await writeReview(dir,manifest);
 const {browser,page,errors}=await openPage(path.join(dir,'dist/review.html'),{width:1440,height:1100});
 try{
  for(const format of Object.keys(FORMATS)){
   await page.selectOption('#format',format);
   const result=await page.evaluate(()=>{
    let frames=0;const failures=[],m=window.explainer.manifest;
    const close=(a,b)=>Math.abs(a-b)<1e-7;
    for(const scene of m.scenes)for(let f=0;f<Math.round(scene.duration*m.fps);f++){
     frames++;const frame=window.renderAt(scene.start+f/m.fps),a=frame.audit,s=a.find(v=>v.kind.endsWith('-proof'));
     const fail=(reason,detail)=>{if(failures.length<25)failures.push({scene:scene.id,f,reason,detail});};
     if(!s)fail('missing mechanism');
     else if(s.kind==='geometry-proof'){
      if(s.tip[0]<s.plot.x||s.tip[0]>s.plot.x+s.plot.w||s.tip[1]<s.plot.y||s.tip[1]>s.plot.y+s.plot.h)fail('vector outside plot');
      if(!close(s.output[0],s.input[0]+s.amount*s.input[1])||!close(s.output[1],s.input[1])||!close((s.tip[0]-s.origin[0])/s.unit,s.output[0])||!close((s.origin[1]-s.tip[1])/s.unit,s.output[1]))fail('matrix/geometry invariant');
      const labels=a.filter(v=>v.kind==='matrix-entry').map(v=>Number(v.text));const want=(s.presentationMatrix??s.matrix).flat().map(v=>Number(v.toFixed(2)));if(JSON.stringify(labels)!==JSON.stringify(want))fail('matrix display');
     }else{
      const expected=1/(1+Math.exp((s.query[1]-s.query[0])/Math.sqrt(2)));
      if(!close(s.weights[0],expected)||!close(s.weights[0]+s.weights[1],1)||!close(s.output[0]/2+s.output[1]/4,1))fail('attention invariant');
      if(s.weightReveal===1&&s.barWidths.some((v,i)=>!close(v/s.barScale,s.weights[i])))fail('weight bar scale');
      if(s.mixReveal===1&&!a.some(v=>v.kind==='attention-output'&&v.text===`Output ≈ (${s.output.map(v=>v.toFixed(2)).join(', ')})`))fail('output display');
     }
     for(const item of a)if(item.outside)fail('overflow',item);
     const boxes=a.filter(v=>v.text&&v.width>0);
     for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
      const b=boxes[i],c=boxes[j];if(b.kind==='caption'&&c.kind==='caption')continue;
      if(b.x<c.x+c.width-1&&b.x+b.width>c.x+1&&b.y<c.y+c.height-1&&b.y+b.height>c.y+1)fail('text overlap',{a:b.text,b:c.text});
     }
    }
    const last=m.scenes.at(-1),a=window.renderAt(last.end-.5).audit;window.renderAt(0);const b=window.renderAt(last.end-.5).audit;
    return {frames,failures,deterministic:JSON.stringify(a)===JSON.stringify(b)};
   });
   // Save representative frames even on failure so the failed layout is reviewable.
   for(const scene of manifest.scenes){const shot=await capture(page,scene.end-.5,'png');await atomic(path.join(out,slug+'-'+format+'-'+scene.id+'.png'),Buffer.from(shot.image,'base64'));}
   if(format==='landscape'||format==='portrait'){
    const scene=manifest.scenes.find(s=>s.id===(slug==='linear-transformation'?'shear':'change'));
    const first=scene.words.find(w=>w.text.toLowerCase().replace(/[^a-z]/g,'')===(slug==='linear-transformation'?'shear':'switch')).start;
    const last=scene.words.find(w=>w.text.toLowerCase().replace(/[^a-z]/g,'')===(slug==='linear-transformation'?'lands':'recompute')).start;
    for(const [name,t]of [['before',first],['during',(first+last)/2],['after',last]]){const shot=await capture(page,scene.start+t,'png');await atomic(path.join(out,slug+'-'+format+'-'+name+'.png'),Buffer.from(shot.image,'base64'));}
   }
   results.push({slug,format,...result});await atomic(path.join(out,'results.json'),{results});
   assert.deepEqual(result.failures,[],JSON.stringify({slug,format,failures:result.failures.slice(0,5)}));assert.equal(result.deterministic,true);
  }
  await page.selectOption('#format','portrait');await page.setViewportSize({width:430,height:932});await page.evaluate(()=>{window.scrollTo(0,0);window.explainer.seek(window.explainer.manifest.scenes.at(-1).end-.5);});await page.screenshot({path:path.join(out,slug+'-phone.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),430);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
 // Relocate the editable ZIP. Disable Python to prove included speech is actually reused.
 const bundle=await handoff(dir,project,manifest),temp=await fs.mkdtemp(path.join(os.tmpdir(),'explainer-proof-portable-')),python=process.env.EXPLAINER_PYTHON;
 try{
  for(const [name,bytes]of Object.entries(unzipSync(await fs.readFile(bundle.archive))))if(name.startsWith('editable-project/'))await atomic(path.join(temp,name),Buffer.from(bytes));
  const portable=await loadProject(path.join(temp,'editable-project')),modules=new Set(portable.project.scenes.map(s=>s.visual.module));assert.equal(modules.size,1,'One shared lesson must remain one editable module');
  const module=path.join(portable.dir,[...modules][0]),code=await fs.readFile(module,'utf8');assert.ok(code.includes('function stateAt'));assert.ok(!code.includes(dir));assert.ok(!code.includes(ROOT));
  assert.ok(portable.project.sources.some(s=>s.file?.endsWith('direction.md')));
  process.env.EXPLAINER_PYTHON=path.join(temp,'python-unavailable');const before=await prepare(portable.dir,portable.project);assert.ok(before.scenes.every(s=>s.reused));
  // A targeted visual revision changes just the vector/flow ink. Speech stays byte-identical.
  const audioHashes=await Promise.all(before.scenes.map(s=>hashFile(s.audioFile)));
  await atomic(module,code.replaceAll('palette.primary','palette.accent'));
  const after=await prepare(portable.dir,portable.project);assert.notEqual(before.inputHash,after.inputHash);assert.deepEqual(await Promise.all(after.scenes.map(s=>hashFile(s.audioFile))),audioHashes);
  const file=path.join(temp,'revised.html');await atomic(file,await htmlPage(portable.dir,after));const replay=await openPage(file);
  try{const proof=await replay.page.evaluate(()=>{const m=window.explainer.manifest;return window.renderAt(m.scenes.at(-1).end-.5).audit.find(a=>a.kind.endsWith('-proof'));});if(slug==='linear-transformation')assert.deepEqual(proof.output,[3,2]);else assert.ok(Math.abs(proof.output[1]-3.217718729)<1e-8);assert.deepEqual(replay.errors,[]);}finally{await replay.browser.close();}
 }finally{if(python===undefined)delete process.env.EXPLAINER_PYTHON;else process.env.EXPLAINER_PYTHON=python;await fs.rm(temp,{recursive:true,force:true});}
}
await atomic(path.join(out,'results.json'),{status:'passed',results,portableRevision:true,phoneEmulation:'430x932'});
console.log(JSON.stringify({status:'passed',frames:results.reduce((n,r)=>n+r.frames,0),layouts:results.length,portableRevision:true}));
