import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {ROOT,FORMATS,hash,hashFile,readJSON,exists,atomic,containedFile,KitError,captionGroups,secondsToSrt,safeJSON} from './core.mjs';
import {noticesHTML} from './notices.mjs';
import {visualDescription} from '../player/description.mjs';
import {narrate} from './speech.mjs';

export async function prepare(dir,project,{sceneId,voice,style,caption,progress}={}){
  const speech=await narrate(dir,project,{sceneId,voice,progress});
  let start=0;const scenes=[];
  for(const scene of project.scenes.filter(s=>!sceneId||s.id===sceneId)){
    const result=speech[scene.id],duration=Math.ceil((result.duration+(scene.hold??.8))*project.fps)/project.fps;
    const audio=await fs.readFile(result.audio);const mime=result.audio.endsWith('.mp3')?'audio/mpeg':result.audio.endsWith('.m4a')?'audio/mp4':'audio/wav';
    const visual={...scene.visual};
    if(visual.type==='image'){const image=await containedFile(dir,visual.file),extension=path.extname(image).toLowerCase(),mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}[extension];if(!mime)throw new KitError('IMAGE_TYPE','Use PNG, JPEG or WebP for image scenes.','Convert the asset locally, keeping its source/rights record.');visual.data=`data:${mime};base64,${(await fs.readFile(image)).toString('base64')}`;}
    scenes.push({...scene,visual,start,end:start+duration,duration,audioDuration:result.duration,audio:`data:${mime};base64,${audio.toString('base64')}`,audioFile:result.audio,speechKey:result.key,words:result.words,timingMethod:result.timingMethod,reused:result.reused,speechMetadata:result});start+=duration;
  }
  return {...project,style:style??project.style,caption:{...project.caption,...(caption?{mode:caption}:{})},duration:start,scenes,formatPresets:FORMATS,inputHash:await inputFingerprint(dir,project)};
}
export async function htmlPage(dir,manifest,{format='portrait',renderOnly=false,compact=false}={}){
  const imports=[`import {boot} from ${JSON.stringify(path.join(ROOT,'src/player/player.mjs'))};`],custom=[];
  for(const [i,scene]of manifest.scenes.entries())if(scene.visual.type==='custom'){
    const file=await containedFile(dir,scene.visual.module);imports.push(`import {render as scene${i}} from ${JSON.stringify(file)};`);custom.push(`${JSON.stringify(scene.id)}:scene${i}`);
  }
  // Operational cache state must not alter rendered content or segment keys.
  const {inputHash,...contentManifest}=manifest;
  const embed={...contentManifest,scenes:manifest.scenes.map(({audioFile,speechMetadata,reused,...s})=>s)};
  // Learning/review metadata is useful in the player, but never changes a film frame.
  if(renderOnly){delete embed.teaching;delete embed.downloads;delete embed.kitURL;embed.sources=[];embed.claims=[];delete embed.checks;}
  const content=imports.join('\n')+`\nboot(${safeJSON(embed)},{format:${JSON.stringify(format)},renderOnly:${renderOnly},custom:{${custom.join(',')}}}).catch(e=>{document.body.dataset.error=e.message;console.error(e);});`;
  const allowed=[await fs.realpath(ROOT),await fs.realpath(dir)];
  const result=await build({stdin:{contents:content,resolveDir:dir,sourcefile:'review-entry.mjs'},bundle:true,write:false,platform:'browser',format:'esm',minify:true,plugins:[{name:'project-boundary',setup(b){b.onLoad({filter:/.*/},async args=>{const real=await fs.realpath(args.path);if(!allowed.some(root=>real.startsWith(root+path.sep)))throw new Error('Custom module imports outside toolkit/project: '+args.path);return undefined;});}}]});
  let source=await fs.readFile(path.join(ROOT,'src/player/player.html'),'utf8');
  if(compact)source=source.replace('<body>','<body class="compact">');
  const fonts=await Promise.all(['figtree','newsreader'].map(async name=>`@font-face{font-family:${name==='figtree'?'Figtree':'Newsreader'};font-style:normal;font-weight:100 900;font-display:block;src:url(data:font/ttf;base64,${(await fs.readFile(path.join(ROOT,'assets/fonts',name+'.ttf'))).toString('base64')}) format('truetype');}`));
  source=source.replace('/* FONTS */',fonts.join('\n')).replace('/* BOOT */',result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script'));
  return source.replace('<!-- NOTICES -->',await noticesHTML());
}
export async function writeCompanions(dir,manifest){
  const dist=path.join(dir,'dist');await fs.mkdir(dist,{recursive:true});let cues=[];
  for(const s of manifest.scenes)for(const group of captionGroups(s.words,manifest.caption.maxWords))cues.push({start:s.start+group[0].start,end:s.start+group.at(-1).end,text:group.map(w=>w.text).join(' ')});
  const srt=cues.map((c,i)=>`${i+1}\n${secondsToSrt(c.start)} --> ${secondsToSrt(c.end)}\n${c.text}`).join('\n\n')+'\n';
  await atomic(path.join(dist,'captions.srt'),srt);await atomic(path.join(dist,'captions.vtt'),'WEBVTT\n\n'+srt.replace(/^\d+\n/gm,'').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g,'$1.$2'));
  await atomic(path.join(dist,'transcript.md'),'# '+manifest.title+'\n\n'+manifest.scenes.map(s=>'## '+s.title+'\n\n'+s.narration+'\n\n**Visual description:** '+(visualDescription(s)||'Not yet supplied; review required.')).join('\n\n')+'\n');
  await atomic(path.join(dist,'sources.json'),{sources:manifest.sources,claims:manifest.claims,checks:manifest.checks??[],notice:'Sources and declared checks require content review. Technical checks do not certify claims.'});
  if(manifest.teaching)await atomic(path.join(dist,'teaching.md'),'# '+manifest.title+' · Learning companion\n\n'+['audience','goal','prerequisite','limit'].filter(k=>manifest.teaching[k]).map(k=>`**${k}:** ${manifest.teaching[k]}`).join('\n\n')+'\n\n'+(manifest.teaching.questions??[]).map(q=>`## ${q.question}\n\n${q.answer}\n\n${q.explanation??''}`).join('\n\n')+'\n');
  await atomic(path.join(dist,'timeline.json'),{duration:manifest.duration,fps:manifest.fps,scenes:manifest.scenes.map(({audio,audioFile,speechMetadata,...s})=>s)});
  return dist;
}
export async function writeReview(dir,manifest,format='portrait'){
  const dist=await writeCompanions(dir,manifest);const target=path.join(dist,'review.html');
  const downloads=[{title:'Captions · SRT',file:'captions.srt'},{title:'Captions · VTT',file:'captions.vtt'},{title:'Transcript',file:'transcript.md'},{title:'Sources',file:'sources.json'}];
  if(manifest.teaching)downloads.push({title:'Learning companion',file:'teaching.md'});
  const receipt=path.join(dist,'render.json');if(await exists(receipt)){const r=await readJSON(receipt);if(r.inputHash===manifest.inputHash)for(const item of r.results)if(await exists(item.file)&&await hashFile(item.file)===item.sha256)downloads.push({title:item.format+' video',file:path.basename(item.file)});}
  const artifacts=path.join(dist,'artifacts.json');if(await exists(artifacts)&&await exists(path.join(dist,'handoff.zip'))&&(await readJSON(artifacts)).inputHash===manifest.inputHash)downloads.push({title:'Everything · ZIP',file:'handoff.zip'});
  await atomic(target,await htmlPage(dir,{...manifest,downloads},{format}));
  await atomic(path.join(dist,'review.json'),{schemaVersion:1,file:'review.html',inputHash:manifest.inputHash,format,sha256:await hashFile(target)});return target;
}
export async function inputFingerprint(dir,project){
  const references={};
  for(const scene of project.scenes)for(const name of [scene.audio,scene.timing,scene.visual.type==='image'?scene.visual.file:null].filter(Boolean))references[name]=await hashFile(await containedFile(dir,name));
  for(const source of project.sources)if(source.file)references[source.file]=await hashFile(await containedFile(dir,source.file));
  const runtime=await htmlPage(dir,{...project,duration:0,formatPresets:FORMATS});
  return hash({project,references,runtime:hash(runtime)});
}
export function evaluateChecks(project){
  return (project.checks??[]).map(check=>{
    const a=check.values??[];let actual=null;
    if(check.kind==='difference')actual=Number(a[0])-Number(a[1]);
    if(check.kind==='sum')actual=a.reduce((n,v)=>n+Number(v),0);
    if(check.kind==='power')actual=Number(a[0])**Number(a[1]);
    if(check.kind==='choose'){const [n,k]=a;if(Number.isInteger(n)&&Number.isInteger(k)&&n>=0&&k>=0&&k<=n){actual=1;for(let i=1;i<=k;i++)actual=actual*(n-k+i)/i;}}
    return {id:check.id,kind:check.kind,actual,expected:check.expected,pass:Number.isFinite(actual)&&Math.abs(actual-check.expected)<1e-8};
  });
}
