import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {run,withLock} from '../../src/engine/core.mjs';
import {bounded,stopEncoder,waitForDrain} from '../../src/engine/waits.mjs';
import {capture,cancellation,browserOptions} from '../../src/engine/render.mjs';

const codeIs=code=>e=>e.code===code;
test('a deadline remains a failure when SIGTERM exits zero',async()=>{
  await assert.rejects(run(process.execPath,['-e',"process.on('SIGTERM',()=>process.exit(0));console.log('ready');setInterval(()=>{},1000)"],{timeout:500}),e=>e.code==='TIMEOUT'&&e.details.stdout.includes('ready'));
  assert.equal((await run(process.execPath,['-e',"console.log('normal')"])).trim(),'normal');
});
test('a child ignoring SIGTERM is killed and reported as timed out',async()=>{
  const started=Date.now();await assert.rejects(run(process.execPath,['-e',"process.on('SIGTERM',()=>{});console.log('ready');setInterval(()=>{},1000)"],{timeout:500,killGrace:100}),e=>e.code==='TIMEOUT'&&e.details.stdout.includes('ready'));assert.ok(Date.now()-started<5000);
});
test('abort cancels a running command even if its handler exits zero',async()=>{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),500);
  try{await assert.rejects(run(process.execPath,['-e',"process.on('SIGTERM',()=>process.exit(0));setInterval(()=>{},1000)"],{signal:controller.signal}),codeIs('INTERRUPTED'));}finally{clearTimeout(timer);}
});
test('a stalled capture times out and an interrupt releases the project lock',async()=>{
  const page={evaluate:()=>new Promise(()=>{})};
  await assert.rejects(capture(page,0,'jpeg',undefined,{timeout:30}),codeIs('TIMEOUT'));
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'explainer-lock-'));
  try{const timer=setTimeout(()=>{cancellation.requested=true;},30);
    try{await assert.rejects(withLock(dir,()=>capture(page,0)),codeIs('INTERRUPTED'));}finally{clearTimeout(timer);cancellation.requested=false;}
    await assert.rejects(fs.access(path.join(dir,'build/.lock')));assert.equal(await withLock(dir,async()=>42),42);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
async function stalledEncoder(action){
  const child=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});console.log('ready');setInterval(()=>{},1000)"],{stdio:['pipe','pipe','pipe']});
  child.stdin.on('error',()=>{});const completion=new Promise(resolve=>child.on('close',resolve));
  try{await once(child.stdout,'data');await action(child,completion);}finally{await stopEncoder(child,completion,{grace:30});}
  assert.equal(child.signalCode,'SIGKILL');
}
test('stalled encoder input has a deadline and removes listeners',()=>stalledEncoder(async child=>{
  assert.equal(child.stdin.write(Buffer.alloc(4*1024*1024)),false);
  const before=child.stdin.listenerCount('error');await assert.rejects(waitForDrain(child,{timeout:30}),codeIs('TIMEOUT'));
  assert.equal(child.stdin.listenerCount('drain'),0);assert.equal(child.stdin.listenerCount('error'),before);
}));
test('interrupt wakes encoder backpressure and completion waits',()=>stalledEncoder(async(child,completion)=>{
  child.stdin.write(Buffer.alloc(4*1024*1024));const c=new AbortController(),timer=setTimeout(()=>c.abort(),30);
  try{await assert.rejects(waitForDrain(child,{signal:c.signal}),codeIs('INTERRUPTED'));await assert.rejects(bounded(()=>completion,{signal:c.signal,label:'Encoder completion'}),codeIs('INTERRUPTED'));}finally{clearTimeout(timer);}
}));
test('encoder completion cannot wait indefinitely',()=>stalledEncoder(async(_,completion)=>{
  await assert.rejects(bounded(()=>completion,{timeout:30,label:'Encoder completion'}),codeIs('TIMEOUT'));
}));
test('browser discovery rejects missing paths, directories and non-executables',async()=>{
  const original=process.env.EXPLAINER_BROWSER_PATH,dir=await fs.mkdtemp(path.join(os.tmpdir(),'explainer-browser-'));
  try{
    for(const candidate of [path.join(dir,'missing'),dir]){process.env.EXPLAINER_BROWSER_PATH=candidate;await assert.rejects(browserOptions(),codeIs('BROWSER_NOT_READY'));}
    const file=path.join(dir,'plain');await fs.writeFile(file,'plain');await fs.chmod(file,0o600);
    if(process.platform!=='win32'){process.env.EXPLAINER_BROWSER_PATH=file;await assert.rejects(browserOptions(),codeIs('BROWSER_NOT_READY'));}
    process.env.EXPLAINER_BROWSER_PATH=process.execPath;assert.equal((await browserOptions()).executablePath,process.execPath);
  }finally{if(original===undefined)delete process.env.EXPLAINER_BROWSER_PATH;else process.env.EXPLAINER_BROWSER_PATH=original;await fs.rm(dir,{recursive:true,force:true});}
});
