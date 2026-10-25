import {matvec,attention} from '../../../src/player/operations.mjs';
// One layer, one head. Inputs already include fixed position information.
export const INPUTS=[[1,0],[0,2],[1,1],[2,1]];
export const WQ=[[1,.5],[-.5,1]],WK=[[.5,1],[1,.25]],WV=[[1,2],[-1,1]];
export function append(cache,input){
 const key=matvec(WK,input),value=matvec(WV,input),keys=[...cache.keys,key],values=[...cache.values,value],query=matvec(WQ,input);
 return {keys,values,query,...attention(query,keys,values)};
}
export function build(inputs=INPUTS){return inputs.reduce((cache,input)=>append(cache,input),{keys:[],values:[]});}
export function changedCase(){
 const original=build(),changed=INPUTS.map(v=>[...v]);changed[0]=[3,0];
 const query=matvec(WQ,changed.at(-1)),stale=attention(query,original.keys,original.values),rebuilt=build(changed);
 return {original,changed,stale,rebuilt};
}
export function fullPrefix(inputs=INPUTS){
 const keys=inputs.map(v=>matvec(WK,v)),values=inputs.map(v=>matvec(WV,v)),query=matvec(WQ,inputs.at(-1));
 return {keys,values,query,...attention(query,keys,values)};
}
export function validateRecipe({inputs=INPUTS,wq=WQ,wk=WK,wv=WV}={}){
 const vector=v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite);
 if(!Array.isArray(inputs)||inputs.length!==4||!inputs.every(vector)||![wq,wk,wv].every(m=>Array.isArray(m)&&m.length===2&&m.every(vector)))throw new Error('This recipe needs four finite two-component inputs and 2×2 projection matrices; revise layout, script and tests for other dimensions');
 if(inputs[0][0]===3&&inputs[0][1]===0)throw new Error('Changed prefix must differ from the original input');
}
