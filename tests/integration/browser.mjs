import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {ROOT,FORMATS,loadProject,atomic,run,hash} from '../../src/engine/core.mjs';
import {prepare,htmlPage} from '../../src/engine/publish.mjs';
import {narrate} from '../../src/engine/speech.mjs';
import {openPage} from '../../src/engine/render.mjs';
import {audition} from '../../src/engine/audition.mjs';

const noVideo=process.argv.includes('--no-video');
const out=path.join(process.env.EXPLAINFRAME_TEST_OUTPUT??path.join(ROOT,'.local/test-results'),noVideo?'browser-no-video':'browser');await fs.mkdir(out,{recursive:true});
const {dir,project}=await loadProject(path.join(ROOT,'examples/revenue-and-contribution'));
const manifest=await prepare(dir,project);const file=path.join(out,'review.html');await atomic(file,await htmlPage(dir,manifest));
const {browser,page,errors}=await openPage(file,{width:1440,height:1100});const result={formats:[],networkRequests:[]};
page.on('request',r=>{if(/^https?:/.test(r.url()))result.networkRequests.push(r.url());});
try{
  for(const format of Object.keys(FORMATS)){
    await page.selectOption('#format',format);const details=await page.evaluate(()=>{const s=window.explainer.manifest.scenes[0],w=s.words[2],audit=window.renderAt((w.start+w.end)/2).audit;return{width:document.querySelector('canvas').width,height:document.querySelector('canvas').height,activeWords:audit.filter(a=>a.kind==='caption'&&a.active).length,overflow:audit.filter(a=>a.outside).length};});
    assert.equal(details.width,FORMATS[format].width);assert.equal(details.height,FORMATS[format].height);assert.equal(details.activeWords,1);assert.equal(details.overflow,0);const words=await page.evaluate(()=>{let checked=0;const misses=[];for(const s of window.explainer.manifest.scenes)for(const w of s.words){checked++;const audit=window.renderAt(s.start+(w.start+w.end)/2).audit;if(!audit.some(a=>a.kind==='caption'&&a.active&&a.text===w.text))misses.push({scene:s.id,word:w.text});}return{checked,misses};});assert.deepEqual(words.misses,[]);result.formats.push({format,...details,words});
  }
  assert.equal(await page.evaluate(()=>{window.renderAt(2);const a=document.querySelector('canvas').toDataURL();window.renderAt(8);window.renderAt(2);return a===document.querySelector('canvas').toDataURL();}),true);
  await page.locator('.transcript-scene').nth(2).click();assert.equal(await page.evaluate(()=>window.explainer.frame(window.explainer.manifest.scenes[2].start).scene),'compare');
  await page.evaluate(()=>window.explainer.seek(0));await page.click('#play');await page.waitForFunction(()=>window.explainer.audio.currentTime>.3);await page.click('#play');await page.selectOption('#speed','1.5');assert.equal(await page.evaluate(()=>window.explainer.audio.playbackRate),1.5);
  await page.evaluate(()=>window.explainer.seek(window.explainer.manifest.scenes[2].start));assert.ok((await page.locator('#evidence').innerText()).includes('Revenue rises'));
  assert.equal(await page.locator('#learning').isVisible(),true);const answer=page.locator('.question details');assert.equal(await answer.getAttribute('open'),null);await answer.locator('summary').click();assert.ok((await answer.innerText()).includes('$45'));
  await page.click('#mute');assert.equal(await page.evaluate(()=>window.explainer.audio.muted),true);await page.selectOption('#caption-mode','none');assert.equal(await page.evaluate(()=>window.renderAt(2).audit.filter(a=>a.kind==='caption').length),0);await page.selectOption('#caption-mode','karaoke');
  await page.evaluate(()=>window.explainer.seek(window.explainer.manifest.scenes[2].start));await page.locator('#revision-tools summary').click();await page.fill('#revision-note','Show the extra costs.');const reviewDownload=page.waitForEvent('download');await page.click('#save-review');const review=await reviewDownload,reviewFile=path.join(out,'review-notes.json');await review.saveAs(reviewFile);assert.equal(JSON.parse(await fs.readFile(reviewFile,'utf8')).scene,'compare');result.learningEvidenceAndReview=true;
  assert.equal(await page.locator('canvas').getAttribute('role'),'img');assert.equal(await page.locator('canvas').getAttribute('aria-describedby'),'visual-description');assert.ok((await page.locator('#visual-description').innerText()).includes('contribution'));result.visualDescription=true;
  await page.locator('#licenses summary').click();assert.ok((await page.locator('#licenses').innerText()).includes('SIL OPEN FONT LICENSE'));await page.locator('#licenses summary').click();result.readableNotices=true;
  await page.selectOption('#format','portrait');await page.screenshot({path:path.join(out,'desktop.png')});await page.setViewportSize({width:430,height:932});await page.screenshot({path:path.join(out,'mobile.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),430);
  assert.deepEqual(errors,[]);assert.deepEqual(result.networkRequests,[]);result.player={playback:true,transcriptSeek:true,speed:true,deterministic:true,mobileNoOverflow:true};
}finally{await browser.close();}

const job=path.join(out,'job');await fs.mkdir(job,{recursive:true});await fs.cp(path.join(dir,'media'),path.join(job,'media'),{recursive:true});await fs.cp(path.join(dir,'scenes'),path.join(job,'scenes'),{recursive:true});await fs.copyFile(path.join(dir,'source-notes.md'),path.join(job,'source-notes.md'));
const short={...project,scenes:[structuredClone(project.scenes[0])],checks:[],teaching:{...project.teaching,questions:[]}};await atomic(path.join(job,'project.json'),short);
const board=await audition(job,short,{voices:[short.speech.voice]});const boardBrowser=await openPage(path.join(out,'review.html'));
try{
  await boardBrowser.page.goto(pathToFileURL(board.board).href);await boardBrowser.page.getByRole('button',{name:'Choose ink',exact:true}).click();await boardBrowser.page.getByRole('button',{name:'Choose pop',exact:true}).click();
  await boardBrowser.page.waitForFunction(()=>document.querySelector('#preview').contentWindow.explainer);const selectedAppearance=await boardBrowser.page.locator('#preview').evaluate(f=>f.contentWindow.renderAt(2));assert.equal(selectedAppearance.style,'ink');
  await boardBrowser.page.setViewportSize({width:430,height:932});const voiceY=await boardBrowser.page.locator('#voices').evaluate(e=>e.getBoundingClientRect().top+scrollY);assert.ok(voiceY<932);assert.equal(await boardBrowser.page.locator('iframe').count(),1);result.compactAuditionVoiceY=voiceY;
  const downloading=boardBrowser.page.waitForEvent('download');await boardBrowser.page.click('#save');const download=await downloading,selection=path.join(out,'selection.json');await download.saveAs(selection);
  await boardBrowser.page.setViewportSize({width:430,height:932});assert.equal(await boardBrowser.page.evaluate(()=>document.documentElement.scrollWidth),430);await boardBrowser.page.screenshot({path:path.join(out,'audition-mobile.png')});
  await run(process.execPath,[path.join(ROOT,'bin/explain.mjs'),'select','--project',job,'--selection',selection]);const selected=JSON.parse(await fs.readFile(path.join(job,'project.json'),'utf8'));assert.equal(selected.style,'ink');assert.equal(selected.caption.mode,'pop');result.auditionSelection=true;
}finally{await boardBrowser.browser.close();}

await fs.mkdir(path.join(job,'scenes'),{recursive:true});await atomic(path.join(job,'scenes/fixture.mjs'),`export function render({body,text,card,time,cue,palette}){card(body.x,body.y,body.w,body.h);text(time>=cue('revenue')?'Costs matter.':'Revenue.',body.x+30,body.y+50,40,{maxWidth:body.w-60,color:palette.primary});}`);
let custom={...short,scenes:[{...short.scenes[0],visualDescription:'The scene changes from revenue to costs at the named speech cue.',visual:{type:'custom',module:'scenes/fixture.mjs'}}]};
let prepared=await prepare(job,custom);const customFile=path.join(out,'custom.html');await atomic(customFile,await htmlPage(job,prepared));const customPage=await openPage(customFile);
try{const audit=await customPage.page.evaluate(()=>window.renderAt(4).audit);assert.ok(audit.some(a=>a.text==='Costs matter.'));assert.ok(audit.every(a=>!a.outside));const image=await customPage.page.evaluate(()=>document.querySelector('canvas').toDataURL('image/png').split(',')[1]);await fs.mkdir(path.join(job,'assets'),{recursive:true});await atomic(path.join(job,'assets/image.png'),Buffer.from(image,'base64'));assert.equal(await customPage.page.locator('#visual-description').innerText(),custom.scenes[0].visualDescription);result.customCue=true;}finally{await customPage.browser.close();}
custom={...short,scenes:[{...short.scenes[0],visualDescription:'A captured card reads Costs matter.',visual:{type:'image',file:'assets/image.png'}}]};prepared=await prepare(job,custom);const imageFile=path.join(out,'image.html');await atomic(imageFile,await htmlPage(job,prepared));const imagePage=await openPage(imageFile);try{assert.equal(await imagePage.page.evaluate(()=>window.sceneImages.question.width),1080);result.imageImport=true;}finally{await imagePage.browser.close();}

const provided=structuredClone(short);provided.speech={...provided.speech,backend:'provided',voice:'fixture'};const timing=path.join(job,provided.scenes[0].timing),meta=JSON.parse(await fs.readFile(timing,'utf8'));meta.voice='fixture';await atomic(timing,meta);
assert.equal((await narrate(job,provided)).question.bundled,true);provided.scenes[0].narration+=' Changed.';await assert.rejects(narrate(job,provided),e=>e.code==='PROVIDED_AUDIO_STALE');result.importedAudioInvalidation=true;

// Export from a path containing spaces and a URL fragment character: FFmpeg must
// resolve its relative segment list against the project, not a truncated URL.
if(!noVideo){
const renderJob=path.join(out,'render fixture #1');await fs.mkdir(renderJob,{recursive:true});await fs.cp(path.join(dir,'media'),path.join(renderJob,'media'),{recursive:true});await fs.cp(path.join(dir,'scenes'),path.join(renderJob,'scenes'),{recursive:true});await fs.copyFile(path.join(dir,'source-notes.md'),path.join(renderJob,'source-notes.md'));await atomic(path.join(renderJob,'project.json'),short);
const exported=JSON.parse(await run(process.execPath,[path.join(ROOT,'bin/explain.mjs'),'render','--project',renderJob,'--format','square','--quality','draft'],{timeout:180000,env:{EXPLAINER_PYTHON:'/unavailable/python'}}));assert.equal(exported.results[0].decodePass,true);assert.equal(exported.results[0].width,540);assert.equal(exported.results[0].height,540);result.exportWithHashPath=true;
const repeat=JSON.parse(await run(process.execPath,[path.join(ROOT,'bin/explain.mjs'),'render','--project',renderJob,'--format','square','--quality','draft'],{timeout:180000,env:{EXPLAINER_PYTHON:'/unavailable/python'}}));
assert.deepEqual(repeat.results[0].reusedScenes,[short.scenes[0].id]);
const jobReceipt=JSON.parse(await fs.readFile(path.join(renderJob,'build/job.json'),'utf8'));assert.equal(jobReceipt.status,'complete');assert.ok(jobReceipt.started&&jobReceipt.finished&&jobReceipt.elapsedMs>0);assert.equal(jobReceipt.cache.renderedSceneReuses,1);assert.ok(jobReceipt.stages.some(s=>s.name==='render'&&s.status==='complete'));assert.ok(repeat.results[0].toolchain.ffmpeg&&repeat.results[0].toolchain.browser.version);
result.exportReceipt={first:exported.results[0],repeat:repeat.results[0],job:jobReceipt};
}else result.exportWithHashPath='Not run: --no-video';

const invalid=await run(process.execPath,[path.join(ROOT,'bin/explain.mjs'),'--help']);assert.equal(JSON.parse(invalid).version,'0.2.0');
await atomic(path.join(out,'results.json'),result);console.log(JSON.stringify(result,null,2));
