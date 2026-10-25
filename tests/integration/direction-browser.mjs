import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import os from 'node:os';
import {unzipSync} from 'fflate';
import {handoff} from '../../src/engine/handoff.mjs';
import {ROOT,FORMATS,loadProject,atomic} from '../../src/engine/core.mjs';
import {prepare,htmlPage} from '../../src/engine/publish.mjs';
import {openPage,capture} from '../../src/engine/render.mjs';
const {dir,project}=await loadProject(path.join(ROOT,'examples/revenue-and-contribution'));
const out=path.join(process.env.EXPLAINFRAME_TEST_OUTPUT??path.join(ROOT,'.local/test-results'),'direction');await fs.mkdir(out,{recursive:true});
const manifest=await prepare(dir,project),file=path.join(out,'review.html');await atomic(file,await htmlPage(dir,manifest));
const {browser,page,errors}=await openPage(file,{width:1440,height:1100}),results=[];
try{
 for(const format of Object.keys(FORMATS)){
  await page.selectOption('#format',format);
  const audit=await page.evaluate(()=>{
   let frames=0;const failures=[];const m=window.explainer.manifest;
   for(const scene of m.scenes)for(let f=0;f<Math.round(scene.duration*m.fps);f++){
    frames++;const a=window.renderAt(scene.start+f/m.fps).audit,s=a.find(x=>x.kind==='mechanism');
    if(!s||Math.abs(s.revenue-s.costs-s.contribution)>1e-8||Math.abs(s.costWidth+s.contributionWidth-s.revenueWidth)>1e-6||a.some(x=>x.outside))failures.push({scene:scene.id,f,reason:'invariant or overflow'});
    const eq=a.find(x=>x.kind==='equation'),match=eq?.text.match(/^\$(\d+) − \$(\d+) = \$(\d+)$/);if(match&&Number(match[1])-Number(match[2])!==Number(match[3]))failures.push({scene:scene.id,f,reason:'display arithmetic'});
    const captions=a.filter(x=>x.kind==='caption');for(const x of a.filter(x=>!['caption','mechanism'].includes(x.kind)))if(captions.some(c=>x.x<c.x+c.width&&x.x+x.width>c.x&&x.y<c.y+c.height&&x.y+x.height>c.y))failures.push({scene:scene.id,f,reason:'caption overlap',text:x.text});
   }
   const c=m.scenes.find(s=>s.id==='compare'),state=t=>window.renderAt(c.start+t).audit.find(x=>x.kind==='mechanism');
   const before=state(1),mid=state(6.3),after=state(9.5);return{frames,failures,before,mid,after};
  });assert.equal(audit.failures.length,0,JSON.stringify({format,first:audit.failures.slice(0,3),count:audit.failures.length}));assert.ok(audit.mid.revenueWidth>audit.before.revenueWidth&&audit.mid.contributionWidth<audit.before.contributionWidth);assert.equal(audit.after.contribution,30);
  const cueState=await page.evaluate(()=>{const c=window.explainer.manifest.scenes.find(s=>s.id==='compare'),t=c.words.find(w=>w.text==='fifty').start;return window.renderAt(c.start+t).audit.find(a=>a.kind==='mechanism');});assert.equal(cueState.revenue,150);assert.equal(cueState.costs,120);results.push({format,...audit});
  const comparison=manifest.scenes.find(s=>s.id==='compare');for(const [label,t]of [['before',1],['during',6.3],['after',9.5]]){const shot=await capture(page,comparison.start+t,'png');await atomic(path.join(out,format+'-'+label+'.png'),Buffer.from(shot.image,'base64'));}
 }
 assert.deepEqual(errors,[]);
 await page.selectOption('#format','portrait');await page.setViewportSize({width:430,height:932});await page.evaluate(()=>{window.scrollTo(0,0);window.explainer.seek(window.explainer.manifest.scenes.find(s=>s.id==='compare').start+9.5);});await page.screenshot({path:path.join(out,'phone.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),430);
}finally{await browser.close();}
const bundle=await handoff(dir,project,manifest),temp=await fs.mkdtemp(path.join(os.tmpdir(),'explainer-portable-direction-'));
try{
 const files=unzipSync(await fs.readFile(bundle.archive));for(const [name,bytes]of Object.entries(files))if(name.startsWith('editable-project/'))await atomic(path.join(temp,name),Buffer.from(bytes));
 const portable=await loadProject(path.join(temp,'editable-project')),html=await htmlPage(portable.dir,await prepare(portable.dir,portable.project));assert.ok(!html.includes(path.join(dir,'scenes')));const file=path.join(temp,'portable.html');await atomic(file,html);const check=await openPage(file);
 try{const state=await check.page.evaluate(()=>{const s=window.explainer.manifest.scenes.find(s=>s.id==='compare');return window.renderAt(s.start+9.5).audit.find(a=>a.kind==='mechanism');});assert.equal(state.revenue,150);assert.equal(state.costs,120);assert.equal(state.contribution,30);assert.deepEqual(check.errors,[]);}finally{await check.browser.close();}
}finally{await fs.rm(temp,{recursive:true,force:true});}
await atomic(path.join(out,'results.json'),{status:'passed',results,errors,phoneEmulation:'430x932',portableSceneReplay:true});console.log(JSON.stringify({status:'passed',frames:results.reduce((n,r)=>n+r.frames,0),formats:results.map(r=>r.format)},null,2));
