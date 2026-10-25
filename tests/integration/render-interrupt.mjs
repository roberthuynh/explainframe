// Exercise the actual render CLI under cancellation with a fake encoder that never
// consumes input or creates media. The real browser freezes inside a custom scene.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {ROOT,atomic,loadProject,exists} from '../../src/engine/core.mjs';
import {bounded} from '../../src/engine/waits.mjs';
if(process.platform==='win32')throw new Error('This signal fixture requires a POSIX host; Windows remains unverified.');
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'explainer-interrupt-'));let child,encoderPID;
try{
  const source=path.join(ROOT,'examples/revenue-and-contribution'),{project}=await loadProject(source);
  project.scenes=project.scenes.slice(0,1);project.teaching.questions=[];project.checks=[];project.speech.backend='provided';
  project.scenes[0].visual={type:'custom',module:'scenes/stall.mjs'};
  await fs.cp(path.join(source,'media'),path.join(dir,'media'),{recursive:true});await fs.copyFile(path.join(source,'source-notes.md'),path.join(dir,'source-notes.md'));
  await atomic(path.join(dir,'project.json'),project);await atomic(path.join(dir,'scenes/stall.mjs'),'export function render({time}){if(time>0){while(true){}}}');
  const fake=path.join(dir,'tools/ffmpeg'),pidFile=path.join(dir,'encoder.pid');
  await atomic(fake,`#!/usr/bin/env node
if(process.argv.includes('-version')){console.log('ffmpeg fixture 1');process.exit(0);}require('node:fs').writeFileSync(process.env.TEST_ENCODER_PID,String(process.pid));process.on('SIGTERM',()=>{});setInterval(()=>{},1000);
`);await fs.chmod(fake,0o755);
  child=spawn(process.execPath,[path.join(ROOT,'bin/explain.mjs'),'render','--project',dir,'--format','square','--quality','draft'],{cwd:ROOT,env:{...process.env,PATH:path.dirname(fake)+path.delimiter+process.env.PATH,TEST_ENCODER_PID:pidFile},stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='',sent=false,interruptAt,interruptTask,fixtureError;
  const closed=new Promise((resolve,reject)=>{child.on('close',resolve);child.on('error',reject);});
  child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>{
    stderr+=b;if(!sent&&stderr.includes('"frame":0')){sent=true;interruptTask=(async()=>{const deadline=Date.now()+5000;while(!await exists(pidFile)){if(Date.now()>deadline)throw new Error('Fake encoder did not become ready');await new Promise(resolve=>setTimeout(resolve,25));}await new Promise(resolve=>setTimeout(resolve,100));interruptAt=Date.now();child.kill('SIGTERM');})().catch(e=>{fixtureError=e;child.kill('SIGKILL');});}
  });
  const exit=await bounded(()=>closed,{timeout:20000,label:'Interrupted render CLI'});
  await interruptTask;if(fixtureError)throw fixtureError;
  assert.ok(await exists(pidFile),`Encoder never started: ${stdout} ${stderr}`);
  encoderPID=Number(await fs.readFile(pidFile,'utf8'));
  assert.ok(sent);assert.notEqual(exit,0);assert.equal(JSON.parse(stdout).code,'INTERRUPTED');
  assert.ok(Date.now()-interruptAt<10000);assert.equal(await exists(path.join(dir,'build/.lock')),false);
  assert.throws(()=>process.kill(encoderPID,0),e=>e.code==='ESRCH');
  const files=await fs.readdir(path.join(dir,'build/render/square/draft'));assert.ok(files.every(f=>!f.endsWith('.mp4')));
  assert.equal(JSON.parse(await fs.readFile(path.join(dir,'build/job.json'),'utf8')).status,'failed');
  const result={status:'passed',actualCLI:true,actualChromium:true,stalledCustomScene:true,fakeEncoder:true,forcedEncoderTermination:true,lockReleased:true,videoFilesCreated:0,exit,cleanupMilliseconds:Date.now()-interruptAt};
  await atomic(path.join(process.env.EXPLAINFRAME_TEST_OUTPUT??path.join(ROOT,'.local/test-results'),'render-interrupt.json'),result);console.log(JSON.stringify(result,null,2));
}finally{
  if(child&&child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');
  if(!encoderPID&&await exists(path.join(dir,'encoder.pid')))encoderPID=Number(await fs.readFile(path.join(dir,'encoder.pid'),'utf8'));
  if(encoderPID)try{process.kill(encoderPID,'SIGKILL');}catch{}
  await fs.rm(dir,{recursive:true,force:true});
}
