import test from 'node:test';
import assert from 'node:assert/strict';
import {containedCanvasScale,inspectAudit} from '../../src/player/visual-checks.mjs';
test('phone size uses contained bitmap rather than letterboxed canvas width',()=>{
 const bitmap={width:1080,height:1920},box={width:374,height:605.796875};
 const scale=containedCanvasScale(bitmap,box);
 assert.equal(scale,605.796875/1920);
 const box44={text:'Key',fontSize:44,x:0,y:0,width:100,height:44,kind:'key'};
 assert.equal(inspectAudit([box44],{displayScale:scale})[0].kind,'small-text');
 assert.deepEqual(inspectAudit([{...box44,fontSize:46}],{displayScale:scale}),[]);
 assert.equal(containedCanvasScale(bitmap,{width:216,height:500}),.2);
 assert.throws(()=>containedCanvasScale(bitmap,{width:0,height:500}));
});
