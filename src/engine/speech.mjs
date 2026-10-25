import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {ROOT,VERSION,MODEL_REVISION,hash,hashFile,exists,run,readJSON,atomic,containedFile,KitError,validTimings} from './core.mjs';

export async function settings(){return await exists(path.join(ROOT,'.local/settings.json'))?await readJSON(path.join(ROOT,'.local/settings.json')):{};}
export async function voiceEnvironment(){
  const local=await settings();const python=process.env.EXPLAINER_PYTHON??local.python??path.join(ROOT,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
  const hf=process.env.HF_HOME??path.join(os.homedir(),'.cache/huggingface');
  const model=process.env.EXPLAINER_MODEL_PATH??local.modelPath??path.join(hf,'hub/models--hexgrad--Kokoro-82M/snapshots',MODEL_REVISION);
  return {python,model};
}
export async function speechKey(scene,speech,{backendVersions,modelFingerprint}={}){
  return hash({text:scene.narration,speech,revision:MODEL_REVISION,backendVersions:backendVersions??{},modelFingerprint:modelFingerprint??null,generator:hash(await fs.readFile(path.join(ROOT,'src/voice/narrate.py'))),kitVersion:VERSION});
}
async function imported(dir,scene,speech){
  if(!scene.audio||!scene.timing)return null;
  const audio=await containedFile(dir,scene.audio),metadata=await readJSON(await containedFile(dir,scene.timing));
  const language=metadata.language??(/^(af|am)_/.test(metadata.voice)?'a':/^(bf|bm)_/.test(metadata.voice)?'b':null);
  if(metadata.textHash!==hash(scene.narration)||metadata.voice!==speech.voice||metadata.speed!==speech.speed||language!==speech.language||metadata.lexiconHash!==hash(speech.lexicon))return null;
  if(metadata.audioHash!==hash(await fs.readFile(audio)))throw new KitError('AUDIO_CHANGED',`Bundled audio hash changed: ${scene.id}`,'Regenerate the speech or import matching audio and timing metadata.');
  const actual=Number((await run('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',audio])).trim());
  if(!Number.isFinite(actual)||Math.abs(actual-metadata.duration)>.15)throw new KitError('AUDIO_DURATION_MISMATCH',`Audio duration does not match timing metadata: ${scene.id}`,'Rebuild the timing receipt from the actual waveform.',{actual,declared:metadata.duration});
  if(!validTimings(metadata.words,metadata.duration))throw new KitError('INVALID_TIMING',`Bundled timing is invalid: ${scene.id}`,'Regenerate the timing metadata.');
  if(!['model-duration','aligned-recording'].includes(metadata.timingMethod))throw new KitError('UNMEASURED_TIMING',`Audio needs measured or aligned timing: ${scene.id}`,'Supply actual token/alignment timing; do not distribute duration by word length.');
  return {...metadata,audio,key:metadata.key??hash(metadata),reused:true,bundled:true};
}
export async function narrate(dir,project,{sceneId,voice,progress=()=>{}}={}){
  const speech={...project.speech,...(voice?{voice,...(project.speech.backend==='kokoro'?{language:voice.startsWith('b')?'b':'a'}:{})}: {})};
  const scenes=project.scenes.filter(s=>!sceneId||s.id===sceneId);if(!scenes.length)throw new KitError('SCENE_NOT_FOUND',`No scene ${sceneId}`,'Use a scene ID from project.json.');
  const results={},need=[];
  for(const scene of scenes){const media=await imported(dir,scene,speech);if(media)results[scene.id]=media;else need.push(scene);}
  if(!need.length)return results;
  if(speech.backend==='provided')throw new KitError('PROVIDED_AUDIO_STALE','An imported recording or its timing does not match the current script.','Import matching audio/timing metadata or explicitly select Kokoro for regenerated narration.',{scenes:need.map(s=>s.id)});
  const env=await voiceEnvironment();
  if(!await exists(env.python))throw new KitError('VOICE_NOT_READY','Python Kokoro is not configured.','Run npm run setup -- --download-model, or set EXPLAINER_PYTHON to an existing Kokoro Python.');
  for(const file of ['config.json','kokoro-v1_0.pth',`voices/${speech.voice}.pt`])if(!await exists(path.join(env.model,file)))throw new KitError('MODEL_NOT_READY',`Missing ${file}`,'Run npm run setup -- --download-model --voices '+speech.voice+' or set EXPLAINER_MODEL_PATH to the pinned snapshot.');
  const backendVersions=JSON.parse(await run(env.python,['-B','-c',"import importlib.metadata as m,json; print(json.dumps({x:m.version(x) for x in ['kokoro','misaki','torch','soundfile','spacy','en_core_web_sm']}))"],{timeout:20000}));
  const modelFingerprint=hash({config:await hashFile(path.join(env.model,'config.json')),voice:await hashFile(path.join(env.model,`voices/${speech.voice}.pt`)),weights:await hashFile(path.join(env.model,'kokoro-v1_0.pth'))});
  const pending=[];
  for(const scene of need){
    const key=await speechKey(scene,speech,{backendVersions,modelFingerprint});const folder=path.join(dir,'build/speech',scene.id,key),metaFile=path.join(folder,'speech.json'),audio=path.join(folder,'voice.wav');
    let cached=null;
    if(await exists(metaFile)&&await exists(audio)){const meta=await readJSON(metaFile);if(meta.key===key&&validTimings(meta.words,meta.duration)&&meta.audioHash===hash(await fs.readFile(audio)))cached={...meta,audio,reused:true};}
    if(cached)results[scene.id]=cached;else pending.push({scene,key,folder,audio,metaFile});
  }
  if(!pending.length)return results;
  const job=path.join(dir,'build/speech/jobs',hash({time:Date.now(),pid:process.pid,voice:speech.voice}).slice(0,16));await fs.mkdir(job,{recursive:true});
  const spec={...speech,modelPath:env.model,modelRevision:MODEL_REVISION,items:pending.map(p=>({id:p.scene.id,text:p.scene.narration}))};await atomic(path.join(job,'spec.json'),spec);
  progress({stage:'speech',scenes:pending.map(p=>p.scene.id),voice:speech.voice});
  await run(env.python,['-B',path.join(ROOT,'src/voice/narrate.py'),path.join(job,'spec.json'),job],{timeout:Math.max(120000,pending.reduce((n,p)=>n+p.scene.narration.length*100,0)),env:{PYTHONDONTWRITEBYTECODE:'1',HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1',HF_HUB_DISABLE_TELEMETRY:'1',DO_NOT_TRACK:'1'},repair:'Inspect the Python diagnostic. Model downloads only occur in the explicit setup command.'});
  for(const p of pending){const meta=await readJSON(path.join(job,p.scene.id+'.json'));
    if(!validTimings(meta.words,meta.duration))throw new KitError('INVALID_TIMING',`Kokoro did not return valid word timing: ${p.scene.id}`,'Check the voice language, lexicon and source text.');
    await fs.mkdir(p.folder,{recursive:true});await fs.copyFile(path.join(job,p.scene.id+'.wav'),p.audio);
    const receipt={...meta,key:p.key,lexiconHash:hash(speech.lexicon),backendVersions,modelFingerprint,generatorVersion:VERSION};await atomic(p.metaFile,receipt);results[p.scene.id]={...receipt,audio:p.audio,reused:false};
  }
  return results;
}
