import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {matvec,softmax,attention,between,lerp} from '../../src/player/operations.mjs';
import {ROOT,run} from '../../src/engine/core.mjs';
import {stateAt as geometry} from '../../examples/linear-transformation/scenes/lesson.mjs';
import {stateAt as flow,KEYS,VALUES} from '../../examples/attention-dataflow/scenes/lesson.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('matrix operations preserve linear combinations, reject ragged/mismatched and nonfinite inputs',()=>{
 assert.deepEqual(matvec([[1,1],[0,1]],[2,3]),[5,3]);assert.deepEqual(matvec([[0,-1],[1,0]],[2,3]),[-3,2]);
 for(const [m,v]of [[[],[1]],[[[1],[2,3]],[1]],[[[1,2]],[1]],[[[Infinity]],[1]],[[[1]],[NaN]]])assert.throws(()=>matvec(m,v));
 assert.throws(()=>matvec([[Number.MAX_VALUE]],[2]),/overflow/);
});
test('stable softmax and attention agree with independent analytic endpoints and changed case',()=>{
 const expected=1/(1+Math.exp(-Math.sqrt(2))),a=attention([2,0],KEYS,VALUES),b=attention([0,2],KEYS,VALUES);
 close(a.weights[0],expected);close(a.output[0],2*expected);close(a.output[1],4*(1-expected));close(b.weights[1],expected);
 assert.deepEqual(attention([0,0],KEYS,VALUES).output,[1,2]);assert.deepEqual(softmax([1000,1000]),[.5,.5]);
 const shifted=softmax([1001,1000]),plain=softmax([1,0]);shifted.forEach((v,i)=>close(v,plain[i]));
 for(const args of [[[1],KEYS,VALUES],[[1,2],KEYS,[[1,2]]],[[1,2],KEYS,[[1],[1,2]]]])assert.throws(()=>attention(...args),/dimension|rectangular/);
 for(const bad of [[],[NaN],[Infinity]])assert.throws(()=>softmax(bad));
});
test('all intermediate proof states obey the math; seeking has no history',()=>{
 const cue=word=>['Shear','Apply','Switch','Compare','Softmax','Multiply'].includes(word)?2:5;
 for(let i=0;i<=400;i++){
  const t=i/50,g=geometry('apply',t,cue);close(g.output[0],1+2*g.amount);close(g.output[1],2);
  g.output.forEach((v,j)=>close(v,g.input[0]*g.basis[0][j]+g.input[1]*g.basis[1][j]));
  const s=flow('change',t,cue),expected=1/(1+Math.exp((s.query[1]-s.query[0])/Math.sqrt(2)));
  close(s.weights[0],expected);close(s.weights.reduce((a,b)=>a+b),1);close(s.output[0]/2+s.output[1]/4,1);assert.ok(s.weights.every(w=>w>0&&w<1));
 }
 const first=flow('change',3,cue);flow('change',8,cue);flow('change',0,cue);assert.deepEqual(flow('change',3,cue),first);
});
test('cue intervals clamp, resolve occurrence selectors and reject invalid endpoints',()=>{
 const cue=(word,options)=>word==='a'?(options?.occurrence??0):4;
 assert.equal(between(-1,cue,'a','b'),0);assert.equal(between(8,cue,'a','b'),1);assert.equal(between(3,cue,{word:'a',occurrence:2},'b'),.5);
 assert.throws(()=>between(1,()=>1,'a','b'),/increasing/);assert.throws(()=>between(NaN,cue,'a','b'));
 assert.throws(()=>lerp(0,1,2));
});
test('technical templates can move outside the kit and retain readable reusable operations',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'explainer-proofs-'));
 try{for(const template of ['geometry','attention','cache']){
  const dir=path.join(temp,template);await run(process.execPath,[path.join(ROOT,'bin/explain.mjs'),'new','--path',dir,'--template',template]);
  const code=await fs.readFile(path.join(dir,'scenes/lesson.mjs'),'utf8');assert.ok(code.includes('function stateAt'));assert.ok(code.split('\n').length>100);assert.ok(!code.includes(ROOT));
  const module=await import(pathToFileURL(path.join(dir,'scenes/lesson.mjs')));assert.equal(typeof module.render,'function');
  assert.ok((await fs.readFile(path.join(dir,'direction.md'),'utf8')).includes('Learning question'));
 }}finally{await fs.rm(temp,{recursive:true,force:true});}
});

test('portable modules keep legal notices and reject imports outside the project and kit',async()=>{
 const {portableModule}=await import('../../src/engine/custom.mjs'),temp=await fs.mkdtemp(path.join(os.tmpdir(),'explainer-module-'));
 try{const dir=path.join(temp,'job');await fs.mkdir(dir);await fs.writeFile(path.join(dir,'scene.mjs'),'/*! Copyright Example Author; MIT */\nexport function render(){}');const code=await portableModule(dir,'scene.mjs');assert.ok(code.includes('Copyright Example Author'));
 await fs.writeFile(path.join(temp,'outside.mjs'),'export const value=1;');await fs.writeFile(path.join(dir,'scene.mjs'),"import {value} from '../outside.mjs';export function render(){return value;}");await assert.rejects(portableModule(dir,'scene.mjs'),/escapes/);
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});
test('browser cleanup remains bounded and cannot replace the primary failure',async()=>{
 const {closeBrowser}=await import('../../src/engine/render.mjs');const primary=new Error('Bad frame');
 await closeBrowser({close:()=>Promise.reject(new Error('Close failed'))},primary);assert.equal(primary.message,'Bad frame');assert.equal(primary.details.cleanup.message,'Close failed');
 await assert.rejects(closeBrowser({close:()=>new Promise(()=>{})},null,{timeout:5}),/cleanup timed out/);
 const interrupted=new Error('Render interrupted');await closeBrowser({close:()=>new Promise(()=>{})},interrupted,{timeout:5});assert.equal(interrupted.details.cleanup.code,'TIMEOUT');
});
