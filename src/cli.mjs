#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {ROOT,VERSION,FORMATS,STYLES,CAPTIONS,KitError,exists,hash,readJSON,atomic,run,loadProject,normalizeProject,withLock,validTimings} from './engine/core.mjs';
import {doctor,setup} from './engine/setup.mjs';
import {checkProject} from './engine/checks.mjs';
import {portableModule} from './engine/custom.mjs';
import {handoff} from './engine/handoff.mjs';
import {narrate} from './engine/speech.mjs';
import {prepare,writeReview,inputFingerprint} from './engine/publish.mjs';
import {render,storyboard,cancellation} from './engine/render.mjs';
import {jobMeasurement} from './engine/measurement.mjs';
import {audition,applySelection} from './engine/audition.mjs';

const options={project:{type:'string'},target:{type:'string'},audience:{type:'string'},goal:{type:'string'},title:{type:'string'},source:{type:'string'},template:{type:'string'},path:{type:'string'},scene:{type:'string'},format:{type:'string'},formats:{type:'string'},quality:{type:'string'},style:{type:'string'},captions:{type:'string'},voice:{type:'string'},voices:{type:'string'},selection:{type:'string'},python:{type:'string'},'kit-url':{type:'string'},browser:{type:'boolean'},'bundled-only':{type:'boolean'},'download-model':{type:'boolean'},open:{type:'boolean'},json:{type:'boolean'},help:{type:'boolean'}};
let parsed;try{parsed=parseArgs({options,allowPositionals:true});}catch(error){process.stdout.write(JSON.stringify({status:'error',code:'INVALID_ARGUMENT',message:error.message,repair:'Run node bin/explain.mjs --help.'})+'\n');process.exit(1);}
const {values,positionals}=parsed;const command=positionals[0]??'help';
const progress=value=>process.stderr.write(JSON.stringify({...value,pid:process.pid})+'\n');
const output=value=>process.stdout.write(JSON.stringify(value,null,2)+'\n');
if(command==='render'){process.on('SIGINT',()=>{cancellation.requested=true;});process.on('SIGTERM',()=>{cancellation.requested=true;});}
async function open(file){if(!values.open||!file)return;const args=process.platform==='darwin'?['open',[file]]:process.platform==='win32'?['explorer.exe',[file]]:['xdg-open',[file]];await run(args[0],args[1],{timeout:15000});}
async function main(){
  if(values.help||command==='help'){output({name:'Explainframe',version:VERSION,usage:'npm run <command> -- --project <PROJECT_DIRECTORY>',commands:['doctor','setup [--browser] [--download-model] [--python PATH]','demo [--open]','new --path PATH [--template business|math|geometry|attention|cache|blank] [--source URL]','narrate [--scene ID]','audition [--scene ID] [--voices af_heart,af_bella,am_michael | --bundled-only]','select --selection FILE (or --style paper --captions karaoke --voice af_heart)','storyboard [--formats portrait,landscape,square,feed]','preview [--format portrait] [--open]','render [--formats ...] [--quality draft|final]','check [--target preview|video|bundle] [--formats ...]','bundle'],formats:FORMATS,styles:STYLES,captions:CAPTIONS});return;}
  if(command==='doctor'){const result=await doctor();output(result);if(result.status==='needs-setup')process.exitCode=2;return;}
  if(command==='setup'){const result=await setup({browser:values.browser,downloadModel:values['download-model'],voices:values.voices?.split(','),python:values.python});output(result);if(result.status==='needs-setup')process.exitCode=2;return;}
  if(command==='new'){
    const target=path.resolve(values.path??path.join(ROOT,'projects',`explainer-${Date.now()}`));if(await exists(target))throw new KitError('PROJECT_EXISTS',`Refusing to overwrite ${target}`,'Choose a new path or edit the existing project.');
    const template=values.template??'blank';const templateName={business:'revenue-and-contribution',math:'six-dots',geometry:'linear-transformation',attention:'attention-dataflow',cache:'kv-cache'}[template];let p;
    if(templateName){const source=path.join(ROOT,'examples',templateName);p=await readJSON(path.join(source,'project.json'));if(await exists(path.join(source,'media')))await fs.cp(path.join(source,'media'),path.join(target,'media'),{recursive:true});for(const name of ['scenes','assets','source-notes.md','direction.md'])if(await exists(path.join(source,name)))await fs.cp(path.join(source,name),path.join(target,name),{recursive:true});for(const module of new Set(p.scenes.filter(s=>s.visual?.type==='custom').map(s=>s.visual.module)))await atomic(path.join(target,module),await portableModule(source,module));}
    else if(template==='blank')p={schemaVersion:1,title:values.title??'New explanation',category:'CONCEPT',sources:[],claims:[],scenes:[{id:'opening',title:values.title??'Your learning question',narration:'Replace this sentence with a source-grounded opening.',visual:{type:'statement',text:'Show one concrete example.'}}]};
    else throw new KitError('INVALID_TEMPLATE','Unknown template '+template,'Choose business, math, geometry, attention, cache or blank.');
    let origin=null;try{origin=(await run('git',['remote','get-url','origin'],{cwd:ROOT})).trim();}catch{}
    const githubURL=origin?.replace(/^git@github\.com:/,'https://github.com/').replace(/\.git$/,'');
    if(values.audience||values.goal)p.teaching={...p.teaching,...(values.audience?{audience:values.audience}:{}),...(values.goal?{goal:values.goal}:{})};
    if(values.title)p.title=values.title;if(values.source)p.sources.push({id:'user-source',url:values.source,title:'Source supplied by user',status:'not-yet-read'});
    if(values['kit-url'])p.kitURL=values['kit-url'];else if(githubURL&&/^https:\/\/github\.com\/[^/]+\/[^/#?]+\/?$/.test(githubURL))p.kitURL=githubURL;
    p=normalizeProject(p);await atomic(path.join(target,'project.json'),p);
    await atomic(path.join(target,'.explainer-kit.json'),{schemaVersion:1,version:VERSION,kitDirectory:ROOT,sourceURL:values['kit-url']??origin,created:new Date().toISOString()});
    output({status:'created',project:target,template,sourceStatus:values.source?'Agent must read source before authoring':'No new source supplied',next:'Edit project.json, then follow the requested-stage route in START-HERE.md.'});return;
  }
  const dir=values.project??(command==='demo'?path.join(ROOT,'examples/llm'):null);
  if(!dir)throw new KitError('PROJECT_REQUIRED','Specify --project <PROJECT_DIRECTORY>.','Use npm run new -- --path <NEW_PROJECT_DIRECTORY>, or npm run demo.');
  const loaded=await loadProject(dir);let project=loaded.project;
  if(values.style){if(!STYLES.includes(values.style))throw new KitError('INVALID_STYLE','Unknown style','Choose paper, ink or chalk.');project.style=values.style;}
  if(values.captions){if(!CAPTIONS.includes(values.captions))throw new KitError('INVALID_CAPTIONS','Unknown captions','Choose karaoke, pop, plain or none.');project.caption.mode=values.captions;}
  const formats=values.formats?.split(',')??(values.format?[values.format]:project.formats);
  if(formats.some(f=>!FORMATS[f]))throw new KitError('INVALID_FORMAT','Unknown output format','Choose portrait, landscape, square or feed.');
  const format=values.format??formats[0]??'portrait';
  await withLock(loaded.dir,async()=>{
    const measurement=jobMeasurement(command);const measure=(name,action)=>measurement.measure(name,action);
    const receipt=path.join(loaded.dir,'build/job.json');await atomic(receipt,{command,status:'running',pid:process.pid,started:new Date().toISOString()});
    try{
      let result;
      if(command==='select'){
        if(values.selection){const selected=await readJSON(path.resolve(values.selection));if(selected.inputHash&&selected.inputHash!==await inputFingerprint(loaded.dir,project))throw new KitError('STALE_SELECTION','The audition inputs or scene code changed.','Generate a new audition, or explicitly choose values with CLI flags.');project=applySelection(project,selected);}
        if(values.voice){project.speech.voice=values.voice;project.speech.backend='kokoro';project.speech.language=values.voice.startsWith('b')?'b':'a';}
        project=normalizeProject(project);await atomic(path.join(loaded.dir,'project.json'),project);result={status:'selected',style:project.style,caption:project.caption.mode,voice:project.speech.voice};
      }else if(command==='narrate'){
        const speech=await measure('narration',()=>narrate(loaded.dir,project,{sceneId:values.scene,progress}));measurement.cache.speechReused=Object.values(speech).filter(s=>s.reused).length;result={status:'narrated',scenes:Object.fromEntries(Object.entries(speech).map(([id,s])=>[id,{duration:s.duration,key:s.key,reused:s.reused,timingMethod:s.timingMethod}]))};
      }else if(command==='audition')result=await measure('audition',()=>audition(loaded.dir,project,{sceneId:values.scene,voices:values['bundled-only']?[project.speech.voice]:values.voices?.split(','),format,progress}));
      else if(command==='check'){
        result=await measure('check',()=>checkProject(loaded.dir,project,{target:values.target,formats:values.formats?.split(',')??(values.format?[values.format]:undefined)}));if(result.problems.length)process.exitCode=2;
      }else if(['preview','demo','render','storyboard','bundle'].includes(command)){
        const manifest=await measure('prepare-including-narration',()=>prepare(loaded.dir,project,{progress}));measurement.cache.speechReused=manifest.scenes.filter(s=>s.reused).length;await atomic(path.join(loaded.dir,'build/prepared.json'),{projectHash:hash(project),manifest});
        if(command==='render')result={status:'rendered',results:await measure('render',()=>render(loaded.dir,project,manifest,{formats,quality:values.quality??'final',progress})),review:await measure('review',()=>writeReview(loaded.dir,manifest,format))};
        else if(command==='storyboard')result=await measure('storyboard',()=>storyboard(loaded.dir,manifest,{formats,progress}));
        else if(command==='bundle'){
          result=await measure('bundle',()=>handoff(loaded.dir,project,manifest,{format}));
        }else result={status:'preview-ready',review:await measure('review',()=>writeReview(loaded.dir,manifest,format)),duration:manifest.duration};
      }else throw new KitError('UNKNOWN_COMMAND','Unknown command '+command,'Run node bin/explain.mjs --help.');
      measurement.cache.renderedSceneReuses=(result.results??[]).reduce((n,r)=>n+r.reusedScenes.length,0);
      await atomic(receipt,measurement.snapshot(process.exitCode?'needs-attention':'complete',{result}));output(result);await open(result.review??result.board);
    }catch(error){await atomic(receipt,measurement.snapshot('failed',{code:error.code??'FAILED',message:error.message,repair:error.repair}));throw error;}
  });
}
main().catch(error=>{output({status:'error',code:error.code??'FAILED',message:error.message,repair:error.repair??'Inspect the diagnostic and resume after repair.',details:error.details});process.exitCode=1;});
