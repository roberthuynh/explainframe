import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import {ROOT,normalizeProject} from '../../src/engine/core.mjs';
import {frame} from '../../src/player/scene.mjs';
function canvas(){const ctx=new Proxy({measureText:v=>({width:String(v).length*18})},{get:(t,k)=>k in t?t[k]:(()=>{})});return {width:1080,height:1920,getContext:()=>ctx};}
const words=Array.from({length:7},(_,i)=>({text:'word'+(i+1),start:i/10,end:(i+1)/10}));
function manifest(ws=words){return {duration:2,style:'paper',caption:{mode:'karaoke',maxWords:6,safeBottom:.1},scenes:[{id:'start',title:'Boundary',start:0,end:2,duration:2,words:ws,visual:{type:'statement',text:'Boundary'}}]};}
const captions=(m,t)=>frame(canvas(),m,t).audit.filter(a=>a.kind==='caption');
test('every short spoken word survives phrase boundaries in all caption modes',()=>{
  for(const mode of ['karaoke','pop','plain']){const m=manifest();m.caption.mode=mode;for(const w of words)assert.deepEqual(captions(m,(w.start+w.end)/2).filter(a=>a.active).map(a=>a.text),[w.text]);assert.deepEqual(captions(m,.6).filter(a=>a.active).map(a=>a.text),['word7']);}
});
test('punctuation boundaries yield to speech and trailing holds only cover real gaps',()=>{
  const ws=[{text:'End.',start:0,end:.1},{text:'Next',start:.12,end:.2},{text:'Later',start:.6,end:.7}],m=manifest(ws);
  assert.deepEqual(captions(m,.11).map(a=>a.text),['End.']);assert.deepEqual(captions(m,.15).filter(a=>a.active).map(a=>a.text),['Next']);
  const gap=manifest([{text:'End.',start:0,end:.1},{text:'Later',start:.6,end:.7}]);assert.equal(captions(gap,.3).length,0);
});
test('stacked bars preserve supplied currency and do not invent revenue units',()=>{
  for(const prefix of ['', '$']){const m=manifest();m.scenes[0].visual={type:'stacked-bars',prefix,items:[{label:prefix?'Sales':'Participants',segments:[{label:'A',value:30},{label:'B',value:70}]}]};const labels=frame(canvas(),m,.5).audit.filter(a=>a.kind==='stack-label').map(a=>a.text);assert.deepEqual(labels,[`${prefix?'Sales':'Participants'} · ${prefix}100`]);}
});
test('published schema governs runtime shape validation; semantic references are checked afterward',async()=>{
  const schema=JSON.parse(await fs.readFile(path.join(ROOT,'schemas/project.schema.json'),'utf8')),validate=new Ajv2020({strict:false}).compile(schema);
  const raw={schemaVersion:1,title:'Categories',scenes:[{id:'start',title:'Start',narration:'Compare.',visual:{type:'bars',items:[{label:'A',value:10}]}}]};
  const valid=[raw,{schemaVersion:1,title:'Minimal',scenes:[{id:'start',title:'Start',narration:'Explain.'}]}];
  for(const p of valid){assert.equal(validate(p),true);assert.doesNotThrow(()=>normalizeProject(p));}
  const mutations=[p=>delete p.scenes[0].visual.items[0].label,p=>p.scenes[0].visual.items[0].label=9,p=>p.scenes[0].visual.items[0].value='10',p=>p.scenes[0].visual.items[0].value=-1,p=>p.scenes[0].visual.prefix=2,p=>p.formats=Array(5).fill('portrait'),p=>p.scenes[0].audio=42,p=>p.claims=[{id:'x',text:'Claim'}]];
  for(const mutate of mutations){const p=structuredClone(raw);mutate(p);assert.equal(validate(p),false);assert.throws(()=>normalizeProject(p),e=>e.code==='INVALID_PROJECT');}
  const semantic=structuredClone(raw);semantic.scenes[0].claims=['missing'];assert.equal(validate(semantic),true);assert.throws(()=>normalizeProject(semantic),e=>e.code==='INVALID_PROJECT');
});
