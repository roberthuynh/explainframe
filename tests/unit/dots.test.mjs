import test from 'node:test';
import assert from 'node:assert/strict';
import {frame} from '../../src/player/scene.mjs';

for(const [format,width,height] of [['landscape',1920,1080],['portrait',1080,1920],['square',1080,1080],['feed',1080,1350]]){
  test(`dots labels clear every chord and the instruction in ${format}`,()=>{
    const points=[];
    const ctx=new Proxy({measureText:s=>({width:String(s).length*14}),arc:(x,y)=>points.push([x,y])},{get:(target,key)=>key in target?target[key]:()=>{}});
    const scene={id:'dots',start:0,end:5,duration:5,title:'Six dots',words:[],visual:{type:'dots',count:6,edges:[[0,1],[1,3],[3,0]],text:'Choose any 3 of the 6 dots.'}};
    const result=frame({width,height,getContext:()=>ctx},{duration:5,style:'paper',caption:{mode:'none'},scenes:[scene]},4,{format});
    const labels=result.audit.filter(a=>a.kind==='dot-label'),instruction=result.audit.find(a=>a.kind==='dot-caption');
    const cx=points.reduce((s,p)=>s+p[0],0)/6,cy=points.reduce((s,p)=>s+p[1],0)/6;
    assert.equal(labels.length,6);
    labels.forEach((label,i)=>{
      const [x,y]=points[i],dx=x-cx,dy=y-cy;
      // Every label corner lies outside its vertex's tangent half-plane;
      // every connecting chord lies inside, including a fully connected graph.
      for(const lx of [label.x,label.x+label.width])for(const ly of [label.y,label.y+label.height]){
        assert.ok((lx-x)*dx+(ly-y)*dy>0,`label ${i+1} enters the polygon`);
      }
      assert.ok(label.y+label.height+20<instruction.y,`label ${i+1} crowds the instruction`);
      assert.equal(label.outside,false);
    });
  });
}
