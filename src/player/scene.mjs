// Deterministic frame functions. Timing/easing conventions follow the MIT PDoom lineage.
export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const ease=t=>1-(1-clamp(t))**3;
export const PALETTES={
  paper:{bg:'#f8f6f2',card:'#ffffff',ink:'#1b1f24',muted:'#626c77',line:'#dddcd6',accent:'#9a6b12',primary:'#17305a',positive:'#247461'},
  ink:{bg:'#101c2d',card:'#17283c',ink:'#f2f5f8',muted:'#a7b6c9',line:'#34475b',accent:'#66dfd2',primary:'#a9c7ff',positive:'#9de4bd'},
  chalk:{bg:'#19332e',card:'#204039',ink:'#fff8e8',muted:'#c0d0c1',line:'#48675b',accent:'#f5c567',primary:'#b4ddca',positive:'#c3e3a0'},
};
function groups(words,max=6){const out=[];let b=[];for(const w of words){b.push(w);if(b.length>=max||/[.!?]$/.test(w.text)){out.push(b);b=[];}}if(b.length)out.push(b);return out;}
export function frame(canvas,manifest,time,{format='portrait',style=manifest.style,caption=manifest.caption,custom={}}={}){
  const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,portrait=H/W>1.1,ratio=H/W;
  const palette=PALETTES[style]??PALETTES.paper;
  let scene=manifest.scenes.find(s=>time>=s.start&&time<s.end)??(time<0?manifest.scenes[0]:manifest.scenes.at(-1));
  const t=clamp(time-scene.start,0,scene.duration),duration=scene.duration,progress=clamp(t/Math.max(.001,duration));
  const audit=[];ctx.clearRect(0,0,W,H);ctx.fillStyle=palette.bg;ctx.fillRect(0,0,W,H);
  const margin=W*.07,body={x:margin,y:H*(portrait?.22:.26),w:W-2*margin,h:H*(portrait?.43:.40)};
  function text(value,x,y,size=42,{color=palette.ink,weight=500,align='left',family='Figtree',maxWidth=W-2*margin,lineHeight=1.15,label='text'}={}){
    value=String(value??'');ctx.textAlign=align;ctx.textBaseline='top';ctx.fillStyle=color;
    const set=()=>ctx.font=`${weight} ${size}px "${family}"`;set();
    const wrap=()=>{const lines=[];for(const paragraph of value.split('\n')){let line='';for(const word of paragraph.split(/\s+/)){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}lines.push(line);}return lines;};
    let lines=wrap();while(size>16&&(lines.length*size*lineHeight>H*.23||lines.some(l=>ctx.measureText(l).width>maxWidth))){size-=2;set();lines=wrap();}
    lines.forEach((line,i)=>{const width=ctx.measureText(line).width;const xx=x-(align==='center'?width/2:align==='right'?width:0),yy=y+i*size*lineHeight;ctx.fillText(line,x,yy);audit.push({kind:label,text:line,x:xx,y:yy,width,height:size*lineHeight,fontSize:size,outside:xx<-.5||yy<-.5||xx+width>W+.5||yy+size*lineHeight>H+.5});});
    return lines.length*size*lineHeight;
  }
  function card(x,y,w,h,{fill=palette.card,border=palette.line}={}){ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(20,w*.04));ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=border;ctx.lineWidth=2;ctx.stroke();}
  function line(x1,y1,x2,y2,color=palette.primary,width=5){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function cue(needle,{occurrence,edge='start'}={}){const norm=s=>s.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');const hits=scene.words.filter(w=>w.id===needle||norm(w.text)===norm(needle));if(!hits.length)throw new Error(`Unresolved timing cue '${needle}' in ${scene.id}`);if(hits.length>1&&occurrence===undefined)throw new Error(`Ambiguous cue '${needle}': specify its zero-based occurrence`);const selected=hits[occurrence??0];if(!selected)throw new Error(`Cue occurrence missing: ${needle}`);return selected[edge];}
  text(scene.eyebrow??manifest.category??'EXPLAINED',margin,H*.055,portrait?25:24,{color:palette.muted,weight:650,label:'eyebrow'});
  const titleSize=portrait?68:76;
  text(scene.title,margin,H*.10,titleSize,{family:style==='paper'?'Newsreader':'Figtree',weight:style==='paper'?500:700,maxWidth:body.w,label:'title',lineHeight:1.06});
  const v=scene.visual,p=ease(t/.8),font=portrait?42:40;
  if(v.type==='image'){
    const image=window.sceneImages?.[scene.id];if(!image)throw new Error('Image not ready: '+scene.id);
    const scale=Math.min(body.w/image.width,body.h/image.height),w=image.width*scale,h=image.height*scale;
    card(body.x,body.y,body.w,body.h);ctx.drawImage(image,body.x+(body.w-w)/2,body.y+(body.h-h)/2,w,h);
  }else if(v.type==='custom'){
    if(!custom[scene.id])throw new Error(`Custom visual module missing for ${scene.id}`);
    custom[scene.id]({ctx,width:W,height:H,time:t,duration,progress,palette,body,portrait,text,card,line,audit,scene,cue});
  }else if(v.type==='statement'){
    card(body.x,body.y,body.w,body.h);
    const y=body.y+body.h*.24;
    if(v.value!==undefined)text(v.value,W/2,y,portrait?120:128,{align:'center',family:'Newsreader',color:palette.primary,weight:600,maxWidth:body.w*.85,label:'value'});
    text(v.text??scene.title,W/2,v.value!==undefined?body.y+body.h*.62:y,font+8,{align:'center',maxWidth:body.w*.82,label:'visual'});
  }else if(v.type==='compare'){
    const items=v.items??[],vertical=portrait;const gap=24,n=Math.max(1,items.length);
    items.forEach((item,i)=>{const w=vertical?body.w:(body.w-gap*(n-1))/n,h=vertical?(body.h-gap*(n-1))/n:body.h,x=body.x+(vertical?0:i*(w+gap)),y=body.y+(vertical?i*(h+gap):0);
      card(x,y,w,h);text(item.label,x+28,y+22,font*.7,{color:palette.muted,weight:650,maxWidth:w-56,label:'compare-label'});
      text(item.value??'',x+28,y+h*.27,vertical?70:92,{family:'Newsreader',weight:600,color:item.emphasis?palette.accent:palette.primary,maxWidth:w-56,label:'compare-value'});
      if(item.detail)text(item.detail,x+28,y+h*.68,font*.72,{maxWidth:w-56,color:palette.muted,label:'compare-detail'});
    });
  }else if(v.type==='steps'){
    const items=v.items??[],gap=18,n=Math.max(1,items.length),h=(body.h-gap*(n-1))/n;
    items.forEach((item,i)=>{const y=body.y+i*(h+gap);card(body.x,y,body.w,h);text(String(i+1).padStart(2,'0'),body.x+25,y+h*.25,font*.85,{color:palette.accent,weight:700,label:'step-number'});text(typeof item==='string'?item:item.text,body.x+100,y+h*.25,font*.90,{maxWidth:body.w-135,label:'step-text'});});
  }else if(v.type==='bars'){
    const items=v.items??[],max=Math.max(1,...items.map(i=>Math.abs(Number(i.value)))),n=Math.max(1,items.length),row=body.h/n;
    items.forEach((item,i)=>{const y=body.y+i*row;const labelW=body.w*(portrait?.38:.28);text(item.label,body.x,y+row*.18,font*.8,{maxWidth:labelW-12,label:'bar-label'});const available=body.w-labelW-110;card(body.x+labelW,y+row*.12,available,row*.52,{fill:palette.line,border:palette.line});ctx.fillStyle=i===items.length-1?palette.accent:palette.primary;ctx.beginPath();ctx.roundRect(body.x+labelW,y+row*.12,Math.max(2,available*Math.abs(Number(item.value))/max*p),row*.52,8);ctx.fill();text((v.prefix??'')+item.value+(v.suffix??''),body.x+body.w,y+row*.18,font*.85,{align:'right',maxWidth:105,weight:700,label:'bar-value'});});
  }else if(v.type==='stacked-bars'){
    const totals=v.items.map(i=>i.segments.reduce((n,s)=>n+s.value,0)),max=Math.max(1,...totals),row=body.h/v.items.length,prefix=v.prefix??'';
    const colors=[palette.primary,palette.accent,palette.positive];
    v.items.forEach((item,i)=>{
      const y=body.y+i*row,bx=body.x+28,barY=y+row*.30,bw=body.w-56,bh=row*.24;
      card(body.x,y,body.w,row-16);text(item.label+' · '+prefix+totals[i],bx,y+20,font*.76,{maxWidth:bw,color:palette.muted,label:'stack-label'});
      let offset=0;item.segments.forEach((segment,j)=>{const width=bw*segment.value/max*p;ctx.fillStyle=colors[j];ctx.fillRect(bx+offset,barY,width,bh);if(width>75)text(prefix+segment.value,bx+offset+width/2,barY+bh*.25,font*.73,{align:'center',maxWidth:width-12,color:palette.bg,weight:750,label:'stack-value'});offset+=width;});
      let lx=bx;item.segments.forEach((segment,j)=>{ctx.fillStyle=colors[j];ctx.fillRect(lx,y+row*.71,16,16);text(segment.label,lx+25,y+row*.69,font*.58,{maxWidth:bw/item.segments.length-30,color:palette.muted,label:'stack-legend'});lx+=bw/item.segments.length;});
    });
  }else if(v.type==='dots'){
    const labelSize=45,labelHeight=labelSize*1.15;
    const n=v.count??6,cx=W/2,cy=body.y+body.h*.42,r=Math.min(Math.min(body.w,body.h)*.27,body.h*.45-28-labelHeight-24);
    const points=Array.from({length:n},(_,i)=>[cx+Math.sin(i*2*Math.PI/n)*r,cy-Math.cos(i*2*Math.PI/n)*r]);
    for(const [i,edge] of (v.edges??[]).entries()){if(t<i*.22)continue;const a=points[edge[0]],b=points[edge[1]];if(a&&b)line(...a,...b,palette.primary,5);}
    points.forEach(([x,y],i)=>{
      ctx.beginPath();ctx.arc(x,y,portrait?15:14,0,Math.PI*2);ctx.fillStyle=palette.primary;ctx.fill();
      // Labels sit beyond their vertex, outside every chord of the circle.
      const dx=Math.sin(i*2*Math.PI/n),dy=-Math.cos(i*2*Math.PI/n);
      const align=dx>.25?'left':dx<-.25?'right':'center';
      const labelY=y+dy*28-(dy<-.25?labelHeight:dy>.25?0:labelHeight/2);
      text(i+1,x+dx*28,labelY,labelSize,{align,maxWidth:55,color:palette.muted,label:'dot-label'});
    });
    if(v.text)text(v.text,W/2,body.y+body.h*.87,45,{align:'center',maxWidth:body.w*.92,color:palette.accent,weight:650,label:'dot-caption'});
  }
  if(scene.takeaway)text(scene.takeaway,W/2,H*(portrait?.70:.73),portrait?32:30,{align:'center',color:palette.primary,maxWidth:body.w*.95,weight:650,label:'takeaway'});
  if(caption.mode!=='none'){
    const phrases=groups(scene.words,caption.maxWords);
    const group=phrases.find((g,i)=>t>=g[0].start&&t<Math.min(g.at(-1).end+.16,phrases[i+1]?.[0].start??Infinity));
    if(group){
      let size=portrait?48:48;const maxWidth=W*(portrait?.83:.86),gap=size*.34;
      const makeLines=()=>{ctx.font=`750 ${size}px Figtree`;const ls=[[]];let width=0;for(const w of group){const ww=ctx.measureText(w.text).width;if(width&&width+gap+ww>maxWidth){ls.push([]);width=0;}ls.at(-1).push({...w,width:ww});width+=(width?gap:0)+ww;}return ls;};
      let ls=makeLines();while(size>23&&(ls.length>2||ls.some(l=>l.some(w=>w.width>maxWidth)))){size-=2;ls=makeLines();}
      const lh=size*1.38,total=ls.length*lh,pad=20,bottom=H*(1-caption.safeBottom),top=bottom-total-pad;
      const widest=Math.max(...ls.map(l=>l.reduce((s,w)=>s+w.width,0)+(l.length-1)*gap));
      card((W-widest)/2-pad,top-pad/2,widest+pad*2,total+pad,{fill:palette.card,border:palette.line});
      for(const [li,words]of ls.entries()){
        const width=words.reduce((s,w)=>s+w.width,0)+(words.length-1)*gap;let x=(W-width)/2;
        for(const w of words){const active=t>=w.start&&t<w.end;const y=top+li*lh;
          if(active&&caption.mode!=='plain'){ctx.fillStyle=palette.accent;ctx.beginPath();ctx.roundRect(x-6,y-4,w.width+12,size*1.20,8);ctx.fill();}
          ctx.font=`750 ${size}px Figtree`;ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle=active&&caption.mode!=='plain'?palette.bg:palette.ink;
          const pop=active&&caption.mode==='pop'?1+.055*Math.sin(clamp((t-w.start)/Math.max(.01,w.end-w.start))*Math.PI):1;
          ctx.save();ctx.translate(x+w.width/2,y+size/2);ctx.scale(pop,pop);ctx.fillText(w.text,-w.width/2,-size/2);ctx.restore();
          audit.push({kind:'caption',text:w.text,active,x,y,width:w.width,height:size*1.2,fontSize:size,outside:x<0||x+w.width>W||y<0||y+size*1.2>H});x+=w.width+gap;
        }
      }
    }
  }
  ctx.fillStyle=palette.line;ctx.fillRect(margin,H*.96,W-2*margin,3);ctx.fillStyle=palette.accent;ctx.fillRect(margin,H*.96,(W-2*margin)*clamp(time/manifest.duration),3);
  return {scene:scene.id,time,localTime:t,progress,audit,format,style,ratio};
}
