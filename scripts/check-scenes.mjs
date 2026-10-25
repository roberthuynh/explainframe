import path from 'node:path';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {FORMATS,loadProject,atomic,hash} from '../src/engine/core.mjs';
import {prepare,writeReview} from '../src/engine/publish.mjs';
import {openPage,capture} from '../src/engine/render.mjs';
import {inspectAudit,predictionHolds as inspectHolds,containedCanvasScale} from '../src/player/visual-checks.mjs';
export async function checkScenes(projectPath,out){
 const {dir,project}=await loadProject(projectPath),manifest=await prepare(dir,project);await atomic(path.join(dir,'build/prepared.json'),{projectHash:hash(project),manifest});await writeReview(dir,manifest);
 const {page,browser,errors}=await openPage(path.join(dir,'dist/review.html'),{width:1440,height:1100});const results=[];let portraitFrames=[];
 try{
  for(const format of Object.keys(FORMATS)){
   await page.selectOption('#format',format);
   const frames=await page.evaluate(()=>{const m=window.explainer.manifest,out=[];for(const s of m.scenes)for(let f=0;f<Math.round(s.duration*m.fps);f++)out.push({scene:s.id,frame:f,audit:window.renderAt(s.start+f/m.fps).audit.filter(a=>a.text||a.outside)});return out;});
   if(format==='portrait')portraitFrames=frames;
   const failures=[];for(const frame of frames){const issues=inspectAudit(frame.audit,{minFont:0});if(issues.length&&failures.length<30)failures.push({...frame,audit:undefined,issues});}
   for(const s of manifest.scenes){const shot=await capture(page,s.end-.5,'png');await atomic(path.join(out,format+'-'+s.id+'.png'),Buffer.from(shot.image,'base64'));}
   results.push({format,frames:frames.length,failures});
  }
  await page.selectOption('#format','portrait');await page.setViewportSize({width:430,height:932});
  const phone=await page.evaluate(()=>{const canvas=document.querySelector('canvas'),m=window.explainer.manifest;return {bitmap:{width:canvas.width,height:canvas.height},box:{width:canvas.getBoundingClientRect().width,height:canvas.getBoundingClientRect().height},overflow:document.documentElement.scrollWidth>430,scenes:m.scenes.map(s=>({id:s.id,audit:window.renderAt(s.end-.5).audit.filter(a=>a.text)}))};});
  phone.scale=containedCanvasScale(phone.bitmap,phone.box);
  const phoneFailures=[];let phoneFailureCount=0;for(const frame of portraitFrames){const issues=inspectAudit(frame.audit,{displayScale:phone.scale});phoneFailureCount+=issues.length;for(const f of issues)if(phoneFailures.length<30)phoneFailures.push({...f,scene:frame.scene,frame:frame.frame});}
  await page.screenshot({path:path.join(out,'phone.png')});
  const predictionHolds=inspectHolds(manifest);
  const report={status:results.every(r=>!r.failures.length)&&!phoneFailures.length&&!phone.overflow&&!errors.length&&predictionHolds.every(p=>p.pass)?'passed':'failed',results,phone:{viewport:'430x932 emulation',scale:phone.scale,frames:portraitFrames.length,failureCount:phoneFailureCount,failures:phoneFailures,overflow:phone.overflow},predictionHolds,errors};
  await atomic(path.join(out,'results.json'),report);return report;
 }finally{await browser.close();}
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){const {values}=parseArgs({options:{project:{type:'string'},out:{type:'string'}},strict:true});if(!values.project||!values.out)throw new Error('Use --project <job> --out <evidence-directory>');const report=await checkScenes(path.resolve(values.project),path.resolve(values.out));console.log(JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=1;}
