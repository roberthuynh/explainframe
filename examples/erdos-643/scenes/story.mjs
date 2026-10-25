const clamp=x=>Math.max(0,Math.min(1,x));
export function render(a){
 const {ctx,body:b,text,card,line,palette:p,time,cue,scene,portrait}=a;
 const {topic,step:s}=scene.visual;
 const start=cue(scene.visual.cue,{occurrence:0});const q=clamp((time-start)/(1.1/1.3));
 const x=f=>b.x+b.w*f,y=f=>b.y+b.h*f;
 const blue=p.primary,green=p.positive,gold=p.accent;
 const T=(v,xx,yy,size=54,opts={})=>text(v,xx,yy,size,{maxWidth:b.w*.92,...opts});
 const label=(v,xx,yy,ww,opts={})=>T(v,xx,yy,54,{maxWidth:ww,...opts});
 const box=(v,fx,fy,fw,fh,col=blue)=>{card(x(fx),y(fy),b.w*fw,b.h*fh,{fill:p.card,border:col});T(v,x(fx+fw/2),y(fy+fh/2)-30,54,{align:'center',maxWidth:b.w*fw*.90,color:col});};
 const arrow=(x1,y1,x2,y2,col=blue)=>{line(x1,y1,x2,y2,col,5);const ang=Math.atan2(y2-y1,x2-x1);line(x2,y2,x2-17*Math.cos(ang-.5),y2-17*Math.sin(ang-.5),col,5);line(x2,y2,x2-17*Math.cos(ang+.5),y2-17*Math.sin(ang+.5),col,5);};
 const dot=(xx,yy,r,col)=>{ctx.beginPath();ctx.arc(xx,yy,r,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();};
 const person=(fx,fy,col)=>{dot(x(fx),y(fy),26,col);ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(x(fx)-38,y(fy)+35,76,85,18);ctx.fill();};
 if(topic==='llm'){
  if(s===0){
   T('The cat sat',x(.5),y(.03),72,{align:'center'});
   ['The','cat','sat'].forEach((v,i)=>{const fx=.02+i*.33;box(v,fx,.27,.29,.23);arrow(x(fx+.145),y(.52),x(fx+.145),y(.66),green);if(q>0)T(['[0.2, …]','[0.7, …]','[0.4, …]'][i],x(fx+.145),y(.72),52,{align:'center',maxWidth:b.w*.30,color:green});});
  }else if(s===1){
   ['The','cat','sat','on','the'].forEach((v,i)=>{const fx=.01+i*.2;box(v,fx,0,.18,.2);if(q>0)arrow(x(fx+.09),y(.23),x(.5),y(.46),i===1?gold:blue);});
   box('Attention + other layers',.10,.48,.8,.23);arrow(x(.5),y(.74),x(.5),y(.84));T('Next-token prediction',x(.5),y(.88),56,{align:'center'});
  }else if(s===2){
   const vals=[40,30,30];['mat','floor','other'].forEach((v,i)=>{const yy=.08+i*.27;T(v,x(.01),y(yy),56,{maxWidth:b.w*.22});card(x(.25),y(yy),b.w*.59,b.h*.15,{fill:p.line,border:p.line});ctx.fillStyle=i===0?green:blue;ctx.fillRect(x(.25),y(yy),b.w*.59*vals[i]/100*q,b.h*.15);T(vals[i]+'%',x(.87),y(yy),54,{maxWidth:b.w*.13});});T('Illustrative probabilities',x(.5),y(.92),50,{align:'center',color:p.muted});
  }else if(s===3){
   box(q>.75?'The cat sat on the mat':'The cat sat on the',.02,.02,.96,.25);if(q<=.75)box('mat',.34,.42,.32,.22,green);arrow(x(.5),y(.3),x(.5),y(.39),green);if(q>0){arrow(x(.67),y(.53),x(.93),y(.53),green);arrow(x(.93),y(.53),x(.93),y(.29),green);}T('Add token → run again',x(.5),y(.82),62,{align:'center'});
  }else{
   box('Training',.02,.05,.43,.25);box('Generation',.55,.05,.43,.25,green);T('Parameters\nchange',x(.235),y(.42),58,{align:'center',maxWidth:b.w*.43});T('Parameters\nstay fixed',x(.765),y(.42),58,{align:'center',maxWidth:b.w*.43,color:green});T('Context grows with each token',x(.5),y(.86),54,{align:'center'});
  }
 }else if(topic==='erdos-643'){
  if(s<3){
   const pts=Array.from({length:6},(_,i)=>[x(.12+(i%3)*.38),y(.17+Math.floor(i/3)*.49)]);
   const groups=s===2&&q>.45?[[0,1,3],[2,4,5]]:[[0,1,2],[3,4,5]];
   for(let g=0;g<2;g++){const ids=groups[g];if(s===0&&g===1)continue;ctx.save();ctx.strokeStyle=g?green:blue;ctx.lineWidth=16;ctx.lineJoin='round';ctx.globalAlpha=.22;ctx.beginPath();ids.forEach((id,i)=>{const [xx,yy]=pts[id];i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});ctx.closePath();ctx.stroke();ctx.restore();}
   pts.forEach(([xx,yy],i)=>{dot(xx,yy,44,p.card);T(i+1,xx,yy-32,64,{align:'center',maxWidth:100});});
   T(s===0?'A triple = 3 selected dots':s===1?'123 + 456':q>.45?'124 + 356':'123 + 456',x(.5),y(.89),60,{align:'center'});
   if(s===2)T('First split: 123 + 456',x(.5),y(-.09),48,{align:'center',color:p.muted});
  }else if(s===3){
   [['123','456'],['124','356']].forEach((row,i)=>{row.forEach((v,j)=>{const fx=.03+j*.52,fy=.06+i*.36;box(v,fx,fy,.42,.25,i===1?green:blue);if(i===1&&j===1&&q>.1){line(x(fx+.03),y(fy+.03),x(fx+.39),y(fy+.22),gold,9);line(x(fx+.39),y(fy+.03),x(fx+.03),y(fy+.22),gold,9);}});});T(q>.1?'Second split incomplete':'Both splits are present',x(.5),y(.87),56,{align:'center'});
  }else{
   for(let i=0;i<12;i++)dot(x(.08+(i%6)*.168),y(.12+Math.floor(i/6)*.18),18,i%2?green:blue);
   T('More selected triples',x(.5),y(.48),64,{align:'center'});arrow(x(.5),y(.63),x(.5),y(.74));T('When is a repeat guaranteed?',x(.5),y(.83),56,{align:'center'});
  }
 }else if(topic==='vietnamese-address'){
  if(s===0){person(.16,.10,blue);T('Speaker',x(.16),y(.36),52,{align:'center',maxWidth:b.w*.30});['Older friend','Colleague','Stranger'].forEach((v,i)=>{box(v,.51,.02+i*.31,.47,.23);arrow(x(.29),y(.23),x(.49),y(.135+i*.31),green);});T('“you”',x(.18),y(.70),68,{align:'center'});
  }else if(s===1||s===2||s===4){
   const reversed=s===2&&q>.2;person(.22,.07,green);person(.78,.07,blue);
   T('em',x(.22),y(.32),84,{align:'center',color:green});T('anh',x(.78),y(.32),84,{align:'center',color:blue});
   T('Younger',x(.22),y(.49),54,{align:'center',maxWidth:b.w*.42});T('Older man',x(.78),y(.49),54,{align:'center',maxWidth:b.w*.42});
   if(reversed)arrow(x(.65),y(.25),x(.35),y(.25),blue);else arrow(x(.35),y(.25),x(.65),y(.25),green);
   T(reversed?'you':'I',x(.22),y(.73),70,{align:'center',color:green});T(reversed?'I':'you',x(.78),y(.73),70,{align:'center',color:blue});
  }else{
   person(.21,.04,blue);T('chị',x(.21),y(.30),84,{align:'center',color:blue});T('Older sister',x(.21),y(.49),52,{align:'center',maxWidth:b.w*.40});['Relationship','Setting','Preference'].forEach((v,i)=>box(v,.47,.02+i*.31,.51,.23,i===0?green:blue));
  }
 }else if(topic==='case-discussion'){
  if(s===0){box('Available facts',.02,.02,.96,.23);arrow(x(.5),y(.28),x(.5),y(.39));box('Your decision',.12,.42,.76,.24,green);T('Outcome not yet known',x(.5),y(.86),58,{align:'center'});
  }else if(s===1||s===2){
   ['Busy restaurant','Limited cash buffer','One key manager'].forEach((v,i)=>box(v,.02,.01+i*.23,.96,.18,i===1?gold:blue));
   box('Expand now',.02,.80,.46,.19,green);box('Wait',.55,.80,.43,.19,blue);
   if(s===2&&q>.1)arrow(x(.5),y(.68),x(.25),y(.77),green);
  }else if(s===3){
   const words=['Prepare','Small group','Class debate','Reflect'];words.forEach((v,i)=>{const fx=portrait?.08:.01+i*.25,fy=portrait?i*.25:.30,fw=portrait?.84:.23,fh=portrait?.19:.35;box(v,fx,fy,fw,fh,i===3?green:blue);if(i<3){if(portrait)arrow(x(.5),y(fy+.20),x(.5),y(fy+.24));else arrow(x(fx+.235),y(.475),x(fx+.25),y(.475));}});
  }else{
   box('Recommendation',.02,.02,.96,.22,green);arrow(x(.24),y(.48),x(.4),y(.27));arrow(x(.76),y(.48),x(.6),y(.27));box('Evidence',.02,.51,.46,.24);box('Assumptions',.54,.51,.44,.24);T('Revise when the evidence changes',x(.5),y(.88),54,{align:'center'});
  }
 }else if(topic==='data-centers'){
  if(s===0){
   const row=portrait;const labels=['Phone','Network','Server'];labels.forEach((v,i)=>{const fx=row?.18:.02+i*.34,fy=row?.03+i*.33:.3,fw=row?.64:.28,fh=row?.23:.37;box(v,fx,fy,fw,fh,i===2?green:blue);if(i<2){if(row)arrow(x(.5),y(fy+.24),x(.5),y(fy+.32));else arrow(x(fx+.29),y(.485),x(fx+.33),y(.485));}});if(portrait)dot(x(.5),y(.15+.66*q),14,gold);else dot(x(.16+.68*q),y(.485),14,gold);
  }else if(s===1){
   box('Compute',.03,.03,.94,.22,blue);box('Storage',.03,.38,.94,.22,green);box('Network',.03,.73,.94,.22,gold);arrow(x(.65),y(.27),x(.65),y(.36),green);arrow(x(.35),y(.62),x(.35),y(.71),gold);
  }else if(s===2){
   box('Power',.02,.02,.42,.22,gold);box('Cooling',.56,.02,.42,.22,green);box('Servers',.18,.50,.64,.40,blue);
   arrow(x(.23),y(.27),x(.32),y(.47),gold);arrow(x(.68),y(.47),x(.77),y(.27),green);T('Heat out',x(.82),y(.32),50,{align:'center',maxWidth:b.w*.31,color:green});
   for(let i=0;i<3;i++){line(x(.24),y(.61+i*.09),x(.76),y(.61+i*.09),p.line,9);dot(x(.27),y(.61+i*.09),6,green);}
  }else if(s===3){
   box('Main power',.02,.03,.46,.24,blue);box('Backup',.54,.03,.44,.24,green);box('Servers',.18,.68,.64,.26,blue);arrow(x(.24),y(.29),x(.37),y(.65),q>.2?p.line:blue);arrow(x(.76),y(.29),x(.63),y(.65),green);if(q>.2){line(x(.16),y(.36),x(.38),y(.53),gold,10);line(x(.38),y(.36),x(.16),y(.53),gold,10);}
  }else{
   box('Servers',.2,.36,.6,.25,blue);box('Power',.02,.01,.43,.22,gold);box('Cooling',.55,.01,.43,.22,green);box('Network',.2,.77,.6,.22,blue);arrow(x(.235),y(.25),x(.35),y(.33),gold);arrow(x(.65),y(.33),x(.765),y(.25),green);arrow(x(.5),y(.74),x(.5),y(.64),blue);
  }
 }
}
