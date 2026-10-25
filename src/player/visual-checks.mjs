// Reusable checks for authored scenes. These are layout evidence, not a learning score.
export function inspectAudit(audit,{displayScale=1,minFont=14,exempt=['eyebrow','axis','origin']}={}){
 const failures=[],boxes=audit.filter(a=>a.text&&a.width>0);
 for(const a of audit){
  if(a.outside)failures.push({kind:'overflow',label:a.kind,text:a.text});
  if(a.fontSize&&a.text&&!exempt.includes(a.kind)&&a.fontSize*displayScale<minFont-.01)failures.push({kind:'small-text',label:a.kind,text:a.text,pixels:a.fontSize*displayScale});
 }
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const a=boxes[i],b=boxes[j];if(a.kind==='caption'&&b.kind==='caption')continue;
  if(a.x<b.x+b.width-1&&a.x+a.width>b.x+1&&a.y<b.y+b.height-1&&a.y+a.height>b.y+1)failures.push({kind:'text-overlap',a:a.text,b:b.text});
 }
 return failures;
}

export function predictionHolds(manifest){
 return manifest.scenes.filter(s=>s.learningPhase==='predict'||s.id==='predict').map(s=>({scene:s.id,silentSeconds:s.duration-s.audioDuration,pass:s.duration-s.audioDuration>=3}));
}

// object-fit: contain scales the bitmap by whichever box dimension limits it.
export function containedCanvasScale({width,height},box){
 if(![width,height,box.width,box.height].every(n=>Number.isFinite(n)&&n>0))throw new Error('Canvas and display dimensions must be positive');
 return Math.min(box.width/width,box.height/height);
}
