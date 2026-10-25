import {performance} from 'node:perf_hooks';
import {VERSION,run,hash,readJSON,ROOT} from './core.mjs';
import path from 'node:path';
export function jobMeasurement(command,{now=()=>performance.now(),date=()=>new Date().toISOString()}={}){
  const started=date(),start=now(),stages=[],cache={};
  return {cache,async measure(name,action){const begin=now(),record={name,started:date(),status:'running'};stages.push(record);try{const result=await action();record.status='complete';return result;}catch(e){record.status='failed';record.code=e.code??'FAILED';throw e;}finally{record.finished=date();record.elapsedMs=Math.max(0,now()-begin);}},snapshot(status,extra={}){return {command,status,started,finished:date(),elapsedMs:Math.max(0,now()-start),stages,cache,...extra};}};
}
export async function toolchain({browserOptions,signal}={}){
  const pkg=await readJSON(path.join(ROOT,'package.json'));
  const probe=async(command,args)=>{try{return (await run(command,args,{timeout:10000,signal})).trim().split('\n')[0];}catch(e){if(e.code==='INTERRUPTED')throw e;return null;}};
  const [ffmpeg,ffprobe,browserVersion]=await Promise.all([probe('ffmpeg',['-version']),probe('ffprobe',['-version']),browserOptions?.executablePath?probe(browserOptions.executablePath,['--version']):null]);
  return {kit:VERSION,platform:process.platform,arch:process.arch,node:process.version,dependencies:pkg.dependencies,ffmpeg,ffprobe,browser:browserOptions?{executable:browserOptions.executablePath,version:browserVersion}:null};
}
export function renderToolchainKey(t){return t.ffmpeg&&t.browser?.version?hash({ffmpeg:t.ffmpeg,browser:t.browser.version,platform:t.platform,arch:t.arch}):null;}
