import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {ROOT,MODEL_REVISION,exists,run,atomic,KitError} from './core.mjs';
import {voiceEnvironment,settings} from './speech.mjs';
import {browserOptions} from './render.mjs';
const require=createRequire(import.meta.url);
export async function doctor(){
  const env=await voiceEnvironment(),checks=[];
  const check=async(name,command,args,repair,required=true)=>{try{const result=await run(command,args,{timeout:20000});checks.push({name,ok:true,detail:result.trim().slice(0,200)});}catch(e){checks.push({name,ok:false,required,repair,error:e.message});}};
  checks.push({name:'node',ok:Number(process.versions.node.split('.')[0])>=22,detail:process.version,required:true,repair:'Install Node 22 or later in the execution environment.'});
  await check('ffmpeg','ffmpeg',['-version'],'Install FFmpeg for this environment; do not silently modify the host system.');
  await check('ffprobe','ffprobe',['-version'],'Install FFmpeg, which includes ffprobe.');
  try{const options=await browserOptions();checks.push({name:'browser',ok:true,detail:(options.executablePath??'Playwright-managed Chromium')+' (executable found; launch not tested)'});}catch(e){checks.push({name:'browser',ok:false,required:true,repair:e.repair,error:e.message});}
  await check('voice-python',env.python,['-B','-c',"import importlib.util as u; assert all(u.find_spec(x) for x in ['kokoro','soundfile','en_core_web_sm']),'Voice package or English tokenizer missing'; print('Voice packages installed; actual synthesis verifies runtime')"],'Run npm run setup -- --download-model, or set EXPLAINER_PYTHON.',false);
  const modelFiles=['config.json','kokoro-v1_0.pth','voices/af_heart.pt'];
  const missing=[];for(const file of modelFiles)if(!await exists(path.join(env.model,file)))missing.push(file);
  checks.push({name:'voice-model',ok:missing.length===0,required:false,missing,repair:'Run npm run setup -- --download-model, or set EXPLAINER_MODEL_PATH to the pinned Kokoro snapshot.'});
  return {status:checks.some(c=>c.required&& !c.ok)?'needs-setup':'ready-for-bundled-demo',platform:process.platform,arch:process.arch,checks,voiceReady:checks.filter(c=>c.name.startsWith('voice-')).every(c=>c.ok),note:'Bundled examples can preview/render without Python. New narration needs the voice environment. This is a capability check, not a platform certification.'};
}
export async function setup({browser=false,downloadModel=false,voices=['af_heart','af_bella','am_michael'],python}={}){
  const local=await settings();
  if(browser){const cli=path.join(path.dirname(require.resolve('playwright/package.json')),'cli.js');await run(process.execPath,[cli,'install','chromium'],{timeout:600000});}
  if(downloadModel){
    for(const voice of voices)if(!/^(af|am|bf|bm)_[a-z]+$/.test(voice))throw new KitError('INVALID_VOICE','Unsupported voice '+voice,'Use an English Kokoro voice from the model card.');
    if(python)local.python=path.resolve(python);
    if(!local.python){await run('uv',['sync','--frozen','--python','3.12'],{cwd:ROOT,timeout:600000,repair:'Install uv and allow dependency downloads, then run setup again. No system-wide Python is changed.'});local.python=path.join(ROOT,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');}
    const hasTokenizer=await run(local.python,['-B','-c',"import importlib.util;print(int(importlib.util.find_spec('en_core_web_sm') is not None))"],{timeout:30000,repair:'Check the selected Python executable. Setup only needs a lightweight package-discovery check here.'});
    if(hasTokenizer.trim()!=='1')await run('uv',['pip','install','--python',local.python,'https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl'],{timeout:300000});
    const patterns=['config.json','kokoro-v1_0.pth',...voices.map(v=>'voices/'+v+'.pt')];
    const code=`from huggingface_hub import snapshot_download; import json; print(snapshot_download(repo_id='hexgrad/Kokoro-82M',revision=${JSON.stringify(MODEL_REVISION)},allow_patterns=${JSON.stringify(patterns)}))`;
    const output=await run(local.python,['-B','-c',code],{timeout:600000,env:{HF_HUB_OFFLINE:'0',TRANSFORMERS_OFFLINE:'0',HF_HUB_DISABLE_TELEMETRY:'1',DO_NOT_TRACK:'1'}});local.modelPath=output.trim().split('\n').at(-1);
  }
  if(Object.keys(local).length)await atomic(path.join(ROOT,'.local/settings.json'),local);
  return await doctor();
}
