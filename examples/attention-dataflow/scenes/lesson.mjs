import {attention,between,lerp} from '../../../src/player/operations.mjs';
export const KEYS=[[1,0],[0,1]],VALUES=[[2,0],[0,4]],QUERY=[2,0],CHANGED=[0,2];
const sceneQuery=(id,p)=>id==='predict'?[...CHANGED]:QUERY.map((v,i)=>lerp(v,CHANGED[i],p));
export function stateAt(id,time,cue){
 if(KEYS.length!==2||VALUES.length!==2||[...KEYS,...VALUES,QUERY,CHANGED].some(v=>v.length!==2))throw new Error('This recipe supports two positions and two components. Revise its layout for other dimensions.');
 const change=id==='change'?between(time,cue,'Switch','Recompute'):0;
 const query=sceneQuery(id,change),result=attention(query,KEYS,VALUES);
 const scoreReveal=id==='inputs'?0:id==='scores'?between(time,cue,'Compare','Scale'):1;
 const weightReveal=['inputs','scores','predict'].includes(id)?0:id==='normalize'?between(time,cue,'Softmax','weights'):1;
 const mixReveal=['inputs','scores','normalize','predict'].includes(id)?0:id==='mix'?between(time,cue,'Multiply','add'):1;
 return {...result,query,change,scoreReveal,weightReveal,mixReveal};
}
export function render({ctx,body,palette,text,card,time,cue,scene,audit,width,height}){
 const s=stateAt(scene.id,time,cue),{x,y,w}=body,stack=height/width>.8,f=50,gap=16;
 const fmt=n=>Number(n.toFixed(2)).toString(),vec=v=>'('+v.map(fmt).join(', ')+')',colors=[palette.primary,palette.positive];
 const cw=stack?w:(w-gap)/2,ch=stack?144:290,cy=y+64,barWidths=[],barScale=cw-40;
 text('Query '+vec(s.query),x,y,f,{weight:700,maxWidth:w,label:'query'});
 for(let i=0;i<2;i++){
  const cx=x+(stack?0:i*(cw+gap)),ty=cy+(stack?i*(ch+gap):0),tx=cx+20,tw=cw-40;
  card(cx,ty,cw,ch);text('Position '+(i+1)+(s.mixReveal>0?' · weight ≈ '+fmt(s.weights[i]):''),tx,ty+12,f,{weight:700,color:colors[i],maxWidth:tw,label:'position'});
  let rows;
  if(['inputs','predict'].includes(scene.id))rows=['Key '+vec(KEYS[i]),'Value '+vec(VALUES[i])];
  else if(scene.id==='scores'){
   const products=s.query.map((q,j)=>fmt(q)+'×'+fmt(KEYS[i][j])).join(' + '),dot=s.query.reduce((n,q,j)=>n+q*KEYS[i][j],0);
   rows=[products+' = '+fmt(dot),s.scoreReveal===1?fmt(dot)+' / √'+s.query.length+' ≈ '+fmt(s.scores[i]):'Then divide by √'+s.query.length];
  }else if(scene.id==='normalize'){
   // Shifted exponentials are numerically stable; displayed unshifted ratios are equivalent for these bounded toy inputs.
   const max=Math.max(...s.scores),raw=s.scores.map(v=>Math.exp(v)),rawSum=raw.reduce((a,b)=>a+b);
   if(!Number.isFinite(rawSum)||max>10)throw new Error('Normalization display supports toy scores up to 10; revise notation for larger inputs');
   rows=['exp('+fmt(s.scores[i])+') ≈ '+fmt(raw[i]),fmt(raw[i])+' / '+fmt(rawSum)+' ≈ '+fmt(s.weights[i])];
  }else rows=['Value '+vec(VALUES[i]),'→ '+vec(VALUES[i].map(v=>v*s.weights[i]))];
  rows.forEach((row,j)=>text(row,tx+(stack&&j===1?tw*.49:0),ty+(stack?70:83+j*66),f,{maxWidth:stack?tw*.48:tw,label:j===0?'operand':'operation'}));
  const by=ty+ch-18,bw=barScale*s.weights[i]*s.weightReveal;barWidths.push(bw);
  if(s.weightReveal>0){ctx.fillStyle=palette.line;ctx.fillRect(tx,by,barScale,8);ctx.fillStyle=colors[i];ctx.fillRect(tx,by,bw,8);}
 }
 const oy=cy+(stack?2*ch+gap:ch)+16;
 if(s.mixReveal>0){
  // Two component bars use one fixed signed scale. The weighted lengths, not moving dots, encode contributions.
  const scale=w/24;
  for(let j=0;j<2;j++){
   const yy=oy,base=x+j*w*.5+90;let offset=0;
   text('y'+(j+1),x+j*w*.5,yy,f,{maxWidth:80,label:'component'});
   for(let i=0;i<2;i++){const amount=VALUES[i][j]*s.weights[i]*s.mixReveal,len=amount*scale;ctx.fillStyle=colors[i];ctx.fillRect(base+Math.min(offset,offset+len),yy+8,Math.abs(len),36);offset+=len;}
  }
 }
 const outY=oy+(s.mixReveal>0?64:8);
 const output=s.mixReveal===1?'Output ≈ ('+s.output.map(v=>v.toFixed(2)).join(', ')+')':scene.id==='predict'?'Think, then continue…':scene.id==='normalize'?'Both shares add to 1.':'Matching comes before mixing.';
 text(output,x,outY,f,{weight:700,maxWidth:w,label:'attention-output'});
 audit.push({kind:'attention-proof',...s,keys:KEYS,values:VALUES,barWidths,barScale,contributions:VALUES.map((v,i)=>v.map(n=>n*s.weights[i]*s.mixReveal)),outside:false});
}
