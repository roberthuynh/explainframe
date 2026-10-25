// Text equivalents of authored visual data, without inferring causal claims.
export function visualDescription(scene){
  if(scene.visualDescription?.trim())return scene.visualDescription.trim();
  const v=scene.visual,amount=n=>(v.prefix??'')+n+(v.suffix??'');
  if(v.type==='statement')return [v.value,v.text??scene.title].filter(x=>x!==undefined).join('. ');
  if(v.type==='compare')return v.items.map(i=>[i.label,i.value,i.detail].filter(x=>x!==undefined).join(': ')).join('; ');
  if(v.type==='steps')return v.items.map((i,n)=>`${n+1}. ${typeof i==='string'?i:i.text}`).join(' ');
  if(v.type==='bars')return v.items.map(i=>`${i.label}: ${amount(i.value)}`).join('; ');
  if(v.type==='stacked-bars')return v.items.map(i=>`${i.label}: total ${amount(i.segments.reduce((n,s)=>n+s.value,0))}; ${i.segments.map(s=>s.label+': '+amount(s.value)).join(', ')}`).join('. ');
  if(v.type==='dots')return `${v.count??6} labeled dots. `+(v.edges?.length?'Connections: '+v.edges.map(e=>e.map(n=>n+1).join(' to ')).join(', ')+'. ':'')+(v.text??'');
  return scene.visualMeaningInNarration?'The narration describes the visual information.':'';
}
export function missingVisualDescription(scene){return ['custom','image'].includes(scene.visual.type)&&!scene.visualDescription?.trim()&&scene.visualMeaningInNarration!==true;}
