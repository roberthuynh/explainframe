import test from 'node:test';
import assert from 'node:assert/strict';
import {jobMeasurement,renderToolchainKey} from '../../src/engine/measurement.mjs';
test('job receipts retain wall times and measure monotonic success and failure durations',async()=>{
 let tick=10,wall=0;const m=jobMeasurement('render',{now:()=>tick,date:()=>`wall-${wall++}`});
 assert.equal(await m.measure('prepare',async()=>{tick+=25;return 42;}),42);
 await assert.rejects(m.measure('encode',async()=>{tick+=50;throw Object.assign(new Error('stopped'),{code:'INTERRUPTED'});}),/stopped/);
 m.cache.speechReused=2;const r=m.snapshot('failed');
 assert.equal(r.started,'wall-0');assert.equal(r.finished,'wall-5');assert.equal(r.elapsedMs,75);
 assert.deepEqual(r.stages.map(s=>[s.name,s.status,s.elapsedMs]),[['prepare','complete',25],['encode','failed',50]]);
 assert.equal(r.stages[1].code,'INTERRUPTED');assert.equal(r.cache.speechReused,2);
});
test('render cache invalidates on tool versions and refuses unknown versions',()=>{
 const t={ffmpeg:'ffmpeg 1',browser:{version:'Chrome 1'},platform:'linux',arch:'arm64'};
 assert.equal(renderToolchainKey(t),renderToolchainKey(structuredClone(t)));
 for(const changed of [{...t,ffmpeg:'ffmpeg 2'},{...t,browser:{version:'Chrome 2'}},{...t,arch:'x64'},{...t,platform:'darwin'}])assert.notEqual(renderToolchainKey(t),renderToolchainKey(changed));
 assert.equal(renderToolchainKey({...t,ffmpeg:null}),null);assert.equal(renderToolchainKey({...t,browser:{version:null}}),null);
});
