import {matvec,between} from '../../../src/player/operations.mjs';
export const INPUT=[1,1], CHANGED=[1,2];
// Fit all declared inputs and endpoints once, never rescale during a transformation.
export function domain(){
 const points=[[0,0],[1,0],[0,1],[1,1],INPUT,CHANGED,matvec([[1,1],[0,1]],INPUT),matvec([[1,1],[0,1]],CHANGED)];
 if(points.some(p=>p.length!==2||p.some(v=>!Number.isFinite(v)||Math.abs(v)>20)))throw new Error('This teaching grid supports two coordinates within ±20; revise and verify the layout for a wider domain');
 return {xmin:Math.floor(Math.min(...points.map(p=>p[0])))-.5,xmax:Math.ceil(Math.max(...points.map(p=>p[0])))+.5,ymin:Math.floor(Math.min(...points.map(p=>p[1])))-.5,ymax:Math.ceil(Math.max(...points.map(p=>p[1])))+.5};
}
export function stateAt(id,time,cue){
 const input=['predict','apply'].includes(id)?CHANGED:INPUT;
 const amount=['basis','predict'].includes(id)?0:between(time,cue,id==='shear'?'Shear':'Apply',id==='shear'?'lands':'result');
 const matrix=[[1,amount],[0,1]],output=matvec(matrix,input);
 return {matrix,presentationMatrix:id==='predict'?[[1,1],[0,1]]:matrix,input,output,amount,basis:[matvec(matrix,[1,0]),matvec(matrix,[0,1])]};
}
export function render({ctx,body,palette,text,line,time,cue,scene,audit,width,height}){
 const s=stateAt(scene.id,time,cue),{x,y,w}=body,stack=height/width>.8,h=height*.74-y,f=50,fmt=n=>Number(n.toFixed(2)).toString();
 const ex=stack?x:x+w*.59,ew=stack?w:w*.41;
 text(s.amount===0?'Start: ('+s.input.join(', ')+')':s.amount===1?'Result: ('+s.output.join(', ')+')':'Applying the shear',ex,y,f,{weight:700,maxWidth:ew,label:'math-result'});
 const my=y+70,mx=ex+80,cell=58;
 text('A',ex,my+26,f,{maxWidth:70,label:'matrix-name'});
 for(let r=0;r<2;r++)for(let c=0;c<2;c++)text(fmt(s.presentationMatrix[r][c]),mx+cell*(c*2+.9),my+cell*r,f,{align:'center',maxWidth:cell*1.8,color:c===0?palette.accent:palette.positive,label:'matrix-entry'});
 for(const [xx,side]of [[mx,1],[mx+cell*4,-1]]){line(xx+side*8,my,xx,my,palette.ink,2);line(xx,my,xx,my+cell*2,palette.ink,2);line(xx,my+cell*2,xx+side*8,my+cell*2,palette.ink,2);}
 text(scene.id==='predict'?'Target shear.\nGrid stays at the start.':'Columns tell us\nwhere one step lands.',stack?ex+w*.42:ex,stack?my:my+150,f,{maxWidth:stack?w*.58:ew,color:palette.muted,label:'matrix-meaning'});
 const gx=x,gy=stack?y+220:y,gw=stack?w:w*.53,gh=stack?h-355:h-140;
 const d=domain(),unit=Math.min(gw/(d.xmax-d.xmin),gh/(d.ymax-d.ymin)),ox=gx+(gw-unit*(d.xmax-d.xmin))/2-d.xmin*unit,oy=gy+(gh-unit*(d.ymax-d.ymin))/2+d.ymax*unit;
 const pt=([a,b])=>[ox+a*unit,oy-b*unit];
 ctx.save();ctx.beginPath();ctx.rect(gx,gy,gw,gh);ctx.clip();
 const extent=Math.ceil(Math.max(...Object.values(d).map(Math.abs)))*2;
 for(let k=-extent;k<=extent;k++){
  line(...pt([k,-extent]),...pt([k,extent]),palette.line,1);line(...pt([-extent,k]),...pt([extent,k]),palette.line,1);
  ctx.globalAlpha=.34;line(...pt(matvec(s.matrix,[k,-extent])),...pt(matvec(s.matrix,[k,extent])),palette.primary,1.5);line(...pt(matvec(s.matrix,[-extent,k])),...pt(matvec(s.matrix,[extent,k])),palette.primary,1.5);ctx.globalAlpha=1;
 }
 line(...pt([d.xmin,0]),...pt([d.xmax,0]),palette.muted,2);line(...pt([0,d.ymin]),...pt([0,d.ymax]),palette.muted,2);ctx.restore();
 function arrow(a,b,color,dash=false){const p=pt(a),q=pt(b);ctx.save();if(dash)ctx.setLineDash([7,6]);line(...p,...q,color,dash?4:6);ctx.setLineDash([]);const angle=Math.atan2(q[1]-p[1],q[0]-p[0]),r=12;for(const d of [-.5,.5])line(q[0],q[1],q[0]-r*Math.cos(angle+d),q[1]-r*Math.sin(angle+d),color,4);ctx.restore();}
 if(s.amount>0){ctx.save();ctx.globalAlpha=.35;arrow([0,0],s.input,palette.ink,true);ctx.restore();}
 const e1=s.basis[0],e2=s.basis[1],first=e1.map(n=>n*s.input[0]);
 for(const [base,basis,count,color]of [[[0,0],e1,s.input[0],palette.accent],[first,e2,s.input[1],palette.positive]]){
  if(Number.isInteger(count)){for(let k=0;k<Math.abs(count);k++){const sign=Math.sign(count);arrow(base.map((v,j)=>v+k*sign*basis[j]),base.map((v,j)=>v+(k+1)*sign*basis[j]),color,true);}}
  else arrow(base,base.map((v,j)=>v+count*basis[j]),color,true);
 }
 arrow([0,0],e1,palette.accent);arrow([0,0],e2,palette.positive);arrow([0,0],s.output,palette.primary);
 const ly=y+h-112;
 text('Right step: ('+e1.map(fmt).join(',')+') × '+s.input[0],x,ly,f,{color:palette.accent,maxWidth:w,label:'basis-key'});
 text('Up step: ('+e2.map(fmt).join(',')+') × '+s.input[1],x,ly+60,f,{color:palette.positive,maxWidth:w,label:'basis-key'});
 audit.push({kind:'geometry-proof',...s,unit,plot:{x:gx,y:gy,w:gw,h:gh},domain:d,origin:[ox,oy],tip:pt(s.output),outside:false});
}
