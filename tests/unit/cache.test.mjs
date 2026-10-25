import test from 'node:test';
import assert from 'node:assert/strict';
import {attention,maskedSoftmax} from '../../src/player/operations.mjs';
import {inspectAudit,predictionHolds} from '../../src/player/visual-checks.mjs';
import {INPUTS,WQ,WK,WV,append,build,changedCase,validateRecipe} from '../../examples/kv-cache/scenes/model.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
// Independent full-prefix calculation: no operations.mjs or cache implementation.
function reference(inputs){
 const project=(m,v)=>m.map(row=>{let n=0;for(let j=0;j<v.length;j++)n+=row[j]*v[j];return n;});
 const q=project(WQ,inputs.at(-1)),keys=inputs.map(v=>project(WK,v)),values=inputs.map(v=>project(WV,v));
 const exps=keys.map(k=>Math.exp((q[0]*k[0]+q[1]*k[1])/Math.sqrt(2))),den=exps.reduce((a,b)=>a+b);
 return [0,1].map(j=>values.reduce((n,v,i)=>n+v[j]*exps[i]/den,0));
}
test('append cache matches separate full-prefix reference and leaves prior pairs unchanged',()=>{
 let cache={keys:[],values:[]};
 for(let n=1;n<=INPUTS.length;n++){
  const saved=JSON.stringify(cache),next=append(cache,INPUTS[n-1]);assert.equal(JSON.stringify(cache),saved);assert.equal(next.keys.length,n);
  assert.deepEqual(next.keys.slice(0,-1),cache.keys);assert.deepEqual(next.values.slice(0,-1),cache.values);
  next.output.forEach((v,j)=>near(v,reference(INPUTS.slice(0,n))[j]));near(next.weights.reduce((a,b)=>a+b),1);cache=next;
 }
});
test('mask excludes future before normalization, rejects invalid masks, is stable for extreme scores',()=>{
 assert.deepEqual(maskedSoftmax([1,1,1000],[true,true,false]),[.5,.5,0]);
 for(const mask of [[false,false],[true],[1,true],null])assert.throws(()=>maskedSoftmax([1,2],mask),/Mask/);
 const a=build(INPUTS.slice(0,3)),all=build(),masked=attention(a.query,all.keys,all.values,{mask:[true,true,true,false]});
 assert.equal(masked.weights[3],0);masked.output.forEach((v,i)=>near(v,a.output[i]));
 const values=all.values.map(v=>[...v]);values[3]=[1e6,-1e6];attention(a.query,all.keys,values,{mask:[true,true,true,false]}).output.forEach((v,i)=>near(v,a.output[i]));
});
test('changed prefix makes stale reuse wrong; rebuilt result matches independent reference',()=>{
 const {changed,stale,rebuilt}=changedCase();assert.ok(stale.output.some((v,i)=>Math.abs(v-rebuilt.output[i])>.01));rebuilt.output.forEach((v,i)=>near(v,reference(changed)[i]));
});
test('shared layout audit catches overlap, small displayed text and overflow independently',()=>{
 const box={kind:'label',text:'a',x:0,y:0,width:40,height:20,fontSize:20};
 assert.deepEqual(inspectAudit([box]),[]);assert.equal(inspectAudit([box],{displayScale:.5})[0].kind,'small-text');assert.equal(inspectAudit([box,{...box,text:'b',x:20}])[0].kind,'text-overlap');assert.equal(inspectAudit([{...box,outside:true}])[0].kind,'overflow');
});

test('recipe rejects incompatible projection shapes and unchanged counterexample',()=>{
 assert.doesNotThrow(()=>validateRecipe());
 for(const name of ['wq','wk','wv'])assert.throws(()=>validateRecipe({[name]:[[1,0],[0,1],[1,1]]}),/2×2/);
 assert.throws(()=>validateRecipe({inputs:[[3,0],...INPUTS.slice(1)]}),/differ/);
});

test('prediction holds use semantic phase rather than requiring a particular scene ID',()=>{
 const checks=predictionHolds({scenes:[{id:'future',learningPhase:'predict',duration:7,audioDuration:5},{id:'explain',duration:7,audioDuration:5}]});
 assert.deepEqual(checks,[{scene:'future',silentSeconds:2,pass:false}]);
});
