import {INPUTS,build,changedCase,fullPrefix,validateRecipe} from './model.mjs';
import {between,attention} from '../../../src/player/operations.mjs';
export function stateAt(id,time,cue){
 validateRecipe();
 const before=build(INPUTS.slice(0,-1)),after=build(),fresh=fullPrefix(),revision=changedCase();
 const reveal=id==='append'?between(time,cue,'Append','ready'):id==='repeat'?0:1;
 const repair=id==='invalidate'?between(time,cue,'Rebuild','matches'):0;
 const full=repair===1?revision.rebuilt:after;
 return {before,after,fresh,revision,reveal,repair,full,prediction:id==='predict'};
}
export function render({ctx,body,palette,text,card,line,time,cue,scene,audit,width,height}){
 const s=stateAt(scene.id,time,cue),{x,y,w}=body,f=48,stack=height/width>.8,fmt=n=>Number(n.toFixed(2)).toString(),vec=v=>'('+v.map(fmt).join(',')+')';
 const mode=scene.id,isMask=mode==='mask',isQuery=['mask','answer'].includes(mode),gap=10,cols=stack?1:4,cw=stack?w-60:(w-3*gap)/4,ch=stack?70:260,cy=y+(stack?64:100);
 const query=isMask?s.before.query:s.after.query;
 const title=isQuery?'Query '+(isMask?'3':'4')+' = '+vec(query):mode==='invalidate'?'Changed input 1: '+vec(INPUTS[0])+' → '+vec(s.revision.changed[0]):mode==='predict'?'Next query 4 = '+vec(s.after.query):'3 saved pairs + 1 new input';
 text(title,x,y,f,{weight:700,maxWidth:w,label:'cache-step'});
 const causal=attention(s.before.query,s.after.keys,s.after.values,{mask:s.after.keys.map((_,i)=>i<s.before.keys.length)}),weights=isMask?causal.weights:s.after.weights,slots=[];
 const scan=mode==='answer'?between(time,cue,'Recompute','blend'):1;
 for(let i=0;i<4;i++){
  const sx=x+(stack?60:i*(cw+gap)),sy=cy+(stack?i*(ch+gap):0),old=i<3,amount=old?1:s.reveal;
  const blocked=isMask&&i===3,changed=mode==='invalidate'&&i===0,color=changed||blocked?palette.accent:old?palette.primary:palette.positive;
  if(isQuery){
   const a=stack?[x+18,y+64]:[x+w/2,y+64],b=stack?[x+18,sy+ch/2]:[sx+cw/2,y+64],c=stack?[sx,sy+ch/2]:[sx+cw/2,sy];
   ctx.save();if(blocked)ctx.setLineDash([7,7]);ctx.globalAlpha=i/4<=scan?1:.2;line(...a,...b,color,3);line(...b,...c,color,3);ctx.restore();
   if(blocked){const xx=stack?x+40:c[0],yy=stack?c[1]:sy-10;line(xx-7,yy-7,xx+7,yy+7,color,4);line(xx-7,yy+7,xx+7,yy-7,color,4);}
  }
  card(sx,sy,cw,ch,{border:color});
  const label=(blocked?'× ':old?'✓ ':'+ ')+(i+1),keys=s.full.keys,values=s.full.values;
  text(stack?label:(blocked?'Blocked ':old?'Saved ':'New ')+(i+1),sx+12,sy+12,f,{weight:700,color,maxWidth:stack?90:cw-24,label:'cache-slot'});
  const dx=(1-amount)*18;
  text('K '+(amount>0?vec(keys[i]):'…'),sx+(stack?108:12)+dx,sy+(stack?12:74),stack?46:f,{color,maxWidth:stack?270:cw-24,label:'cache-key'});
  text('V '+(amount>0?vec(values[i]):'…'),sx+(stack?388:12)+dx,sy+(stack?12:136),stack?46:f,{color,maxWidth:stack?242:cw-24,label:'cache-value'});
  if(isQuery)text(blocked?'w = 0':'w ≈ '+fmt(weights[i]),sx+(stack?650:12),sy+(stack?12:198),stack?46:f,{color,maxWidth:stack?cw-662:cw-24,label:'cache-weight'});
  slots.push({x:sx,y:sy,key:keys[i],value:values[i],reused:old,reveal:amount,blocked,weight:isQuery?weights[i]:null});
 }
 const bottom=cy+(stack?4*ch+3*gap:ch)+18;
 let lines;
 if(mode==='repeat')lines=['Projection = matrix × input vector','Full recompute: 8. With cache: 2.'];
 else if(mode==='append')lines=['Append one K and one V.','✓ saved pair     + new pair'];
 else if(mode==='mask')lines=['Future weight = 0 before blending.','Allowed weights still sum to 1.'];
 else if(mode==='predict')lines=['Before: query 3 = '+vec(s.before.query),'Query 3 allows positions '+s.before.keys.map((_,i)=>i+1).join(', ')+'.','Query 4 allows positions '+s.after.keys.map((_,i)=>i+1).join(', ')+'.'];
 else if(mode==='answer')lines=['Cached output: '+vec(s.after.output),'Full recompute: '+vec(s.fresh.output)];
 else if(mode==='invalidate')lines=[s.repair===1?'Rebuilt: '+vec(s.revision.rebuilt.output):'Stale: '+vec(s.revision.stale.output),'Correct: '+vec(s.revision.rebuilt.output)];
 else lines=['4 positions × (2 key + 2 value numbers)','16 saved numbers; memory grows.'];
 lines.forEach((v,i)=>text(v,x,bottom+i*58,f,{weight:i===0?700:500,maxWidth:w,label:'cache-result'}));
 audit.push({kind:'cache-proof',...s,slots,causal,projections:{uncached:s.after.keys.length*2,append:2,totalUncached:s.after.keys.length*(s.after.keys.length+1),totalCached:s.after.keys.length*2},storedScalars:s.full.keys.flat().length+s.full.values.flat().length,outside:false});
}
