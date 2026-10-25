import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {constants} from 'node:fs';
import {bounded,stopEncoder,waitForDrain} from './waits.mjs';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {ROOT,FORMATS,hash,exists,atomic,readJSON,run,KitError,escapeHTML} from './core.mjs';
import {htmlPage,writeCompanions,evaluateChecks} from './publish.mjs';
import {toolchain,renderToolchainKey} from './measurement.mjs';
import {performance} from 'node:perf_hooks';
import {settings} from './speech.mjs';

let controller=new AbortController();
export const cancellation={get requested(){return controller.signal.aborted;},set requested(value){if(value)controller.abort();else if(controller.signal.aborted)controller=new AbortController();},get signal(){return controller.signal;}};
export async function browserOptions(){
  const local=await settings();let executablePath=process.env.EXPLAINER_BROWSER_PATH??local.browser;
  if(!executablePath&&await exists(chromium.executablePath()))executablePath=chromium.executablePath();
  const candidates=process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']:process.platform==='win32'?[path.join(process.env.PROGRAMFILES??'C:/Program Files','Google/Chrome/Application/chrome.exe')]:['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'];
  if(!executablePath)for(const file of candidates)if(await exists(file)){executablePath=file;break;}
  if(!executablePath)throw new KitError('BROWSER_NOT_READY','No headless Chromium browser found.','Run npm run setup -- --browser, or set EXPLAINER_BROWSER_PATH to Chrome/Chromium.');
  try{if(!(await fs.stat(executablePath)).isFile())throw new Error('not a regular file');await fs.access(executablePath,constants.X_OK);}catch(e){throw new KitError('BROWSER_NOT_READY',`Browser path is not executable: ${executablePath} (${e.message})`,'Set EXPLAINER_BROWSER_PATH to an installed Chrome/Chromium executable, or run setup --browser.');}
  return {headless:true,executablePath};
}
export async function openPage(file,{width=1080,height=1920}={}){
  const options=await browserOptions();
  // Playwright owns launch timeout/cleanup; close a late launch if cancellation won.
  let abandoned=false,browser;
  const launch=chromium.launch({...options,timeout:30000});launch.then(b=>{if(abandoned)return closeBrowser(b);}).catch(()=>{});
  try{browser=await bounded(()=>launch,{signal:cancellation.signal,label:'Browser launch'});}catch(error){abandoned=true;throw error;}
  try{
    return await bounded(async()=>{
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>{const url=route.request().url();if(/^(file:|data:|blob:)/.test(url))route.continue();else route.abort();});
    await page.goto(pathToFileURL(file).href,{waitUntil:'load'});await page.waitForFunction(()=>window.filmReady||document.body.dataset.error,{timeout:30000});
    const failure=await page.evaluate(()=>document.body.dataset.error);if(failure)throw new Error(failure);
    return {browser,page,errors};
    },{signal:cancellation.signal,label:'Player initialization'});
  }catch(error){await closeBrowser(browser,error);throw error;}
}
export async function capture(page,time,type='jpeg',size,{timeout=30000,signal=cancellation.signal}={}){
  return await bounded(()=>page.evaluate(({t,type,size})=>{const result=window.renderAt(t);let canvas=document.querySelector('#stage');if(size&&(size.width!==canvas.width||size.height!==canvas.height)){const small=window.__exportCanvas??=document.createElement('canvas');small.width=size.width;small.height=size.height;small.getContext('2d').drawImage(canvas,0,0,size.width,size.height);canvas=small;}return {image:canvas.toDataURL(type==='png'?'image/png':'image/jpeg',.92).split(',')[1],audit:result.audit,scene:result.scene};},{t:time,type,size}),{timeout,signal,label:'Frame capture'});
}
export async function closeBrowser(browser,failure=null,{timeout=cancellation.requested?5000:30000}={}){
  try{await bounded(()=>browser.close(),{timeout,label:'Browser cleanup'});}
  catch(cleanup){if(!failure)throw cleanup;failure.details={...failure.details,cleanup:{code:cleanup.code??'ERROR',message:cleanup.message}};}
}
function oneScene(manifest,scene){return {...manifest,duration:scene.duration,scenes:[{...scene,start:0,end:scene.duration}]};}
export async function render(dir,project,manifest,{formats=project.formats,quality='final',progress=()=>{}}={}){
  if(!['draft','final'].includes(quality))throw new KitError('INVALID_QUALITY','Unknown export quality '+quality,'Use draft or final.');
  if(quality==='final'&&project.sources.some(s=>s.status==='not-yet-read'))throw new KitError('UNREAD_SOURCE','A source has not been read yet.','Have the agent retrieve and review the supplied source, then record its status before final export.');
  const renderStarted=performance.now(),tools=await toolchain({browserOptions:await browserOptions(),signal:cancellation.signal}),toolKey=renderToolchainKey(tools);
  const results=[],scale=quality==='draft'?.5:1;const dist=await writeCompanions(dir,manifest);
  const checkResults=evaluateChecks(project);if(checkResults.some(c=>!c.pass))throw new KitError('EXAMPLE_CHECK_FAILED','A declared numerical check failed.','Repair the example or its checked values before exporting.',{checks:checkResults});
  await atomic(path.join(dir,'build/prepared.json'),{projectHash:hash(project),manifest});
  for(const format of formats){
    const preset=FORMATS[format];if(!preset)throw new KitError('INVALID_FORMAT','Unknown format '+format,'Choose portrait, landscape, square or feed.');
    const size={width:Math.round(preset.width*scale/2)*2,height:Math.round(preset.height*scale/2)*2};
    const folder=path.join(dir,'build/render',format,quality);await fs.mkdir(folder,{recursive:true});const clips=[];const audits=[];
    for(const scene of manifest.scenes){
      if(cancellation.requested)throw new KitError('INTERRUPTED','Render interrupted.','Resume the same render command; finished scene segments stay cached.');
      const isolated=oneScene(manifest,scene),html=await htmlPage(dir,isolated,{format,renderOnly:true}),key=hash({html,size,quality,ffmpeg:'h264-fast-v1',toolchain:toolKey}),movie=path.join(folder,key+'.mp4'),metaFile=path.join(folder,key+'.json'),audio=path.join(folder,key+'.wav');
      let reuse=false;
      if(toolKey&&await exists(movie)&&await exists(metaFile)&&await exists(audio)){const meta=await readJSON(metaFile);reuse=meta.key===key&&meta.movieHash===hash(await fs.readFile(movie))&&meta.audioHash===hash(await fs.readFile(audio));if(reuse)audits.push(...meta.audits);}
      if(!reuse){
        progress({stage:'render',format,scene:scene.id,status:'started'});const htmlFile=path.join(folder,key+'.html');await atomic(htmlFile,html);
        const {browser,page,errors}=await openPage(htmlFile,size);const temp=movie+'.partial.mp4';
        const encoder=spawn('ffmpeg',['-nostdin','-y','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate',String(project.fps),'-i','-','-an','-c:v','libx264','-preset','fast','-crf',quality==='draft'?'23':'18','-pix_fmt','yuv420p','-threads','4',temp],{stdio:['pipe','ignore','pipe']});
        let encoderError='',encoderCode=null,spawnError=null;encoder.stderr.on('data',b=>encoderError=(encoderError+b).slice(-4000));encoder.on('error',e=>spawnError=e);encoder.stdin.on('error',e=>spawnError??=e);
        const completion=new Promise(resolve=>encoder.on('close',c=>{encoderCode=c;resolve(c);}));
        const sceneAudits=[];let failure=null;
        try{
          // Keep the same master layout in drafts; downsample the completed frame only.
          const count=Math.round(scene.duration*project.fps);
          for(let f=0;f<count;f++){
            if(cancellation.requested)throw new KitError('INTERRUPTED','Render interrupted.','Resume the command to reuse finished scenes.');
            if(spawnError||encoderCode!==null)throw new Error('Encoder stopped: '+(spawnError?.message??encoderError));
            const shot=await capture(page,f/project.fps,'jpeg',size);const outside=shot.audit.filter(a=>a.outside);
            if(outside.length)throw new KitError('LAYOUT_OVERFLOW',`Text exceeds ${format} frame in ${scene.id}`,'Shorten the text, split the scene, or adjust the custom layout.',{frame:f,items:outside});
            if(f===0||f===Math.floor(count/2))sceneAudits.push({scene:scene.id,format,frame:f,textItems:shot.audit.length,outside:0});
            if(!encoder.stdin.write(Buffer.from(shot.image,'base64')))await waitForDrain(encoder,{signal:cancellation.signal});
            if(f%90===0)progress({stage:'render',format,scene:scene.id,frame:f,total:count});
          }
          encoder.stdin.end();const code=await bounded(()=>completion,{timeout:120000,signal:cancellation.signal,label:'Encoder completion'});if(code!==0||errors.length)throw new Error(encoderError||errors.join('; '));await fs.rename(temp,movie);
          await run('ffmpeg',['-nostdin','-y','-v','error','-i',scene.audioFile,'-af',`apad=whole_dur=${scene.duration}`,'-t',String(scene.duration),'-ar','48000','-ac','1','-c:a','pcm_s16le',audio],{signal:cancellation.signal});
          await atomic(metaFile,{key,toolchain:tools,movieHash:hash(await fs.readFile(movie)),audioHash:hash(await fs.readFile(audio)),audits:sceneAudits});audits.push(...sceneAudits);
        }catch(error){failure=error;try{await stopEncoder(encoder,completion);}catch(cleanup){error.details={...error.details,encoderCleanup:cleanup.message};}await fs.rm(temp,{force:true}).catch(()=>{});throw error;}
        finally{await closeBrowser(browser,failure);}
      }
      clips.push({video:path.basename(movie),audio:path.basename(audio),scene:scene.id,reused:reuse});
    }
    await atomic(path.join(folder,'video-list.txt'),clips.map(c=>`file '${c.video}'`).join('\n')+'\n');
    await atomic(path.join(folder,'audio-list.txt'),clips.map(c=>`file '${c.audio}'`).join('\n')+'\n');
    const captionSuffix=manifest.caption.mode==='karaoke'?'':manifest.caption.mode==='none'?'-clean':'-'+manifest.caption.mode;
    const output=path.join(dist,`${format}${quality==='draft'?'-draft':''}${captionSuffix}.mp4`),temp=output+'.partial.mp4';
    try{
    await run('ffmpeg',['-nostdin','-y','-v','error','-f','concat','-safe','1','-i','video-list.txt','-f','concat','-safe','1','-i','audio-list.txt','-map','0:v:0','-map','1:a:0','-c:v','copy','-af','loudnorm=I=-16:TP=-1.5:LRA=9','-ar','48000','-c:a','aac','-b:a','160k','-t',String(manifest.duration),'-movflags','+faststart',temp],{cwd:folder,timeout:180000,signal:cancellation.signal});
    await fs.rename(temp,output);
    }finally{await fs.rm(temp,{force:true});}
    await run('ffmpeg',['-v','error','-i',output,'-f','null','-'],{timeout:180000,signal:cancellation.signal});
    const probe=JSON.parse(await run('ffprobe',['-v','error','-show_entries','format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,nb_frames,duration','-of','json',output],{signal:cancellation.signal}));
    const actualDuration=Number(probe.format.duration);if(Math.abs(actualDuration-manifest.duration)>.1)throw new KitError('DURATION_MISMATCH','Output duration differs from timeline.','Inspect scene segment durations and the output probe.',{expected:manifest.duration,actual:actualDuration});
    const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
    if(video?.width!==size.width||video?.height!==size.height||Number(video?.nb_frames)!==Math.round(manifest.duration*project.fps)||audio?.sample_rate!=='48000')throw new KitError('STREAM_MISMATCH','Export streams do not match the requested timeline/format.','Inspect the ffprobe receipt before delivering this output.',{probe});
    const result={format,quality,toolchain:tools,elapsedMs:performance.now()-renderStarted,file:output,width:size.width,height:size.height,duration:actualDuration,bytes:Number(probe.format.size),decodePass:true,reusedScenes:clips.filter(c=>c.reused).map(c=>c.scene),audits,sha256:hash(await fs.readFile(output)),probe};results.push(result);progress({stage:'export',...result,audits:undefined,probe:undefined});
    await atomic(path.join(dist,'render.json'),{schemaVersion:1,projectHash:hash(project),inputHash:manifest.inputHash,date:new Date().toISOString(),toolchain:tools,elapsedMs:performance.now()-renderStarted,duration:manifest.duration,checks:checkResults,results});
  }
  return results;
}
export async function storyboard(dir,manifest,{formats=['portrait','landscape'],progress=()=>{}}={}){
  const output=path.join(dir,'dist/storyboard');await fs.mkdir(output,{recursive:true});const cards=[],findings=[];
  for(const format of formats){
    const html=await htmlPage(dir,manifest,{format,renderOnly:true}),file=path.join(dir,'build',`storyboard-${format}.html`);await atomic(file,html);
    const {browser,page,errors}=await openPage(file,FORMATS[format]);let failure=null;
    try{
      for(const scene of manifest.scenes){const t=scene.start+Math.min(scene.audioDuration*.55,scene.duration-.01);const result=await capture(page,t,'png');const target=path.join(output,`${format}-${scene.id}.png`);await atomic(target,Buffer.from(result.image,'base64'));
        cards.push({format,scene:scene.id,title:scene.title,image:'data:image/png;base64,'+result.image});findings.push({format,scene:scene.id,outside:result.audit.filter(a=>a.outside),audit:result.audit});progress({stage:'storyboard',format,scene:scene.id});
      }if(errors.length)throw new Error(errors.join('; '));
    }catch(error){failure=error;throw error;}finally{await closeBrowser(browser,failure);}
  }
  const body=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Storyboard · ${escapeHTML(manifest.title)}</title><style>body{background:#f8f6f2;color:#17305a;font:16px/1.5 system-ui;padding:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}article{background:white;padding:16px;border-radius:12px}img{width:100%;height:300px;object-fit:contain}small{color:#626c77}</style><h1>${escapeHTML(manifest.title)}</h1><p>Review the mechanism, captions, source support and layout. A sampled board does not verify every frame.</p><main>${cards.map(c=>`<article><small>${c.format} · ${c.scene}</small><h2>${escapeHTML(c.title)}</h2><img src="${c.image}" alt="${escapeHTML(c.title)}"></article>`).join('')}</main>`;
  await atomic(path.join(output,'index.html'),body);await atomic(path.join(output,'layout.json'),findings);
  return {board:path.join(output,'index.html'),frames:cards.length,overflow:findings.flatMap(f=>f.outside).length};
}
