import fs from 'node:fs/promises';
import path from 'node:path';
import {portableModule} from './custom.mjs';
import {zipSync} from 'fflate';
import {ROOT,hash,hashFile,exists,readJSON,atomic,containedFile,escapeHTML} from './core.mjs';
import {portableNotices} from './notices.mjs';
import {writeReview,htmlPage} from './publish.mjs';

export async function handoff(dir,project,manifest,{format='portrait'}={}){
  await writeReview(dir,manifest,format);
  const dist=path.join(dir,'dist'),folder=path.join(dist,'handoff'),editable=path.join(folder,'editable-project');
  // This directory is generated. Rebuild it so removed media never travels in a new handoff.
  await fs.rm(folder,{recursive:true,force:true});await fs.mkdir(editable,{recursive:true});
  const portable=structuredClone(project),modules=new Map();
  for(const scene of portable.scenes){
    const built=manifest.scenes.find(s=>s.id===scene.id),extension=path.extname(built.audioFile),audioName='media/'+scene.id+extension,timingName='media/'+scene.id+'.json';
    await fs.mkdir(path.join(editable,'media'),{recursive:true});await fs.copyFile(built.audioFile,path.join(editable,audioName));
    const {audio,reused,bundled,...metadata}=built.speechMetadata;await atomic(path.join(editable,timingName),metadata);scene.audio=audioName;scene.timing=timingName;
    if(scene.visual.type==='image'){
      const image=await containedFile(dir,scene.visual.file),name='assets/'+scene.id+path.extname(image);await fs.mkdir(path.join(editable,'assets'),{recursive:true});await fs.copyFile(image,path.join(editable,name));scene.visual.file=name;
    }
    if(scene.visual.type==='custom'){
      const original=scene.visual.module;
      if(!modules.has(original)){
        const name='scenes/module-'+modules.size+'.mjs';
        await atomic(path.join(editable,name),await portableModule(dir,original));modules.set(original,name);
      }
      scene.visual.module=modules.get(original);
    }
  }
  for(const [i,source]of portable.sources.entries())if(source.file){
    if(source.includeInBundle===true){const file=await containedFile(dir,source.file),name='sources/'+i+'-'+path.basename(file);await fs.mkdir(path.join(editable,'sources'),{recursive:true});await fs.copyFile(file,path.join(editable,name));source.file=name;}
    else{delete source.file;source.availability='Original local document retained by its owner; not included in this handoff.';}
  }
  await atomic(path.join(editable,'project.json'),portable);
  await atomic(path.join(editable,'README.md'),'# Editable explanation\n\nGive this folder and '+(project.kitURL??'the Explainframe repository URL')+' to your agent. Bundled narration previews and renders without Python. Edit project.json or scene modules to revise. Only explicitly included source notes travel here; raw private readings are not copied automatically.\n');
  const names=['captions.srt','captions.vtt','transcript.md','sources.json','teaching.md'];
  for(const name of names)if((name!=='teaching.md'||project.teaching)&&await exists(path.join(dist,name)))await fs.copyFile(path.join(dist,name),path.join(folder,name));
  await atomic(path.join(folder,'sources.json'),{sources:portable.sources,claims:portable.claims,checks:portable.checks,notice:'Source traceability and declared checks do not certify factual accuracy.'});
  for(const notice of await portableNotices())await atomic(path.join(folder,'licenses',notice.file),notice.text);
  const downloads=names.filter(name=>name!=='teaching.md'||project.teaching).map(file=>({title:file,file}));
  downloads.push({title:'Licenses and component notices',file:'licenses/COMPONENTS.md'});
  const renderFile=path.join(dist,'render.json');if(await exists(renderFile)){const r=await readJSON(renderFile);if(r.projectHash===hash(project)&&r.inputHash===manifest.inputHash)for(const item of r.results){if(await exists(item.file)&&await hashFile(item.file)===item.sha256){const file=path.basename(item.file);await fs.copyFile(item.file,path.join(folder,file));downloads.push({title:item.format+' video',file});}}}
  const auditionFile=path.join(dist,'audition.json');if(await exists(auditionFile)){const audition=await readJSON(auditionFile);if(audition.projectHash===hash(project)&&audition.inputHash===manifest.inputHash&&await exists(path.join(dist,'audition.html'))){await fs.copyFile(path.join(dist,'audition.html'),path.join(folder,'audition.html'));downloads.push({title:'Audition board',file:'audition.html'});}}
  await atomic(path.join(folder,'review.html'),await htmlPage(dir,{...manifest,sources:portable.sources,downloads},{format}));
  await atomic(path.join(folder,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(project.title)} · Handoff</title><style>body{max-width:800px;margin:50px auto;padding:0 24px;font:18px/1.6 system-ui;background:#f8f6f2;color:#17305a}h1{font:42px Georgia}a{color:inherit}li{margin:12px 0}</style><h1>${escapeHTML(project.title)}</h1><p>Start with the player. Keep the editable project when asking your agent for changes.</p><ul><li><a href="review.html">Watch, inspect sources and try the changed example</a></li>${downloads.map(d=>`<li><a href="${d.file}">${escapeHTML(d.title)}</a></li>`).join('')}<li><a href="editable-project/README.md">How to revise the editable project</a></li><li><a href="artifacts.json">File verification manifest</a></li></ul><p>No responses or viewing data are sent anywhere by this handoff.</p></html>`);
  const files=[],archive={};
  async function collect(folder,prefix=''){
    for(const entry of await fs.readdir(folder,{withFileTypes:true})){const file=path.join(folder,entry.name),name=prefix+entry.name;if(entry.isDirectory())await collect(file,name+'/');else{const data=await fs.readFile(file);files.push({file:name,bytes:data.length,sha256:hash(data)});archive[name]=new Uint8Array(data);}}
  }
  await collect(folder);
  const receipt={schemaVersion:1,projectHash:hash(project),inputHash:manifest.inputHash,files,notice:'Hashes describe this handoff. They do not establish source support or learning outcomes.'};
  await atomic(path.join(folder,'artifacts.json'),receipt);archive['artifacts.json']=new Uint8Array(await fs.readFile(path.join(folder,'artifacts.json')));
  const zip=zipSync(archive,{level:1});await atomic(path.join(dist,'handoff.zip'),Buffer.from(zip));receipt.archiveHash=hash(Buffer.from(zip));await atomic(path.join(dist,'artifacts.json'),receipt);
  await writeReview(dir,manifest,format);
  return {status:'bundled',directory:folder,editableProject:editable,index:path.join(folder,'index.html'),archive:path.join(dist,'handoff.zip'),manifest:path.join(dist,'artifacts.json'),review:path.join(dist,'review.html')};
}
